// lib/offline/medusa-sync-manager.ts
import { medusaOfflineDB } from '../db/medusa-offline-db';
import { sdk } from '@/lib/config';
import { getAuthHeaders } from '../data/cookies';

class MedusaSyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private listeners: ((isOnline: boolean) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private handleOnline() {
    console.log('Online - Starting sync');
    this.notifyListeners(true);
    this.startSync();
  }

  private handleOffline() {
    console.log('Offline - Operating in offline mode');
    this.notifyListeners(false);
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  onStatusChange(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    callback(typeof navigator !== 'undefined' ? navigator.onLine : true);
  }

  async startSync() {
    if (this.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    this.isSyncing = true;
    console.log('Starting Medusa offline sync...');

    try {
      await this.syncPendingOrders();
      await this.processQueue();
      await this.syncProductsAndCategories();
      
      await medusaOfflineDB.updateSyncMetadata('last_sync_time', new Date().toISOString());
      console.log('Medusa offline sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncPendingOrders() {
    const offlineOrders = await medusaOfflineDB.getOfflineOrders('pending_sync');
    
    for (const order of offlineOrders) {
      try {
        // Create draft order in Medusa
        const draftOrder = await sdk.admin.draftOrder.create({
          email: order.customer_name || 'offline@example.com',
          region_id: 'reg_01', // Get from cache
          items: order.items.map((item: any) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        }, await getAuthHeaders());
        
        order.status = 'synced';
        order.synced_at = new Date();
        await medusaOfflineDB.saveOfflineOrder(order);
        
      } catch (error) {
        console.error(`Failed to sync order ${order.id}:`, error);
        order.status = 'failed';
        await medusaOfflineDB.saveOfflineOrder(order);
      }
    }
  }

  private async processQueue() {
    const pendingItems = await medusaOfflineDB.getPendingQueue();
    
    for (const item of pendingItems) {
      try {
        switch (item.operation) {
          case 'create_order':
            // Process order creation
            break;
          case 'update_cart':
            // Process cart update
            break;
        }
        
        await medusaOfflineDB.updateQueueItem(item.id as number, { 
          status: 'completed',
        });
      } catch (error) {
        console.error(`Failed to process queue item ${item.id}:`, error);
        await medusaOfflineDB.updateQueueItem(item.id as number, { 
          status: 'failed',
          error: error.message,
          retryCount: item.retryCount + 1,
        });
      }
    }
  }

  private async syncProductsAndCategories() {
    const lastSync = await medusaOfflineDB.getSyncMetadata('products_last_sync');
    const lastSyncTime = lastSync ? new Date(lastSync) : new Date(0);
    
    try {
      // Sync products
      const { products } = await sdk.client.fetch('/store/products', {
        method: 'GET',
        query: { 
          limit: 1000,
          offset: 0,
          fields: '*variants.calculated_price'
        },
        headers: await getAuthHeaders(),
      });
      
      await medusaOfflineDB.saveProducts(products);
      await medusaOfflineDB.updateSyncMetadata('products_last_sync', new Date().toISOString());
      
      // Sync categories
      const { product_categories } = await sdk.store.category.list({}, await getAuthHeaders());
      await medusaOfflineDB.saveCategories(product_categories);
      
    } catch (error) {
      console.error('Failed to sync products:', error);
    }
  }

  startAutoSync(intervalMinutes: number = 5) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.startSync(), intervalMinutes * 60 * 1000);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const medusaSyncManager = new MedusaSyncManager();