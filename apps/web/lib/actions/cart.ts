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


export async function retrieveCart(id?: string): Promise<B2BCart | null> {
  const cartId = id || (await getCartId())
  
  if (!cartId) {

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
    // await syncOfflineCartToServer(cart as B2BCart)
    
    return cart as B2BCart
  } catch (error) {
    // Return cached offline cart if available
    // const offlineCart = await getOfflineCart()
    return  null
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
      return cart
    } catch (error) {
      // Create offline cart when offline
      // const offlineCart = await createOfflineCart(region.id, customer?.employee?.company_id)
      // await saveOfflineCart(offlineCart)
      return null
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
    // await updateOfflineCartWithItems(lineItems, 'add')
  } catch (error) {
    // Queue operation for offline
    for (const item of lineItems) {
      // await queueCartOperation({
      //   type: 'add_item',
      //   payload: { cartId: cart.id, variantId: item.variant_id, quantity: item.quantity }
      // })
    }
    // Update local offline cart
    // await updateOfflineCartWithItems(lineItems, 'add')
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
    // await updateOfflineCartItem(lineId, data.quantity)
  } catch (error) {
    // await queueCartOperation({
    //   type: 'update_item',
    //   payload: { cartId, lineId, quantity: data.quantity }
    // })
    // await updateOfflineCartItem(lineId, data.quantity)
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
     return await sdk.client.fetch(`/dashboard/carts/${data?.cartId}/line-items/${lineId}/custom`, {
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
  } catch (error) {
 
    medusaError(error)
  }
}


