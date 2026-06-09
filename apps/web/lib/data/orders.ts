"use server";

import { sdk } from "@/lib/config";
import { getAuthHeaders, getCacheOptions } from "@/lib/data/cookies";
import medusaError from "@/lib/util/medusa-error";

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

  return {
    id: order.id,
    display_id: order.display_id,
    status: order.status,
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

// Build query string for custom API
const buildQueryString = (
  limit: number,
  offset: number,
  filters?: OrderFilters | any,
  sort?: OrderSortOptions
): string => {
  const params = new URLSearchParams();
  
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());
  
  // Add filters
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.payment_status) params.set("payment_status", filters.payment_status);
  if (filters?.fulfillment_status) params.set("fulfillment_status", filters.fulfillment_status);
  if (filters?.customer_id) params.set("customer_id", filters.customer_id);
  if (filters?.company_id) params.set("company_id", filters.company_id);
  if (filters?.seller_id) params.set("seller_id", filters.seller_id);
  if (filters?.email) params.set("email", filters.email);
  if (filters?.created_from) params.set("created_from", filters.created_from.toISOString());
  if (filters?.created_to) params.set("created_to", filters.created_to.toISOString());
  if (filters?.min_total !== undefined) params.set("min_total", filters.min_total.toString());
  if (filters?.max_total !== undefined) params.set("max_total", filters.max_total.toString());
  
  // Add sorting
  if (sort?.field) params.set("sort_by", sort.field);
  if (sort?.order) params.set("sort_order", sort.order);
  
  // Request expanded data
  params.set("expand_items", "true");
  params.set("expand_customer", "true");
  params.set("expand_addresses", "true");
  params.set("expand_shipping_methods", "true");
    params.set("expand_payments", "false");

  return params.toString();
};

// Main list orders function using Medusa SDK client to fetch from custom endpoint
export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: any,
  sort?: OrderSortOptions
): Promise<PaginatedOrderResponse> => {
  try {
    const headers = await getAuthHeaders();
    const next = await getCacheOptions("orders");
    const queryString = buildQueryString(limit, offset, filters, sort);
    // Use Medusa SDK client to fetch from custom endpoint
    const response = await sdk.client.fetch<any>(
      `/dashboard/orders?${queryString}`,
      {
        method: "GET",
        headers,
        next,
      }
    );
console.log(response.orders, 'RESSSPPON')
    // Transform orders for dashboard
    const transformedOrders = response.orders?.map(transformOrderForDashboard) || [];
    
    const totalPages = Math.ceil((response.count || 0) / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return {
      orders: transformedOrders,
      count: response.count || 0,
      limit: response.limit || limit,
      offset: response.offset || offset,
      page: currentPage,
      total_pages: totalPages,
      has_next: currentPage < totalPages,
      has_previous: currentPage > 1,
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

    const response = await sdk.client.fetch<any>(
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