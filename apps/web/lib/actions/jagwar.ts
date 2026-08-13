// lib/actions/jagwar.ts
'use server';

import { adminFetch } from '../apiClient';
import { revalidatePath } from 'next/cache';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface JagwarCustomerDashboard {
  customer: {
    id: string;
    email: string;
    name: string;
  };
  financial: {
    credit_limit: number;
    current_balance: number;
    total_orders: number;
  };
  containers: {
    borrowed_own: number;
    returned_other: number;
  };
  rewards: {
    refill_credit_balance: number;
    total_earned: number;
    total_used: number;
  };
  recent_activity: {
    jag_transactions: JagTransaction[];
    reward_transactions: RefillCreditTransaction[];
  };
}

export interface JagTransaction {
  id: string;
  customer_id: string;
  order_id: string | null;
  type: 'borrow' | 'return' | 'sold';
  brand: 'own' | 'other';
  quantity: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RefillCreditTransaction {
  id: string;
  customer_id: string;
  type: 'earn' | 'use' | 'expire';
  amount: number;
  source: 'referral' | 'commission' | 'cashback' | 'manual' | 'rebate';
  reference: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateJagwarOrderInput {
  customerId: string;
  quantity: number;
  returnedOwn: number;
  returnedOther: number;
  paidAmount: number;
  creditToApply: number;
  stockLocationId: string;
  notes?: string;
}

export interface CreateJagwarOrderResponse {
  success: boolean;
  order?: any;
  credit?: any;
  transactions?: JagTransaction[];
  error?: string;
}

// New type for the order list & actions
export interface JagwarOrder {
  id: string;
  display_id: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    fulfilled_quantity: number;
    returned_quantity: number;
  }[];
}

// -----------------------------------------------------------------------------
// Existing functions (unchanged)
// -----------------------------------------------------------------------------

export async function getJagwarCustomerDashboard(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/dashboard`,
      { method: 'GET' }
    );
    return { success: true, data: response as JagwarCustomerDashboard };
  } catch (error: any) {
    console.error('Error fetching customer dashboard:', error);
    return { success: false, error: error.message || 'Failed to fetch customer dashboard' };
  }
}

export async function createJagwarOrder(input: CreateJagwarOrderInput) {
  try {
    const response = await adminFetch(`/dashboard/jagwar/orders`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath(`/customers/${input.customerId}`);
    revalidatePath('/orders');
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Error creating Jagwar order:', error);
    return { success: false, error: error.message || 'Failed to create order' };
  }
}

export async function getCustomerJagTransactions(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/transactions`,
      { method: 'GET' }
    );
    return { success: true, transactions: response.transactions || [] };
  } catch (error: any) {
    console.error('Error fetching jag transactions:', error);
    return { success: false, error: error.message || 'Failed to fetch transactions', transactions: [] };
  }
}

export async function getCustomerRewardTransactions(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/rewards`,
      { method: 'GET' }
    );
    return { success: true, transactions: response.transactions || [] };
  } catch (error: any) {
    console.error('Error fetching reward transactions:', error);
    return { success: false, error: error.message || 'Failed to fetch reward transactions', transactions: [] };
  }
}

export async function getCustomerContainerSummary(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/containers`,
      { method: 'GET' }
    );
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Error fetching container summary:', error);
    return { success: false, error: error.message || 'Failed to fetch container summary' };
  }
}

export async function getCustomerFinancialSummary(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/financial`,
      { method: 'GET' }
    );
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Error fetching financial summary:', error);
    return { success: false, error: error.message || 'Failed to fetch financial summary' };
  }
}

// -----------------------------------------------------------------------------
// NEW ACTIONS
// -----------------------------------------------------------------------------

/**
 * List all orders for a customer (transformed to JagwarOrder format)
 */
export async function listCustomerOrders(
  customerId: string
): Promise<{ success: boolean; orders?: JagwarOrder[]; error?: string }> {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/orders`,
      { method: 'GET' }
    );
    return { success: true, orders: response.orders ?? [] };
  } catch (error: any) {
    console.error('listCustomerOrders error:', error);
    return { success: false, error: error.message || 'Failed to list orders', orders: [] };
  }
}

/**
 * Fulfill items in an order (partial or full)
 */
export async function fulfillOrder({
  orderId,
  items,
  notes,
}: {
  orderId: string;
  items: { id: string; quantity: number }[];
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await adminFetch(`/dashboard/jagwar/orders/${orderId}/fulfill`, {
      method: 'POST',
      body: JSON.stringify({ items, notes }),
    });
    revalidatePath('/customers/[id]', 'page'); // revalidate all customer pages
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('fulfillOrder error:', error);
    return { success: false, error: error.message || 'Fulfillment failed' };
  }
}

/**
 * Add payment to an order (capture or record manual payment)
 */
export async function addPaymentToOrder({
  orderId,
  amount,
  method,
  notes,
}: {
  orderId: string;
  amount: number;
  method: string;
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await adminFetch(`/dashboard/jagwar/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, method, notes }),
    });
    revalidatePath('/customers/[id]', 'page');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('addPaymentToOrder error:', error);
    return { success: false, error: error.message || 'Payment failed' };
  }
}

/**
 * Process container returns against an order
 */
export async function returnContainers({
  orderId,
  items,
  notes,
}: {
  orderId: string;
  items: { id: string; quantity: number; reason: string }[];
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await adminFetch(`/dashboard/jagwar/orders/${orderId}/return`, {
      method: 'POST',
      body: JSON.stringify({ items, notes }),
    });
    revalidatePath('/customers/[id]', 'page');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('returnContainers error:', error);
    return { success: false, error: error.message || 'Return failed' };
  }
}

/**
 * Record jugs/containers given (borrowed) to a customer, linked to an order
 */
export async function borrowJagsToCustomer({
  customerId,
  orderId,
  quantity,
  brand,
  notes,
}: {
  customerId: string;
  orderId: string;
  quantity: number;
  brand: 'own' | 'other';
  notes: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await adminFetch(`/dashboard/jagwar/customers/${customerId}/borrow`, {
      method: 'POST',
      body: JSON.stringify({ orderId, quantity, brand, notes }),
    });
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
    console.error('borrowJagsToCustomer error:', error);
    return { success: false, error: error.message || 'Failed to record borrow' };
  }
}