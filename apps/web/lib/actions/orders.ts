// lib/actions/order.ts
'use server';

import {sdk} from '@/lib/config';
import { revalidatePath } from 'next/cache';
import { adminFetch } from '../apiClient';

export async function updateOrderStatus(id: string, status: string) {
  try {
    const response = await sdk.admin.orders.update(id, { status });
    revalidatePath('/orders');
    return { success: true, order: response.order };
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteOrder(id: string) {
  try {
    await sdk.admin.orders.delete(id);
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderShipping(id: string, shippingData: any) {
  try {
    const response = await sdk.admin.orders.update(id, { shipping_address: shippingData });
    revalidatePath('/orders');
    return { success: true, order: response.order };
  } catch (error: any) {
    console.error('Error updating shipping:', error);
    return { success: false, error: error.message };
  }
}


export async function completeOrder(order: any, stock_location_id: string) {
  try {




    console.log(stock_location_id, 'STOCK LOC')
    await updatePosOrderStatus(order?.id, 'completed')

    const response = await adminFetch(`/admin/orders/${order?.id}/fulfillments`, {
      method: 'POST',
      body: JSON.stringify({ location_id: stock_location_id, items: order?.items }),
    });

     await adminFetch(`/dashboard/orders/${order?.id}/complete`, {
      method: 'POST'
    });
    
    revalidatePath('/dashboard');
    return { success: true, data: response };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

export async function fulfillOrder(orderId: string, stock_location_id: string) {
  try {

    

    console.log(stock_location_id, 'STOCK LOC')
    const response = await adminFetch(`/dashboard/company/orders/fulfill`, {
      method: 'POST',
      body: JSON.stringify({ orderId, stock_location_id }),
    });
    
    revalidatePath('/dashboard');
    return { success: true, data: response };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}



export async function updatePosOrderStatus(orderId: string, status: string) {
  try {
    const response = await adminFetch(`/dashboard/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    
    revalidatePath('/orders');
    return { success: true, data: response };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

export async function deletePosOrder(orderId: string) {
  try {
    await adminFetch(`/admin/orders/${orderId}/cancel`, {
      method: 'POST',
    });
    
    revalidatePath('/orders');
    return { success: true };
  } catch (error) {
    console.error('Error deleting order:', error);
    return { success: false, error: 'Failed to delete order' };
  }
}

export async function deleteDraftOrder(draftOrderId: string) {
  try {
    await adminFetch(`/admin/draft-orders/${draftOrderId}`, {
      method: 'DELETE',
    });
    
    revalidatePath('/orders');
    return { success: true };
  } catch (error) {
    console.error('Error deleting draft order:', error);
    return { success: false, error: 'Failed to delete draft order' };
  }
}

export async function convertDraftToOrder(draftOrderId: string) {
  try {
    const response = await adminFetch(`/admin/draft-orders/${draftOrderId}/confirm`, {
      method: 'POST',
    });
    
    revalidatePath('/orders');
    return { success: true, data: response };
  } catch (error) {
    console.error('Error converting draft to order:', error);
    return { success: false, error: 'Failed to convert draft order' };
  }
}