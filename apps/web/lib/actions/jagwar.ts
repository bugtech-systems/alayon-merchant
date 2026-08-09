// lib/actions/jagwar.ts
'use server';

import { adminFetch } from '../apiClient';
import { revalidatePath } from 'next/cache';

// Types
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

/**
 * Fetch customer dashboard data from Jagwar API
 */
export async function getJagwarCustomerDashboard(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/dashboard`,
      {
        method: 'GET',
      }
    );

    return { 
      success: true, 
      data: response as JagwarCustomerDashboard 
    };
  } catch (error: any) {
    console.error('Error fetching customer dashboard:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch customer dashboard' 
    };
  }
}

/**
 * Create a Jagwar order (water order with container transactions)
 */
export async function createJagwarOrder(input: CreateJagwarOrderInput) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/orders`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );

    revalidatePath(`/customers/${input.customerId}`);
    revalidatePath('/orders');
    
    return { 
      success: true, 
      data: response 
    };
  } catch (error: any) {
    console.error('Error creating Jagwar order:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create order' 
    };
  }
}

/**
 * Get customer's Jag transactions
 */
export async function getCustomerJagTransactions(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/transactions`,
      {
        method: 'GET',
      }
    );

    return { 
      success: true, 
      transactions: response.transactions || [] 
    };
  } catch (error: any) {
    console.error('Error fetching jag transactions:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch transactions',
      transactions: [] 
    };
  }
}

/**
 * Get customer's refill credit transactions
 */
export async function getCustomerRewardTransactions(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/rewards`,
      {
        method: 'GET',
      }
    );

    return { 
      success: true, 
      transactions: response.transactions || [] 
    };
  } catch (error: any) {
    console.error('Error fetching reward transactions:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch reward transactions',
      transactions: [] 
    };
  }
}

/**
 * Get customer's container summary
 */
export async function getCustomerContainerSummary(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/containers`,
      {
        method: 'GET',
      }
    );

    return { 
      success: true, 
      data: response 
    };
  } catch (error: any) {
    console.error('Error fetching container summary:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch container summary' 
    };
  }
}

/**
 * Get customer's financial summary
 */
export async function getCustomerFinancialSummary(customerId: string) {
  try {
    const response = await adminFetch(
      `/dashboard/jagwar/customers/${customerId}/financial`,
      {
        method: 'GET',
      }
    );

    return { 
      success: true, 
      data: response 
    };
  } catch (error: any) {
    console.error('Error fetching financial summary:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch financial summary' 
    };
  }
}