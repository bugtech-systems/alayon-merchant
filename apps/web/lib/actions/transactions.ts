// lib/actions/transactions.ts

'use server';

import sdk from '@/lib/config';
import { Transaction } from '@/types/transactions';
import { getAuthHeaders } from '../data/cookies';
import { adminFetch } from '../apiClient';

export async function listTransactions(
  limit: number = 10,
  offset: number = 0,
  filters: Record<string, any> = {}
) {
  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      ),
    });

    const response = await adminFetch(
      `/dashboard/transactions?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

        const filteredTransactions = response.transactions.filter((trans: any) => trans?.customer_id === filters?.customer_id);
    const count = filteredTransactions.length;

    return {
      transactions: filteredTransactions || [],
      count: count || 0,
      page: Math.floor(offset / limit) + 1,
      total_pages: Math.ceil((count || 0) / limit),
      has_next: offset + limit < (count || 0),
      has_previous: offset > 0,
    };
  } catch (error) {
    console.error('Error listing transactions:', error);
    throw error;
  }
}

export async function createTransaction(data: any) {
  try {
    const response = await adminFetch(`/admin/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });


    console.log(response, "RESSSPp")
    return { success: true, transaction: response.transaction };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function updateTransaction(id: string, data: any) {
  try {
    const response = await adminFetch(`/dashboard/transactions/${id}`, {
      method: 'PUT',
      body: data,
    });

    return { success: true, transaction: response.transaction };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteTransaction(id: string) {
  try {
    await sdk.client.fetch(`/dashboard/transactions/${id}`, {
      method: 'DELETE',
      headers: {
                ...(await getAuthHeaders()),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function getTransaction(id: string) {
  try {
    const response = await sdk.client.fetch(`/store/transactions/${id}`, {
      method: 'GET',
    });

    return { success: true, transaction: response.transaction };
  } catch (error) {
    console.error('Error getting transaction:', error);
    return { success: false, error: error.message };
  }
}