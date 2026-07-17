"use client";

import { useState, useEffect, useCallback } from "react";
import { ConversationList } from "../_components/message-conversation-list";
import { UserProfile } from "../_components/message-user-profile";
import { ChatArea } from "../_components/message-chat-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
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

// Mock Data
const conversations: Conversation[] = [
  {
    id: "1",
    name: "Alice Johnson",
    avatar: "/images/avatar1.png",
    lastMessage: "Hey, how are you?",
    timestamp: "10:30 AM",
    unreadCount: 2,
    isActive: true,
    status: "Active now"
  },
  {
    id: "2",
    name: "Bob Smith",
    avatar: "https://bundui-images.netlify.app/avatars/09.png",
    lastMessage: "Can we meet tomorrow?",
    timestamp: "Yesterday",
    unreadCount: 54,
    isActive: false,
    status: "Last seen 2 hours ago"
  },
  {
    id: "3",
    name: "Charlie Brown",
    avatar: "https://bundui-images.netlify.app/avatars/09.png",
    lastMessage: "Thanks for your help!",
    timestamp: "Tuesday",
    unreadCount: 1,
    isActive: false,
    status: "Last seen yesterday"
  },
  {
    id: "4",
    name: "Diana Prince",
    avatar: "https://bundui-images.netlify.app/avatars/09.png",
    lastMessage: "The project is done!",
    timestamp: "2 days ago",
    unreadCount: 0,
    isActive: false,
    status: "Last seen 3 days ago"
  },
  {
    id: "5",
    name: "Ethan Hunt",
    avatar: "https://bundui-images.netlify.app/avatars/09.png",
    lastMessage: "Mission accomplished",
    timestamp: "Last week",
    unreadCount: 0,
    isActive: false,
    status: "Last seen last week"
  }
];

const messages: Message[] = [
  {
    id: "1",
    senderId: "2",
    content: "Hey there! How's it going?",
    timestamp: "10:30 AM",
    isOwn: false
  },
  {
    id: "2",
    senderId: "1",
    content: "Hi Alice! I'm doing well, thanks for asking. How about you?",
    timestamp: "10:32 AM",
    isOwn: true
  },
  {
    id: "3",
    senderId: "2",
    content: "I'm great! Just working on some new projects. Have you heard about the latest tech conference?",
    timestamp: "10:35 AM",
    isOwn: false
  },
  {
    id: "4",
    senderId: "1",
    content: "No, I haven't. Tell me more about it!",
    timestamp: "10:36 AM",
    isOwn: true
  },
  {
    id: "5",
    senderId: "2",
    content: "It's called TechXpo 2023. It's happening next month and features some amazing speakers from top tech companies.",
    timestamp: "10:38 AM",
    isOwn: false
  },
    {
    id: "1",
    senderId: "2",
    content: "Hey there! How's it going?",
    timestamp: "10:30 AM",
    isOwn: false
  },
  {
    id: "2",
    senderId: "1",
    content: "Hi Alice! I'm doing well, thanks for asking. How about you?",
    timestamp: "10:32 AM",
    isOwn: true
  },
  {
    id: "3",
    senderId: "2",
    content: "I'm great! Just working on some new projects. Have you heard about the latest tech conference?",
    timestamp: "10:35 AM",
    isOwn: false
  },
  {
    id: "4",
    senderId: "1",
    content: "No, I haven't. Tell me more about it!",
    timestamp: "10:36 AM",
    isOwn: true
  },
  {
    id: "5",
    senderId: "2",
    content: "It's called TechXpo 2023. It's happening next month and features some amazing speakers from top tech companies.",
    timestamp: "10:38 AM",
    isOwn: false
  }
];

const currentUser: User = {
  id: "2",
  name: "Alice Johnson",
  avatar: "/images/avatar2.png",
  status: "Active now",
  bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  email: "alicejohnson@example.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  sharedFiles: [
    { name: "project_proposal.pdf", type: "pdf" },
    { name: "meeting_notes.docx", type: "docx" },
    { name: "budget_2023.xlsx", type: "xlsx" }
  ]
};

// Constants
const MOBILE_BREAKPOINT = 1024;

export default function ChatApp() {
  // State
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(conversations[0]);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showList, setShowList] = useState(true);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      
      // On desktop, always show the list
      if (!mobile) {
        setShowList(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handlers
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    // On mobile, hide the list when a conversation is selected
    if (isMobile) {
      setShowList(false);
    }
  }, [isMobile]);

  const handleBack = useCallback(() => {
    // Show the list again when back button is pressed on mobile
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
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Area */}
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
        />
      </div>

      {/* Profile - Desktop Sidebar */}
      {!isMobile && showProfile && (
        <div className="hidden lg:block w-80 flex-shrink-0 border-l border-gray-200 bg-white">
          <UserProfile 
            user={currentUser} 
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
              user={currentUser} 
              onClose={closeProfile} 
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}