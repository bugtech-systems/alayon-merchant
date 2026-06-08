// types/offline-pos.ts
export interface OfflineQueueItem {
  id: string;
  operation: 'create_order' | 'update_order' | 'sync_cart' | 'update_inventory';
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface OfflineState {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingSyncCount: number;
  syncInProgress: boolean;
}

export interface CachedProduct {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  variants: CachedVariant[];
  categories: string[];
  cached_at: number;
  updated_at: number;
}

export interface CachedVariant {
  id: string;
  title: string;
  prices: { amount: number; currency_code: string }[];
  inventory_quantity: number;
}

export interface OfflineOrder {
  id: string;
  order_number: string;
  items: OfflineOrderItem[];
  customer_id?: string;
  customer_name?: string;
  table_id?: string;
  status: 'pending_sync' | 'synced' | 'failed';
  created_at: Date;
  synced_at?: Date;
  offline_created: boolean;
  total: number;
}

export interface OfflineOrderItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  title: string;
}