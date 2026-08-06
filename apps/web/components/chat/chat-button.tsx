// components/chat/chat-button.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatBubble } from "./chat-bubble";
import { useSocket } from "@/hooks/useSocket";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatButtonProps {
  userId: string;
  userRole?: string;
  customerId?: string;
  token?: string;
  serverUrl?: string;
  className?: string;
  defaultOpen?: boolean;
}

export function ChatButton({ 
  userId, 
  userRole = "guest", 
  customerId,
  token,
  serverUrl,
  className,
  defaultOpen = false
}: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const {
    isConnected,
    isAuthenticated,
    messages,
    unreadCount,
    onlineUsers,
    typingUsers,
    sendMessage,
    markAllRead,
    connect,
    disconnect,
    getChatHistory
  } = useSocket({
    userId,
    role: userRole,
    customerId,
    token,
    serverUrl
  });

  // Auto-connect when component mounts
  useEffect(() => {
    if (userId) {
      // Socket auto-connects via the hook
      getChatHistory(50);
    }
  }, [userId, getChatHistory]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllRead();
    }
  }, [isOpen, unreadCount, markAllRead]);

  // Handle window focus to refresh unread count
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        markAllRead();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, markAllRead]);

  const handleToggleChat = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      // Mark all as read when opening
      markAllRead();
    }
  }, [isOpen, markAllRead]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const handleMaximize = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      {/* Chat Bubble */}
      {isOpen && (
        <div className={cn(
          "absolute bottom-16 right-0",
          "w-[380px] sm:w-[420px]",
          "transition-all duration-300 ease-in-out",
          isMinimized ? "scale-95 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}>
          <ChatBubble
            userId={userId}
            userRole={userRole}
            messages={messages}
            unreadCount={unreadCount}
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
            onSendMessage={sendMessage}
            onMinimize={handleMinimize}
            onClose={handleClose}
            onMarkAllRead={markAllRead}
          />
        </div>
      )}

      {/* Minimized Chat Header */}
      {isOpen && isMinimized && (
        <div 
          className={cn(
            "absolute bottom-16 right-0 w-[380px] sm:w-[420px]",
            "cursor-pointer rounded-t-lg bg-primary px-4 py-3 shadow-lg transition-all",
            "hover:bg-primary/90"
          )}
          onClick={handleMaximize}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">
                Chat
              </span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary-foreground/60">
                {isConnected ? "● Online" : "● Offline"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="rounded-full p-1 hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Toggle Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggleChat}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "hover:scale-105 active:scale-95",
                isOpen && "bg-destructive hover:bg-destructive/90"
              )}
              aria-label={isOpen ? "Close chat" : "Open chat"}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <>
                  <MessageCircle className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold animate-in zoom-in-50"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                  {!isConnected && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-yellow-500 ring-2 ring-background" />
                  )}
                  {isConnected && !isAuthenticated && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-orange-500 ring-2 ring-background" />
                  )}
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isOpen ? "Close chat" : `Open chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}