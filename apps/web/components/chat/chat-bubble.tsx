// components/chat/chat-bubble.tsx
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  Send, X, Minimize2, Users, Circle, MoreVertical, ChevronDown, 
  User, UserPlus, MessageCircle, Search, Check, Clock 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from "date-fns";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  id: string;
  text: string;
  sender: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  timestamp: Date | string;
  read: boolean;
  readBy: string[];
  isOwn?: boolean;
  customerId?: string;
  room?: string;
  groupId?: string;
  recipientId?: string;
  recipientName?: string;
}

interface OnlineUser {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatar?: string;
  customerId?: string;
  lastActive?: Date;
}

interface ChatBubbleProps {
  userId: string;
  userRole?: string;
  messages: Message[];
  unreadCount: number;
  isConnected: boolean;
  isAuthenticated: boolean;
  onlineUsers: OnlineUser[];
  typingUsers: Record<string, boolean>;
  onSendMessage: (text: string, room?: string, recipientId?: string) => boolean;
  onSendPrivateMessage: (recipientId: string, text: string) => boolean;
  onMinimize: () => void;
  onClose: () => void;
  onMarkAllRead: () => void;
  onLoadMore?: () => void;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  className?: string;
  room?: string;
}

export function ChatBubble({
  userId,
  userRole = "guest",
  messages,
  unreadCount,
  isConnected,
  isAuthenticated,
  onlineUsers,
  typingUsers,
  onSendMessage,
  onSendPrivateMessage,
  onMinimize,
  onClose,
  onMarkAllRead,
  onLoadMore,
  hasMoreMessages = false,
  isLoadingMore = false,
  className,
  room = "general"
}: ChatBubbleProps) {
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [selectedRecipient, setSelectedRecipient] = useState<OnlineUser | null>(null);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const previousMessagesLength = useRef(messages.length);

  // Filter online users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return onlineUsers;
    return onlineUsers.filter(user => 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [onlineUsers, searchQuery]);

  // Sort messages: oldest to newest (ascending)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [messages]);

  // Filter messages for selected recipient
  const filteredMessages = useMemo(() => {
    if (!selectedRecipient) return sortedMessages;
    
    return sortedMessages.filter(msg => 
      (msg.sender === selectedRecipient.id || msg.senderId === selectedRecipient.id) ||
      (msg.recipientId === selectedRecipient.id) ||
      (msg.sender === userId && msg.recipientId === selectedRecipient.id)
    );
  }, [sortedMessages, selectedRecipient, userId]);

  // Group messages by date
  const getGroupedMessages = useCallback((messagesToGroup: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messagesToGroup.forEach(message => {
      const date = typeof message.timestamp === 'string' 
        ? new Date(message.timestamp) 
        : message.timestamp;
      
      let key: string;
      if (isToday(date)) {
        key = 'Today';
      } else if (isYesterday(date)) {
        key = 'Yesterday';
      } else {
        key = format(date, "MMMM d, yyyy");
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(message);
    });
    
    return groups;
  }, []);

  const groupedMessages = useMemo(() => {
    return getGroupedMessages(filteredMessages);
  }, [filteredMessages, getGroupedMessages]);

  // Check if scroll is at bottom
  const checkIfAtBottom = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const atBottom = scrollHeight - scrollTop <= clientHeight + 50;
      setIsAtBottom(atBottom);
      return atBottom;
    }
    return true;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  // Handle new messages and auto-scroll
  useEffect(() => {
    const currentLength = filteredMessages.length;
    const prevLength = previousMessagesLength.current;
    
    if (currentLength > prevLength) {
      const isOwn = filteredMessages[currentLength - 1]?.isOwn;
      
      if (isOwn || isAtBottom) {
        setTimeout(() => scrollToBottom(true), 50);
        setNewMessageCount(0);
      } else {
        setNewMessageCount(prev => prev + 1);
      }
    }
    
    previousMessagesLength.current = currentLength;
  }, [filteredMessages, isAtBottom, scrollToBottom]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    setTimeout(() => scrollToBottom(false), 100);
  }, [scrollToBottom, filteredMessages]);

  // Focus input on open
  useEffect(() => {
    if (inputRef.current && isConnected && isAuthenticated) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isConnected, isAuthenticated]);

  // Mark all as read when component mounts
  useEffect(() => {
    if (unreadCount > 0) {
      onMarkAllRead();
    }
  }, [onMarkAllRead, unreadCount]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    checkIfAtBottom();
  }, [checkIfAtBottom]);

  // Handle scroll to bottom when "new messages" indicator is clicked
  const handleNewMessagesClick = useCallback(() => {
    scrollToBottom(true);
    setNewMessageCount(0);
  }, [scrollToBottom]);

