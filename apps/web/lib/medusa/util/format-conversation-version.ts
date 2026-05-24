// lib/util/format-conversation-version.ts

export interface RawMessage {
  id: string;
  role: string;
  content: string;
  feedback: string | null;
  model_name: string;
  parameters: any;
  parent_message_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version_number: number;
  version_group_id: string | null;
  is_latest_version: boolean;
  parent_version_id: string | null;
  is_current_version: boolean;
  branch_id: string | null;
  edit_reason: string | null;
  metadata?: any;
  pair_id?: string;
  model_id?: string;
  chat_params?: any;
  intent_model?: string;
}

export interface MessageVersion {
  id: string;
  content: string;
  timestamp: string;
  type: "original" | "edited" | "regenerated";
  metadata: {
    model_name?: string;
    parameters?: any;
    feedback?: string | null;
    version_number?: number;
    edit_reason?: string | null;
    [key: string]: any;
  };
}

export interface UIMessage {
  id: string;
  role: string;
  versions: MessageVersion[];
  currentVersionId: string;
  metadata: {
    timestamp: string;
    parent_message_id: string | null;
    parent_version_id?: string | null;
    version_group_id?: string | null;
    version_number?: number;
    is_current_version?: boolean;
    branch_id?: string | null;
    isVersionGroup?: boolean;
    model_name?: string;
    pair_id?: string;
    [key: string]: any;
  };
}

interface MessageNode extends RawMessage {
  children: RawMessage[];
  versions: MessageVersion[];
  currentVersionId: string;
}

/**
 * Extract meaningful content from message (handles JSON strings and complex structures)
 */
export const extractMessageContent = (msg: RawMessage): string => {
  if (!msg.content || msg.content.trim() === "") {
    // Check if there's meaningful metadata
    if (msg.metadata?.intent) {
      return `Intent: ${msg.metadata.intent}`;
    }
    return "[System message]";
  }

  // Try to parse JSON content
  try {
    const parsed = JSON.parse(msg.content);
    if (parsed.message) {
      return parsed.message;
    }
    if (parsed.reasoning) {
      return parsed.reasoning;
    }
    if (parsed.next_intent) {
      return `Intent: ${parsed.next_intent} - ${parsed.reasoning || ''}`;
    }
    return msg.content;
  } catch {
    // Not JSON, return as is
    return msg.content;
  }
};

/**
 * Extract metadata from message
 */
const extractMetadata = (msg: RawMessage): any => {
  const metadata: any = {
    model_name: msg.model_name,
    parameters: msg.parameters,
    feedback: msg.feedback,
    version_number: msg.version_number,
    edit_reason: msg.edit_reason,
    branch_id: msg.branch_id,
    pair_id: msg.pair_id,
    model_id: msg.model_id,
  };

  // Merge additional metadata
  if (msg.metadata) {
    Object.assign(metadata, msg.metadata);
  }

  return metadata;
};

/**
 * Group messages by version group ID
 */
const groupByVersionGroup = (messages: RawMessage[]): Map<string, RawMessage[]> => {
  const groups = new Map<string, RawMessage[]>();
  
  messages.forEach(msg => {
    const groupId = msg.version_group_id || msg.id;
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(msg);
  });
  
  return groups;
};

/**
 * Build message tree from flat array
 */
const buildMessageTree = (messages: RawMessage[]): Map<string, MessageNode> => {
  const messageMap = new Map<string, MessageNode>();
  
  // First pass: create nodes
  messages.forEach(msg => {
    const node: MessageNode = {
      ...msg,
      children: [],
      versions: [],
      currentVersionId: msg.id,
    };
    messageMap.set(msg.id, node);
  });
  
  // Second pass: build parent-child relationships
  messageMap.forEach(node => {
    if (node.parent_message_id && messageMap.has(node.parent_message_id)) {
      const parent = messageMap.get(node.parent_message_id);
      if (parent && !parent.children.find(c => c.id === node.id)) {
        parent.children.push(node);
      }
    }
  });
  
  return messageMap;
};

