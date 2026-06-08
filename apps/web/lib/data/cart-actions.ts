'use server'
// app/lib/data/cart-actions.ts

import { getAuthHeaders, getCacheOptions, getCacheTag, getCartId, setCartId } from "@/lib/data/cookies"
import { getRegion } from "@/lib/data/regions"
import { sdk } from "@/lib/config"
import { getLocale } from "./locale-actions"
import { HttpTypes } from "@medusajs/types"
import medusaError from "../util/medusa-error"
import { revalidateTag } from "next/cache"
import { listRegions, retrieveRegion } from "../actions/regions"

export interface AddToCartWithPricingParams {
  variantId: string
  quantity: number
  countryCode: string
  customerGroupId?: string
  companyId?: string
  priceListId?: string
  customPrice?: number
  metadata?: Record<string, any>
  applyQuantityPricing?: boolean
  regionId?: any
}

export interface UpdateLineItemWithPricingParams {
  lineId: string
  quantity: number
  customerGroupId?: string
  priceListId?: string
}

// Enhanced retrieve cart that includes custom pricing info
// lib/data/cart.ts (updated retrieveCart function)

export async function retrieveCart(
  id?: string, 
  customerGroupId?: string,
  priceListId?: string
) {
  const cartId = (id || (await getCartId()))
  if (!cartId) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  // Fetch the cart first
  const { cart } = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      credentials: "include",
      method: "GET",
      query: {
        fields:
          "*items, *region, *items.product, *items.variant, +items.thumbnail, +items.metadata, *promotions, *company, *company.approval_settings, *customer, *approvals, +completed_at, *approval_status",
      },
      headers,
      next,
    })
    .catch(() => {
      return { cart: null }
    })
console.log(cart)
  if (!cart) {
    return null
  }

  // Fetch custom pricing for cart items
    if (customerGroupId && cart?.items?.length) {
      const enrichedCart = await enrichCartWithCustomPricing(cart, customerGroupId)
      return enrichedCart
    }

  return cart as B2BCart
}

// Function to fetch pricing for a single variant (for product cards)
export async function fetchVariantPricing(
  variantId: string,
  quantity: number = 1,
  customerGroupId?: string,
  priceListId?: string,
  currencyCode: string = "PHP"
) {
  try {
    const headers = await getAuthHeaders()
    
    // Use the same custom pricing endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/api/store/carts/custom-pricing`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          items: [{ variant_id: variantId, quantity }],
          customer_group_id: customerGroupId,
          price_list_id: priceListId,
          currency_code: currencyCode,
        }),
      }
    )

    const data = await response.json()
    
    if (data.success && data.prices && data.prices[0]) {
      return data.prices[0]
    }
    
    return null
  } catch (error) {
    console.error("Error fetching variant pricing:", error)
    return null
  }
}

