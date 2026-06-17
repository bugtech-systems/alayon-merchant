// hooks/use-orders.ts

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { sdk } from '@/lib/config';

export interface OrderFilters {
  date_from?: Date;
  date_to?: Date;
  status?: string[];
  payment_status?: string[];
  customer_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
  order?: string;
  order_direction?: 'ASC' | 'DESC';
  company_id?: string;
}

export interface Order {
  id: string;
  display_id: number;
  status: string;
  payment_status: string;
  total: number;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  shipping_total: number;
  currency_code: string;
  email: string;
  customer_id: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  items: OrderItem[];
  shipping_address?: {
    id: string;
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    country_code: string;
    postal_code: string;
  };
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id: string;
  variant_id: string;
  variant?: {
    id: string;
    title: string;
    sku: string;
  };
}

export interface OrdersResponse {
  orders: Order[];
  count: number;
  limit: number;
  offset: number;
  total_pages: number;
  date_range?: {
    from: string;
    to: string;
  };
  filters?: Record<string, any>;
}

// ============================================
// DATE RANGE HELPERS
// ============================================

export const getDefaultDateRange = (period: 'today' | 'week' | 'month' | 'quarter' | 'year' = 'today') => {
  const now = new Date();
  let from: Date;
  let to: Date = endOfDay(now);

  switch (period) {
    case 'today':
      from = startOfDay(now);
      break;
    case 'week':
      from = startOfDay(subDays(now, 7));
      break;
    case 'month':
      from = startOfDay(subDays(now, 30));
      break;
    case 'quarter':
      from = startOfDay(subDays(now, 90));
      break;
    case 'year':
      from = startOfDay(subDays(now, 365));
      break;
    default:
      from = startOfDay(now);
  }

  return { from, to };
};

// ============================================
// BUILD QUERY PARAMS HELPER
// ============================================

const buildQueryParams = (filters: OrderFilters) => {
  const params: Record<string, any> = {};

  // Pagination
  if (filters.limit) params.limit = filters.limit;
  if (filters.offset) params.offset = filters.offset;

  // Date range
  if (filters.date_from) params.date_from = filters.date_from.toISOString();
  if (filters.date_to) params.date_to = filters.date_to.toISOString();

  // Status filters - handle array properly
  if (filters.status && filters.status.length > 0) {
    params.status = filters.status.join(',');
  }

  // Payment status filters - handle array properly
  if (filters.payment_status && filters.payment_status.length > 0) {
    params.payment_status = filters.payment_status.join(',');
  }

  // Customer filter
  if (filters.customer_id) {
    params.customer_id = filters.customer_id;
  }

  // Company filter
  if (filters.company_id) {
    params.company_id = filters.company_id;
  }

  // Search
  if (filters.search) {
    params.q = filters.search;
  }

  // Sorting
  if (filters.order) {
    params.order_by = filters.order;
  }
  if (filters.order_direction) {
    params.order_direction = filters.order_direction;
  }

  return params;
};

// ============================================
// CUSTOM FETCH WITH ERROR HANDLING
// ============================================