/**
 * Create version objects from grouped messages
 */
const createVersionsFromGroup = (messages: RawMessage[]): MessageVersion[] => {
  return messages
    .sort((a, b) => (a.version_number || 1) - (b.version_number || 1))
    .map((msg, index) => ({
      id: msg.id,
      content: extractMessageContent(msg),
      timestamp: msg.created_at,
      type: index === 0 ? "original" : msg.edit_reason === "user_edit" ? "edited" : "regenerated",
      metadata: {
        ...extractMetadata(msg),
        version_index: index,
        total_versions: messages.length,
        is_current_version: msg.is_current_version || index === messages.length - 1,
      },
    }));
};

/**
 * Process conversation history into UI-friendly format
 * Groups messages by parent-child relationships and handles versioning
 */
export const processConversationHistory = (messages: RawMessage[]): UIMessage[] => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  // Filter out deleted messages
  const activeMessages = messages.filter(msg => !msg.deleted_at);
  
  // Sort by created_at to maintain chronological order
  const sortedMessages = [...activeMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Build message tree
  const messageTree = buildMessageTree(sortedMessages);
  
  // Find root messages (no parent or parent not in current session)
  const rootMessages = Array.from(messageTree.values()).filter(
    node => !node.parent_message_id || !messageTree.has(node.parent_message_id)
  );

  // Group versions
  const versionGroups = groupByVersionGroup(sortedMessages);
  
  // Track processed messages to avoid duplicates
  const processedMessageIds = new Set<string>();
  const uiMessages: UIMessage[] = [];

  // Process root messages and their children
  const processMessage = (node: MessageNode, parentId: string | null = null): void => {
    if (processedMessageIds.has(node.id)) return;
    
    // Check if this message is part of a version group
    const groupId = node.version_group_id || node.id;
    const versionGroup = versionGroups.get(groupId) || [];
    const isVersionGroup = versionGroup.length > 1;
    
    // If this is a version group and we haven't processed it yet
    if (isVersionGroup && !processedMessageIds.has(groupId)) {
      // Mark all messages in this group as processed
      versionGroup.forEach(msg => processedMessageIds.add(msg.id));
      
      // Get the current version (latest or marked as current)
      const currentVersion = versionGroup.find(v => v.is_current_version) || versionGroup[versionGroup.length - 1];
      const versions = createVersionsFromGroup(versionGroup);
      
      // Create UI message for the version group
      uiMessages.push({
        id: `group_${groupId}`,
        role: node.role,
        versions,
        currentVersionId: currentVersion?.id || versions[0]?.id || node.id,
        metadata: {
          timestamp: node.created_at,
          parent_message_id: parentId || node.parent_message_id || null,
          parent_version_id: node.parent_version_id,
          version_group_id: groupId,
          isVersionGroup: true,
          version_count: versionGroup.length,
          current_version_number: currentVersion?.version_number,
          branch_id: node.branch_id,
          model_name: node.model_name,
          pair_id: node.pair_id,
        },
      });
    } 
    // Single message, no version group
    else if (!isVersionGroup && !processedMessageIds.has(node.id)) {
      processedMessageIds.add(node.id);
      
      // Create single version
      const versions: MessageVersion[] = [{
        id: node.id,
        content: extractMessageContent(node),
        timestamp: node.created_at,
        type: "original",
        metadata: extractMetadata(node),
      }];
      
      uiMessages.push({
        id: node.id,
        role: node.role,
        versions,
        currentVersionId: node.id,
        metadata: {
          timestamp: node.created_at,
          parent_message_id: parentId || node.parent_message_id || null,
          parent_version_id: node.parent_version_id,
          version_group_id: node.version_group_id,
          version_number: node.version_number,
          is_current_version: node.is_current_version,
          branch_id: node.branch_id,
          model_name: node.model_name,
          pair_id: node.pair_id,
          isVersionGroup: false,
        },
      });
    }
    
    // Process children
    const children = node.children.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    children.forEach(child => {
      processMessage(child, node.id);
    });
  };
  
  // Process all root messages
  rootMessages.forEach(root => processMessage(root));
  
  // Sort UI messages by timestamp
  return uiMessages.sort(
    (a, b) => new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
  );
};

