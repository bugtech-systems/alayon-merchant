// app/(dashboard)/dashboard/messages/_components/chat-app.tsx

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ConversationList } from "./message-conversation-list";
import { UserProfile } from "./message-user-profile";
import { ChatArea } from "./message-chat-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { 
  getConversation, 
  sendMessage, 
  markMessagesAsRead,
  getLatestConversations, 
  sendBulkMessage,
  sendFlastMessage
} from "@/lib/actions/message";
import { useMedusaCustomers } from "@/hooks/useMedusaCustomers";

// Types
interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isActive: boolean;
  status: string;
  phoneNumber: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sent' | 'delivered' | 'failed' | 'pending';
  direction?: 'incoming' | 'outgoing';
}

interface User {
  id: string;
  name: string;
  avatar: string;
  status: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  sharedFiles: Array<{
    name: string;
    type: string;
  }>;
}

interface ChatAppProps {
  initialConversations: {
    data: Conversation[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  };
  currentUser: any;
  company?: any;
}

// Constants
const MOBILE_BREAKPOINT = 1024;

export default function ChatApp({ initialConversations, currentUser, company }: ChatAppProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations.data || []);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    initialConversations.data?.[0] || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showList, setShowList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const {data } = useMedusaCustomers({}) as any;

console.log(company, data?.customers, 'CURRNET')

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.phoneNumber, true);
      // markConversationAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        setShowList(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);



  // Set up polling for new messages
  useEffect(() => {
    if (selectedConversation) {
      // Poll every 30 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages(selectedConversation.phoneNumber, true);
      }, 30000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [selectedConversation]);

  // Fetch messages function
  const fetchMessages = useCallback(async (phoneNumber: string, refresh: boolean = false) => {
    try {
      if (refresh) {
        setMessageOffset(0);
      } else {
        setLoadingMessages(true);
      }

      const offset = refresh ? 0 : messageOffset;
      const data = await getConversation(phoneNumber, {
        limit: 50,
        offset: offset,
      });


      console.log(data, 'DATAAAAs')
      const formattedMessages = data.messages || [];
      
      setMessages(prev => refresh ? formattedMessages : [...prev, ...formattedMessages]);
      setHasMoreMessages(data.pagination?.has_more || false);
      setMessageOffset(offset + formattedMessages.length);

    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error("Failed to load messages. Please try again.");
    } finally {
      setLoadingMessages(false);
    }
  }, [messageOffset]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string, phoneNumber?: any, isFlashSms?: any) => {
    if (!selectedConversation || !content.trim()) return;

    // Optimistically add message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: 'current',
      content: content.trim(),
      timestamp: new Date().toLocaleString(),
      isOwn: true,
      status: 'pending'
    };

    setMessages(prev => [...prev, tempMessage]);
    setSendingMessage(true);

    try {
        let response;

       response = await sendMessage({
        sender: currentUser.phone,
        phoneNumber: phoneNumber || selectedConversation.phoneNumber,
        message: content.trim(),
        flash: isFlashSms
      });
     

      // Update the message with real data
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { 
              ...msg, 
              id: response.message_id || msg.id, 
              status: 'sent' 
            }
          : msg
      ));

      // Update conversation last message
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id
          ? { 
              ...conv, 
              lastMessage: content.trim(), 
              timestamp: 'Just now' 
            }
          : conv
      ));

      toast.success("Message sent successfully!");

    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark message as failed
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, status: 'failed' }
          : msg
      ));
      
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  }, [selectedConversation, currentUser.phone]);

  const handleSendBulkMessage = useCallback(async (content: string, phoneNumbers: any, flash = false) => {

            let messagesSent = await sendBulkMessage({
                    phoneNumbers: phoneNumbers,
                    message: content,
                    flash
            })

            console.log(messagesSent, 'SENNTTS')

  }, [selectedConversation, currentUser.phone])



  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      await markMessagesAsRead({
        conversationId,
        phoneNumber: currentUser.phone
      });
      
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      ));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [currentUser.phone]);

  // Load more messages (pagination)
  const handleLoadMore = useCallback(async () => {
    if (!selectedConversation || !hasMoreMessages || loadingMessages) return;
    await fetchMessages(selectedConversation.phoneNumber);
  }, [selectedConversation, hasMoreMessages, loadingMessages, fetchMessages]);

  // Handlers
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    console.log(conversation, 'COVVV')
    setSelectedConversation(conversation);
    setMessages([]);
    setMessageOffset(0);
    markConversationAsRead(conversation.id);
    if (isMobile) {
      setShowList(false);
    }
  }, [isMobile, markConversationAsRead]);

  const handleBack = useCallback(() => {
    if (isMobile) {
      setShowList(true);
    }
  }, [isMobile]);

  const toggleProfile = useCallback(() => {
    setShowProfile(prev => !prev);
  }, []);

  const closeProfile = useCallback(() => {
    setShowProfile(false);
  }, []);

  // Determine if chat area should be full width
  const isChatFullWidth = isMobile && !showList;

  if (isLoading) {
    return (
      <div className="flex h-[90vh] items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[90vh] overflow-hidden bg-gray-50">
      {/* Conversation List */}
      <div
        className={`
          ${showList ? "flex" : "hidden"} 
          lg:flex 
          w-full 
          flex-shrink-0 
          flex-col 
          border-r 
          border-gray-200 
          bg-white 
          lg:w-80
        `}
      >
        <ConversationList
          customers={data?.customers || []}
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          currentUserPhone={currentUser.phone}
          onSendBulkMessage={handleSendBulkMessage}
          
        />
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className={`
          flex 
          flex-1 
          flex-col 
          min-w-0 
          ${isChatFullWidth ? "w-full" : ""}
        `}>
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            onToggleProfile={toggleProfile}
            onBack={handleBack}
            isMobile={isMobile}
            showList={showList}
            onSendMessage={handleSendMessage}
            onLoadMore={handleLoadMore}
            loadingMessages={loadingMessages}
            sendingMessage={sendingMessage}
            hasMoreMessages={hasMoreMessages}
            markAsRead={() => markConversationAsRead(selectedConversation.id)}
            currentUser={currentUser}
          />
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-500">Select a conversation to start messaging</p>
          </div>
        </div>
      )}

      {/* Profile - Desktop Sidebar */}
      {!isMobile && showProfile && (
        <div className="hidden lg:block w-80 flex-shrink-0 border-l border-gray-200 bg-white">
          <UserProfile 
            user={selectedConversation ? {
              ...currentUser,
              phone: selectedConversation.phoneNumber,
              name: selectedConversation.name,
              avatar: selectedConversation.avatar,
              status: selectedConversation.status,
            } : currentUser} 
            onClose={closeProfile} 
          />
        </div>
      )}

      {/* Profile - Mobile Sheet */}
      {isMobile && (
        <Sheet open={showProfile} onOpenChange={setShowProfile}>
          <SheetContent 
            side="right" 
            className="w-full p-0 sm:max-w-sm"
          >
            <UserProfile 
              user={selectedConversation ? {
                ...currentUser,
                phone: selectedConversation.phoneNumber,
                name: selectedConversation.name,
                avatar: selectedConversation.avatar,
                status: selectedConversation.status,
              } : currentUser} 
              onClose={closeProfile} 
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}