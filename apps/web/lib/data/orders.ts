"use server";

import { sdk } from "@/lib/config";
import { getAuthHeaders, getCacheOptions } from "@/lib/data/cookies";
import medusaError from "@/lib/util/medusa-error";
import { adminFetch } from "../apiClient";

// Types for order operations
export interface OrderFilters {
  search?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  customer_id?: string;
  email?: string;
  created_from?: Date;
  created_to?: Date;
  min_total?: number;
  max_total?: number;
}

export interface OrderSortOptions {
  field: "created_at" | "updated_at" | "display_id" | "total" | "status";
  order: "ASC" | "DESC";
}

export interface PaginatedOrderResponse {
  orders: DashboardOrder[];
  count: number;
  limit: number;
  offset: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface DashboardOrder {
  id: string;
  display_id: number;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  fulfillment_status: string;
  fulfillment_status_display: string;
  total: number;
  formatted_total: string;
  subtotal: number;
  formatted_subtotal: string;
  shipping_total: number;
  formatted_shipping: string;
  discount_total: number;
  formatted_discount: string;
  tax_total: number;
  formatted_tax: string;
  currency_code: string;
  email: string;
  customer_name: string;
  customer_phone: string;
  customer_id?: string;
  shipping_address: {
    address_1: string;
    address_2?: string;
    city: string;
    province?: string;
    postal_code?: string;
    country_code: string;
    phone?: string;
    formatted_address: string;
  } | null;
  billing_address: any;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    formatted_unit_price: string;
    total: number;
    formatted_total: string;
    product_id?: string;
    variant_id?: string;
    thumbnail?: string;
  }>;
  item_count: number;
  unique_product_count: number;
  has_been_paid: boolean;
  has_been_fulfilled: boolean;
  created_at: string;
  updated_at: string;
  created_date: string;
  days_since_created: number;
  metadata?: any;
}

// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string = "PHP"): string => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
};

// Helper function to format address
const formatAddress = (address: any): string => {
  if (!address) return "No address";
  const parts = [
    address.address_1,
    address.address_2,
    address.city,
    address.province,
    address.postal_code,
    address.country_code,
  ].filter(Boolean);
  return parts.join(", ");
};