/**
 * Get all versions for a specific message group
 */
export const getMessageVersions = (uiMessages: UIMessage[], messageId: string): MessageVersion[] => {
  const message = uiMessages.find(m => m.id === messageId);
  return message?.versions || [];
};

/**
 * Get the current version content for a message
 */
export const getCurrentVersionContent = (uiMessage: UIMessage): string => {
  const currentVersion = uiMessage.versions.find(v => v.id === uiMessage.currentVersionId);
  return currentVersion?.content || "";
};

/**
 * Get all child messages for a parent message
 */
export const getChildMessages = (uiMessages: UIMessage[], parentId: string): UIMessage[] => {
  return uiMessages.filter(msg => msg.metadata.parent_message_id === parentId);
};

/**
 * Build conversation thread tree from UI messages
 */
export const buildConversationThread = (uiMessages: UIMessage[]): UIMessage[] => {
  const messageMap = new Map<string, UIMessage>();
  const roots: UIMessage[] = [];
  
  // First pass: map all messages by ID
  uiMessages.forEach(msg => {
    messageMap.set(msg.id, msg);
  });
  
  // Second pass: build tree structure
  uiMessages.forEach(msg => {
    const parentId = msg.metadata.parent_message_id;
    if (parentId && messageMap.has(parentId)) {
      // This is a child message, it will be handled by the parent
      // No need to add to roots
    } else {
      roots.push(msg);
    }
  });
  
  // Sort roots by timestamp
  return roots.sort((a, b) => 
    new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
  );
};

/**
 * Format messages for API request
 */
export const formatMessagesForAPI = (uiMessages: UIMessage[]): any[] => {
  return uiMessages.map(msg => {
    const currentVersion = msg.versions.find(v => v.id === msg.currentVersionId);
    return {
      id: msg.id,
      role: msg.role,
      content: currentVersion?.content || "",
      metadata: msg.metadata,
    };
  });
};

/**
 * Find message by ID in UI messages
 */
export const findMessageById = (uiMessages: UIMessage[], id: string): UIMessage | undefined => {
  return uiMessages.find(msg => msg.id === id);
};

/**
 * Get conversation path from root to a specific message
 */
export const getConversationPath = (uiMessages: UIMessage[], targetId: string): UIMessage[] => {
  const path: UIMessage[] = [];
  let current = findMessageById(uiMessages, targetId);
  
  while (current) {
    path.unshift(current);
    const parentId = current.metadata.parent_message_id;
    current = parentId ? findMessageById(uiMessages, parentId) : undefined;
  }
  
  return path;
};

/**
 * Get latest version of a message
 */
export const getLatestVersion = (uiMessage: UIMessage): MessageVersion => {
  return uiMessage.versions[uiMessage.versions.length - 1];
};

/**
 * Check if a message has multiple versions
 */
export const hasMultipleVersions = (uiMessage: UIMessage): boolean => {
  return uiMessage.versions.length > 1;
};

/**
 * Get version number display text
 */
export const getVersionDisplayText = (uiMessage: UIMessage, versionId: string): string => {
  const index = uiMessage.versions.findIndex(v => v.id === versionId);
  const total = uiMessage.versions.length;
  return `Version ${index + 1} of ${total}`;
};

/**
 * Switch message version
 */
export const switchMessageVersion = (
  uiMessages: UIMessage[],
  messageId: string,
  versionId: string
): UIMessage[] => {
  return uiMessages.map(msg => {
    if (msg.id === messageId) {
      const versionExists = msg.versions.some(v => v.id === versionId);
      if (!versionExists) {
        console.warn(`Version ${versionId} not found for message ${messageId}`);
        return msg;
      }
      return {
        ...msg,
        currentVersionId: versionId,
      };
    }
    return msg;
  });
};