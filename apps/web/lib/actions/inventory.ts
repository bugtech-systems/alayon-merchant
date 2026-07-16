// lib/actions/inventory.ts
'use server';

import { revalidatePath } from 'next/cache';
import { sdk } from '../config';
import { adminFetch } from '../apiClient';
import { getAuthHeaders } from '../data/cookies';

// ---------- Types ----------
export interface InventoryItem {
  id: string;
  sku: string;
  title?: string;
  description?: string;
  requires_shipping?: boolean;
  thumbnail?: string;
  origin_country?: string;
  metadata?: Record<string, any>;
  location_levels?: InventoryLevel[];
  created_at?: string;
  updated_at?: string;
}

export interface InventoryLevel {
  id: string;
  inventory_item_id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
  incoming_quantity: number;
  available_quantity: number;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  offset: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------- Helper Functions ----------

function extractErrorMessage(error: any): string {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

function transformInventoryItem(item: any): InventoryItem {
  return {
    id: item.id,
    sku: item.sku || '',
    title: item.title || item.sku || 'Untitled',
    description: item.description || '',
    requires_shipping: item.requires_shipping ?? true,
    thumbnail: item.thumbnail || undefined,
    origin_country: item.origin_country || undefined,
    metadata: item.metadata || {},
    location_levels: item.location_levels || [],
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

function transformInventoryLevel(level: any): InventoryLevel {
  return {
    id: level.id,
    inventory_item_id: level.inventory_item_id,
    location_id: level.location_id,
    stocked_quantity: level.stocked_quantity || 0,
    reserved_quantity: level.reserved_quantity || 0,
    incoming_quantity: level.incoming_quantity || 0,
    available_quantity: level.available_quantity || 0,
    metadata: level.metadata || {},
  };
}

function revalidateInventoryCache() {
  revalidatePath('/dashboard/inventory');
  revalidatePath('/admin/inventory');
}

/**
 * Filter items by metadata fields
 */
function filterByMetadata(
  items: any[],
  metadataFilters: Record<string, any>
): any[] {
  if (!items.length || !Object.keys(metadataFilters).length) {
    return items;
  }

  return items.filter((item) => {
    const metadata = item.metadata || {};
    
    return Object.entries(metadataFilters).every(([key, value]) => {
      // Skip undefined/null/empty filter values
      if (value === undefined || value === null || value === '') {
        return true;
      }
      
      const metadataValue = metadata[key];
      
      // Handle array of values (e.g., multiple location_ids)
      if (Array.isArray(value)) {
        return value.includes(metadataValue);
      }
      
      // Handle string/number comparison (loose equality for type coercion)
      return metadataValue == value;
    });
  });
}


// ---------- Core API Functions ----------


export async function listInventoryItems(
  limit: number = 10,
  offset: number = 0,
  filters: Record<string, any> = {}
): Promise<PaginatedResponse<InventoryItem>> {
  try {
    // Separate metadata filters from standard API filters
    const metadataFields = ['location_id', 'company_id', 'category', 'brand', 'supplier'];
    const metadataFilters: Record<string, any> = {};
    const standardFilters: Record<string, any> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (metadataFields.includes(key)) {
        metadataFilters[key] = value;
      } else {
        standardFilters[key] = value;
      }
    });

    // Build query params with ONLY standard filters (no metadata)
    const queryParams: Record<string, any> = {};
    
    // Add standard filters
    Object.entries(standardFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = value;
      }
    });

    // If we have metadata filters, fetch ALL items (up to a reasonable limit)
    // to perform client-side filtering
    if (Object.keys(metadataFilters).length > 0) {
      queryParams.limit = 1000; // Fetch more items for filtering
      queryParams.offset = 0;   // Start from beginning
    } else {
      queryParams.limit = limit;
      queryParams.offset = offset;
    }

    let response;
    
    try {
      // Use SDK client.fetch
      response = await sdk.client.fetch(`/admin/inventory-items`, {
        method: 'GET',
        query: queryParams,
      });
    } catch (sdkError) {
      console.warn('SDK fetch failed, trying direct API call:', sdkError);
      
      // Fallback to direct fetch
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const queryString = new URLSearchParams();
      
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryString.append(key, String(value));
        }
      });
      
      const fetchResponse = await fetch(
        `${baseUrl}/admin/inventory-items?${queryString.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      response = await fetchResponse.json();
    }

    let inventoryItems = response.inventory_items || response.items || [];
    
    // Apply metadata filters client-side
    if (Object.keys(metadataFilters).length > 0) {
      inventoryItems = filterByMetadata(inventoryItems, metadataFilters);
      
      // Apply pagination after filtering
      const totalFilteredCount = inventoryItems.length;
      const paginatedItems = inventoryItems.slice(offset, offset + limit);
      
      return {
        items: paginatedItems.map(transformInventoryItem),
        count: totalFilteredCount,
        offset,
        limit,
      };
    }

    // No metadata filters, return as-is
    const count = response.count || inventoryItems.length;

    return {
      items: inventoryItems.map(transformInventoryItem),
      count,
      offset,
      limit,
    };
  } catch (error: any) {
    console.error('Error listing inventory items:', error);
    throw new Error(`Failed to list inventory items: ${extractErrorMessage(error)}`);
  }
}

// ... rest of the functions remain the same

/**
 * Get a single inventory item
 */
export async function getInventoryItem(id: string): Promise<ApiResponse<InventoryItem>> {
  try {
    let response;
    
    try {
      response = await sdk.client.fetch(`/admin/inventory-items/${id}`, {
        method: 'GET',
      });
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const fetchResponse = await fetch(`${baseUrl}/admin/inventory-items/${id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      response = await fetchResponse.json();
    }

    const inventoryItem = response.inventory_item || response.item;

    if (!inventoryItem) {
      return { success: false, error: 'Inventory item not found' };
    }

    return {
      success: true,
      data: transformInventoryItem(inventoryItem),
    };
  } catch (error: any) {
    console.error(`Error getting inventory item ${id}:`, error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

export async function fetchInventoryItemsByLocation(
  locationId: string,
  params?: {
    limit?: number;
    offset?: number;
    fields?: string; // override the fields string if needed
  } 
): Promise<any> {
  const {
    limit = 10000,
    offset = 0,
    fields = "id,title,sku,hs_code,location_levels", // include location levels to get stock qty
  } = params || {};

  const headers = await getAuthHeaders();

  const { inventory_items } = await sdk.admin.inventoryItem.list(
    {
        location_levels: {
          stock_location_id: locationId,
        },
        limit,
        offset
    },
    {
       limit,
       offset,
      headers,
      fields, // tells the API which fields to return
    }
  );

  return inventory_items;
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(data: {
  sku: string;
  title?: string;
  description?: string;
  requires_shipping?: boolean;
  origin_country?: string;
  metadata?: Record<string, any>;
}): Promise<ApiResponse<InventoryItem>> {
  try {
    if (!data.sku?.trim()) {
      return { success: false, error: 'SKU is required' };
    }

    const payload = {
      sku: data.sku.trim(),
      title: data.title?.trim() || data.sku.trim(),
      description: data.description?.trim() || '',
      requires_shipping: data.requires_shipping ?? true,
      origin_country: data.origin_country || '',
      metadata: data.metadata || {},
    };

    let response;
    
    try {
      response = await sdk.client.fetch('/admin/inventory-items', {
        method: 'POST',
        body: payload,
      });
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const fetchResponse = await fetch(`${baseUrl}/admin/inventory-items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      response = await fetchResponse.json();
    }

    const inventoryItem = response.inventory_item || response.item;

    if (!inventoryItem) {
      return { success: false, error: 'Failed to create inventory item' };
    }

    revalidateInventoryCache();

    return {
      success: true,
      data: transformInventoryItem(inventoryItem),
      message: 'Inventory item created successfully',
    };
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(
  id: string,
  data: {
    sku?: string;
    title?: string;
    description?: string;
    requires_shipping?: boolean;
    origin_country?: string;
    metadata?: Record<string, any>;
  }
): Promise<ApiResponse<InventoryItem>> {
  try {
    if (!id) {
      return { success: false, error: 'Inventory item ID is required' };
    }

    const payload: any = {};
    if (data.sku !== undefined) payload.sku = data.sku.trim();
    if (data.title !== undefined) payload.title = data.title.trim();
    if (data.description !== undefined) payload.description = data.description.trim();
    if (data.requires_shipping !== undefined) payload.requires_shipping = data.requires_shipping;
    if (data.origin_country !== undefined) payload.origin_country = data.origin_country;
    if (data.metadata !== undefined) payload.metadata = data.metadata;

    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'No data provided for update' };
    }

    let response;
    
    try {
      response = await sdk.client.fetch(`/admin/inventory-items/${id}`, {
        method: 'POST',
        body: payload,
      });
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const fetchResponse = await fetch(`${baseUrl}/admin/inventory-items/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      response = await fetchResponse.json();
    }

    const inventoryItem = response.inventory_item || response.item;

    if (!inventoryItem) {
      return { success: false, error: 'Failed to update inventory item' };
    }

    revalidateInventoryCache();

    return {
      success: true,
      data: transformInventoryItem(inventoryItem),
      message: 'Inventory item updated successfully',
    };
  } catch (error: any) {
    console.error(`Error updating inventory item ${id}:`, error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string): Promise<ApiResponse<null>> {
  try {
    if (!id) {
      return { success: false, error: 'Inventory item ID is required' };
    }

    try {
      await sdk.client.fetch(`/admin/inventory-items/${id}`, {
        method: 'DELETE',
      });
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      await fetch(`${baseUrl}/admin/inventory-items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
        },
      });
    }

    revalidateInventoryCache();

    return {
      success: true,
      message: 'Inventory item deleted successfully',
    };
  } catch (error: any) {
    console.error(`Error deleting inventory item ${id}:`, error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * List inventory levels for an item
 */
export async function listInventoryLevels(
  inventoryItemId: string
): Promise<ApiResponse<InventoryLevel[]>> {
  try {
    if (!inventoryItemId) {
      return { success: false, error: 'Inventory item ID is required' };
    }

    let response;
    
    try {
      response = await sdk.client.fetch(
        `/admin/inventory-items/${inventoryItemId}/location-levels`,
        { method: 'GET' }
      );
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const fetchResponse = await fetch(
        `${baseUrl}/admin/inventory-items/${inventoryItemId}/location-levels`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      response = await fetchResponse.json();
    }

    const levels = response.location_levels || response.inventory_levels || [];

    return {
      success: true,
      data: levels.map(transformInventoryLevel),
    };
  } catch (error: any) {
    console.error(`Error listing inventory levels:`, error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Update inventory level (stock management)
 */
export async function updateInventoryLevel(
  inventoryItemId: string,
  locationId: string,
  data: {
    stocked_quantity?: number;
    reserved_quantity?: number;
    incoming_quantity?: number;
  }
): Promise<ApiResponse<InventoryLevel>> {
  try {
    if (!inventoryItemId || !locationId) {
      return { success: false, error: 'Inventory item ID and Location ID are required' };
    }

    const payload: any = {};
    if (data.stocked_quantity !== undefined) payload.stocked_quantity = Math.max(0, data.stocked_quantity);
    if (data.reserved_quantity !== undefined) payload.reserved_quantity = Math.max(0, data.reserved_quantity);
    if (data.incoming_quantity !== undefined) payload.incoming_quantity = Math.max(0, data.incoming_quantity);

    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'No quantity data provided' };
    }

    let response;
    
    try {
      response = await sdk.client.fetch(
        `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
        {
          method: 'POST',
          body: payload,
        }
      );
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const fetchResponse = await fetch(
        `${baseUrl}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      response = await fetchResponse.json();
    }

    const level = response.location_level || response.inventory_level;

    if (!level) {
      return { success: false, error: 'Failed to update inventory level' };
    }

    revalidateInventoryCache();

    return {
      success: true,
      data: transformInventoryLevel(level),
      message: 'Stock updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating inventory level:', error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Bulk delete inventory items
 */
export async function bulkDeleteInventoryItems(ids: string[]): Promise<ApiResponse<any>> {
  try {
    if (!ids?.length) {
      return { success: false, error: 'No IDs provided' };
    }

    const results = await Promise.allSettled(ids.map(id => deleteInventoryItem(id)));
    
    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful.push(ids[index]);
      } else {
        failed.push({
          id: ids[index],
          error: result.status === 'fulfilled' ? result.value.error || 'Error' : 'Failed',
        });
      }
    });

    return {
      success: failed.length === 0,
      data: { successful, failed },
      message: `${successful.length} deleted, ${failed.length} failed`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Create inventory level for an item at a location
 */
export async function createInventoryLevel(
  inventoryItemId: string,
  locationId: string,
  data: {
    stocked_quantity?: number;
    reserved_quantity?: number;
    incoming_quantity?: number;
  }
): Promise<ApiResponse<InventoryLevel>> {
  try {
    if (!inventoryItemId || !locationId) {
      return { success: false, error: 'Inventory item ID and Location ID are required' };
    }

    const payload = {
      location_id: locationId,
      stocked_quantity: data.stocked_quantity ?? 0,
      reserved_quantity: data.reserved_quantity ?? 0,
      incoming_quantity: data.incoming_quantity ?? 0,
    };

    let response;
    
    try {
      response = await sdk.client.fetch(
        `/admin/inventory-items/${inventoryItemId}/location-levels`,
        {
          method: 'POST',
          body: payload,
        }
      );
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      const fetchResponse = await fetch(
        `${baseUrl}/admin/inventory-items/${inventoryItemId}/location-levels`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      response = await fetchResponse.json();
    }

    const level = response.location_level || response.inventory_level;

    if (!level) {
      return { success: false, error: 'Failed to create inventory level' };
    }

    return {
      success: true,
      data: transformInventoryLevel(level),
      message: 'Inventory level created successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Delete an inventory level
 */
export async function deleteInventoryLevel(
  inventoryItemId: string,
  locationId: string
): Promise<ApiResponse<null>> {
  try {
    if (!inventoryItemId || !locationId) {
      return { success: false, error: 'IDs required' };
    }

    try {
      await sdk.client.fetch(
        `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
        { method: 'DELETE' }
      );
    } catch (sdkError) {
      const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
      await fetch(
        `${baseUrl}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.MEDUSA_ADMIN_API_KEY}`,
          },
        }
      );
    }

    return {
      success: true,
      message: 'Inventory level deleted',
    };
  } catch (error: any) {
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}