"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { 
  MoreHorizontal, 
  Info, 
  Paperclip, 
  Send, 
  ArrowLeft,
  Zap,
  AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sent' | 'delivered' | 'failed' | 'pending';
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  status: string;
  phoneNumber?: string;
}

interface ChatAreaProps {
  conversation: Conversation;
  messages: any[];
  onToggleProfile: () => void;
  onBack: () => void;
  isMobile: boolean;
  showList: boolean;
  onSendMessage?: (content: string, isFlashSms: boolean) => Promise<void>;
  sendingMessage?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMoreMessages?: boolean;
}

export function ChatArea({
  conversation,
  messages,
  onToggleProfile,
  onBack,
  isMobile,
  showList,
  onSendMessage,
  sendingMessage = false,
  isLoading = false,
  onLoadMore,
  hasMoreMessages = false,
}: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isFlashSms, setIsFlashSms] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [rows, setRows] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle load more on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries: any) => {
        if (entries[0].isIntersecting && hasMoreMessages && !isLoading && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreTriggerRef.current) {
      observer.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (loadMoreTriggerRef.current) {
        observer.unobserve(loadMoreTriggerRef.current);
      }
    };
  }, [hasMoreMessages, isLoading, onLoadMore]);

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = newHeight + 'px';
    
    // Update rows
    const lineCount = value.split('\n').length;
    setRows(Math.min(lineCount, 5));
    
    // Typing indicator
    setIsTyping(value.length > 0);
  }, []);

  // Handle send message
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) {
      toast.error("Please enter a message");
      return;
    }

    if (trimmedMessage.length > 700) {
      toast.error("Message cannot exceed 700 characters");
      return;
    }

    if (onSendMessage) {
      try {
        await onSendMessage(trimmedMessage, conversation?.phoneNumber, isFlashSms);
        setNewMessage("");
        setRows(1);
        setIsTyping(false);
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        toast.success(isFlashSms ? "Flash SMS sent successfully!" : "Message sent successfully!");
      } catch (error) {
        console.error("Failed to send message:", error);
        toast.error("Failed to send message. Please try again.");
      }
    } else {
      // Fallback for demo
      console.log("Sending message:", { content: trimmedMessage, isFlashSms });
      setNewMessage("");
      setRows(1);
      setIsTyping(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      toast.success("Message sent (demo)");
    }
  }, [newMessage, isFlashSms, onSendMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage(e);
    }
    
    // Escape to clear message
    if (e.key === 'Escape') {
      setNewMessage("");
      setRows(1);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      textareaRef.current?.blur();
    }
  }, [handleSendMessage]);

  // Handle paste images/files
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          // Handle image paste if needed
          toast.info("Image paste is not supported yet");
        }
      }
    }
  }, []);

  // Character count
  const characterCount = newMessage.length;
  const isNearLimit = characterCount > 650;
  const isOverLimit = characterCount > 700;