// New: Enrich cart with custom pricing from price lists
async function enrichCartWithCustomPricing(
  cart: HttpTypes.StoreCart,
  customerGroupId: string,
  priceListId?: string
) {
  if (!cart.items?.length) return cart

  const headers = await getAuthHeaders()
  
  try {
    // Fetch custom pricing for all items in cart
    const response = await sdk.client.fetch(
      `/dashboard/carts/${cart.id}/pricing-details`,
      {
        method: "GET",
        headers
      }
    )
    console.log(response, 'ressp')
    // Create price map for quick lookup
    const priceMap = new Map()
    response.prices.forEach((price: any) => {
      priceMap.set(price.variant_id, {
        unit_price: price.amount,
        original_price: price.original_amount,
        price_list_id: price.price_list_id,
        applied_rule: price.applied_quantity_rule,
      })
    })

    // Enrich cart items with custom pricing
    const enrichedItems = cart.items.map(item => {
      const customPrice = priceMap.get(item.variant_id)
      if (customPrice) {
        return {
          ...item,
          unit_price: customPrice.unit_price,
          original_unit_price: customPrice.original_price,
          metadata: {
            ...item.metadata,
            custom_pricing_applied: true,
            price_list_id: customPrice.price_list_id,
            applied_quantity_rule: customPrice.applied_rule,
            customer_group_id: customerGroupId,
          },
        }
      }
      return item
    })

    // Recalculate cart totals
    const subtotal = enrichedItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    )

    return {
      ...cart,
      items: enrichedItems,
      subtotal,
      total: subtotal, // Add shipping and tax calculations as needed
      metadata: {
        ...cart.metadata,
        custom_pricing_enriched: true,
        customer_group_id: customerGroupId,
        enriched_at: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("Failed to enrich cart with custom pricing:", error)
    return cart
  }
}

// Enhanced get or set cart with customer group support
export async function getOrSetCart(
  countryCode: string,
  customerGroupId?: string,
  priceListId?: string
) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id,metadata", customerGroupId)

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { 
        region_id: region.id, 
        locale: locale || undefined,
        metadata: {
          customer_group_id: customerGroupId,
          price_list_id: priceListId,
        }
      },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(
      cart.id, 
      { 
        region_id: region.id,
        metadata: {
          ...cart.metadata,
          customer_group_id: customerGroupId,
          price_list_id: priceListId,
        }
      }, 
      {}, 
      headers
    )
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
  }

  // If customer group is provided but not in cart metadata, update it
  if (customerGroupId && cart?.metadata?.customer_group_id !== customerGroupId) {
    await sdk.store.cart.update(
      cart.id,
      {
        metadata: {
          ...cart.metadata,
          customer_group_id: customerGroupId,
          price_list_id: priceListId,
        }
      },
      {},
      headers
    )
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
  }

  return cart
}

// Enhanced add to cart with custom pricing support
export async function addToCartWithPricing(params: AddToCartWithPricingParams) {
  const {
    variantId,
    quantity,
    countryCode,
    customerGroupId,
    companyId,
    priceListId,
    customPrice,
    metadata = {},
    applyQuantityPricing = true,
    regionId
  } = params

  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  // Get or create cart with customer group context
  const cart = await getOrSetCart(countryCode, customerGroupId, priceListId)
  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }
  try {
    // If custom pricing is needed, use the enhanced endpoint
    if (customerGroupId || priceListId || customPrice) {
      const response = await sdk.client.fetch(
        `/dashboard/carts/${cart.id}/line-items/custom`,
        {
          method: "POST",
          headers,
          body: {
            variant_id: variantId,
            quantity,
            region_id: regionId,
            customer_group_id: customerGroupId,
            price_list_id: priceListId,
            custom_price: customPrice,
            company_id: companyId,
            apply_quantity_pricing: applyQuantityPricing,
            metadata: {
              ...metadata,
              added_with_custom_pricing: true,
            },
          },
        }
      )

      // Invalidate cache
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, "max")
      return {
        success: true,
        cart: response.cart,
        appliedPricing: response.applied_pricing,
      }
    } else {
      // Use standard add to cart without custom pricing
      await sdk.store.cart.createLineItem(
        cart.id,
        {
          variant_id: variantId,
          quantity,
          ...{region_id: regionId, ...metadata},
        },
        {},
        headers
      )

      // Invalidate cache
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, "max")

      return {
        success: true,
        cart: await retrieveCart(cart.id, undefined, customerGroupId),
      }
    }
  } catch (error) {
    console.error("Error adding item to cart:", error)
    throw error
  }
}

