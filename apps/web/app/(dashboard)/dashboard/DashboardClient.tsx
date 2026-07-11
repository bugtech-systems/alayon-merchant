// app/dashboard/DashboardClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import DriverDashboard from "./rider/page";
import { CompanyOrdersTable } from "@/components/company-orders-table/table";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMedusaOrders } from "@/hooks/useMedusaOrders";
import { assignDriverToOrder, unassignDriverToOrder } from "@/lib/data";
import { PrintDialog } from "@/app/pos/_components/print-dialog";

interface DashboardClientProps {
  user: any;
  userRole: string;
}

export function DashboardClient({ user, userRole }: DashboardClientProps) {
  const [cartPrint, setCartPrint] = useState(null);
  const [previousOrderCount, setPreviousOrderCount] = useState<number>(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousOrderCountRef = useRef<number>(0); // Use ref to track count without re-renders
  
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
    // Try multiple audio formats for better compatibility
    const audioExtensions = ['mp3', 'wav', 'ogg'];
    let currentAudio: HTMLAudioElement | null = null;
    
    // Try to load the audio file
    const loadAudio = (extension: string) => {
      try {
        const audio = new Audio(`/notification.${extension}`);
        audio.volume = 1.0;
        audio.preload = 'auto';
        
        // Check if audio can be loaded
        audio.addEventListener('canplaythrough', () => {
          console.log(`Audio loaded successfully (${extension})`);
          setIsSoundLoaded(true);
          setAudioError(null);
          audioRef.current = audio;
        });
        
        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load audio (${extension}):`, e);
          // Try next format
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
    
    // Start loading with first format
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
      // Only update if count changed
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

    // Try multiple methods to play sound
    const playMethods = [
      // Method 1: Use the audio element
      () => {
        if (audioRef.current && isSoundLoaded) {
          console.log('Method 1: Playing via audio element');
          audioRef.current.currentTime = 0;
          return audioRef.current.play();
        }
        return Promise.reject('Audio element not available');
      },
      
      // Method 2: Create a new audio element
      () => {
        console.log('Method 2: Creating new audio element');
        const audio = new Audio('/notification.mp3');
        audio.volume = 1.0;
        return audio.play();
      },
      
      // Method 3: Use Web Speech API
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

    // Try each method in sequence
    for (let i = 0; i < playMethods.length; i++) {
      try {
        const result = await playMethods[i]();
        console.log(`Sound played successfully using method ${i + 1}:`, result);
        return true;
      } catch (error) {
        console.warn(`Method ${i + 1} failed:`, error);
        // Continue to next method
      }
    }

    // If all methods fail, use the simplest fallback
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

  // Auto-refetch every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (!isLoading && data?.orders) {
        // Get current count from the ref (most up-to-date)
        const currentOrderCount = previousOrderCountRef.current;
        
        console.log(`Auto-refresh: Checking for new orders... Current count: ${currentOrderCount}`);
        
        // Store the current data before refetch
        const currentData = data;
        
        // Refetch data
        const result = await refetch();
        
        // Get the new data from the result
        if (result.data?.orders) {
          const newOrderCount = result.data.orders.length;
          console.log(`Auto-refresh: New count: ${newOrderCount}, Previous count: ${currentOrderCount}`);
          
          // Check if there are new orders (count increased)
          if (newOrderCount > currentOrderCount) {
            console.log(`New order detected! Playing notification... (${currentOrderCount} -> ${newOrderCount})`);
            if (isSoundEnabled) {
              await playNotificationSound();
            }
          }
          
          // Update the ref with the new count
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
      // Temporarily enable sound to test
      console.log('Sound was disabled, enabling temporarily for test');
      setIsSoundEnabled(true);
      setTimeout(async () => {
        await playNotificationSound();
        // Don't revert - let user decide if they want to keep it on
      }, 100);
    }
  }, [isSoundEnabled, playNotificationSound]);

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
        
        {/* Sound control and test buttons */}
        <div className="flex justify-end items-center gap-3 px-4">
          <button
            onClick={handleTestNotification}
            className="text-sm px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
            aria-label="Test notification sound"
          >
            🔊 Test Sound
          </button>
          <button
            onClick={toggleSound}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isSoundEnabled ? "Disable sound notifications" : "Enable sound notifications"}
          >
            {isSoundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
          </button>
          <span className="text-xs text-muted-foreground">
            {isSoundLoaded ? '✅ Sound Ready' : '⏳ Loading Sound...'}
          </span>
          {audioError && (
            <span className="text-xs text-red-500">
              ⚠️ {audioError}
            </span>
          )}
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