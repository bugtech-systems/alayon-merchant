// app/dashboard/DashboardClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import DriverDashboard from "./rider/page";
import { CompanyOrdersTable } from "@/components/company-orders-table/table";
import React, { useState, useEffect, useRef } from "react";
import { useMedusaOrders } from "@/hooks/useMedusaOrders";
import { assignDriverToOrder, unassignDriverToOrder } from "@/lib/data";
import { PrintDialog } from "@/app/pos/_components/print-dialog";

interface DashboardClientProps {
  user: any;
  userRole: string;
}

export function DashboardClient({ user, userRole }: DashboardClientProps) {
  const [cartPrint, setCartPrint] = useState(null);
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set());
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get pagination and filter params from URL
  const page = parseInt(searchParams?.get('page') || '1', 10);
  const limit = parseInt(searchParams?.get('limit') || '10', 10);
  const search = searchParams?.get('search') || '';
  const statusFilter = searchParams?.get('status') || '';

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
      company_id: pricingContext.companyId,
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit
    }
  });

  // Initialize audio for notification sound
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('/notification.mp3'); // Make sure to add this file to your public folder
  audioRef.current.volume = 1.0; // Maximum volume (0.0 to 1.0)
    
    // Fallback if file doesn't exist
    audioRef.current.onerror = () => {
      console.warn('Notification sound file not found. Using fallback notification.');
    };
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Initialize previous order IDs on first data load
  useEffect(() => {
    if (data?.orders && data.orders.length > 0) {
      const orderIds = new Set(data.orders.map(order => order.id));
      setPreviousOrderIds(orderIds);
    }
  }, [data?.orders]);

  // Auto-refetch every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (!isLoading) {
        // Store current order IDs before refetch
        const currentOrderIds = data?.orders 
          ? new Set(data.orders.map(order => order.id))
          : new Set();
        
        await refetch();
        
        // Check for new orders after refetch
        if (data?.orders) {
          const newOrderIds = new Set(data.orders.map(order => order.id));
          const hasNewOrders = Array.from(newOrderIds).some(id => !currentOrderIds.has(id));
          
          if (hasNewOrders && isSoundEnabled) {
            playNotificationSound();
          }
          
          // Update previous order IDs
          setPreviousOrderIds(newOrderIds);
        }
      }
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [refetch, data?.orders, isLoading, isSoundEnabled]);

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        // Reset and play
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          console.warn('Could not play notification sound:', error);
          // Fallback: Use Web Speech API as a backup notification
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('New order received');
            utterance.volume = 0.5;
            utterance.rate = 0.8;
            window.speechSynthesis.speak(utterance);
          }
        });
      } else {
        // Fallback: Use Web Speech API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance('New order received');
          utterance.volume = 0.5;
          utterance.rate = 0.8;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Manual refresh handler with sound notification check
  const handleManualRefresh = async () => {
    const currentOrderIds = data?.orders 
      ? new Set(data.orders.map(order => order.id))
      : new Set();
    
    await refetch();
    
    if (data?.orders) {
      const newOrderIds = new Set(data.orders.map(order => order.id));
      const hasNewOrders = Array.from(newOrderIds).some(id => !currentOrderIds.has(id));
      
      if (hasNewOrders && isSoundEnabled) {
        playNotificationSound();
      }
      
      setPreviousOrderIds(newOrderIds);
    }
  };

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

  // Toggle sound notification
  const toggleSound = () => {
    setIsSoundEnabled(prev => !prev);
  };

  // Company role view
  if (userRole === "company") {
    const { company } = user.employee;
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <PrintDialog open={cartPrint} onOpenChange={setCartPrint} cart={cartPrint} />
        
        {/* Optional: Add a sound toggle button */}
        <div className="flex justify-end items-center gap-2 px-4">
          <button
            onClick={toggleSound}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isSoundEnabled ? "Disable sound notifications" : "Enable sound notifications"}
          >
            {isSoundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
          </button>
          <span className="text-xs text-muted-foreground">
            Auto-refresh: 10s
          </span>
        </div>
        
        <CompanyOrdersTable
          data={data?.orders || []}
          totalCount={data?.total || 0}
          isLoading={isLoading}
          onAssignDriver={handleAssignRider}
          onStatusChange={handleUpdateStatus}
          onRefresh={handleManualRefresh}
          onRowClick={handleRowClick}
          companyId={company?.id}
          searchQuery={search}
          onSearchChange={handleSearchChange}
          enableDragDrop={true}
          enableColumnVisibility={true}
          enableRowSelection={true}
          onPrint={setCartPrint}
        />
      </div>
    );
  }
  
  // Driver role view
  if (userRole === "driver") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DriverDashboard user={user}/>
      </div>
    );
  }

  // Store role view (similar to driver)
  if (userRole === "store") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DriverDashboard user={user}/>
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <p>Welcome {user.first_name || user.email}</p>
    </div>
  );
}