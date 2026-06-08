// hooks/use-offline-data.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineDB } from '@/lib/db/indexeddb';
import { syncManager } from '@/lib/offline/offline-sync-manager';
import { sdk } from '@/lib/config';
import { getAuthHeaders } from '@/lib/data/cookies';

export function useOfflineData<T>(
  key: string[],
  onlineFetcher: () => Promise<T>,
  options?: { staleTime?: number; enabled?: boolean }
) {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineData, setOfflineData] = useState<T | null>(null);

  useEffect(() => {
    syncManager.onStatusChange(setIsOnline);
  }, []);

  // Try to get data from cache first
  const { data: onlineData, isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (isOnline) {
        try {
          const data = await onlineFetcher();
          // Cache in IndexedDB
          await cacheData(key.join('_'), data);
          return data;
        } catch (error) {
          // Fallback to cached data
          const cached = await getCachedData<T>(key.join('_'));
          if (cached) return cached;
          throw error;
        }
      } else {
        // Offline: return cached data
        const cached = await getCachedData<T>(key.join('_'));
        if (cached) return cached;
        throw new Error('No cached data available offline');
      }
    },
    enabled: options?.enabled !== false,
    staleTime: options?.staleTime || 5 * 60 * 1000,
  });

  const cacheData = async (cacheKey: string, data: T) => {
    const cache = {
      key: cacheKey,
      data,
      timestamp: Date.now(),
    };
    await offlineDB.updateSyncMetadata(cacheKey, cache);
  };

  const getCachedData = async <T>(cacheKey: string): Promise<T | null> => {
    const cached = await offlineDB.getSyncMetadata(cacheKey);
    return cached?.data || null;
  };

  return {
    data: onlineData || offlineData,
    isLoading,
    error,
    isOnline,
    refetch,
  };
}

// Hook for offline mutations
export function useOfflineMutation<TVariables, TData>(
  mutationKey: string,
  onlineMutator: (variables: TVariables) => Promise<TData>
) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    syncManager.onStatusChange(setIsOnline);
  }, []);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      if (isOnline) {
        // Online: execute normally
        const result = await onlineMutator(variables);
        // Invalidate relevant queries
        await queryClient.invalidateQueries({ queryKey: [mutationKey] });
        return result;
      } else {
        // Offline: queue for later sync
        const queueItem: OfflineQueueItem = {
          id: crypto.randomUUID(),
          operation: mutationKey as any,
          data: variables,
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
        };
        await offlineDB.addToQueue(queueItem);
        
        // Store in offline orders
        if (mutationKey === 'create_order') {
          const offlineOrder: OfflineOrder = {
            id: crypto.randomUUID(),
            order_number: `OFFLINE-${Date.now()}`,
            items: (variables as any).items,
            status: 'pending_sync',
            created_at: new Date(),
            offline_created: true,
            total: (variables as any).total,
          };
          await offlineDB.saveOfflineOrder(offlineOrder);
        }
        
        return { success: true, offline: true, message: 'Saved for sync when online' };
      }
    },
  });

  return mutation;
}