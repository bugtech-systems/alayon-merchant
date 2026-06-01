"use server"

import { sdk } from "@/lib/config"
import { getAuthHeaders, getCacheOptions } from "@/lib/data/cookies"
import medusaError from "@/lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        fields:
          "*payment_collections.payments,*items,+items.metadata,*items.variant,*items.product",
      },
      headers,
      next,
    })
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  let response = await sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/dashboard/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        fields: "+customer_id,*items,+items.metadata,*items.variant,*items.variant.product,*items.product",
        ...filters,
      },
      headers,
      next,
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
    console.log(response, "RESSS")
   // Transform the response
    const transformedOrders: DashboardOrder[] = response.map((order) => {
      // Calculate item statistics
      const items = order.items || [];
      const uniqueProducts = new Set(items.map((item) => item.product_id || item.variant?.product_id));
      
      // Calculate item totals
      const itemsWithTotals = items.map((item) => ({
        ...item,
        calculated_unit_price: item.unit_price / (item.quantity || 1),
        total_price: item.unit_price,
        // Ensure metadata is always an object
        metadata: item.metadata || {},
      }));

      return {
        ...order,
        items: itemsWithTotals,
        summary: order.summary || {
          total: order.total || 0,
          subtotal: order.subtotal || 0,
          shipping_total: order.shipping_total || 0,
          discount_total: order.discount_total || 0,
          tax_total: order.tax_total || 0,
        },
        formatted_total: new Intl.NumberFormat('en-PH', {
          style: 'currency',
          currency: order.currency_code?.toUpperCase() || 'PHP',
          minimumFractionDigits: 2,
        }).format(order.summary?.total || order.total || 0),
        item_count: items.length,
        unique_product_count: uniqueProducts.size,
      };
    });

 return {
      orders: transformedOrders,
      count: response.count,
      limit,
      offset,
    };

}


export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}