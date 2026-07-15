// lib/actions/inventory.ts
'use server';

import sdk from '@/lib/config';
import { getAuthHeaders } from '../data/cookies';
import { adminFetch } from '../apiClient';

/**
 * List inventory items with pagination and filters
 */
export async function listInventoryItems(
  limit: number = 10,
  offset: number = 0,
  filters: Record<string, any> = {}
) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      // Include only defined filters
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([_, v]) => v !== undefined && v !== null && v !== ''
        )
      ),
    });

    // Use adminFetch for authenticated requests
    const response = await adminFetch(
      `/admin/inventory-items?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

    // Map response (adjust based on your actual API response structure)
    const inventoryItems = response.inventory_items || response.items || [];
    const count = response.count || response.total || inventoryItems.length;

    return {
      items: inventoryItems,
      count,
      page: Math.floor(offset / limit) + 1,
      total_pages: Math.ceil(count / limit),
      has_next: offset + limit < count,
      has_previous: offset > 0,
    };
  } catch (error) {
    console.error('Error listing inventory items:', error);
    throw error;
  }
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(data: any) {
  try {
    const response = await adminFetch(`/admin/inventory-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return {
      success: true,
      inventoryItem: response.inventory_item || response.item,
    };
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return {
      success: false,
      error: error.message || 'Failed to create inventory item',
    };
  }
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(id: string, data: any) {
  try {
    const response = await adminFetch(`/admin/inventory-items/${id}`, {
      method: 'POST', // Medusa v2 uses POST for updates with _method=PUT or just PUT
      // Some APIs use PUT; adjust if needed
      body: JSON.stringify(data),
    });

    return {
      success: true,
      inventoryItem: response.inventory_item || response.item,
    };
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    return {
      success: false,
      error: error.message || 'Failed to update inventory item',
    };
  }
}

/**
 * Delete an inventory item
 */
export async function deleteInventoryItem(id: string) {
  try {
    // Use adminFetch for DELETE
    await adminFetch(`/admin/inventory-items/${id}`, {
      method: 'DELETE',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete inventory item',
    };
  }
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItem(id: string) {
  try {
    const response = await adminFetch(`/admin/inventory-items/${id}`, {
      method: 'GET',
    });

    return {
      success: true,
      inventoryItem: response.inventory_item || response.item,
    };
  } catch (error: any) {
    console.error('Error getting inventory item:', error);
    return {
      success: false,
      error: error.message || 'Failed to get inventory item',
    };
  }
}

/**
 * Bulk update inventory levels (e.g., adjust stock)
 */
export async function bulkUpdateInventoryLevels(updates: Array<{
  inventory_item_id: string;
  location_id: string;
  quantity: number;
}>) {
  try {
    const response = await adminFetch(`/admin/inventory-items/bulk-update`, {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });

    return {
      success: true,
      results: response.results || response,
    };
  } catch (error: any) {
    console.error('Error bulk updating inventory levels:', error);
    return {
      success: false,
      error: error.message || 'Failed to update inventory levels',
    };
  }
}

/**
 * List inventory levels for a specific inventory item
 */
export async function listInventoryLevels(
  inventoryItemId: string,
  filters: Record<string, any> = {}
) {
  try {
    const queryParams = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters).filter(
          ([_, v]) => v !== undefined && v !== null && v !== ''
        )
      ),
    });

    const response = await adminFetch(
      `/admin/inventory-items/${inventoryItemId}/levels?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

    return {
      success: true,
      levels: response.inventory_levels || response.levels || [],
    };
  } catch (error: any) {
    console.error('Error listing inventory levels:', error);
    return {
      success: false,
      error: error.message || 'Failed to list inventory levels',
    };
  }
}

/**
 * Update inventory level for a specific item and location
 */
export async function updateInventoryLevel(
  inventoryItemId: string,
  locationId: string,
  quantity: number
) {
  try {
    const response = await adminFetch(
      `/admin/inventory-items/${inventoryItemId}/levels/${locationId}`,
      {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      }
    );

    return {
      success: true,
      level: response.inventory_level || response.level,
    };
  } catch (error: any) {
    console.error('Error updating inventory level:', error);
    return {
      success: false,
      error: error.message || 'Failed to update inventory level',
    };
  }
}