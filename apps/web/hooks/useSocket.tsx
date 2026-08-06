// hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketProps {
  userId?: string;
  role?: string;
  customerId?: string;
  token?: string;
  serverUrl?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  recipientId?: string;
  recipientName?: string;
  timestamp: Date | string;
  read: boolean;
  readBy: string[];
  broadcast?: boolean;
  targetRoles?: string[];
  targetRooms?: string[];
  groupId?: string;
  isOwn?: boolean;
  customerId?: string;
  room?: string;
  private?: boolean;
}

export interface OnlineUser {
  id: string;
  name: string;
  role: string;
  email?: string;
  customerId?: string;
  lastActive?: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'order' | 'status_update' | 'customer_message' | 'system' | 'private_message';
  read: boolean;
  timestamp: Date;
  data?: any;
}

export function useSocket({ 
  userId, 
  role = 'guest', 
  customerId, 
  token,
  serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3500'
}: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const messageQueue = useRef<any[]>([]);
  const isOwnMessageRef = useRef<Set<string>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    if (!userId) {
      console.log('No userId provided, skipping socket initialization');
      return;
    }

    console.log('Initializing socket connection to:', serverUrl);
    
    const newSocket = io(serverUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        token: token,
        userId: userId,
        role: role
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      newSocket.emit('authenticate', { 
        userId, 
        role, 
        customerId,
        token 
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
      
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setIsAuthenticated(false);
      
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Max reconnect attempts reached');
        newSocket.disconnect();
      }
    });

    // Authentication events
    newSocket.on('auth_success', (data) => {
      console.log('Authentication successful:', data);
      setIsAuthenticated(true);
      setIsConnected(true);
      
      // Process any queued messages
      if (messageQueue.current.length > 0) {
        messageQueue.current.forEach(msg => {
          if (msg.type === 'group') {
            sendMessage(msg.text, msg.room, msg.targetRooms);
          } else if (msg.type === 'private') {
            sendPrivateMessage(msg.recipientId, msg.text);
          }
        });
        messageQueue.current = [];
      }
    });

    newSocket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
    });

    // User presence events
    newSocket.on('user_joined', (data) => {
      console.log('User joined:', data);
      setOnlineUsers(prev => {
        if (prev.some(u => u.id === data.userId)) return prev;
        return [...prev, { 
          id: data.userId, 
          name: data.userName || data.role || data.userId,
          role: data.role || 'guest',
          email: data.email,
          customerId: data.customerId,
          lastActive: new Date()
        }];
      });
    });

    newSocket.on('user_left', (data) => {
      console.log('User left:', data);
      setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
    });

    // Online users list
    newSocket.on('online_users', (data) => {
      console.log('Online users list received:', data);
      if (data.users && Array.isArray(data.users)) {
        setOnlineUsers(data.users);
      }
    });

    // Chat history from Redis
    newSocket.on('chat_history', (data) => {
      console.log('Chat history received:', data);
      if (data.messages && data.messages.length > 0) {
        const formattedMessages = data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          isOwn: msg.sender === userId || msg.senderId === userId
        }));
        setMessages(formattedMessages);
      }
    });

    // Unread count
    newSocket.on('unread_count', (data) => {
      console.log('Unread count updated:', data);
      setUnreadCount(data.count || 0);
    });

    // Group message received
    newSocket.on('group_message_received', (data) => {
      console.log('Group message received:', data);
      
      const isOwn = data.sender === userId || data.senderId === userId;
      
      if (isOwn && isOwnMessageRef.current.has(data.id)) {
        isOwnMessageRef.current.delete(data.id);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.id 
              ? { 
                  ...msg, 
                  id: data.id,
                  timestamp: new Date(data.timestamp),
                  read: data.read || false,
                  readBy: data.readBy || []
                }
              : msg
          )
        );
        return;
      }

      if (isOwn) return;

      const message: Message = {
        id: data.id || `msg_${Date.now()}`,
        text: data.text || data.content,
        sender: data.sender,
        senderId: data.senderId,
        senderName: data.senderName || 'Unknown',
        senderRole: data.senderRole || 'guest',
        timestamp: new Date(data.timestamp),
        read: data.read || false,
        readBy: data.readBy || [],
        broadcast: data.broadcast || false,
        targetRoles: data.targetRoles || [],
        targetRooms: data.targetRooms || [],
        groupId: data.groupId,
        customerId: data.customerId,
        room: data.room,
        isOwn: false
      };
      
      setMessages(prev => [...prev, message]);
      setUnreadCount(prev => prev + 1);
      
      // Show notification for new message
      if (data.senderRole !== role) {
        const notification: Notification = {
          id: `msg_notif_${Date.now()}`,
          title: `Message from ${data.senderName || 'Unknown'}`,
          message: data.text || data.content,
          type: 'message',
          read: false,
          timestamp: new Date(data.timestamp),
          data: message
        };
        setNotifications(prev => [notification, ...prev]);
      }
    });

    // Private message received
    newSocket.on('private_message_received', (data) => {
      console.log('Private message received:', data);
      
      const isOwn = data.sender === userId || data.senderId === userId;
      
      if (isOwn && isOwnMessageRef.current.has(data.id)) {
        isOwnMessageRef.current.delete(data.id);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.id 
              ? { ...msg, id: data.id, timestamp: new Date(data.timestamp) }
              : msg
          )
        );
        return;
      }

      if (isOwn) return;

      const message: Message = {
        id: data.id || `msg_${Date.now()}`,
        text: data.text || data.content,
        sender: data.sender,
        senderId: data.senderId,
        senderName: data.senderName || 'Unknown',
        senderRole: data.senderRole || 'guest',
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        timestamp: new Date(data.timestamp),
        read: data.read || false,
        readBy: data.readBy || [],
        isOwn: false,
        private: true
      };
      
      setMessages(prev => [...prev, message]);
      setUnreadCount(prev => prev + 1);
      
      // Show notification for private message
      const notification: Notification = {
        id: `private_msg_${Date.now()}`,
        title: `Private message from ${data.senderName || 'Unknown'}`,
        message: data.text || data.content,
        type: 'private_message',
        read: false,
        timestamp: new Date(data.timestamp),
        data: message
      };
      setNotifications(prev => [notification, ...prev]);
    });

    // Customer message
    newSocket.on('customer_message', (data) => {
      console.log('Customer message received:', data);
      
      const isOwn = data.sender === userId || data.senderId === userId || data.customerId === customerId;
      
      if (isOwn) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.id 
              ? { ...msg, id: data.id, timestamp: new Date(data.timestamp) }
              : msg
          )
        );
        return;
      }

      const message: Message = {
        id: data.id || `msg_${Date.now()}`,
        text: data.text,
        sender: data.customerId || 'customer',
        senderId: data.senderId,
        senderName: data.customerName || 'Customer',
        senderRole: 'customer',
        timestamp: new Date(data.timestamp),
        read: false,
        readBy: [],
        broadcast: true,
        targetRoles: ['kitchen', 'cashier'],
        customerId: data.customerId,
        isOwn: false
      };
      
      setMessages(prev => [...prev, message]);
      setUnreadCount(prev => prev + 1);
      
      const notification: Notification = {
        id: `customer_msg_${Date.now()}`,
        title: `Customer: ${data.customerName || 'Customer'}`,
        message: data.text,
        type: 'customer_message',
        read: false,
        timestamp: new Date(data.timestamp),
        data: message
      };
      setNotifications(prev => [notification, ...prev]);
    });

    // Typing indicator
    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.isTyping
      }));
      
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: false
          }));
        }, 3000);
      }
    });

    // Message sent acknowledgment
    newSocket.on('message_sent', (data) => {
      console.log('Message sent acknowledgment:', data);
      if (data.id) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === `temp_${data.tempId || data.id}` 
              ? { ...msg, id: data.id, timestamp: new Date(data.timestamp) }
              : msg
          )
        );
        isOwnMessageRef.current.add(data.id);
      }
    });

    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
        newSocket.off();
      }
      socketRef.current = null;
      isOwnMessageRef.current.clear();
    };
  }, [userId, role, customerId, token, serverUrl]);

  // Send group message
  const sendMessage = useCallback((text: string, room?: string, targetRooms?: string[]) => {
    if (!socketRef.current || !isAuthenticated) {
      console.warn('Socket not authenticated, queuing message');
      messageQueue.current.push({ type: 'group', text, room, targetRooms });
      return false;
    }
    
    if (!text.trim()) {
      console.warn('Cannot send empty message');
      return false;
    }

    try {
      const tempId = `temp_${Date.now()}`;
      const messageData = {
        text: text.trim(),
        content: text.trim(),
        room: room || 'general',
        targetRooms: targetRooms || ['kitchen', 'cashier'],
        senderName: role === 'kitchen' ? 'Kitchen Staff' : 
                    role === 'cashier' ? 'Cashier' : 
                    role === 'customer' ? 'Customer' : 'User',
        timestamp: new Date().toISOString(),
        tempId: tempId
      };

      socketRef.current.emit('group_message', messageData);
      
      const tempMessage: Message = {
        id: tempId,
        text: text.trim(),
        sender: userId || 'user',
        senderId: userId,
        senderName: messageData.senderName,
        senderRole: role,
        timestamp: new Date(),
        read: true,
        readBy: [userId || 'user'],
        broadcast: true,
        targetRoles: ['cashier', 'kitchen'],
        targetRooms: targetRooms || ['kitchen', 'cashier'],
        room: room || 'general',
        isOwn: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      isOwnMessageRef.current.add(tempId);
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, [role, userId, isAuthenticated]);

  // Send private message
  const sendPrivateMessage = useCallback((recipientId: string, text: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.warn('Socket not authenticated, queuing private message');
      messageQueue.current.push({ type: 'private', recipientId, text });
      return false;
    }
    
    if (!text.trim()) {
      console.warn('Cannot send empty message');
      return false;
    }

    if (!recipientId) {
      console.warn('Recipient ID required for private message');
      return false;
    }

    try {
      const tempId = `temp_${Date.now()}`;
      const recipient = onlineUsers.find(u => u.id === recipientId);
      
      socketRef.current.emit('private_message', {
        recipientId,
        text: text.trim(),
        senderName: role === 'kitchen' ? 'Kitchen Staff' : 
                    role === 'cashier' ? 'Cashier' : 'User',
        timestamp: new Date().toISOString(),
        tempId: tempId
      });
      
      const tempMessage: Message = {
        id: tempId,
        text: text.trim(),
        sender: userId || 'user',
        senderId: userId,
        senderName: role === 'kitchen' ? 'Kitchen Staff' : 
                    role === 'cashier' ? 'Cashier' : 'User',
        senderRole: role,
        recipientId: recipientId,
        recipientName: recipient?.name || 'Unknown',
        timestamp: new Date(),
        read: true,
        readBy: [userId || 'user'],
        isOwn: true,
        private: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      isOwnMessageRef.current.add(tempId);
      
      return true;
    } catch (error) {
      console.error('Failed to send private message:', error);
      return false;
    }
  }, [role, userId, isAuthenticated, onlineUsers]);

  // Send customer message
  const sendCustomerMessage = useCallback((text: string, customerId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.warn('Socket not authenticated');
      return false;
    }
    
    if (!text.trim()) {
      console.warn('Cannot send empty message');
      return false;
    }

    try {
      const tempId = `temp_${Date.now()}`;
      socketRef.current.emit('customer_message', {
        text: text.trim(),
        customerId: customerId,
        customerName: role === 'cashier' ? 'Cashier' : 'Staff',
        timestamp: new Date().toISOString(),
        tempId: tempId
      });
      
      const tempMessage: Message = {
        id: tempId,
        text: text.trim(),
        sender: userId || 'user',
        senderId: userId,
        senderName: role === 'cashier' ? 'Cashier' : 'Staff',
        senderRole: role,
        timestamp: new Date(),
        read: true,
        readBy: [userId || 'user'],
        customerId: customerId,
        isOwn: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      isOwnMessageRef.current.add(tempId);
      
      return true;
    } catch (error) {
      console.error('Failed to send customer message:', error);
      return false;
    }
  }, [role, userId, isAuthenticated]);

  // Mark message as read
  const markMessageRead = useCallback((messageId: string) => {
    if (!socketRef.current || !isAuthenticated) return;
    
    socketRef.current.emit('mark_message_read', { messageId });
    
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, read: true, readBy: [...msg.readBy, userId || 'user'] }
          : msg
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [userId, isAuthenticated]);

  // Mark all messages as read
  const markAllRead = useCallback((room?: string) => {
    if (!socketRef.current || !isAuthenticated) return;
    
    socketRef.current.emit('mark_all_read', { room: room || role });
    
    setMessages(prev => 
      prev.map(msg => ({ ...msg, read: true }))
    );
    setUnreadCount(0);
  }, [role, isAuthenticated]);

  // Get chat history
  const getChatHistory = useCallback((limit = 50, offset = 0, room?: string) => {
    if (!socketRef.current || !isAuthenticated) return;
    
    socketRef.current.emit('get_chat_history', { limit, offset, room });
  }, [isAuthenticated]);

  // Get private chat history with a specific user
  const getPrivateChatHistory = useCallback((userId: string, limit = 50, offset = 0) => {
    if (!socketRef.current || !isAuthenticated) return;
    
    socketRef.current.emit('get_private_history', { userId, limit, offset });
  }, [isAuthenticated]);

  // Join a room
  const joinRoom = useCallback((room: string) => {
    if (!socketRef.current || !isAuthenticated) return;
    socketRef.current.emit('join_room', { room });
  }, [isAuthenticated]);

  // Leave a room
  const leaveRoom = useCallback((room: string) => {
    if (!socketRef.current || !isAuthenticated) return;
    socketRef.current.emit('leave_room', { room });
  }, [isAuthenticated]);

  // Send typing indicator
  const sendTyping = useCallback((room: string, isTyping: boolean, recipientId?: string) => {
    if (!socketRef.current || !isAuthenticated) return;
    socketRef.current.emit('typing', { 
      room, 
      isTyping, 
      recipientId: recipientId 
    });
  }, [isAuthenticated]);

  // Notification management
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // Get messages filtered by room
  const getRoomMessages = useCallback((room: string) => {
    return messages.filter(msg => msg.room === room || msg.groupId === room);
  }, [messages]);

  // Get private messages with a specific user
  const getPrivateMessages = useCallback((userId: string) => {
    return messages.filter(msg => 
      (msg.sender === userId || msg.senderId === userId) ||
      (msg.recipientId === userId)
    );
  }, [messages]);

  // Get unread messages
  const getUnreadMessages = useCallback(() => {
    return messages.filter(msg => !msg.read && !msg.isOwn);
  }, [messages]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    socket,
    socketRef,
    isConnected,
    isAuthenticated,
    notifications,
    messages,
    unreadCount,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendPrivateMessage,
    sendCustomerMessage,
    markMessageRead,
    markAllRead,
    getChatHistory,
    getPrivateChatHistory,
    joinRoom,
    leaveRoom,
    sendTyping,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    getUnreadNotifications,
    getRoomMessages,
    getPrivateMessages,
    getUnreadMessages,
    clearMessages,
    reconnect,
    disconnect,
    setMessages
  };
}