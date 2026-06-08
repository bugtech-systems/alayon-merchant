// hooks/use-offline-pos.ts
import { useState, useEffect, useCallback } from 'react';
import { offlineDB } from '@/lib/db/indexeddb';
import { syncManager } from '@/lib/offline/offline-sync-manager';
import { offlineProductService } from '@/lib/offline/offline-product-service';

export function useOfflinePOS() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    syncManager.onStatusChange(setIsOnline);
    updatePendingCount();
    
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const updatePendingCount = async () => {
    const pending = await offlineDB.getPendingQueue();
    setPendingSyncCount(pending.length);
  };

  const manualSync = async () => {
    setIsSyncing(true);
    try {
      await syncManager.startSync();
      await offlineProductService.syncProducts();
    } finally {
      setIsSyncing(false);
    }
  };

  const getProducts = useCallback(async (params?: any) => {
    return await offlineProductService.getProducts(params);
  }, []);

  const getProductById = useCallback(async (id: string) => {
    return await offlineProductService.getProductById(id);
  }, []);

  const createOfflineOrder = useCallback(async (orderData: any) => {
    const offlineOrder: any = {
      id: crypto.randomUUID(),
      order_number: `OFFLINE-${Date.now()}`,
      items: orderData.items,
      customer_name: orderData.customer_name,
      table_id: orderData.table_id,
      status: 'pending_sync',
      created_at: new Date(),
      offline_created: true,
      total: orderData.total,
    };
    
    await offlineDB.saveOfflineOrder(offlineOrder);
    
    // Add to sync queue
    await offlineDB.addToQueue({
      id: crypto.randomUUID(),
      operation: 'create_order',
      data: orderData,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    });
    
    return offlineOrder;
  }, []);

  const getOfflineOrders = useCallback(async () => {
    return await offlineDB.getOfflineOrders();
  }, []);

  return {
    isOnline,
    pendingSyncCount,
    isSyncing,
    manualSync,
    getProducts,
    getProductById,
    createOfflineOrder,
    getOfflineOrders,
  };
}