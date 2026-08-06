// components/chat/chat-button.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, X, Volume2, VolumeX, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatBubble } from "./chat-bubble";
import { useSocket } from "@/hooks/useSocket";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAudioManager } from "@/lib/audio-manager";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ChatButtonProps {
  userId: string;
  userRole?: string;
  customerId?: string;
  companyId?: string;
  token?: string;
  serverUrl?: string;
  className?: string;
  defaultOpen?: boolean;
}

export function ChatButton({ 
  userId, 
  userRole = "guest", 
  customerId,
  companyId = "default",
  token,
  serverUrl,
  className,
  defaultOpen = false
}: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [audioManager, setAudioManager] = useState<any>(null);
  const buzzerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    isConnected,
    isAuthenticated,
    messages,
    unreadCount,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendPrivateMessage,
    markAllRead,
    getChatHistory,
  } = useSocket({
    userId,
    role: userRole,
    customerId,
    companyId,
    token,
    serverUrl
  });

  // Initialize audio manager on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const manager = getAudioManager();
      setAudioManager(manager);
      
      // Load sound preferences
      const savedSound = localStorage.getItem('chat-sound-enabled');
      if (savedSound !== null) {
        const enabled = savedSound === 'true';
        setSoundEnabled(enabled);
        manager.setEnabled(enabled);
      }
      
      const savedNotifications = localStorage.getItem('chat-notifications-enabled');
      if (savedNotifications !== null) {
        setNotificationEnabled(savedNotifications === 'true');
      }
    }
  }, []);

  // Auto-connect when component mounts
  useEffect(() => {
    if (userId && isAuthenticated) {
      getChatHistory(50, 0, companyId);
    }
  }, [userId, isAuthenticated, getChatHistory, companyId]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllRead(`company:${companyId}`);
    }
  }, [isOpen, unreadCount, markAllRead, companyId]);

  // Handle new messages - play sounds and show notifications
  useEffect(() => {
    if (messages.length === 0 || !audioManager) return;

    const lastMessage = messages[messages.length - 1];
    
    // Check if this is a new message (not the one we sent)
    if (lastMessage.id !== lastMessageId && !lastMessage.isOwn) {
      setLastMessageId(lastMessage.id);
      
      // Play ringtone for new message
      if (soundEnabled && audioManager.isAudioAvailable()) {
        try {
          audioManager.playRingtone();
          audioManager.vibrate([100, 50, 100]);
        } catch (error) {
          console.warn('Failed to play ringtone:', error);
        }
      }
      
      // Show browser notification
      if (notificationEnabled && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification('New Message', {
              body: `${lastMessage.senderName || 'Someone'}: ${lastMessage.text}`,
              icon: '/favicon.ico',
              tag: 'chat-message',
              requireInteraction: true,
            });
          } catch (error) {
            console.warn('Failed to show notification:', error);
          }
        }
      }
      
      // Trigger buzzer for group messages (if it's a group chat)
      if (!lastMessage.private && !lastMessage.isOwn) {
        triggerBuzzer();
      }
    }
  }, [messages, lastMessageId, soundEnabled, notificationEnabled, audioManager]);

  // Buzzer effect for group messages
  const triggerBuzzer = useCallback(() => {
    if (isBuzzing || !audioManager) return;
    
    setIsBuzzing(true);
    
    try {
      if (audioManager.isAudioAvailable()) {
        audioManager.playBuzzer();
        audioManager.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (error) {
      console.warn('Failed to play buzzer:', error);
    }
    
    // Reset buzzer state after a delay
    if (buzzerTimeoutRef.current) {
      clearTimeout(buzzerTimeoutRef.current);
    }
    buzzerTimeoutRef.current = setTimeout(() => {
      setIsBuzzing(false);
    }, 1000);
  }, [isBuzzing, audioManager]);

  // Handle window focus to refresh unread count
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        markAllRead(`company:${companyId}`);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, markAllRead, companyId]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const handleToggleChat = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      markAllRead(`company:${companyId}`);
      if (audioManager) {
        audioManager.resume();
      }
    }
  }, [isOpen, markAllRead, companyId, audioManager]);

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

  // Toggle sound
  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    
    if (audioManager) {
      audioManager.setEnabled(newState);
    }
    
    localStorage.setItem('chat-sound-enabled', String(newState));
    
    // Play a test sound if enabled
    if (newState && audioManager && audioManager.isAudioAvailable()) {
      try {
        audioManager.playNotification();
      } catch (error) {
        console.warn('Failed to play test sound:', error);
      }
    }
  }, [soundEnabled, audioManager]);

  // Toggle notifications
  const toggleNotifications = useCallback(() => {
    const newState = !notificationEnabled;
    setNotificationEnabled(newState);
    localStorage.setItem('chat-notifications-enabled', String(newState));
  }, [notificationEnabled]);

  // Wrapper for sendMessage with companyId
  const handleSendMessage = useCallback((text: string, room?: string, companyId?: string) => {
    const targetCompanyId = companyId || companyId;
    const targetRoom = room || `company:${targetCompanyId}`;
    return sendMessage(text, targetRoom, [targetRoom]);
  }, [sendMessage, companyId]);

  // Wrapper for sendPrivateMessage
  const handleSendPrivateMessage = useCallback((recipientId: string, text: string) => {
    return sendPrivateMessage(recipientId, text);
  }, [sendPrivateMessage]);

  // Wrapper for loading more messages
  const handleLoadMore = useCallback(() => {
    getChatHistory(50, messages.length, companyId);
  }, [getChatHistory, messages.length, companyId]);

  // Safe audio test functions
  const testRingtone = useCallback(() => {
    if (audioManager && audioManager.isAudioAvailable()) {
      try {
        audioManager.playRingtone();
        audioManager.vibrate([100, 50, 100, 50, 100]);
      } catch (error) {
        console.warn('Failed to test ringtone:', error);
      }
    }
  }, [audioManager]);

  const testBuzzer = useCallback(() => {
    if (audioManager && audioManager.isAudioAvailable()) {
      try {
        audioManager.playBuzzer();
        audioManager.vibrate([200, 100, 200, 100, 200]);
      } catch (error) {
        console.warn('Failed to test buzzer:', error);
      }
    }
  }, [audioManager]);

  // Get unread count for the company
  const companyUnreadCount = unreadCount;

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
            companyId={companyId}
            messages={messages}
            unreadCount={companyUnreadCount}
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
            onSendMessage={handleSendMessage}
            onSendPrivateMessage={handleSendPrivateMessage}
            onMinimize={handleMinimize}
            onClose={handleClose}
            onMarkAllRead={markAllRead}
            onLoadMore={handleLoadMore}
            hasMoreMessages={messages.length >= 50}
            isLoadingMore={false}
            room={`company:${companyId}`}
            isBuzzing={isBuzzing}
          />
        </div>
      )}

      {/* Minimized */}
      {isOpen && isMinimized && (
        <div 
          className={cn(
            "absolute bottom-16 right-0 w-[380px] sm:w-[420px]",
            "cursor-pointer rounded-t-lg bg-primary px-4 py-3 shadow-lg transition-all",
            "hover:bg-primary/90",
            isBuzzing && "animate-pulse bg-destructive"
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
                <Badge variant="secondary" className="ml-2 animate-in zoom-in">
                  {unreadCount}
                </Badge>
              )}
              {isBuzzing && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
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
            <div className="relative">
              {/* Sound indicator ring */}
              {isBuzzing && (
                <div className="absolute -inset-1 rounded-full bg-yellow-400/30 animate-ping"></div>
              )}
              <button
                onClick={handleToggleChat}
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "hover:scale-105 active:scale-95",
                  isOpen && "bg-destructive hover:bg-destructive/90",
                  isBuzzing && "ring-4 ring-yellow-400 ring-opacity-50"
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
                    {isBuzzing && (
                      <span className="absolute -inset-1 rounded-full animate-pulse bg-yellow-400/20" />
                    )}
                  </>
                )}
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="flex flex-col gap-1">
            <span>
              {isOpen ? "Close chat" : `Open chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>🔊 {soundEnabled ? 'On' : 'Off'}</span>
              <span>·</span>
              <span>🔔 {notificationEnabled ? 'On' : 'Off'}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Audio Controls Dropdown */}
      <div className="absolute bottom-16 left-0 mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={toggleSound} className="cursor-pointer">
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  <span>Sound: On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  <span>Sound: Off</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleNotifications} className="cursor-pointer">
              {notificationEnabled ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  <span>Notifications: On</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  <span>Notifications: Off</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={testRingtone}
              className="cursor-pointer"
              disabled={!audioManager || !audioManager.isAudioAvailable()}
            >
              <span>Test Ringtone</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={testBuzzer}
              className="cursor-pointer"
              disabled={!audioManager || !audioManager.isAudioAvailable()}
            >
              <span>Test Buzzer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}