// Transform order data for dashboard display
const transformOrderForDashboard = (order: any): DashboardOrder => {
  const items = order.items || [];
  const uniqueProducts = new Set(items.map((item: any) => item.product_id));
  
  // Calculate days since created
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Format items
  const formattedItems = items.map((item: any) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unit_price,
    formatted_unit_price: formatCurrency(item.unit_price / (item.quantity || 1), order.currency_code),
    total: item.total || item.unit_price,
    formatted_total: formatCurrency(item.total || item.unit_price, order.currency_code),
    product_id: item.product_id,
    variant_id: item.variant_id,
    thumbnail: item.thumbnail,
  }));


  // Get customer name
  let customerName = order.email || "Guest";
  let customerPhone = "N/A";
  
  if (order.customer) {
    if (order.customer.first_name || order.customer.last_name) {
      customerName = `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim();
    }
    customerPhone = order.customer.phone || order.shipping_address?.phone || "N/A";
  } else if (order.shipping_address?.phone) {
    customerPhone = order.shipping_address.phone;
  }

  const totalQuantity = formattedItems.reduce((sum: any, item: any) => sum + item.quantity, 0);

  return {
    ...order,
    id: order.id,
    display_id: order.display_id,
    status: order.status,
    delivery_status: order?.delivery?.delivery_status,
    status_display: getOrderStatusDisplay(order.status),
    payment_status: order.payment_status,
    payment_status_display: getPaymentStatusDisplay(order.payment_status),
    fulfillment_status: order.fulfillment_status,
    fulfillment_status_display: getFulfillmentStatusDisplay(order.fulfillment_status),
    total: order.total || 0,
    formatted_total: formatCurrency(order.total || 0, order.currency_code),
    subtotal: order.subtotal || 0,
    formatted_subtotal: formatCurrency(order.subtotal || 0, order.currency_code),
    shipping_total: order.shipping_total || 0,
    formatted_shipping: formatCurrency(order.shipping_total || 0, order.currency_code),
    discount_total: order.discount_total || 0,
    formatted_discount: formatCurrency(order.discount_total || 0, order.currency_code),
    tax_total: order.tax_total || 0,
    formatted_tax: formatCurrency(order.tax_total || 0, order.currency_code),
    currency_code: order.currency_code,
    email: order.email,
    totalQuantity,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_id: order.customer_id,
    shipping_address: order.shipping_address ? {
      address_1: order.shipping_address.address_1,
      address_2: order.shipping_address.address_2,
      city: order.shipping_address.city,
      province: order.shipping_address.province,
      postal_code: order.shipping_address.postal_code,
      country_code: order.shipping_address.country_code,
      phone: order.shipping_address.phone,
      formatted_address: formatAddress(order.shipping_address),
    } : null,
    billing_address: order.billing_address,
    items: formattedItems,
    item_count: items.length,
    unique_product_count: uniqueProducts.size,
    has_been_paid: order.payment_status === "captured" || order.payment_status === "paid",
    has_been_fulfilled: order.fulfillment_status === "fulfilled" || order.fulfillment_status === "shipped",
    created_at: order.created_at,
    updated_at: order.updated_at,
    created_date: new Date(order.created_at).toLocaleDateString(),
    days_since_created: daysSinceCreated,
    metadata: order.metadata
  };
};

// Helper functions for status display
const getOrderStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    completed: "Completed",
    processing: "Processing",
    canceled: "Canceled",
    archived: "Archived",
    requires_action: "Requires Action",
  };
  return statusMap[status] || status;
};

const getPaymentStatusDisplay = (status: string | null): string => {
  const statusMap: Record<string, string> = {
    not_paid: "Not Paid",
    awaiting: "Awaiting",
    captured: "Paid",
    partially_refunded: "Partially Refunded",
    refunded: "Refunded",
    canceled: "Canceled",
    requires_action: "Requires Action",
  };
  return statusMap[status || "not_paid"] || status || "Not Paid";
};

const getFulfillmentStatusDisplay = (status: string | null): string => {
  const statusMap: Record<string, string> = {
    not_fulfilled: "Not Fulfilled",
    partially_fulfilled: "Partially Fulfilled",
    fulfilled: "Fulfilled",
    shipped: "Shipped",
    partially_shipped: "Partially Shipped",
    returned: "Returned",
    canceled: "Canceled",
    requires_action: "Requires Action",
  };
  return statusMap[status || "not_fulfilled"] || status || "Not Fulfilled";
};

// Build query string for custom API - aligned with listPosOrders approach
const buildQueryString = (
  limit: number,
  offset: number,
  filters?: OrderFilters | any,
  sort?: OrderSortOptions
): string => {
  const params = new URLSearchParams();
  
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());
  
  // Add fields to include all related data (matching listPosOrders)
  const fields = [
    'id',
    'status',
    'created_at',
    'updated_at',
    'email',
    'display_id',
    'custom_display_id',
    'payment_status',
    'fulfillment_status',
    'total',
    'subtotal',
    'tax_total',
    'shipping_total',
    'discount_total',
    'currency_code',
    'customer',
    'sales_channel',
    'payment_collections',
    'payments',
    'items',
    'shipping_address',
    'billing_address',
    'shipping_methods',
    'metadata',
    'fulfillments',
    'claims',
    'swaps',
    'returns',
    'refunds',
    'promotions',
    'discounts'
  ].join(',');
  
  params.set("fields", fields);
  
  // Set default sorting to show newest first (matching listPosOrders)
  if (sort?.field) {
    params.set("sort_by", sort.field);
    if (sort?.order) params.set("sort_order", sort.order);
  } else {
    params.set("order", "-created_at");
  }
  
  // Add search filter (Medusa's q parameter)
  if (filters?.search) {
    params.set("q", filters.search);
  }
  
  // Handle status filter - only add if it's a specific status (not 'all' and not exclusion)
  // The exclusion (!canceled,!refunded) will be handled client-side like listPosOrders
  if (filters?.status && filters.status !== 'all' && !filters.status.includes('!')) {
    params.set("status", filters.status);
  }
  // Note: We're NOT adding exclusion status to the query since it causes errors
  
  // Add payment status filter
  if (filters?.payment_status && filters.payment_status !== 'all') {
    params.set("payment_status", filters.payment_status);
  }
  
  // Add fulfillment status filter
  if (filters?.fulfillment_status && filters.fulfillment_status !== 'all') {
    params.set("fulfillment_status", filters.fulfillment_status);
  }
  
  // Add customer filter
  if (filters?.customer_id) {
    params.set("customer_id", filters.customer_id);
  }
  
  // Handle date filters using Medusa's range syntax (matching listPosOrders)
  const dateFrom = filters?.date_from || filters?.created_from;
  const dateTo = filters?.date_to || filters?.created_to;
  
  if (dateFrom) {
    const fromValue = typeof dateFrom === 'string' ? dateFrom : dateFrom.toISOString().split('T')[0];
    params.set("created_at[gte]", fromValue);
  }
  
  if (dateTo) {
    const toValue = typeof dateTo === 'string' ? dateTo : dateTo.toISOString().split('T')[0];
    params.set("created_at[lte]", toValue);
  }
  
  // Add numeric filters
  if (filters?.min_total !== undefined && filters?.min_total !== null) {
    params.set("total[gte]", filters.min_total.toString());
  }
  
  if (filters?.max_total !== undefined && filters?.max_total !== null) {
    params.set("total[lte]", filters.max_total.toString());
  }
  
  // Add email filter
  if (filters?.email) {
    params.set("email", filters.email);
  }
  
  return params.toString();
};

// Main list orders function - now matches listPosOrders pattern
export const listOrders = async (
  limit: number = 10000,
  offset: number = 0,
  filters?: any,
  sort?: OrderSortOptions
): Promise<PaginatedOrderResponse> => {
  try {
    const headers = await getAuthHeaders();
    const next = await getCacheOptions("orders");
        const fields = [
      'id',
      'status',
      'created_at',
      'updated_at',
      'email',
      'display_id',
      'custom_display_id',
      'payment_status',
      'fulfillment_status',
      'total',
      'subtotal',
      'tax_total',
      'shipping_total',
      'discount_total',
      'currency_code',
      'customer.*',
      'sales_channel',
      'payment_collections.*',
      'payments',
      'items',
      'shipping_address',
      'billing_address',
      'shipping_methods',
      'metadata',
      'fulfillments',
      'claims',
      'swaps',
      'returns',
      'refunds',
      'promotions',
      'discounts',
      'delivery.*'
    ].join(',');


    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      fields: fields,
      order: '-created_at' // Show newest first
    });

    // Add status filter to exclude cancelled and refunded by default
    const excludedStatuses = ['canceled', 'refunded'];

    // Add date filters if provided - with proper start/end of day handling
    if (filters?.created_at_from) {
      // Ensure we're using the start of the day (00:00:00)
      const fromDate = new Date(filters.created_at_from);
      fromDate.setHours(0, 0, 0, 0);
      queryParams.append('created_at[gte]', fromDate.toISOString());
    }
    if (filters?.created_at_to) {
      // Ensure we're using the end of the day (23:59:59.999)
      const toDate = new Date(filters.created_at_to);
      toDate.setHours(23, 59, 59, 999);
      queryParams.append('created_at[lte]', toDate.toISOString());
    }

    // Add search filter
    if (filters?.search) {
      queryParams.append('q', filters.search);
    }

    // Add specific status filter
    if (filters?.status && filters.status !== 'all' && !filters.status.includes('!')) {
      queryParams.append('status', filters.status);
    }

    // Add payment status filter
    if (filters?.payment_status && filters.payment_status !== 'all') {
      queryParams.append('payment_status', filters.payment_status);
    }

    // Add customer filter
    if (filters?.customer_id) {
      queryParams.append('customer_id', filters.customer_id);
    }

    // Use Medusa SDK client to fetch from custom endpoint
    const response = await sdk.client.fetch(
      `/admin/orders?${queryParams.toString()}`,
      {
        method: "GET",
        // headers,
        next,
      }
    );
    

    // Get all orders from response
    let orders = response.orders || [];
    const totalCount = response.count || 0;

    // Filter out cancelled and refunded on client side (matching listPosOrders)
    if (!filters?.include_cancelled && !filters?.include_refunded) {
      orders = orders.filter((order: any) => 
        order.status !== 'canceled' && order.status !== 'refunded'
      );
    }
    
    // Filter by seller_id or company_id from metadata (matching listPosOrders)
    if (filters?.seller_id) {
      orders = orders.filter((order: any) => order.metadata?.seller_id === filters.seller_id);
    }
    if (filters?.company_id) {
      orders = orders.filter((order: any) => order.metadata?.company_id == filters.company_id);
    }


    // Client-side date filtering with proper start/end of day handling
    if (filters?.date_from) {
      const fromDate = new Date(filters.date_from);
      fromDate.setHours(0, 0, 0, 0); // Start of day
      orders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= fromDate;
      });
    }
    if (filters?.date_to) {
      const toDate = new Date(filters.date_to);
      toDate.setHours(23, 59, 59, 999); // End of day
      orders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate <= toDate;
      });
    }


    // Sort orders by created_at descending (newest first)
    orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Calculate pagination with filtered count
    const filteredCount = orders.length;
    const start = offset;
    const end = Math.min(offset + limit, filteredCount);
    const paginatedOrders = orders.slice(start, end);
    // Transform orders for dashboard
    const transformedOrders = paginatedOrders.map(transformOrderForDashboard) || [];
    
    const totalPages = Math.ceil((filteredCount || 0) / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return {
      orders: transformedOrders,
      count: filteredCount || 0,
      limit: limit,
      offset: offset,
      page: currentPage,
      total_pages: totalPages,
      has_next: offset + limit < filteredCount,
      has_previous: offset > 0,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    medusaError(error);
    return {
      orders: [],
      count: 0,
      limit,
      offset,
      page: 1,
      total_pages: 0,
      has_next: false,
      has_previous: false,
    };
  }
};

// Get single order by ID using custom endpoint
export const retrieveOrder = async (id: string): Promise<DashboardOrder | null> => {
  try {
    const headers = await getAuthHeaders();
    const next = await getCacheOptions("orders");
    console.log(id, "IDD")
    const response = await sdk.client.fetch(
      `/store/orders/${id}`,
      {
        method: "GET",
        headers,
        next,
      }
    );

    return transformOrderForDashboard(response.order);
  } catch (error) {
    console.error("Error fetching order:", error);
    medusaError(error);
    return null;
  }
};

// Update order status using custom endpoint
export const updateOrderStatus = async (
  orderId: string,
  status: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const headers = await getAuthHeaders();

    await sdk.client.fetch(
      `/dashboard/orders/${orderId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error updating order:", error);
    return { success: false, error: error.message };
  }
};

// Bulk update orders status using custom endpoint
export const bulkUpdateOrdersStatus = async (
  orderIds: string[],
  status: string
): Promise<{ success: boolean; updatedCount: number; failedCount: number; error?: string }> => {
  try {
    const headers = await getAuthHeaders();

    const response = await sdk.client.fetch<any>(
      `/dashboard/orders/bulk`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_status",
          order_ids: orderIds,
          data: { status }
        }),
      }
    );

    return {
      success: response.success,
      updatedCount: response.updated_count || 0,
      failedCount: response.failed_count || 0,
    };
  } catch (error) {
    console.error("Error bulk updating orders:", error);
    return {
      success: false,
      updatedCount: 0,
      failedCount: orderIds.length,
      error: error.message,
    };
  }
};

