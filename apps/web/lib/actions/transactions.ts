// lib/actions/transactions.ts

'use server';

import sdk from '@/lib/config';
import { getAuthHeaders } from '../data/cookies';
import { adminFetch } from '../apiClient';


export async function listTransactions(
  limit: number = 10000,
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

        let filteredTransactions = [] as any;
        if(filters?.company_id){
          filteredTransactions = response.transactions.filter((trans: any) => trans?.company_id == filters?.company_id)
        } else {
       filteredTransactions = response.transactions.filter((trans: any) => trans?.customer_id == filters?.customer_id)
        }
    const count = filteredTransactions.length;
console.log(response, 'REspp', filteredTransactions)
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
      body: JSON.stringify(data),
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


// ============================================
// LIST CATEGORIES
// ============================================

export interface ListCategoriesParams {
  limit?: number;
  offset?: number;
  type?: 'income' | 'expense' | 'transfer' | 'all';
  parent_id?: string | null;
  is_active?: boolean | 'all';
  search?: string;
  order_by?: 'created_at' | 'updated_at' | 'name' | 'type';
  order_direction?: 'ASC' | 'DESC';
}

export async function listCategories(
  params: ListCategoriesParams = {}
) {
  try {
    const {
      limit = 50,
      offset = 0,
      type = 'all',
      parent_id,
      is_active = true,
      search,
      order_by = 'name',
      order_direction = 'ASC',
    } = params;

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    // Add optional filters
    if (type && type !== 'all') {
      queryParams.append('type', type);
    }
    if (parent_id !== undefined) {
      queryParams.append('parent_id', parent_id || 'null');
    }
    if (is_active !== undefined && is_active !== 'all') {
      queryParams.append('is_active', String(is_active));
    }
    if (search) {
      queryParams.append('search', search);
    }
    if (order_by) {
      queryParams.append('order_by', order_by);
    }
    if (order_direction) {
      queryParams.append('order_direction', order_direction);
    }

    const response = await adminFetch(
      `/dashboard/transactions/categories?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

    return {
      categories: response.categories || [],
      count: response.count || 0,
      limit: response.limit || limit,
      offset: response.offset || offset,
      total_pages: response.total_pages || 1,
    };
  } catch (error) {
    console.error('Error listing transaction categories:', error);
    throw error;
  }
}

// ============================================
// GET CATEGORY TREE
// ============================================

export async function getCategoryTree(
  type?: 'income' | 'expense' | 'transfer' | 'all',
  is_active: boolean = true
) {
  try {
    const queryParams = new URLSearchParams();
    if (type && type !== 'all') {
      queryParams.append('type', type);
    }
    if (is_active !== undefined) {
      queryParams.append('is_active', String(is_active));
    }

    const response = await adminFetch(
      `/dashboard/transactions/categories/tree?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

    return {
      tree: response.tree || [],
      total: response.total || 0,
    };
  } catch (error) {
    console.error('Error getting category tree:', error);
    throw error;
  }
}

// ============================================
// GET SINGLE CATEGORY
// ============================================

export async function getCategory(id: string) {
  try {
    const response = await adminFetch(
      `/dashboard/transactions/categories/${id}`,
      {
        method: 'GET',
      }
    );

    return {
      success: true,
      category: response.category,
      children: response.children || [],
    };
  } catch (error) {
    console.error('Error getting category:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CREATE CATEGORY
// ============================================

export interface CreateCategoryData {
  name: string;
  description?: string | null;
  type: 'income' | 'expense' | 'transfer';
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  account_code?: string | null;
  is_taxable?: boolean;
  tax_rate?: number | null;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export async function createCategory(data: CreateCategoryData) {
  try {
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      throw new Error('Category name is required');
    }
    if (!data.type || !['income', 'expense', 'transfer'].includes(data.type)) {
      throw new Error('Type must be one of: income, expense, transfer');
    }

    const response = await adminFetch(`/dashboard/transactions/categories`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        name: data.name.trim(),
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || null,
        parent_id: data.parent_id || null,
        account_code: data.account_code || null,
        is_taxable: data.is_taxable || false,
        tax_rate: data.tax_rate || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
        metadata: data.metadata || {},
      }),
    });

    return { 
      success: true, 
      category: response.category 
    };
  } catch (error) {
    console.error('Error creating category:', error);
    return { 
      success: false, 
      error: error.message,
      category: null 
    };
  }
}

// ============================================
// UPDATE CATEGORY
// ============================================

export interface UpdateCategoryData {
  name?: string;
  description?: string | null;
  type?: 'income' | 'expense' | 'transfer';
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  account_code?: string | null;
  is_taxable?: boolean;
  tax_rate?: number | null;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export async function updateCategory(id: string, data: UpdateCategoryData) {
  try {
    // Validate if name is provided
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Category name cannot be empty');
    }

    // Validate type if provided
    if (data.type !== undefined && !['income', 'expense', 'transfer'].includes(data.type)) {
      throw new Error('Type must be one of: income, expense, transfer');
    }

    const response = await adminFetch(`/dashboard/transactions/categories/${id}`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        name: data.name ? data.name.trim() : undefined,
      }),
    });

    return { 
      success: true, 
      category: response.category 
    };
  } catch (error) {
    console.error('Error updating category:', error);
    return { 
      success: false, 
      error: error.message,
      category: null 
    };
  }
}

