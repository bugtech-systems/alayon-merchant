// lib/db/medusa-offline-db.ts
import { DBSchema, openDB, IDBPDatabase } from 'idb';

interface MedusaOfflineDB extends DBSchema {
  products: {
    key: string;
    value: {
      id: string;
      title: string;
      description: string | null;
      thumbnail: string | null;
      variants: any[];
      categories: string[];
      cached_at: number;
      updated_at: number;
    };
    indexes: {
      'by-category': string[];
      'by-updated': number;
    };
  };
  categories: {
    key: string;
    value: {
      id: string;
      name: string;
      handle: string;
      parent_category_id: string | null;
      cached_at: number;
    };
  };
  queue: {
    key: number;
    value: {
      id: string;
      operation: 'create_order' | 'update_cart' | 'sync_cart';
      data: any;
      timestamp: number;
      retryCount: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      error?: string;
    };
    indexes: {
      'by-status': string;
      'by-timestamp': number;
    };
  };
  offline_orders: {
    key: string;
    value: {
      id: string;
      order_number: string;
      items: any[];
      customer_id?: string;
      customer_name?: string;
      table_id?: string;
      status: 'pending_sync' | 'synced' | 'failed';
      created_at: Date;
      synced_at?: Date;
      total: number;
    };
    indexes: {
      'by-status': string;
      'by-created': Date;
    };
  };
  sync_metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updated_at: number;
    };
  };
}

class MedusaOfflineDB {
  private db: IDBPDatabase<MedusaOfflineDB> | null = null;
  private static instance: MedusaOfflineDB;

  static getInstance(): MedusaOfflineDB {
    if (!MedusaOfflineDB.instance) {
      MedusaOfflineDB.instance = new MedusaOfflineDB();
    }
    return MedusaOfflineDB.instance;
  }

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<MedusaOfflineDB>('medusa-pos-offline', 1, {
      upgrade(db) {
        // Products store
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-category', 'categories', { multiEntry: true });
        productStore.createIndex('by-updated', 'updated_at');

        // Categories store
        const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
        categoryStore.createIndex('by-parent', 'parent_category_id');

        // Queue store
        const queueStore = db.createObjectStore('queue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        queueStore.createIndex('by-status', 'status');
        queueStore.createIndex('by-timestamp', 'timestamp');

        // Offline orders store
        const orderStore = db.createObjectStore('offline_orders', { keyPath: 'id' });
        orderStore.createIndex('by-status', 'status');
        orderStore.createIndex('by-created', 'created_at');

        // Sync metadata store
        db.createObjectStore('sync_metadata', { keyPath: 'key' });
      },
    });
  }

  async saveProducts(products: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('products', 'readwrite');
    const store = tx.objectStore('products');
    
    for (const product of products) {
      await store.put({
        id: product.id,
        title: product.title,
        description: product.description,
        thumbnail: product.thumbnail,
        variants: product.variants,
        categories: product.categories?.map((c: any) => c.id) || [],
        cached_at: Date.now(),
        updated_at: new Date(product.updated_at).getTime(),
      });
    }
    await tx.done;
  }

  async getProducts(): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('products');
  }

  async getProductById(id: string): Promise<any | null> {
    if (!this.db) await this.init();
    return await this.db!.get('products', id);
  }

  async saveCategories(categories: any[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    
    for (const category of categories) {
      await store.put({
        id: category.id,
        name: category.name,
        handle: category.handle,
        parent_category_id: category.parent_category_id,
        cached_at: Date.now(),
      });
    }
    await tx.done;
  }

  async getCategories(): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAll('categories');
  }

  async addToQueue(operation: Omit<MedusaOfflineDB['queue']['value'], 'id'>): Promise<number> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('queue', 'readwrite');
    const id = await tx.store.add({
      ...operation,
      retryCount: 0,
      status: 'pending',
    });
    await tx.done;
    return id as number;
  }

  async getPendingQueue(): Promise<MedusaOfflineDB['queue']['value'][]> {
    if (!this.db) await this.init();
    const index = this.db!.transaction('queue').store.index('by-status');
    return await index.getAll('pending');
  }

  async updateQueueItem(id: number, updates: Partial<MedusaOfflineDB['queue']['value']>): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('queue', 'readwrite');
    const item = await tx.store.get(id);
    if (item) {
      await tx.store.put({ ...item, ...updates });
    }
    await tx.done;
  }

  async saveOfflineOrder(order: MedusaOfflineDB['offline_orders']['value']): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('offline_orders', order);
  }

  async getOfflineOrders(status?: string): Promise<MedusaOfflineDB['offline_orders']['value'][]> {
    if (!this.db) await this.init();
    if (status) {
      const index = this.db!.transaction('offline_orders').store.index('by-status');
      return await index.getAll(status);
    }
    return await this.db!.getAll('offline_orders');
  }

  async updateSyncMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('sync_metadata', { key, value, updated_at: Date.now() });
  }

  async getSyncMetadata(key: string): Promise<any> {
    if (!this.db) await this.init();
    const result = await this.db!.get('sync_metadata', key);
    return result?.value;
  }
}

export const medusaOfflineDB = MedusaOfflineDB.getInstance();