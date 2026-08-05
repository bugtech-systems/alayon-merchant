// components/chat/ChatWidget.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName?: string;
  senderRole?: string;
  timestamp: Date;
  read?: boolean;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (text: string) => void;
  userRole: string;
  userName: string;
  userId: string;
  className?: string;
}

export function ChatWidget({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  userRole,
  userName,
  userId,
  className
}: ChatWidgetProps) {
  const [messageText, setMessageText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const getSenderColor = (role?: string) => {
    switch(role) {
      case 'company':
      case 'cashier':
        return 'bg-blue-500';
      case 'kitchen':
        return 'bg-orange-500';
      case 'driver':
        return 'bg-green-500';
      case 'customer':
        return 'bg-purple-500';
      case 'ai':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSenderLabel = (role?: string) => {
    switch(role) {
      case 'company':
      case 'cashier':
        return 'Cashier';
      case 'kitchen':
        return 'Kitchen';
      case 'driver':
        return 'Driver';
      case 'customer':
        return 'Customer';
      case 'ai':
        return 'AI Assistant';
      default:
        return 'Staff';
    }
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border",
      isMinimized ? "h-14" : "h-[500px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span className="font-semibold text-sm">Kitchen Chat</span>
          <span className="text-xs opacity-70">
            ({userRole === 'company' ? 'Cashier' : userRole === 'driver' ? 'Driver' : 'Staff'})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 h-[380px] p-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start a conversation with the kitchen</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender === userId;
                  const isAI = message.senderRole === 'ai';
                  
                  return (
                    <div
                      key={message.id || index}
                      className={cn(
                        "flex items-start gap-2",
                        isOwn && "flex-row-reverse"
                      )}
                    >
                      {!isOwn && (
                        <Avatar className={cn(
                          "h-8 w-8 flex-shrink-0 text-white flex items-center justify-center text-xs font-medium",
                          getSenderColor(message.senderRole)
                        )}>
                          {message.senderName?.charAt(0).toUpperCase() || 'S'}
                        </Avatar>
                      )}
                      <div className={cn(
                        "max-w-[80%] rounded-lg p-3",
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : isAI
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700"
                          : "bg-muted"
                      )}>
                        {!isOwn && !isAI && (
                          <p className="text-xs font-medium mb-1">
                            {message.senderName || getSenderLabel(message.senderRole)}
                          </p>
                        )}
                        {isAI && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              AI Assistant
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              🤖
                            </span>
                          </div>
                        )}
                        <p className="text-sm break-words">{message.text}</p>
                        <span className="text-[10px] opacity-70 mt-1 block">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Press Enter to send
            </p>
          </div>
        </>
      )}
    </div>
  );
}