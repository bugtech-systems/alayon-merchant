// lib/actions/orders.ts
import { startOfDay, endOfDay, format } from 'date-fns';
import { sdk } from "../config";
import { getAuthHeaders, getCacheHeaders } from "../data/cookies";
import { listPosOrders } from "./orders";

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
  let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week':
      from = new Date(now);
      from.setDate(now.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
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

  // Status filters
  if (filters.status && filters.status.length > 0) {
    params.status = filters.status.join(',');
  }

  // Payment status filters
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
// STORE ORDERS ACTIONS
// ============================================


/**
 * List orders for admin with company filtering
 */
export async function listAdminOrders(
  filters: OrderFilters = {},
  options?: { cache?: RequestCache }
): Promise<OrdersResponse> {
  try {
    const queryParams = buildQueryParams(filters);
        console.log(queryParams, 'QUEEERY')
    const response = await sdk.client.fetch(`/dashboard/orders`, {
      method: 'GET',
      query: queryParams,
      ...(await getAuthHeaders()),
      ...(await getCacheHeaders('orders')),
      next: {
        ...(options?.cache ? { cache: options.cache } : {}),
        tags: ['orders'],
      },
    });

    return {
      orders: response.orders || [],
      count: response.count || 0,
      limit: response.limit || filters.limit || 20,
      offset: response.offset || filters.offset || 0,
      total_pages: response.total_pages || Math.ceil((response.count || 0) / (filters.limit || 20)),
      date_range: {
        from: filters.date_from?.toISOString() || '',
        to: filters.date_to?.toISOString() || '',
      },
      filters,
    };
  } catch (error) {
    console.error('Error listing admin orders:', error);
    return {
      orders: [],
      count: 0,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      total_pages: 0,
    };
  }
}

/**
 * Get a single order by ID
 */
export async function getOrder(
  orderId: string,
  options?: { admin?: boolean; cache?: RequestCache }
): Promise<Order | null> {
  try {
    const isAdmin = options?.admin || false;
    const endpoint = isAdmin ? `/admin/orders/${orderId}` : `/store/orders/${orderId}`;
    
    const response = await sdk.client.fetch<{ order: Order }>(endpoint, {
      method: 'GET',
      ...(await getAuthHeaders()),
      ...(await getCacheHeaders(`order-${orderId}`)),
      next: {
        ...(options?.cache ? { cache: options.cache } : {}),
        tags: [`order-${orderId}`],
      },
    });

    return response.order || null;
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

// ============================================
// DASHBOARD ORDERS ACTIONS
// ============================================

export interface DashboardOrdersResponse {
  period: string;
  date_range: {
    from: string;
    to: string;
  };
  summary: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    total_items: number;
    unique_customers: number;
  };
  breakdown: {
    by_status: Record<string, { count: number; total: number; items: number }>;
    by_payment_status: Record<string, { count: number; total: number }>;
    daily: Record<string, { count: number; total: number; items: number; unique_customers: number }>;
  };
  recent_orders: Order[];
  top_customers: Array<{
    customer: any;
    total_orders: number;
    total_spent: number;
    last_order: string;
  }>;
  filters: {
    status: string | null;
    payment_status: string | null;
    company_id: string | null;
  };
}

/**
 * Get dashboard orders statistics
 */
export async function getDashboardOrders(
  options: {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
    date_from?: Date;
    date_to?: Date;
    status?: string[];
    payment_status?: string[];
    company_id?: string;
    cache?: RequestCache;
  } = {}
): Promise<DashboardOrdersResponse> {
  try {
    const {
      period = 'today',
      date_from,
      date_to,
      status = [],
      payment_status = [],
      company_id,
    } = options;

    const defaultDateRange = getDefaultDateRange(period);
    const fromDate = date_from || defaultDateRange.from;
    const toDate = date_to || defaultDateRange.to;

    const queryParams: Record<string, any> = {
      date_from: fromDate.toISOString(),
      date_to: toDate.toISOString(),
      period,
    };

    if (company_id) queryParams.company_id = company_id;
    if (status && status.length > 0) queryParams.status = status.join(',');
    if (payment_status && payment_status.length > 0) queryParams.payment_status = payment_status.join(',');

    const response = await sdk.client.fetch<DashboardOrdersResponse>(`/admin/orders/dashboard`, {
      method: 'GET',
      query: queryParams,
      ...(await getAuthHeaders()),
      ...(await getCacheHeaders('dashboard-orders')),
      next: {
        ...(options.cache ? { cache: options.cache } : {}),
        tags: ['dashboard-orders'],
      },
    });

    return response;
  } catch (error) {
    console.error('Error fetching dashboard orders:', error);
    return {
      period: options.period || 'today',
      date_range: {
        from: '',
        to: '',
      },
      summary: {
        total_revenue: 0,
        total_orders: 0,
        average_order_value: 0,
        total_items: 0,
        unique_customers: 0,
      },
      breakdown: {
        by_status: {},
        by_payment_status: {},
        daily: {},
      },
      recent_orders: [],
      top_customers: [],
      filters: {
        status: null,
        payment_status: null,
        company_id: null,
      },
    };
  }
}

// ============================================
// ORDER MUTATION ACTIONS
// ============================================

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const response = await sdk.client.fetch<{ order: Order }>(`/admin/orders/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
      ...(await getAuthHeaders()),
    });

    return { success: true, order: response.order };
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message || 'Failed to update order status' };
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const response = await sdk.client.fetch<{ order: Order }>(`/admin/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      ...(await getAuthHeaders()),
    });

    return { success: true, order: response.order };
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return { success: false, error: error.message || 'Failed to cancel order' };
  }
}