// components/chat/chat-bubble.tsx - Updated handleSendMessage
const handleSendMessage = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  if (!messageInput.trim() || !isConnected || !isAuthenticated || isSending) return;

  setIsSending(true);
  try {
    let success = false;
    
    if (isPrivateMode && selectedRecipient) {
      // Use private message if available, otherwise fallback to group
      if (onSendPrivateMessage) {
        success = onSendPrivateMessage(selectedRecipient.id, messageInput.trim());
      } else {
        console.warn('onSendPrivateMessage is not available, falling back to group message');
        success = onSendMessage(messageInput.trim(), room);
      }
    } else {
      success = onSendMessage(messageInput.trim(), room);
    }
    
    if (success) {
      setMessageInput("");
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTimeout(() => scrollToBottom(true), 50);
    }
  } finally {
    setIsSending(false);
  }
}, [messageInput, isConnected, isAuthenticated, isSending, isPrivateMode, selectedRecipient, onSendMessage, onSendPrivateMessage, room, scrollToBottom]);

  // Typing handler
  const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
    } else if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  }, [isTyping]);

  // Load more messages when scrolling to top
  const handleScrollTop = useCallback(() => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      if (hasMoreMessages && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

  // Select a user to chat with
  const handleSelectUser = useCallback((user: OnlineUser) => {
    setSelectedRecipient(user);
    setIsPrivateMode(true);
    setIsUserListOpen(false);
    setShowOnlineUsers(false);
    // Clear messages and load chat history for this user
    // This would trigger a new message fetch
  }, []);

  // Switch back to group chat
  const handleSwitchToGroup = useCallback(() => {
    setSelectedRecipient(null);
    setIsPrivateMode(false);
  }, []);

  // Get user status indicator
  const getUserStatus = useCallback((userId: string) => {
    const user = onlineUsers.find(u => u.id === userId);
    return user ? 'online' : 'offline';
  }, [onlineUsers]);

  // Utility functions
  const getInitials = useCallback((name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const getRoleColor = useCallback((role: string) => {
    const colors: Record<string, string> = {
      customer: "bg-blue-500",
      kitchen: "bg-green-500",
      cashier: "bg-purple-500",
      manager: "bg-red-500",
      admin: "bg-yellow-500",
      driver: "bg-orange-500",
      guest: "bg-gray-500",
      company: "bg-indigo-500"
    };
    return colors[role] || "bg-gray-500";
  }, []);

  const getRoleLabel = useCallback((role: string) => {
    const labels: Record<string, string> = {
      customer: "Customer",
      kitchen: "Kitchen Staff",
      cashier: "Cashier",
      manager: "Manager",
      admin: "Admin",
      driver: "Driver",
      guest: "Guest",
      company: "Company"
    };
    return labels[role] || role;
  }, []);

  const formatMessageTime = useCallback((timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = diffMs / 1000 / 60;

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday, ${format(date, "h:mm a")}`;
    return format(date, "MMM d, h:mm a");
  }, []);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(user => user.id === userId);
  }, [onlineUsers]);

  const isUserTyping = useCallback((senderId: string) => {
    return typingUsers[senderId] || false;
  }, [typingUsers]);

  const getSenderName = useCallback((message: Message) => {
    if (message.isOwn) return "You";
    return message.senderName || message.sender || "Unknown";
  }, []);

  // Check if there are any typing users (excluding self)
  const hasTypingUsers = useMemo(() => {
    return Object.entries(typingUsers).some(([id, typing]) => 
      typing && id !== userId
    );
  }, [typingUsers, userId]);

  // Get current chat title
  const chatTitle = useMemo(() => {
    if (isPrivateMode && selectedRecipient) {
      return `Chat with ${selectedRecipient.name}`;
    }
    return "Group Chat";
  }, [isPrivateMode, selectedRecipient]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg bg-background shadow-xl border overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              {isPrivateMode && selectedRecipient ? (
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn(
                    "text-white text-xs",
                    getRoleColor(selectedRecipient.role)
                  )}>
                    {getInitials(selectedRecipient.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <MessageIcon className="h-5 w-5 text-primary" />
              )}
            </div>
            {isPrivateMode && selectedRecipient && isUserOnline(selectedRecipient.id) && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {chatTitle}
              {!isConnected && (
                <Badge variant="outline" className="text-[10px]">
                  Connecting...
                </Badge>
              )}
              {isConnected && !isAuthenticated && (
                <Badge variant="outline" className="text-[10px] text-yellow-600">
                  Authenticating...
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Circle className={cn(
                "h-1.5 w-1.5 fill-current",
                isConnected && isAuthenticated ? "text-green-500" : "text-yellow-500"
              )} />
              {isConnected && isAuthenticated ? "Online" : "Connecting..."}
              {isPrivateMode && selectedRecipient && (
                <span className="ml-1">
                  · {isUserOnline(selectedRecipient.id) ? 'Online' : 'Offline'}
                </span>
              )}
              {!isPrivateMode && onlineUsers.length > 0 && (
                <span className="ml-1">· {onlineUsers.length} online</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* User list toggle */}
          <Dialog open={isUserListOpen} onOpenChange={setIsUserListOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative"
              >
                <Users className="h-4 w-4" />
                {onlineUsers.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">
                    {onlineUsers.length}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Select User to Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {/* Group chat option */}
                    <Button
                      variant={!isPrivateMode ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        handleSwitchToGroup();
                        setIsUserListOpen(false);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      <span>Group Chat</span>
                      {!isPrivateMode && <Check className="h-4 w-4 ml-auto" />}
                    </Button>
                    
                    {filteredUsers.map((user) => (
                      <Button
                        key={user.id}
                        variant={selectedRecipient?.id === user.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSelectUser(user)}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className={cn(
                            "text-[8px] text-white",
                            getRoleColor(user.role)
                          )}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start flex-1">
                          <span className="text-sm">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        {selectedRecipient?.id === user.id && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                        {isUserOnline(user.id) && (
                          <Circle className="h-2 w-2 ml-2 fill-green-500 text-green-500" />
                        )}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMinimize}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onMarkAllRead}>
                Mark all as read
              </DropdownMenuItem>
              {isPrivateMode && selectedRecipient && (
                <DropdownMenuItem onClick={handleSwitchToGroup}>
                  Switch to group chat
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                // Clear chat functionality
              }}>
                Clear chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1">
        <ScrollArea 
          className="h-[380px] px-4 py-3" 
          ref={scrollRef}
          onScrollCapture={handleScroll}
          onScroll={handleScrollTop}
        >
          {filteredMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4">
                {isPrivateMode ? (
                  <User className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <MessageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <h4 className="mt-4 text-sm font-medium">
                {isPrivateMode ? `No messages with ${selectedRecipient?.name}` : "No messages yet"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                {isPrivateMode 
                  ? `Start a private conversation with ${selectedRecipient?.name}`
                  : "Start a conversation with our team. We're here to help!"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Load more indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-muted-foreground ml-1">Loading more...</span>
                  </div>
                </div>
              )}
              
              {/* Messages grouped by date */}
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <div className="flex justify-center mb-3">
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {date}
                    </span>
                  </div>
                  {dateMessages.map((message) => {
                    const isOwn = message.isOwn || message.sender === userId || message.senderId === userId;
                    const senderName = getSenderName(message);
                    const isOnline = isUserOnline(message.sender);
                    const isTypingNow = isUserTyping(message.sender);
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2 mb-3",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="h-7 w-7 mt-0.5">
                            <AvatarFallback className={cn(
                              "text-[10px] text-white",
                              getRoleColor(message.senderRole || 'guest')
                            )}>
                              {getInitials(senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "flex max-w-[80%] flex-col",
                            isOwn ? "items-end" : "items-start"
                          )}
                        >
                          {!isOwn && (
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-medium">
                                {senderName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {getRoleLabel(message.senderRole || 'guest')}
                              </span>
                              {isOnline && (
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              )}
                              {isTypingNow && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  typing...
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={cn(
                              "mt-0.5 rounded-lg px-3 py-2 text-sm break-words",
                              isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted",
                              "transition-all duration-200"
                            )}
                          >
                            {message.text}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {formatMessageTime(message.timestamp)}
                            </span>
                            {isOwn && message.read && (
                              <span className="text-[10px] text-green-500">✓✓</span>
                            )}
                            {isOwn && !message.read && (
                              <span className="text-[10px] text-muted-foreground">✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {/* End of messages marker */}
              <div ref={messageEndRef} />
            </div>
          )}
          
          {/* Typing indicator */}
          {hasTypingUsers && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-muted-foreground">Someone is typing...</span>
            </div>
          )}
        </ScrollArea>

        {/* New messages indicator */}
        {newMessageCount > 0 && !isAtBottom && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg gap-2"
              onClick={handleNewMessagesClick}
            >
              <ChevronDown className="h-4 w-4" />
              {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 border-t p-3 bg-muted/20"
      >
        <Input
          ref={inputRef}
          type="text"
          placeholder={
            isPrivateMode && selectedRecipient
              ? `Message ${selectedRecipient.name}...`
              : isConnected && isAuthenticated 
                ? "Type a message..." 
                : "Connecting..."
          }
          value={messageInput}
          onChange={handleTyping}
          className="flex-1"
          disabled={!isConnected || !isAuthenticated || isSending}
          maxLength={500}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!messageInput.trim() || !isConnected || !isAuthenticated || isSending}
          className="h-9 w-9 shrink-0"
        >
          {isSending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
      
      {/* Footer */}
      <div className="border-t px-3 py-1.5 bg-muted/10">
        <p className="text-[10px] text-muted-foreground text-center">
          {isConnected && isAuthenticated ? (
            <>
              {isPrivateMode && selectedRecipient ? (
                <>Private chat with {selectedRecipient.name} · {isUserOnline(selectedRecipient.id) ? 'Online' : 'Offline'}</>
              ) : (
                <>Chat secured · {onlineUsers.length} users online</>
              )}
              {unreadCount > 0 && ` · ${unreadCount} unread`}
            </>
          ) : (
            "Connecting to chat service..."
          )}
        </p>
      </div>
    </div>
  );
}

// Helper icon component
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}