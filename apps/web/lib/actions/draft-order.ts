"use server"

// lib/actions/draft-order.ts
import { sdk } from '@/lib/config';
import { revalidateTag } from 'next/cache';
import { getAuthHeaders, getCacheHeaders } from '../data/cookies';

interface DraftOrderItem {
  variant_id?: string;
  title?: string;
  quantity: number;
  unit_price?: number;
}

interface ShippingAddress {
  address_1: string;
  address_2?: string;
  city: string;
  country_code: string;
  province?: string;
  postal_code: string;
  phone?: string;
}

interface CreateDraftOrderInput {
  email: string;
  region_id: string;
  sales_channel_id?: string;
  customer_id?: string;
  items: DraftOrderItem[];
  shipping_method: {
    option_id: string;
    price?: number;
  };
  shipping_address: ShippingAddress;
  billing_address?: ShippingAddress;
  discount_code?: string;
  no_notification?: boolean;
}

interface DraftOrderResponse {
  draft_order: {
    id: string;
    display_id: number;
    email: string;
    status: string;
    cart_id: string;
    created_at: string;
    updated_at: string;
  };
}

export async function createDraftOrder(orderData: CreateDraftOrderInput) {
  try {
    const response = await sdk.client.fetch(
      `/admin/draft-orders`,
      {
        method: 'POST',
        body: JSON.stringify(orderData),
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("draft-orders")),
        },
      }
    ) as any;
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create draft order');
    }
    
    const { draft_order } = await response.json();
    
    revalidateTag("draft-orders-list", "max");
    revalidateTag("draft-order-details", "max");
    
    return draft_order;
  } catch (error) {
    console.error('Error creating draft order:', error);
    return null;
  }
}

export async function updateDraftOrder(
  draftOrderId: string, 
  updateData: Partial<CreateDraftOrderInput>
) {
  try {
    const response = await sdk.client.fetch(
      `/admin/draft-orders/${draftOrderId}`,
      {
        method: 'POST',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("draft-orders")),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update draft order');
    }
    
    revalidateTag("draft-orders-list", "max");
    revalidateTag(`draft-order-${draftOrderId}`, "max");
    
    return true;
  } catch (error) {
    console.error('Error updating draft order:', error);
    return false;
  }
}

export async function deleteDraftOrder(draftOrderId: string) {
  try {
    const response = await sdk.client.fetch(
      `/admin/draft-orders/${draftOrderId}`,
      {
        method: 'DELETE',
        headers: {
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("draft-orders")),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to delete draft order');
    }
    
    revalidateTag("draft-orders-list", "max");
    
    return true;
  } catch (error) {
    console.error('Error deleting draft order:', error);
    return false;
  }
}

export async function sendDraftOrderInvoice(draftOrderId: string) {
  try {
    const response = await sdk.client.fetch(
      `/admin/draft-orders/${draftOrderId}/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("draft-orders")),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to send draft order invoice');
    }
    
    return true;
  } catch (error) {
    console.error('Error sending draft order invoice:', error);
    return false;
  }
}

export async function markDraftOrderAsPaid(draftOrderId: string) {
  try {
    const response = await sdk.client.fetch(
      `/admin/draft-orders/${draftOrderId}/pay`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("draft-orders")),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to mark draft order as paid');
    }
    
    revalidateTag("draft-orders-list", "max");
    revalidateTag(`draft-order-${draftOrderId}`, "max");
    
    return true;
  } catch (error) {
    console.error('Error marking draft order as paid:', error);
    return false;
  }
}

export async function getDraftOrders() {
  try {
    const response = await sdk.client.fetch(`/admin/draft-orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
        ...(await getCacheHeaders("draft-orders-list")),
      },
    }) as any;
    
    if (!response.ok) {
      throw new Error('Failed to fetch draft orders');
    }
    
    const { draft_orders } = await response.json();
    return draft_orders;
  } catch (error) {
    console.error('Error fetching draft orders:', error);
    return [];
  }
}

