// hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketProps {
  userId?: string;
  role?: string;
  customerId?: string;
  token?: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName?: string;
  senderRole?: string;
  timestamp: Date;
  read: boolean;
  readBy: string[];
  broadcast?: boolean;
  targetRoles?: string[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  timestamp: Date;
  data?: any;
}

export function useSocket({ userId, role = 'guest', customerId, token }: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    if (!userId) {
      console.log('No userId provided, skipping socket initialization');
      return;
    }

    const socketUrl = process.env.SMS_URL || 'http://localhost:3500';
    
    console.log('Initializing socket connection to:', socketUrl);
    
    const newSocket = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
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
      
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Max reconnect attempts reached');
        newSocket.disconnect();
      }
    });

    newSocket.on('auth_success', (data) => {
      console.log('Authentication successful:', data);
      setIsConnected(true);
    });

    newSocket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
    });

    // Chat history from Redis
    newSocket.on('chat_history', (data) => {
      console.log('Chat history received:', data);
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    });

    // Unread count
    newSocket.on('unread_count', (data) => {
      console.log('Unread count updated:', data);
      setUnreadCount(data.count || 0);
    });

    // Message received
    newSocket.on('message_received', (data) => {
      console.log('Message received:', data);
      
      const message: Message = {
        id: data.id || `msg_${Date.now()}`,
        text: data.text,
        sender: data.sender,
        senderName: data.senderName,
        senderRole: data.senderRole,
        timestamp: new Date(data.timestamp),
        read: data.read || false,
        readBy: data.readBy || [],
        broadcast: data.broadcast || false,
        targetRoles: data.targetRoles || []
      };
      
      setMessages(prev => [...prev, message]);
      
      // Show notification for new message
      if (data.senderRole !== role) {
        const notification: Notification = {
          id: `msg_notif_${Date.now()}`,
          title: `Message from ${data.senderName || 'Unknown'}`,
          message: data.text,
          type: 'message',
          read: false,
          timestamp: new Date(data.timestamp),
          data: message
        };
        setNotifications(prev => [notification, ...prev]);
      }
    });

    // Order received
    newSocket.on('order_received', (data) => {
      console.log('Order received:', data);
      
      const notification: Notification = {
        id: `order_${Date.now()}`,
        title: data.notification?.title || 'New Order',
        message: data.notification?.message || `Order #${data.order?.display_id} received`,
        type: 'order',
        read: false,
        timestamp: new Date(data.timestamp),
        data: data
      };
      
      setNotifications(prev => [notification, ...prev]);
    });

    // Order updated
    newSocket.on('order_updated', (data) => {
      console.log('Order updated:', data);
      
      const notification: Notification = {
        id: `update_${Date.now()}`,
        title: data.notification?.title || 'Order Updated',
        message: data.notification?.message || `Order #${data.order?.display_id} updated`,
        type: 'status_update',
        read: false,
        timestamp: new Date(data.timestamp),
        data: data
      };
      
      setNotifications(prev => [notification, ...prev]);
    });

    // Customer message
    newSocket.on('customer_message', (data) => {
      console.log('Customer message received:', data);
      
      const message: Message = {
        id: data.id || `msg_${Date.now()}`,
        text: data.text,
        sender: data.customerId || 'customer',
        senderName: data.customerName || 'Customer',
        senderRole: 'customer',
        timestamp: new Date(data.timestamp),
        read: false,
        readBy: [],
        broadcast: true,
        targetRoles: ['kitchen', 'cashier']
      };
      
      setMessages(prev => [...prev, message]);
      
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

    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
        newSocket.off();
      }
      socketRef.current = null;
    };
  }, [userId, role, customerId, token]);

  // Send message function with Redis
  const sendMessage = useCallback((text: string, receiver?: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return false;
    }
    
    if (!text.trim()) {
      console.warn('Cannot send empty message');
      return false;
    }

    try {
      const messageData = {
        text: text.trim(),
        receiver: receiver || 'cashier',
        senderName: role === 'company' ? 'Cashier' : role === 'driver' ? 'Driver' : 'Staff',
        timestamp: new Date().toISOString()
      };

      socketRef.current.emit('kitchen_message', messageData);
      
      // Optimistically add message to local state
      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        text: text.trim(),
        sender: userId || 'user',
        senderName: role === 'company' ? 'Cashier' : role === 'driver' ? 'Driver' : 'Staff',
        senderRole: role,
        timestamp: new Date(),
        read: true,
        readBy: [userId || 'user'],
        broadcast: true,
        targetRoles: ['cashier', 'kitchen']
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, [role, userId]);

  // Send customer message
  const sendCustomerMessage = useCallback((text: string, customerId: string) => {
    if (!socketRef.current) {
      console.error('Socket not connected');
      return false;
    }
    
    if (!text.trim()) {
      console.warn('Cannot send empty message');
      return false;
    }

    try {
      socketRef.current.emit('customer_message', {
        text: text.trim(),
        customerId: customerId,
        customerName: role === 'company' ? 'Cashier' : 'Staff',
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Failed to send customer message:', error);
      return false;
    }
  }, [role]);

  // Mark message as read
  const markMessageRead = useCallback((messageId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('mark_message_read', { messageId });
    
    // Update local state
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, read: true, readBy: [...msg.readBy, userId || 'user'] }
          : msg
      )
    );
  }, [userId]);

  // Mark all messages as read
  const markAllRead = useCallback(() => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('mark_all_read');
    
    // Update local state
    setMessages(prev => 
      prev.map(msg => ({ ...msg, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Get chat history
  const getChatHistory = useCallback((limit = 50, offset = 0) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('get_chat_history', { limit, offset });
  }, []);

  // Mark notification as read
  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return unreadCount;
  }, [unreadCount]);

  // Send typing indicator
  const sendTyping = useCallback((room: string, isTyping: boolean) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('typing', { room, isTyping });
  }, []);

  return {
    socket,
    socketRef,
    isConnected,
    notifications,
    messages,
    unreadCount,
    sendMessage,
    sendCustomerMessage,
    markMessageRead,
    markAllRead,
    getChatHistory,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    getUnreadCount,
    sendTyping,
    setMessages
  };
}