// ============================================
// DELETE CATEGORY
// ============================================

export async function deleteCategory(id: string) {
  try {
    await adminFetch(`/dashboard/transactions/categories/${id}`, {
      method: 'DELETE',
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

export interface BulkUpdateItem {
  id: string;
  data: UpdateCategoryData;
}


// ============================================
// SEARCH CATEGORIES
// ============================================

export async function searchCategories(
  query: string,
  options: {
    type?: 'income' | 'expense' | 'transfer' | 'all';
    is_active?: boolean;
    limit?: number;
  } = {}
) {
  try {
    const { type = 'all', is_active = true, limit = 20 } = options;

    const queryParams = new URLSearchParams({
      q: query,
      limit: Math.min(limit, 50).toString(),
    });

    if (type && type !== 'all') {
      queryParams.append('type', type);
    }
    if (is_active !== undefined) {
      queryParams.append('is_active', String(is_active));
    }

    const response = await adminFetch(
      `/admin/transaction-categories/search?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

    return {
      categories: response.categories || [],
      count: response.count || 0,
      query,
      limit: response.limit || limit,
    };
  } catch (error) {
    console.error('Error searching categories:', error);
    throw error;
  }
}

// ============================================
// EXPORT CATEGORIES
// ============================================

export async function exportCategories(
  type?: 'income' | 'expense' | 'transfer' | 'all',
  is_active: boolean = true
) {
  try {
    const queryParams = new URLSearchParams();
    if (type && type !== 'all') {
      queryParams.append('type', type);
    }
    if (is_active !== undefined) {
      queryParams.append('is_active', String(is_active));
    }

    const response = await adminFetch(
      `/admin/transaction-categories/export?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

    return {
      categories: response.categories || [],
      total: response.total || 0,
      exported_at: response.exported_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting categories:', error);
    throw error;
  }
}

// ============================================
// HELPER: GET CATEGORIES BY TYPE
// ============================================

export async function getCategoriesByType(
  type: 'income' | 'expense' | 'transfer',
  is_active: boolean = true
) {
  try {
    const result = await listCategories({
      type,
      is_active,
      limit: 100,
      order_by: 'name',
      order_direction: 'ASC',
    });

    return {
      categories: result.categories,
      count: result.count,
    };
  } catch (error) {
    console.error(`Error getting ${type} categories:`, error);
    throw error;
  }
}

// ============================================
// HELPER: GET ACTIVE CATEGORIES
// ============================================

export async function getActiveCategories(
  type?: 'income' | 'expense' | 'transfer' | 'all'
) {
  try {
    const result = await listCategories({
      type: type || 'all',
      is_active: true,
      limit: 200,
      order_by: 'name',
      order_direction: 'ASC',
    });

    return {
      categories: result.categories,
      count: result.count,
    };
  } catch (error) {
    console.error('Error getting active categories:', error);
    throw error;
  }
}

// ============================================
// HELPER: GET CATEGORY WITH TRANSACTION COUNT
// ============================================

export async function getCategoryWithStats(id: string) {
  try {
    const [categoryResult, treeResult] = await Promise.all([
      getCategory(id),
      getCategoryTree(),
    ]);

    if (!categoryResult.success) {
      throw new Error(categoryResult.error);
    }

    // Count children
    const children = treeResult.tree.find((node: any) => node.id === id)?.children || [];

    return {
      ...categoryResult,
      children_count: children.length,
    };
  } catch (error) {
    console.error('Error getting category with stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}