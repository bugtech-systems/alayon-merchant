// app/dashboard/DashboardClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import DriverDashboard from "./rider/page";
import { CompanyOrdersTable } from "@/components/company-orders-table/table";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMedusaOrders } from "@/hooks/useMedusaOrders";
import { assignDriverToOrder, unassignDriverToOrder } from "@/lib/data";
import { PrintDialog } from "@/app/pos/_components/print-dialog";
import { startOfDay, endOfDay, format } from 'date-fns';
import { completeOrder, fulfillOrder } from "@/lib/actions/orders";
import { KpiCards } from "./rider/_components/kpi-cards";
import { useSocket } from "@/hooks/useSocket";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { acceptDelivery } from "@/lib/actions";

interface DashboardClientProps {
  user: any;
  userRole: string;
}

export function DashboardClient({ user, userRole }: DashboardClientProps) {
  const [cartPrint, setCartPrint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState<number>(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousOrderCountRef = useRef<number>(0);
  
  // Get pagination and filter params from URL
  const page = parseInt(searchParams?.get('page') || '1', 10);
  const limit = parseInt(searchParams?.get('limit') || '10', 10);
  const search = searchParams?.get('search') || '';
  const statusFilter = searchParams?.get('status') || '';

  // Get today's date range with proper start/end of day
  const now = new Date();
  const from = startOfDay(now);
  const to = endOfDay(now);

  // Build filters for Medusa v2 using created_at field
  const filters: Record<string, any> = {
    date_from: format(from, 'yyyy-MM-dd'),
    date_to: format(to, 'yyyy-MM-dd'),
  };


  const pricingContext = React.useMemo(() => ({
    priceListId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.price_list_id 
      : user?.driver?.price_list_id,
    customerGroupId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.customer_group_id 
      : user?.driver?.customer_group_id,
    customerId: user?.id,
    companyId: user?.metadata?.role == 'company' ? user.employee?.company_id : user?.driver?.company_id,
    stockLocationId: user?.metadata?.role == 'company' ? user.employee?.company?.stock_location_id : user?.driver?.stock_location_id,
    pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group'
  }), [user]);

  // Fetch orders with pagination and filters
  const { data, refetch, isLoading } = useMedusaOrders({
    filters: { 
      ...filters,
      company_id: pricingContext.companyId,
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit
    }
  });

  // Initialize Socket.IO connection
  const { 
    socket, 
    isConnected, 
    notifications, 
    messages,
    sendMessage,
    markNotificationRead,
    clearNotifications,
  } = useSocket({
    userId: user?.id,
    role: userRole,
    customerId: user?.id,
    token: user?.token
  });

  // Initialize audio for notification sound
  useEffect(() => {
    const audioExtensions = ['mp3', 'wav', 'ogg'];
    let currentAudio: HTMLAudioElement | null = null;
    
    const loadAudio = (extension: string) => {
      try {
        const audio = new Audio(`/notification.${extension}`);
        audio.volume = 1.0;
        audio.preload = 'auto';
        
        audio.addEventListener('canplaythrough', () => {
          console.log(`Audio loaded successfully (${extension})`);
          setIsSoundLoaded(true);
          setAudioError(null);
          audioRef.current = audio;
        });
        
        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load audio (${extension}):`, e);
          const currentIndex = audioExtensions.indexOf(extension);
          if (currentIndex < audioExtensions.length - 1) {
            loadAudio(audioExtensions[currentIndex + 1]);
          } else {
            setAudioError('No audio format could be loaded');
            setIsSoundLoaded(false);
          }
        });
        
        return audio;
      } catch (error) {
        console.error(`Error creating audio for ${extension}:`, error);
        return null;
      }
    };
    
    currentAudio = loadAudio(audioExtensions[0]);
    
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Update previous order count when data changes
  useEffect(() => {
    if (data?.orders) {
      const newCount = data.orders.length;
      if (previousOrderCountRef.current !== newCount) {
        console.log(`Order count changed: ${previousOrderCountRef.current} -> ${newCount}`);
        previousOrderCountRef.current = newCount;
        setPreviousOrderCount(newCount);
      }
    }
  }, [data?.orders]);

  // Function to play notification sound with multiple fallbacks
  const playNotificationSound = useCallback(async () => {
    console.log('Attempting to play notification sound...');
    console.log('Sound enabled:', isSoundEnabled);
    console.log('Sound loaded:', isSoundLoaded);
    console.log('Audio ref exists:', !!audioRef.current);
    
    if (!isSoundEnabled) {
      console.log('Sound is disabled, skipping playback');
      return;
    }

    const playMethods = [
      () => {
        if (audioRef.current && isSoundLoaded) {
          console.log('Method 1: Playing via audio element');
          audioRef.current.currentTime = 0;
          return audioRef.current.play();
        }
        return Promise.reject('Audio element not available');
      },
      
      () => {
        console.log('Method 2: Creating new audio element');
        const audio = new Audio('/notification.mp3');
        audio.volume = 1.0;
        return audio.play();
      },
      
      () => {
        console.log('Method 3: Using Web Speech API');
        if ('speechSynthesis' in window) {
          return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance('New order received');
            utterance.volume = 1;
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.onend = () => resolve('Speech completed');
            utterance.onerror = (e) => reject(e);
            window.speechSynthesis.speak(utterance);
            resolve('Speech started');
          });
        }
        return Promise.reject('Speech synthesis not available');
      }
    ];

    for (let i = 0; i < playMethods.length; i++) {
      try {
        const result = await playMethods[i]();
        console.log(`Sound played successfully using method ${i + 1}:`, result);
        return true;
      } catch (error) {
        console.warn(`Method ${i + 1} failed:`, error);
      }
    }

    try {
      console.log('Using final fallback: Web Audio API');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 500);
      
      console.log('Fallback beep played');
      return true;
    } catch (error) {
      console.error('All sound playback methods failed:', error);
      setAudioError('Sound playback failed');
      return false;
    }
  }, [isSoundEnabled, isSoundLoaded]);

  // Handle socket notifications
  useEffect(() => {
    if (!socket) return;

    // Handle order received events
    socket.on('order_received', (data) => {
      console.log('New order received via socket:', data);
      
      // Show toast notification
      toast.info(`New Order #${data.order.display_id}`, {
        description: `${data.order.items.length} items - Total: ₱${data.order.total}`,
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to order details or highlight the order
            handleRowClick(data.order);
          }
        }
      });
      
      // Play sound notification
      if (isSoundEnabled) {
        playNotificationSound();
      }
      
      // Refetch orders to update the table
      refetch();
    });

    // Handle order status updates
    socket.on('order_updated', (data) => {
      console.log('Order updated via socket:', data);
      
      toast.info(`Order #${data.order.display_id} updated`, {
        description: `Status: ${data.status}`,
        duration: 3000
      });
      
      // Refetch to update the table
      refetch();
    });

    // Handle messages from kitchen/cashier
    socket.on('message_received', (data) => {
      console.log('Message received:', data);
      
      toast.info(`Message from ${data.senderName || 'Kitchen'}`, {
        description: data.text,
        duration: 4000,
        action: {
          label: 'Reply',
          onClick: () => setShowChat(true)
        }
      });
      
      if (isSoundEnabled) {
        playNotificationSound();
      }
    });

    // Handle customer messages
    socket.on('customer_message', (data) => {
      console.log('Customer message received:', data);
      
      toast.info(`Customer: ${data.customerName || 'Customer'}`, {
        description: data.text,
        duration: 4000,
        action: {
          label: 'Reply',
          onClick: () => setShowChat(true)
        }
      });
      
      if (isSoundEnabled) {
        playNotificationSound();
      }
    });

    return () => {
      socket.off('order_received');
      socket.off('order_updated');
      socket.off('message_received');
      socket.off('customer_message');
    };
  }, [socket, isSoundEnabled, playNotificationSound, refetch]);

  // Auto-refetch every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (!isLoading && data?.orders) {
        const currentOrderCount = previousOrderCountRef.current;
        
        console.log(`Auto-refresh: Checking for new orders... Current count: ${currentOrderCount}`);
        
        const currentData = data;
        const result = await refetch();
        
        if (result.data?.orders) {
          const newOrderCount = result.data.orders.length;
          console.log(`Auto-refresh: New count: ${newOrderCount}, Previous count: ${currentOrderCount}`);
          
          if (newOrderCount > currentOrderCount) {
            console.log(`New order detected! Playing notification... (${currentOrderCount} -> ${newOrderCount})`);
            if (isSoundEnabled) {
              await playNotificationSound();
            }
          }
          
          previousOrderCountRef.current = newOrderCount;
          setPreviousOrderCount(newOrderCount);
        }
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [refetch, data, isLoading, isSoundEnabled, playNotificationSound]);

  // Manual refresh handler with sound notification check
  const handleManualRefresh = useCallback(async () => {
    const currentOrderCount = previousOrderCountRef.current;
    
    console.log(`Manual refresh: Checking for new orders... Current count: ${currentOrderCount}`);
    
    const result = await refetch();
    
    if (result.data?.orders) {
      const newOrderCount = result.data.orders.length;
      console.log(`Manual refresh: New count: ${newOrderCount}, Previous count: ${currentOrderCount}`);
      
      if (newOrderCount > currentOrderCount) {
        console.log(`Manual refresh: New order detected! Playing notification... (${currentOrderCount} -> ${newOrderCount})`);
        if (isSoundEnabled) {
          await playNotificationSound();
        }
      }
      
      previousOrderCountRef.current = newOrderCount;
      setPreviousOrderCount(newOrderCount);
    }
  }, [refetch, isSoundEnabled, playNotificationSound]);

  // Test notification sound manually
  const handleTestNotification = useCallback(async () => {
    console.log('Testing notification sound...');
    if (isSoundEnabled) {
      await playNotificationSound();
    } else {
      console.log('Sound was disabled, enabling temporarily for test');
      setIsSoundEnabled(true);
      setTimeout(async () => {
        await playNotificationSound();
      }, 100);
    }
  }, [isSoundEnabled, playNotificationSound]);

  // Function to stop any playing notification sound
  const stopNotificationSound = useCallback(() => {
    console.log('Stopping notification sound...');
    
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        console.log('Audio element stopped and reset');
      } catch (error) {
        console.warn('Error stopping audio element:', error);
      }
    }
    
    try {
      const allAudio = document.querySelectorAll('audio');
      allAudio.forEach(audio => {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      console.log('All audio elements stopped');
    } catch (error) {
      console.warn('Error stopping other audio elements:', error);
    }
    
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        console.log('Speech synthesis canceled');
      } catch (error) {
        console.warn('Error canceling speech synthesis:', error);
      }
    }
  }, []);

  // Handler for print action that stops sound first
  const handlePrint = useCallback((cartData: any) => {
    console.log('Print action triggered - stopping notification sound...');
    stopNotificationSound();
    setCartPrint(cartData);
  }, [stopNotificationSound]);

  const handleAssignRider = async (orderId: string, riderId: string | null) => {
    try {
      let response;
      if (!riderId) {
        response = await unassignDriverToOrder(orderId);
      } else {
        response = await assignDriverToOrder(orderId, riderId);
      }
      await refetch();
      console.log("Rider assigned successfully", response);
    } catch (error) {
      console.error("Error assigning rider:", error);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      console.log(orderId, status, 'UPDATE STATUS');
      await refetch();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleRowClick = (order: any) => {
    console.log(order, 'ORDER');
    stopNotificationSound();
  };

  const handleAcceptOrder = async (orderId: any, stock_location_id: any) => {
    console.log(orderId, 'ORDER', stock_location_id);
      setLoading(true);
    let order = data?.orders.find(a => a.id === orderId) as any;
    console.log(order, 'ORDEER')

    console.log(order, 'ORDER ACCEPT')
    await acceptDelivery(order?.delivery?.id)
    await fulfillOrder(orderId, stock_location_id)
    await refetch();
    setLoading(false);
  };

  const handleConfirmOrder = async (order: any, stock_location_id: any) => {
    console.log(order, 'ORDEERaaaaaa', stock_location_id)
    setLoading(true);
    await completeOrder(order, stock_location_id)
    await refetch();
    setLoading(false);
  };

  // Update URL query params
  const updateQueryParams = (params: Record<string, string | number | undefined>) => {
    const current = new URLSearchParams(searchParams?.toString() || '');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        current.set(key, String(value));
      } else {
        current.delete(key);
      }
    });
    const queryString = current.toString();
    router.push(queryString ? `?${queryString}` : window.location.pathname, { scroll: false });
  };

  const handleSearchChange = (query: string) => {
    updateQueryParams({ search: query, page: 1 });
  };

  // Toggle sound
  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
    toast.info(`Sound ${!isSoundEnabled ? 'enabled' : 'disabled'}`, {
      duration: 2000
    });
  }, [isSoundEnabled]);

  // Toggle chat
  const toggleChat = useCallback(() => {
    setShowChat(prev => !prev);
  }, []);

  // Company role view
  if (userRole === "company") {
    const { company } = user.employee;
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6 relative">
        <Toaster position="top-right" richColors />
        <PrintDialog open={cartPrint} onOpenChange={setCartPrint} cart={cartPrint} />
        
        {/* Notification Controls */}
          <div className="flex items-center gap-2 text-sm">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
        
        <CompanyOrdersTable
          data={data?.orders || []}
          totalCount={data?.total || 0}
          isLoading={(isLoading || loading)}
          onAssignDriver={handleAssignRider}
          onStatusChange={handleUpdateStatus}
          onRefresh={handleManualRefresh}
          onRowClick={handleRowClick}
          companyId={pricingContext?.companyId}
          defaultStockLocationId={pricingContext?.stockLocationId}
          searchQuery={search}
          onSearchChange={handleSearchChange}
          enableDragDrop={true}
          enableColumnVisibility={true}
          enableRowSelection={true}
          onPrint={handlePrint}
          onAcceptOrder={(orderId, stock_location_id) => handleAcceptOrder(orderId, stock_location_id) as any}
          onCompleteOrder={(order, stock_location_id) => handleConfirmOrder(order, stock_location_id) as any}
        />

     
      </div>
    );
  }
  
  // Driver role view
  if (userRole === "driver") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6 relative">
        <Toaster position="top-right" richColors />
        
 

        {/* KPI Cards */}
        <KpiCards
          totalCustomers={0}
          activeCustomers={0}
          totalRevenue={0}
          totalOrders={0}
          isLoading={isLoading}
        />
        
        {/* Task Reminders */}
        {/* <TaskReminders customerId={pricingContext.customerId} locationId={pricingContext.stockLocationId} priceListId={pricingContext.priceListId}/> */}
         
        <DriverDashboard user={user}/>

       
      </div>
    );
  }

  // Store role view (similar to driver)
  if (userRole === "store") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6 relative">
        <Toaster position="top-right" richColors />
        
        {/* Notification Controls */}

        <DriverDashboard user={user}/>


      </div>
    );
  }

  // Default fallback
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Toaster position="top-right" richColors />
      <p>Welcome {user.first_name || user.email}</p>
    </div>
  );
}