// lib/actions/cart.ts
"use server"

import { sdk } from "@/lib/config"
import medusaError from "@/lib/medusa/util/medusa-error"
import { B2BCart } from "@/types/global"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "@/lib/medusa/data/cookies"
import { retrieveCustomer } from "./customer"
import { getRegion } from "./regions"
import { getCachedId } from "../data/cookies"

// Offline queue for cart operations
interface QueuedCartOperation {
  id: string
  type: 'add_item' | 'update_item' | 'remove_item' | 'update_cart'
  payload: any
  timestamp: number
  retryCount: number
}

const CART_QUEUE_KEY = 'offline_cart_queue'
const LOCAL_CART_KEY = 'offline_cart'

export async function retrieveCart(id?: string): Promise<B2BCart | null> {
  const cartId = id || (await getCartId())
  
  if (!cartId) {
    // Try to load from offline storage
    const offlineCart = await getOfflineCart()
    if (offlineCart) {
      return offlineCart as B2BCart
    }
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  try {
    const { cart } = await sdk.client.fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      credentials: "include",
      method: "GET",
      query: {
        fields: "*items, *region, *items.product, *items.variant, +items.thumbnail, +items.metadata, *promotions, *company, *company.approval_settings, *customer, *approvals, +completed_at, *approval_status, +shipping_address.metadata",
      },
      headers,
      next,
    })
    
    // Sync offline cart if exists
    await syncOfflineCartToServer(cart as B2BCart)
    
    return cart as B2BCart
  } catch (error) {
    // Return cached offline cart if available
    const offlineCart = await getOfflineCart()
    return offlineCart as B2BCart || null
  }
}

export async function getOrSetCart(countryCode: string): Promise<B2BCart | null> {
  let cart = await retrieveCart()
  const region = await getRegion(countryCode)
  const customer = await retrieveCustomer()

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    try {
      const body = {
        region_id: region.id,
        metadata: {
          company_id: customer?.employee?.company_id,
        },
      }

      const cartResp = await sdk.store.cart.create(body, {}, headers)
      setCartId(cartResp.cart.id)

      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")

      cart = await retrieveCart()
    } catch (error) {
      // Create offline cart when offline
      const offlineCart = await createOfflineCart(region.id, customer?.employee?.company_id)
      await saveOfflineCart(offlineCart)
      return offlineCart as B2BCart
    }
  }

  if (cart && cart?.region_id !== region.id) {
    try {
      await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
    } catch (error) {
      // Queue update for later sync
      // await queueCartOperation({
      //   type: 'update_cart',
      //   payload: { cartId: cart.id, region_id: region.id }
      // })
    }
  }

  return cart
}

