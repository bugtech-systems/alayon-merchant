// lib/services/offline-product-service.ts
import { offlineDB } from '../db/indexeddb';
import { sdk } from '../config/medusa';
import { getAuthHeaders } from '../data/cookies';

export class OfflineProductService {
  async getProducts(params?: any) {
    try {
      // Try to fetch from API if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const { products } = await sdk.client.fetch('/store/products', {
          method: 'GET',
          query: { ...params, limit: 1000 },
          headers: await getAuthHeaders(),
        });
        
        // Cache for offline use
        await this.cacheProducts(products);
        return products;
      }
    } catch (error) {
      console.warn('Failed to fetch products online, using cache:', error);
    }
    
    // Fallback to cached products
    return await this.getCachedProducts();
  }

  async cacheProducts(products: any[]) {
    const cachedProducts = products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      thumbnail: p.thumbnail,
      variants: p.variants.map(v => ({
        id: v.id,
        title: v.title,
        prices: v.prices,
        inventory_quantity: v.inventory_quantity,
      })),
      categories: p.categories?.map(c => c.id) || [],
      cached_at: Date.now(),
      updated_at: new Date(p.updated_at).getTime(),
    }));
    
    await offlineDB.saveProducts(cachedProducts);
  }

  async getCachedProducts(): Promise<any[]> {
    return await offlineDB.getProducts();
  }

  async getProductById(id: string): Promise<any | null> {
    // Try online first
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { product } = await sdk.client.fetch(`/store/products/${id}`, {
          method: 'GET',
          headers: await getAuthHeaders(),
        });
        return product;
      } catch (error) {
        console.warn(`Failed to fetch product ${id} online, using cache`);
      }
    }
    
    // Fallback to cache
    return await offlineDB.getProductById(id);
  }

  async syncProducts() {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const lastSync = await offlineDB.getSyncMetadata('products_last_sync');
      const lastSyncTime = lastSync ? new Date(lastSync) : new Date(0);
      
      // Get updated products since last sync
      const { products } = await sdk.client.fetch('/store/products', {
        method: 'GET',
        query: { 
          limit: 1000,
          updated_at: { $gt: lastSyncTime.toISOString() }
        },
        headers: await getAuthHeaders(),
      });
      
      if (products.length > 0) {
        await this.cacheProducts(products);
        await offlineDB.updateSyncMetadata('products_last_sync', new Date().toISOString());
      }
    }
  }
}

export const offlineProductService = new OfflineProductService();