// Export orders to CSV using custom endpoint
export const exportOrders = async (
  filters?: OrderFilters,
  sort?: OrderSortOptions
): Promise<{ success: boolean; data?: string; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const queryString = buildQueryString(999999, 0, filters, sort);

    const response = await sdk.client.fetch<any>(
      `/dashboard/orders/export?${queryString}`,
      {
        method: "GET",
        headers,
      }
    );
    
    return { success: true, data: response.csv };
  } catch (error) {
    console.error("Error exporting orders:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get order statistics using custom endpoint
export const getOrderStatistics = async (): Promise<{
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusBreakdown: Record<string, number>;
  recentOrdersCount: number;
}> => {
  try {
    const headers = await getAuthHeaders();

    const response = await sdk.client.fetch<any>(
      `/dashboard/orders/statistics`,
      {
        method: "GET",
        headers,
      }
    );

    return {
      totalOrders: response.total_orders || 0,
      totalRevenue: response.total_revenue || 0,
      averageOrderValue: response.average_order_value || 0,
      statusBreakdown: response.status_breakdown || {},
      recentOrdersCount: response.recent_orders_count || 0,
    };
  } catch (error) {
    console.error("Error getting order statistics:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      statusBreakdown: {},
      recentOrdersCount: 0,
    };
  }
};

// Helper function to get orders from URL params
export const listOrdersFromParams = async (
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): Promise<PaginatedOrderResponse> => {
  // Extract pagination params
  const limit = parseInt(
    (searchParams instanceof URLSearchParams
      ? searchParams.get("limit")
      : searchParams.limit) as string || "10"
  );
  
  const page = parseInt(
    (searchParams instanceof URLSearchParams
      ? searchParams.get("page")
      : searchParams.page) as string || "1"
  );
  
  const offset = (page - 1) * limit;

  // Build filters object
  const filters: OrderFilters = {};
  
  const status = searchParams instanceof URLSearchParams
    ? searchParams.get("status")
    : searchParams.status as string;
  if (status) filters.status = status;

  const fulfillmentStatus = searchParams instanceof URLSearchParams
    ? searchParams.get("fulfillment_status")
    : searchParams.fulfillment_status as string;
  if (fulfillmentStatus) filters.fulfillment_status = fulfillmentStatus;

  const paymentStatus = searchParams instanceof URLSearchParams
    ? searchParams.get("payment_status")
    : searchParams.payment_status as string;
  if (paymentStatus) filters.payment_status = paymentStatus;

  const search = searchParams instanceof URLSearchParams
    ? searchParams.get("search")
    : searchParams.search as string;
  if (search) filters.search = search;

  const customerId = searchParams instanceof URLSearchParams
    ? searchParams.get("customer_id")
    : searchParams.customer_id as string;
  if (customerId) filters.customer_id = customerId;

  const email = searchParams instanceof URLSearchParams
    ? searchParams.get("email")
    : searchParams.email as string;
  if (email) filters.email = email;

  const createdFrom = searchParams instanceof URLSearchParams
    ? searchParams.get("created_from")
    : searchParams.created_from as string;
  if (createdFrom) filters.created_from = new Date(createdFrom);

  const createdTo = searchParams instanceof URLSearchParams
    ? searchParams.get("created_to")
    : searchParams.created_to as string;
  if (createdTo) filters.created_to = new Date(createdTo);

  const minTotal = searchParams instanceof URLSearchParams
    ? searchParams.get("min_total")
    : searchParams.min_total as string;
  if (minTotal) filters.min_total = parseFloat(minTotal);

  const maxTotal = searchParams instanceof URLSearchParams
    ? searchParams.get("max_total")
    : searchParams.max_total as string;
  if (maxTotal) filters.max_total = parseFloat(maxTotal);

  const sortField = (searchParams instanceof URLSearchParams
    ? searchParams.get("sort_field")
    : searchParams.sort_field) as OrderSortOptions["field"] | undefined;
  
  const sortOrder = (searchParams instanceof URLSearchParams
    ? searchParams.get("sort_order")
    : searchParams.sort_order) as "ASC" | "DESC" | undefined;

  const sort: OrderSortOptions | undefined = sortField && sortOrder
    ? { field: sortField, order: sortOrder }
    : undefined;

  return listOrders(limit, offset, filters, sort);
};

// Transfer request functions using custom endpoints
export const createTransferRequest = async (
  state: {
    success: boolean;
    error: string | null;
    order: any | null;
  },
  formData: FormData
): Promise<{
  success: boolean;
  error: string | null;
  order: any | null;
}> => {
  const id = formData.get("order_id") as string;

  if (!id) {
    return { success: false, error: "Order ID is required", order: null };
  }

  const headers = await getAuthHeaders();

  try {
    const response = await sdk.client.fetch<any>(
      `/dashboard/orders/${id}/transfer`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      }
    );
    
    return { success: true, error: null, order: response.order };
  } catch (error) {
    return { success: false, error: error.message, order: null };
  }
};

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders();

  try {
    const response = await sdk.client.fetch<any>(
      `/dashboard/orders/${id}/transfer/accept`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ token }),
      }
    );
    
    return { success: true, error: null, order: response.order };
  } catch (error) {
    return { success: false, error: error.message, order: null };
  }
};

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders();

  try {
    const response = await sdk.client.fetch<any>(
      `/dashboard/orders/${id}/transfer/decline`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ token }),
      }
    );
    
    return { success: true, error: null, order: response.order };
  } catch (error) {
    return { success: false, error: error.message, order: null };
  }
};