export async function addToCartBulk({
  lineItems,
  countryCode,
  companyId
}: {
  lineItems: HttpTypes.StoreAddCartLineItem[]
  countryCode: string
  companyId?: any
}) {
  const cart = await getOrSetCart(countryCode)
  const session_id = await getCachedId()

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
  } as Record<string, any>

  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts/${cart.id}/line-items/bulk`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ line_items: lineItems, companyId, session_id }),
      }
    )

    if (!response.ok) throw new Error("Failed to add items")

    const fullfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fullfillmentCacheTag, "max")
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
    
    // Update offline cart
    await updateOfflineCartWithItems(lineItems, 'add')
  } catch (error) {
    // Queue operation for offline
    for (const item of lineItems) {
      await queueCartOperation({
        type: 'add_item',
        payload: { cartId: cart.id, variantId: item.variant_id, quantity: item.quantity }
      })
    }
    // Update local offline cart
    await updateOfflineCartWithItems(lineItems, 'add')
    medusaError(error)
  }
}

export async function updateLineItem({
  lineId,
  data,
}: {
  lineId: string
  data: HttpTypes.StoreUpdateCartLineItem
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart.updateLineItem(cartId, lineId, data, {}, headers)
    
    const fullfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fullfillmentCacheTag, "max")
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
    
    // Update offline cart
    await updateOfflineCartItem(lineId, data.quantity)
  } catch (error) {
    await queueCartOperation({
      type: 'update_item',
      payload: { cartId, lineId, quantity: data.quantity }
    })
    await updateOfflineCartItem(lineId, data.quantity)
    medusaError(error)
  }
}

export async function updateLineItemPrice(lineId: string, data: any) {
    
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = (data?.cartId || await getCartId())

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    console.log({ unit_price: data.customUnitPrice, custom_price: data.customUnitPrice, variant_id: data.variantId, customer_group_id: data.customerGroupId, price_list_id: data.priceListId, quantity: data.quantity }, 'prricee')
      await sdk.client.fetch(`/dashboard/carts/${data?.cartId}/line-items/${lineId}/custom`, {
      method: "POST",
      headers,
      body: { unit_price: data.customUnitPrice, custom_price: data.customUnitPrice, variant_id: data.variantId, customer_group_id: data.customerGroupId, price_list_id: data.priceListId, quantity: data.quantity }
    });


  } catch (error) {
    console.log(error, "ERRR")
    // await queueCartOperation({
    //   type: 'update_item',
    //   payload: { cartId, lineId, quantity: data.quantity }
    // })
    // await updateOfflineCartItem(lineId, data.quantity)
    medusaError(error)
  }
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart.deleteLineItem(cartId, lineId, {}, headers)
    
    const fullfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fullfillmentCacheTag, "max")
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
    
    // Update offline cart
    await removeOfflineCartItem(lineId)
  } catch (error) {
    await queueCartOperation({
      type: 'remove_item',
      payload: { cartId, lineId }
    })
    await removeOfflineCartItem(lineId)
    medusaError(error)
  }
}

export async function syncOfflineCartOperations() {
  const queue = await getCartQueue()
  if (queue.length === 0) return

  const headers = await getAuthHeaders()
  const cartId = await getCartId()
  
  if (!cartId) return

  for (const operation of queue) {
    try {
      switch (operation.type) {
        case 'add_item':
          await sdk.store.cart.createLineItem(
            cartId,
            { variant_id: operation.payload.variantId, quantity: operation.payload.quantity },
            {},
            headers
          )
          break
        case 'update_item':
          await sdk.store.cart.updateLineItem(
            cartId,
            operation.payload.lineId,
            { quantity: operation.payload.quantity },
            {},
            headers
          )
          break
        case 'remove_item':
          await sdk.store.cart.deleteLineItem(cartId, operation.payload.lineId, {}, headers)
          break
        case 'update_cart':
          await sdk.store.cart.update(cartId, operation.payload, {}, headers)
          break
      }
      
      // Remove successful operation from queue
      await removeFromCartQueue(operation.id)
    } catch (error) {
      console.error(`Failed to sync operation ${operation.id}:`, error)
    }
  }
}

// Helper functions for offline cart management
async function getOfflineCart(): Promise<any> {
  if (typeof window === 'undefined') return null
  const cart = localStorage.getItem(LOCAL_CART_KEY)
  return cart ? JSON.parse(cart) : null
}

async function saveOfflineCart(cart: any): Promise<void> {
  if (typeof window === 'undefined') return
  // localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart))
}

async function createOfflineCart(regionId: string, companyId?: string): Promise<any> {
  return {
    id: `offline_${Date.now()}`,
    region_id: regionId,
    items: [],
    metadata: { company_id: companyId, is_offline: true },
    created_at: new Date(),
    updated_at: new Date()
  }
}

async function updateOfflineCartWithItems(lineItems: any[], action: 'add' | 'remove'): Promise<void> {
  const offlineCart = await getOfflineCart()
  if (!offlineCart) return

  for (const item of lineItems) {
    const existingItem = offlineCart.items?.find((i: any) => i.variant_id === item.variant_id)
    
    if (existingItem) {
      existingItem.quantity += item.quantity
    } else {
      offlineCart.items.push({
        id: `item_${Date.now()}_${Math.random()}`,
        variant_id: item.variant_id,
        quantity: item.quantity,
        ...item
      })
    }
  }
  
  await saveOfflineCart(offlineCart)
}

async function updateOfflineCartItem(lineId: string, quantity: number): Promise<void> {
  const offlineCart = await getOfflineCart()
  if (!offlineCart) return

  const item = offlineCart.items?.find((i: any) => i.id === lineId)
  if (item) {
    item.quantity = quantity
    await saveOfflineCart(offlineCart)
  }
}

async function removeOfflineCartItem(lineId: string): Promise<void> {
  const offlineCart = await getOfflineCart()
  if (!offlineCart) return

  offlineCart.items = offlineCart.items?.filter((i: any) => i.id !== lineId) || []
  await saveOfflineCart(offlineCart)
}

async function getCartQueue(): Promise<QueuedCartOperation[]> {
  if (typeof window === 'undefined') return []
  const queue = localStorage.getItem(CART_QUEUE_KEY)
  return queue ? JSON.parse(queue) : []
}

async function queueCartOperation(operation: Omit<QueuedCartOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  const queue = await getCartQueue()
  const newOperation: QueuedCartOperation = {
    id: `op_${Date.now()}_${Math.random()}`,
    ...operation,
    timestamp: Date.now(),
    retryCount: 0
  }
  queue.push(newOperation)
  // localStorage.setItem(CART_QUEUE_KEY, JSON.stringify(queue))
}

async function removeFromCartQueue(operationId: string): Promise<void> {
  const queue = await getCartQueue()
  const updatedQueue = queue.filter(op => op.id !== operationId)
  localStorage.setItem(CART_QUEUE_KEY, JSON.stringify(updatedQueue))
}

async function syncOfflineCartToServer(serverCart: B2BCart): Promise<void> {
  const offlineCart = await getOfflineCart()
  if (!offlineCart || !offlineCart.is_offline) return

  // Merge offline items with server cart
  const headers = await getAuthHeaders()
  
  for (const offlineItem of offlineCart.items || []) {
    const existingItem = serverCart.items?.find(
      (item: any) => item.variant_id === offlineItem.variant_id
    )
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + offlineItem.quantity
      await sdk.store.cart.updateLineItem(
        serverCart.id,
        existingItem.id,
        { quantity: newQuantity },
        {},
        headers
      )
    } else {
      await sdk.store.cart.createLineItem(
        serverCart.id,
        { variant_id: offlineItem.variant_id, quantity: offlineItem.quantity },
        {},
        headers
      )
    }
  }
  
  // Clear offline cart after sync
  localStorage.removeItem(LOCAL_CART_KEY)
}