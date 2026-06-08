// components/medusa-offline-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { medusaOfflineDB } from '@/lib/db/medusa-offline-db';
import { medusaSyncManager } from '@/lib/offline/medusa-sync-manager';
import { Loader2 } from 'lucide-react';

interface OfflineContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  manualSync: () => Promise<void>;
  lastSyncTime: Date | null;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingSyncCount: 0,
  isSyncing: false,
  manualSync: async () => {},
  lastSyncTime: null,
});

export const useOffline = () => useContext(OfflineContext);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

export function MedusaOfflineProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await medusaOfflineDB.init();
        console.log('Offline database initialized');
        
        // Get last sync time
        const lastSync = await medusaOfflineDB.getSyncMetadata('last_sync_time');
        if (lastSync) {
          setLastSyncTime(new Date(lastSync));
        }
        
        // Set up online/offline listeners
        const handleOnline = () => {
          setIsOnline(true);
          medusaSyncManager.startSync();
        };
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);
        
        // Set up sync manager callbacks
        medusaSyncManager.onStatusChange(setIsOnline);
        
        // Start auto-sync
        medusaSyncManager.startAutoSync(5);
        
        // Initial sync
        await medusaSyncManager.startSync();
        
        // Update pending count periodically
        const updatePendingCount = async () => {
          const pending = await medusaOfflineDB.getPendingQueue();
          setPendingSyncCount(pending.length);
        };
        
        await updatePendingCount();
        const interval = setInterval(updatePendingCount, 5000);
        
        setIsInitialized(true);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          clearInterval(interval);
          medusaSyncManager.stopAutoSync();
        };
      } catch (error) {
        console.error('Failed to initialize offline database:', error);
        setIsInitialized(true);
      }
    };
    
    initialize();
  }, []);

  const manualSync = async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return;
    }
    
    setIsSyncing(true);
    try {
      await medusaSyncManager.startSync();
      const lastSync = await medusaOfflineDB.getSyncMetadata('last_sync_time');
      if (lastSync) setLastSyncTime(new Date(lastSync));
      const pending = await medusaOfflineDB.getPendingQueue();
      setPendingSyncCount(pending.length);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <OfflineContext.Provider value={{
      isOnline,
      pendingSyncCount,
      isSyncing,
      manualSync,
      lastSyncTime,
    }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </OfflineContext.Provider>
  );
}