// lib/data/orders.ts

export async function listPosOrders(limit: number = 1000, offset: number = 0, filters: Record<string, any> = {}) {
  try {
    // Build fields parameter to include all related data
    const fields = [
      'id',
      'status',
      'created_at',
      'updated_at',
      'email',
      'display_id',
      'custom_display_id',
      'payment_status',
      'fulfillment_status',
      'total',
      'subtotal',
      'tax_total',
      'shipping_total',
      'discount_total',
      'currency_code',
      'customer.*',
      'sales_channel',
      'payment_collections.*',
      "payments",
      'items',
      'shipping_address',
      'billing_address',
      'shipping_methods',
      'metadata',
      'fulfillments',
      'claims',
      'returns',
      'refunds',
      'promotions',
      'discounts',
      'delivery.*'
    ].join(',');

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      fields: fields,
      order: '-created_at' // Show newest first
    });

    // Add status filter to exclude cancelled and refunded by default
    const excludedStatuses = ['canceled', 'refunded'];
    // if (!filters?.include_cancelled && !filters?.include_refunded) {
    //   queryParams.append('status', excludedStatuses.map(s => `!${s}`).join(','));
    // }

    // Add date filters if provided
    if (filters?.created_at_from) {
      queryParams.append('created_at[gte]', filters.created_at_from);
    }
    if (filters?.created_at_to) {
      queryParams.append('created_at[lte]', filters.created_at_to);
    }

    // Add search filter
    if (filters?.search) {
      queryParams.append('q', filters.search);
    }

    // Add specific status filter
    if (filters?.status && filters.status !== 'all' && !filters.status.includes('!')) {
      queryParams.append('status', filters.status);
    }

    // Add payment status filter
    if (filters?.payment_status && filters.payment_status !== 'all') {
      queryParams.append('payment_status', filters.payment_status);
    }

    // Add customer filter
    if (filters?.customer_id) {
      queryParams.append('customer_id', filters.customer_id);
    }



    const response = await adminFetch(`/admin/orders?${queryParams.toString()}`);

    // Get all orders from response
    let orders = response.orders || [];
    const totalCount = response.count || 0;
    console.log(response, 'RESPPO')
    // Filter by seller_id or company_id from metadata
    if (filters?.seller_id) {
      orders = orders.filter((order: any) => order.metadata?.seller_id === filters.seller_id);
    }
    if (filters?.company_id) {
      orders = orders.filter((order: any) => order.metadata?.company_id === filters.company_id);
    }

    // Filter out cancelled and refunded on client side as fallback
    if (!filters?.include_cancelled && !filters?.include_refunded) {
      orders = orders.filter((order: any) => 
        order.status !== 'canceled' && order.status !== 'refunded'
      );
    }

    // Additional client-side filtering for date range if server filtering wasn't applied
    if (filters?.created_at_from) {
      const fromDate = new Date(filters.created_at_from);
      orders = orders.filter((order: any) => new Date(order.created_at) >= fromDate);
    }
    if (filters?.created_at_to) {
      const toDate = new Date(filters.created_at_to);
      orders = orders.filter((order: any) => new Date(order.created_at) <= toDate);
    }

    // Sort orders by created_at descending (newest first)
    orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Calculate pagination with filtered count
    const filteredCount = orders.length;
    const start = offset;
    const end = Math.min(offset + limit, filteredCount);
    const paginatedOrders = orders.slice(start, end);

    


    return {
      orders: paginatedOrders || [],
      count: filteredCount || 0,
      page: Math.floor(offset / limit) + 1,
      total_pages: Math.ceil((filteredCount || 0) / limit),
      has_next: offset + limit < filteredCount,
      has_previous: offset > 0,
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return {
      orders: [],
      count: 0,
      page: 1,
      total_pages: 0,
      has_next: false,
      has_previous: false,
    };
  }
}


export async function listDraftOrders(limit: number = 10, offset: number = 0, filters: Record<string, any> = {}) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...filters,
    });
    
    const response = await adminFetch(`/admin/draft-orders?${params.toString()}`);
    
    return {
      draft_orders: response.draft_orders || [],
      count: response.count || 0,
      page: Math.floor(offset / limit) + 1,
      total_pages: Math.ceil((response.count || 0) / limit),
      has_next: offset + limit < (response.count || 0),
      has_previous: offset > 0,
    };
  } catch (error) {
    console.error('Error fetching draft orders:', error);
    return {
      draft_orders: [],
      count: 0,
      page: 1,
      total_pages: 0,
      has_next: false,
      has_previous: false,
    };
  }
}