// Enhanced update line item with pricing re-evaluation
export async function updateLineItemWithPricing(params: UpdateLineItemWithPricingParams) {
  const { lineId, quantity, customerGroupId, priceListId } = params

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
    // Get current cart to retrieve customer group if not provided
    const cart = await retrieveCart(cartId, undefined, customerGroupId)
    const effectiveCustomerGroupId = customerGroupId || cart?.metadata?.customer_group_id
    const effectivePriceListId = priceListId || cart?.metadata?.price_list_id

    // Use enhanced endpoint to update with pricing re-evaluation
    const response = await sdk.client.fetch(
      `/dashboard/carts/${cartId}/line-items/${lineId}/custom`,
      {
        method: "PUT",
        headers,
        body: {
          quantity,
          customer_group_id: effectiveCustomerGroupId,
          price_list_id: effectivePriceListId,
          recalculate_price: true,
        },
      }
    )
    // Invalidate cache
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag, "max")

    return {
      success: true,
      cart: response.cart,
      updatedPricing: response.updated_pricing,
    }
  } catch (error) {
    console.error("Error updating line item:", error)
    throw error
  }
}

// Add multiple items to cart with bulk pricing
export async function addMultipleItemsToCartWithPricing(
  items: Array<{
    variantId: string
    quantity: number
    customPrice?: number
    metadata?: Record<string, any>
  }>,
  options: {
    countryCode: string
    customerGroupId?: string
    companyId?: string
    priceListId?: string
    applyBulkPricing?: boolean
  }
) {
  const { countryCode, customerGroupId, companyId, priceListId, applyBulkPricing = true } = options

  if (!items.length) {
    throw new Error("No items to add to cart")
  }

  // Get or create cart
  const cart = await getOrSetCart(countryCode, customerGroupId, priceListId)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = await getAuthHeaders()

  try {
    const response = await sdk.client.fetch(
      `/dashboard/carts/${cart.id}/line-items/bulk`,
      {
        method: "POST",
        headers,
        body: {
          items: items.map(item => ({
            variant_id: item.variantId,
            quantity: item.quantity,
            custom_price: item.customPrice,
            metadata: item.metadata,
          })),
          customer_group_id: customerGroupId,
          company_id: companyId,
          price_list_id: priceListId,
          apply_bulk_pricing: applyBulkPricing,
        },
      }
    )

    // Invalidate cache
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag, "max")

    return {
      success: true,
      cart: response.cart,
      pricingSummary: response.pricing_summary,
    }
  } catch (error) {
    console.error("Error adding multiple items to cart:", error)
    throw error
  }
}

// Remove line item from cart
export async function removeLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when removing line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when removing line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, "max")
    })
    .catch(medusaError)
}

// Apply custom pricing to entire cart
export async function applyCustomPricingToCart(
  customerGroupId: string,
  priceListId?: string
) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No cart found to apply custom pricing")
  }

  const headers = await getAuthHeaders()

  try {
    const response = await sdk.client.fetch(
      `/dashboard/carts/${cartId}/apply-custom-pricing`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_group_id: customerGroupId,
          price_list_id: priceListId,
        }),
      }
    )

    // Invalidate cache
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")

    return {
      success: true,
      cart: response.cart,
      appliedPricing: response.applied_pricing,
    }
  } catch (error) {
    console.error("Error applying custom pricing to cart:", error)
    throw error
  }
}

// Get cart with full pricing details
export async function getCartWithPricingDetails(
  cartId?: string,
  customerGroupId?: string
) {
  const id = cartId || (await getCartId())

  if (!id) {
    return null
  }

  const headers = await getAuthHeaders()

  try {
    const response = await sdk.client.fetch(
      `/dashboard/carts/${id}/pricing-details`,
      {
        method: "GET",
        headers,
        query: {
          customer_group_id: customerGroupId,
        },
      }
    )

    return response.cart
  } catch (error) {
    console.error("Error fetching cart with pricing details:", error)
    return null
  }
}

// Helper: Update cart metadata (for setting customer group)
export async function updateCartMetadata(metadata: Record<string, any>) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { metadata }, {}, headers)
    .then(async ({ cart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
      return cart
    })
    .catch(medusaError)
}

// Preserve original functions for backward compatibility
export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  return addToCartWithPricing({
    variantId,
    quantity,
    countryCode,
  })
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag, "max")

      return cart
    })
    .catch(medusaError)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  return updateLineItemWithPricing({
    lineId,
    quantity,
  })
}