/**
 * Archive an order
 */
export async function archiveOrder(
  orderId: string
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const response = await sdk.client.fetch<{ order: Order }>(`/admin/orders/${orderId}/archive`, {
      method: 'POST',
      ...(await getAuthHeaders()),
    });

    return { success: true, order: response.order };
  } catch (error: any) {
    console.error('Error archiving order:', error);
    return { success: false, error: error.message || 'Failed to archive order' };
  }
}

/**
 * Create a new order
 */
export async function createOrder(
  data: {
    items: any[];
    shipping_address: any;
    billing_address?: any;
    shipping_method?: any;
    payment_method?: any;
    metadata?: any;
  }
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const response = await sdk.client.fetch<{ order: Order }>(`/store/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
      ...(await getAuthHeaders()),
    });

    return { success: true, order: response.order };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message || 'Failed to create order' };
  }
}

function filterOrdersByCapturedAt(
  orders: any[],
  dateFrom?: any,
  dateTo?: any
): any[] {
  return orders.filter(order => {
    // Check if order has pos_payment metadata
    const posPayment = order.metadata?.pos_payment;
    if (!posPayment) return false;

    // Check if captured_at exists
    const capturedAt = posPayment.captured_at;
    if (!capturedAt) return false;

    // If no date filters provided, return all orders with captured_at
    if (!dateFrom && !dateTo) return true;

    const capturedDate = new Date(capturedAt);

    // Apply date range filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (capturedDate < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      if (capturedDate > toDate) return false;
    }

    return true;
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get today's order summary
 */
export async function getTodayOrdersSummary(user?: any): Promise<{
  total_sales: number;
  order_count: number;
  customer_count: number;
  average_order_value: number;
  completed_orders: number;
  pending_orders: number;
}> {
  try {


    // Get today's date range with proper start/end of day
    const now = new Date();
    const from = startOfDay(now);
    const to = endOfDay(now);

    // Build filters for Medusa v2 using created_at field
    const filters: Record<string, any> = {
      // Use ISO strings for Medusa v2 API
      date_from: format(from, 'yyyy-MM-dd'),
      date_to: format(to, 'yyyy-MM-dd'),
    };

    // Add company or seller filter based on user role

      filters.seller_id = user?.id;

    // Add any additional filters
    if (user?.employee?.company?.stock_location_id) {
      filters.stock_location_id = user.employee.company.stock_location_id;
    }

    // Fetch orders with filters
    const limit = 1000;
    const response = await listPosOrders(limit, 0, filters);
      // let initialOrders = await listPosOrders(limit, offset, filters);
    console.log(response, "RESPPOND")
    const orders = response.orders || [];
    const filtered = filterOrdersByCapturedAt(orders, from, to)
    // Calculate metrics
    const completedOrders = filtered.filter(o => 
      o.status === 'completed' || 
      o.status === 'paid' || 
      o.status === 'fulfilled'
    );
    
    const pendingOrders = filtered.filter(o => 
      o.status === 'pending' || 
      o.status === 'processing' || 
      o.status === 'requires_action'
    );
    
    // Calculate total sales from completed orders only
    const totalSales = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const orderCount = completedOrders.length;
    const completedCount = completedOrders.length;
    const pendingCount = pendingOrders.length;
    // Count unique customers
    const uniqueCustomers = new Set(
      orders
        .map(o => o.customer_id)
        .filter(Boolean)
    );
    const customerCount = uniqueCustomers.size;
    
    // Calculate average order value from completed orders
    const averageOrderValue = completedCount > 0 ? totalSales / completedCount : 0;

    return {
      total_sales: totalSales,
      order_count: orderCount,
      customer_count: customerCount,
      average_order_value: averageOrderValue,
      completed_orders: completedCount,
      pending_orders: pendingCount,
    };
  } catch (error) {
    console.error('Error getting today orders summary:', error);
    return {
      total_sales: 0,
      order_count: 0,
      customer_count: 0,
      average_order_value: 0,
      completed_orders: 0,
      pending_orders: 0,
    };
  }
}