console.log(messages, 'MESSS')
  return (
    <div className="flex h-[80vh] flex-1 flex-col bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Back button - only visible on mobile when list is hidden */}
            {isMobile && !showList && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="mr-1 hover:bg-gray-100 flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            
            <div className="relative flex-shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={conversation.avatar || "https://bundui-images.netlify.app/avatars/08.png"}
                  alt={conversation.name}
                />
                <AvatarFallback>
                  {conversation.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
            </div>
            
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-gray-900 truncate">
                {conversation.name}
              </h2>
              <p className="text-sm text-green-600 truncate">
                {conversation.status || "Online"}
                {conversation.phoneNumber && (
                  <span className="text-xs text-gray-400 ml-2">
                    {conversation.phoneNumber}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* <div className="flex items-center space-x-1 flex-shrink-0">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleProfile} className="hover:bg-gray-100">
              <Info className="h-4 w-4" />
            </Button>
          </div> */}
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white"
      >
        {/* Load More Trigger */}
        {hasMoreMessages && (
          <div ref={loadMoreTriggerRef} className="flex justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span>Loading more...</span>
                </>
              ) : (
                <span>Scroll for more messages</span>
              )}
            </div>
          </div>
        )}

        {/* Date Separator Example */}
        {messages.length > 0 && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Badge>
          </div>
        )}

        {messages.map((message: any, index) => {
          // Check if we should show time separator
          const showTimeSeparator = index === 0 || 
            new Date(message.created_at).getHours() !== new Date(messages[index - 1]?.created_at).getHours();
              console.log(message.id, index, 'INDDD')
          return (
            <div key={conversation.id + message.id + index}>
              {showTimeSeparator && (
                <div className="flex justify-center my-2">
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {new Date(message?.created_at).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              )}
              
              <div
                className={`flex ${message.isOwn ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                <div className="flex items-end gap-2 max-w-[70%]">
                  {!message.isOwn && (
                    <Avatar className="h-8 w-8 flex-shrink-0 mb-1">
                      <AvatarImage src={conversation.avatar} alt={conversation.name} />
                      <AvatarFallback className="text-xs">
                        {conversation.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 shadow-sm break-words",
                      message.isOwn 
                        ? "bg-blue-600 text-white rounded-br-none" 
                        : "bg-white text-gray-900 rounded-bl-none border border-gray-200"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={cn(
                        "text-xs",
                        message.isOwn ? "text-blue-200" : "text-gray-400"
                      )}>
                        {new Date(message.created_at).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {message.isOwn && message.status && (
                        <span className="text-xs text-blue-200">
                          {message.status === 'sent' && '✓'}
                          {message.status === 'delivered' && '✓✓'}
                          {message.status === 'pending' && '⏳'}
                          {message.status === 'failed' && '✗'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Footer with Multi-line Textarea */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white p-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Flash SMS Toggle */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Switch
                id="flash-sms"
                checked={isFlashSms}
                onCheckedChange={setIsFlashSms}
                className={cn(
                  isFlashSms && "data-[state=checked]:bg-yellow-500"
                )}
              />
              <div className="flex items-center gap-1.5">
                <Zap className={cn(
                  "h-4 w-4",
                  isFlashSms ? "text-yellow-500" : "text-gray-400"
                )} />
                <Label 
                  htmlFor="flash-sms" 
                  className={cn(
                    "text-sm cursor-pointer",
                    isFlashSms ? "text-yellow-600 font-medium" : "text-gray-500"
                  )}
                >
                  Flash SMS
                </Label>
              </div>
            </div>
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                isNearLimit && !isOverLimit && "border-yellow-500 text-yellow-600",
                isOverLimit && "border-red-500 text-red-600"
              )}
            >
              {characterCount}/700
            </Badge>
          </div>

          {/* Message Input */}
          <div className="flex items-end gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="flex-shrink-0 hover:bg-gray-100 mb-1"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Type a message... (Ctrl+Enter to send)"
                className={cn(
                  "min-h-[40px] max-h-[150px] resize-none pr-12",
                  isOverLimit && "border-red-500 focus-visible:ring-red-500"
                )}
                rows={rows}
                disabled={sendingMessage}
              />
              {isOverLimit && (
                <div className="absolute -top-6 right-0 flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>Exceeds 700 chars</span>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className={cn(
                "flex-shrink-0 mb-1 transition-all",
                sendingMessage && "opacity-70 cursor-not-allowed"
              )}
              disabled={
                sendingMessage || 
                !newMessage.trim() || 
                isOverLimit
              }
            >
              {sendingMessage ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Sending</span>
                </div>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:ml-2">Send</span>
                </>
              )}
            </Button>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              {isTyping ? (
                <span className="text-green-600">Typing...</span>
              ) : (
                <span>Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> to send</span>
              )}
            </p>
            {isFlashSms && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                <Zap className="h-3 w-3 mr-1" />
                Flash SMS
              </Badge>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}