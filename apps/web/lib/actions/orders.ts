// lib/actions/order.ts
'use server';

import sdk from '@/lib/config';
import { revalidatePath } from 'next/cache';

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