const fetchWithErrorHandling = async (url: string, options: any = {}) => {
  try {
    const response = await sdk.client.fetch(url, {
      method: options.method || 'GET',
      ...options,
    });
    return response;
  } catch (error: any) {
    // Handle CORS errors specifically
    if (error.message?.includes('CORS') || error.status === 0) {
      console.error('CORS error detected:', error);
      throw new Error('Network error - please check your connection');
    }
    
    // Handle authentication errors
    if (error.status === 401) {
      console.error('Authentication error:', error);
      throw new Error('Please log in again');
    }
    
    // Handle rate limiting
    if (error.status === 429) {
      console.error('Rate limit exceeded:', error);
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw error;
  }
};

// ============================================
// MAIN HOOK - useOrders (Storefront)
// ============================================

interface UseOrdersOptions {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string[];
  payment_status?: string[];
  customer_id?: string;
  date_from?: Date;
  date_to?: Date;
  order?: string;
  order_direction?: 'ASC' | 'DESC';
  enabled?: boolean;
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
}

export const useOrders = (options: UseOrdersOptions = {}) => {
  const {
    limit = 20,
    offset = 0,
    search = '',
    status = [],
    payment_status = [],
    customer_id,
    date_from,
    date_to,
    order = 'created_at',
    order_direction = 'DESC',
    enabled = true,
    period = 'today',
  } = options;

  const defaultDateRange = getDefaultDateRange(period);
  const fromDate = date_from || defaultDateRange.from;
  const toDate = date_to || defaultDateRange.to;

  return useQuery({
    queryKey: ['orders', { limit, offset, search, status, payment_status, customer_id, date_from: fromDate, date_to: toDate, order, order_direction }],
    queryFn: async () => {
      try {
        const filters: OrderFilters = {
          limit,
          offset,
          search: search || undefined,
          status: status.length > 0 ? status : undefined,
          payment_status: payment_status.length > 0 ? payment_status : undefined,
          customer_id,
          date_from: fromDate,
          date_to: toDate,
          order,
          order_direction,
        };

        const queryParams = buildQueryParams(filters);

        const response = await fetchWithErrorHandling('/dashboard/orders', {
          method: 'GET',
          query: queryParams,
        });

        return {
          orders: response.orders || [],
          count: response.count || 0,
          limit: response.limit || limit,
          offset: response.offset || offset,
          total_pages: response.total_pages || Math.ceil((response.count || 0) / limit),
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        } as OrdersResponse;
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        // Return empty data on error to prevent UI from breaking
        return {
          orders: [],
          count: 0,
          limit,
          offset,
          total_pages: 0,
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        } as OrdersResponse;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// ============================================
// ADMIN ORDERS HOOK
// ============================================

interface UseAdminOrdersOptions extends UseOrdersOptions {
  company_id?: string;
}

export const useAdminOrders = (options: UseAdminOrdersOptions = {}) => {
  const {
    limit = 20,
    offset = 0,
    search = '',
    status = [],
    payment_status = [],
    customer_id,
    company_id,
    date_from,
    date_to,
    order = 'created_at',
    order_direction = 'DESC',
    enabled = true,
    period = 'today',
  } = options;

  const defaultDateRange = getDefaultDateRange(period);
  const fromDate = date_from || defaultDateRange.from;
  const toDate = date_to || defaultDateRange.to;

  return useQuery({
    queryKey: ['admin-orders', { limit, offset, search, status, payment_status, customer_id, company_id, date_from: fromDate, date_to: toDate, order, order_direction }],
    queryFn: async () => {
      try {
        const filters: OrderFilters = {
          limit,
          offset,
          search: search || undefined,
          status: status.length > 0 ? status : undefined,
          payment_status: payment_status.length > 0 ? payment_status : undefined,
          customer_id,
          company_id,
          date_from: fromDate,
          date_to: toDate,
          order,
          order_direction,
        };

        const queryParams = buildQueryParams(filters);

        const response = await fetchWithErrorHandling('/dashboard/orders/today', {
          method: 'GET',
          query: queryParams,
        });

        return {
          orders: response.orders || [],
          count: response.count || 0,
          limit: response.limit || limit,
          offset: response.offset || offset,
          total_pages: response.total_pages || Math.ceil((response.count || 0) / limit),
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        } as OrdersResponse;
      } catch (error: any) {
        console.error('Error fetching admin orders:', error);
        return {
          orders: [],
          count: 0,
          limit,
          offset,
          total_pages: 0,
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        } as OrdersResponse;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// ============================================
// INFINITE SCROLLING HOOK
// ============================================

interface UseInfiniteOrdersOptions
  extends Omit<UseOrdersOptions, 'offset' | 'enabled'> {
  company_id?: string;
}

export const useInfiniteOrders = (options: UseInfiniteOrdersOptions = {}) => {
  const {
    limit = 20,
    search = '',
    status = [],
    payment_status = [],
    customer_id,
    company_id,
    date_from,
    date_to,
    order = 'created_at',
    order_direction = 'DESC',
    period = 'today',
  } = options;

  const defaultDateRange = getDefaultDateRange(period);
  const fromDate = date_from || defaultDateRange.from;
  const toDate = date_to || defaultDateRange.to;

  return useInfiniteQuery({
    queryKey: ['orders-infinite', { limit, search, status, payment_status, customer_id, company_id, date_from: fromDate, date_to: toDate, order, order_direction }],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const filters: OrderFilters = {
          limit,
          offset: pageParam,
          search: search || undefined,
          status: status.length > 0 ? status : undefined,
          payment_status: payment_status.length > 0 ? payment_status : undefined,
          customer_id,
          company_id,
          date_from: fromDate,
          date_to: toDate,
          order,
          order_direction,
        };

        const queryParams = buildQueryParams(filters);

        const response = await fetchWithErrorHandling('/admin/orders', {
          method: 'GET',
          query: queryParams,
        });

        const orders = response.orders || [];
        const count = response.count || 0;
        const nextOffset = pageParam + limit;

        return {
          orders,
          count,
          total_pages: response.total_pages || Math.ceil(count / limit),
          nextOffset: nextOffset < count ? nextOffset : null,
          hasMore: nextOffset < count,
        };
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        return {
          orders: [],
          count: 0,
          total_pages: 0,
          nextOffset: null,
          hasMore: false,
        };
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// ============================================
// DASHBOARD ORDERS HOOK
// ============================================

interface UseDashboardOrdersOptions {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  date_from?: Date;
  date_to?: Date;
  status?: string[];
  payment_status?: string[];
  company_id?: string;
  enabled?: boolean;
}

export const useDashboardOrders = (options: UseDashboardOrdersOptions = {}) => {
  const {
    period = 'today',
    date_from,
    date_to,
    status = [],
    payment_status = [],
    company_id,
    enabled = true,
  } = options;

  const defaultDateRange = getDefaultDateRange(period);
  const fromDate = date_from || defaultDateRange.from;
  const toDate = date_to || defaultDateRange.to;

  return useQuery({
    queryKey: ['dashboard-orders', { period, date_from: fromDate, date_to: toDate, status, payment_status, company_id }],
    queryFn: async () => {
      try {
        const queryParams: Record<string, any> = {
          date_from: fromDate.toISOString(),
          date_to: toDate.toISOString(),
          period,
        };

        if (company_id) queryParams.company_id = company_id;
        if (status && status.length > 0) queryParams.status = status.join(',');
        if (payment_status && payment_status.length > 0) queryParams.payment_status = payment_status.join(',');

        const response = await fetchWithErrorHandling('/admin/orders/dashboard', {
          method: 'GET',
          query: queryParams,
        });

        return response;
      } catch (error: any) {
        console.error('Error fetching dashboard orders:', error);
        return {
          period,
          date_range: { from: fromDate, to: toDate },
          summary: {
            total_revenue: 0,
            total_orders: 0,
            average_order_value: 0,
          },
          breakdown: {
            by_status: {},
            by_payment_status: {},
            daily: {},
          },
          recent_orders: [],
        };
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// ============================================
// SINGLE ORDER HOOK
// ============================================

export const useOrder = (orderId: string, options?: { enabled?: boolean; admin?: boolean }) => {
  const { enabled = true, admin = false } = options || {};

  return useQuery({
    queryKey: ['order', orderId, { admin }],
    queryFn: async () => {
      try {
        const endpoint = admin ? `/admin/orders/${orderId}` : `/store/orders/${orderId}`;
        const response = await fetchWithErrorHandling(endpoint, {
          method: 'GET',
        });
        return response;
      } catch (error: any) {
        console.error('Error fetching order:', error);
        throw new Error('Failed to fetch order details');
      }
    },
    enabled: enabled && !!orderId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      try {
        const response = await fetchWithErrorHandling(`/admin/orders/${orderId}`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        });
        return response;
      } catch (error: any) {
        console.error('Error updating order status:', error);
        throw new Error(error.message || 'Failed to update order status');
      }
    },
    onSuccess: (_, { orderId }) => {
      // Invalidate all order queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    retry: 1,
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      try {
        const response = await fetchWithErrorHandling(`/admin/orders/${orderId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        return response;
      } catch (error: any) {
        console.error('Error cancelling order:', error);
        throw new Error(error.message || 'Failed to cancel order');
      }
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    retry: 1,
  });
};

export const useArchiveOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      try {
        const response = await fetchWithErrorHandling(`/admin/orders/${orderId}/archive`, {
          method: 'POST',
        });
        return response;
      } catch (error: any) {
        console.error('Error archiving order:', error);
        throw new Error(error.message || 'Failed to archive order');
      }
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    retry: 1,
  });
};

// ============================================
// EXPORTS
// ============================================
