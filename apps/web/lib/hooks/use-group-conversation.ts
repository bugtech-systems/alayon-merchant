// hooks/useGroupedConversation.ts

import { useState, useCallback } from 'react';
import { 
  processConversationHistory, 
  switchGroupedMessageVersion,
  addVersionToGroup,
  Version 
} from '../util/format-conversation-version';

export const useGroupedConversation = (sessionId: string) => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadHistory = useCallback(async (getSessionMessagesAPI: (params: any) => Promise<any>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getSessionMessagesAPI({ session_id: sessionId });
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        const processedMessages = processConversationHistory(response.data);
        setMessages(processedMessages);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load conversation history");
      console.error("Error loading conversation:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);
  
  const switchVersion = useCallback((groupId: string, versionId: string) => {
    setMessages(prev => switchGroupedMessageVersion(prev, groupId, versionId));
  }, []);
  
  const addVersion = useCallback((groupId: string, newVersion: Version) => {
    setMessages(prev => addVersionToGroup(prev, groupId, newVersion));
  }, []);
  
  const getCurrentVersionContent = useCallback((groupId: string): string => {
    const group = messages.find(msg => msg.id === groupId);
    if (!group) return "";
    const currentVersion = group.versions.find(v => v.id === group.currentVersionId);
    return currentVersion?.content || "";
  }, [messages]);
  
  return {
    messages,
    loading,
    error,
    loadHistory,
    switchVersion,
    addVersion,
    getCurrentVersionContent,
    setMessages,
  };
};