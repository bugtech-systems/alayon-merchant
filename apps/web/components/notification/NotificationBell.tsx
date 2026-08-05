// components/notification/NotificationBell.tsx
import React, { useState } from 'react';
import { Bell, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  timestamp: Date;
  data?: any;
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function NotificationBell({ 
  notifications, 
  onMarkRead, 
  onClearAll,
  className 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'order':
        return '🛍️';
      case 'status_update':
        return '📦';
      case 'message':
        return '💬';
      case 'alert':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch(type) {
      case 'order':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700';
      case 'status_update':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700';
      case 'message':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700';
      case 'alert':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800/20 dark:border-gray-700';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[20px] h-5 text-xs bg-red-500 text-white border-2 border-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "relative p-3 transition-colors hover:bg-accent cursor-pointer",
                    !notification.read && "bg-accent/50",
                    getNotificationColor(notification.type)
                  )}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium",
                          !notification.read && "font-bold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(notification.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}