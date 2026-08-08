"use server"

import { sdk } from "@/lib/config"
import medusaError from "@/lib/util/medusa-error"
import { StoreApprovalResponse } from "@/types/approval"
import { B2BCart } from "@/types/global"
import { HttpTypes, StoreCart } from "@medusajs/types"
import { track } from "@vercel/analytics/server"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCachedId,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getCompanyId,
  removeCartId,
  setCartId,
  setCompanyId,
} from "@/lib/data/cookies"
import { retrieveCustomer } from "@/lib/data/customer"
import { getRegion } from "@/lib/data/regions"
import { DeliveryDTO } from "../types"
import { retrieveUser } from "./users"

export async function createDelivery(cartId: string, company_id: any) {
  const { delivery } = await sdk.client.fetch<{
    delivery: DeliveryDTO;
  }>("/store/deliveries", {
    method: "POST",
    body: { cart_id: cartId, company_id },
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    }
  });

  revalidateTag("deliveries", 'max');

  return delivery;
}

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
    .fetch(`/store/carts/${cartId}`, {
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

  if (!cart) {
    return null
  }

  // If price list ID is provided, fetch variant prices with customer group context
  if (priceListId && cart.items?.length > 0) {
    try {
      // Extract variant IDs from cart items
      const variantIds = cart.items
        .map(item => item.variant_id)
        .filter(Boolean) as string[]

      if (variantIds.length > 0) {
        // Fetch prices for variants using specific price list and customer group
        const pricesResponse = await sdk.client.fetch(`/store/price-lists/${priceListId}/variants/prices`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: {
            variant_ids: variantIds,
            customer_group_id: customerGroupId,
            region_id: cart.region_id,
            currency_code: cart.currency_code,
          },
        })

        // Create a map of variant prices
        const variantPriceMap = new Map()
        if (pricesResponse.prices) {
          pricesResponse.prices.forEach((price: any) => {
            variantPriceMap.set(price.variant_id, {
              amount: price.amount,
              original_amount: price.original_amount,
              calculated_price: price.calculated_price,
              price_list_id: price.price_list_id,
              price_list_type: price.price_list_type,
            })
          })
        }

        // Update cart items with customer group pricing
        cart.items = cart.items.map((item: any) => {
          const variantPrice = variantPriceMap.get(item.variant_id)
          if (variantPrice) {
            // Calculate unit price based on quantity if min/max quantity rules apply
            let unitPrice = variantPrice.amount
            let originalUnitPrice = variantPrice.original_amount || variantPrice.amount

            // Apply quantity-based pricing if available
            if (variantPrice.quantity_prices && variantPrice.quantity_prices.length > 0) {
              const applicablePrice = variantPrice.quantity_prices
                .sort((a: any, b: any) => b.min_quantity - a.min_quantity)
                .find((qp: any) => item.quantity >= qp.min_quantity)
              
              if (applicablePrice) {
                unitPrice = applicablePrice.amount
                originalUnitPrice = applicablePrice.original_amount || applicablePrice.amount
              }
            }

            return {
              ...item,
              unit_price: unitPrice,
              original_unit_price: originalUnitPrice,
              price_list_id: variantPrice.price_list_id,
              price_list_type: variantPrice.price_list_type,
              is_customer_group_pricing: true,
              customer_group_id: customerGroupId,
            }
          }
          return item
        })

        // Recalculate cart totals with new pricing
        cart.total = calculateCartTotal(cart.items, cart.shipping_methods, cart.discounts)
        cart.subtotal = calculateSubtotal(cart.items)
        cart.tax_total = await calculateTaxTotal(cart)
        
        // Add metadata about applied pricing
        cart.metadata = {
          ...cart.metadata,
          applied_price_list_id: priceListId,
          applied_customer_group_id: customerGroupId,
          pricing_applied_at: new Date().toISOString(),
        }
      }
    } catch (error) {
      console.error("Error fetching customer group pricing:", error)
      // Fall back to regular pricing
      cart.metadata = {
        ...cart.metadata,
        pricing_error: error.message,
        fallback_to_regular_pricing: true,
      }
    }
  }

  return cart as B2BCart
}




// Helper function to calculate subtotal
function calculateSubtotal(items: any[]): number {
  return items.reduce((total, item) => {
    return total + (item.unit_price * item.quantity)
  }, 0)
}

// Helper function to calculate cart total
function calculateCartTotal(items: any[], shippingMethods: any[] = [], discounts: any[] = []): number {
  let subtotal = calculateSubtotal(items)
  
  // Add shipping costs
  const shippingTotal = shippingMethods.reduce((total, method) => {
    return total + (method.amount || 0)
  }, 0)
  
  // Apply discounts
  const discountTotal = discounts.reduce((total, discount) => {
    if (discount.type === 'percentage') {
      return total + (subtotal * (discount.value / 100))
    } else if (discount.type === 'fixed') {
      return total + discount.value
    }
    return total
  }, 0)
  
  return subtotal + shippingTotal - discountTotal
}

// Helper function to calculate tax total (simplified)
async function calculateTaxTotal(cart: any): Promise<number> {
  // Implement your tax calculation logic here
  // This could call your tax provider or use region tax rates
  if (!cart.region?.tax_rate) return 0
  
  const subtotal = calculateSubtotal(cart.items)
  return subtotal * (cart.region.tax_rate / 100)
}

export async function retrieveCompanyCart(id?: string) {
  const cachedId = await getCachedId()

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  let company = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts?company_id=${id}&session_id=${cachedId}`, {
      credentials: "include",
      method: "GET",
      query: {
        fields:
          "*items, *region, *items.product, *items.variant, +items.thumbnail, +items.metadata, *promotions, *company, *company.approval_settings, *customer, *approvals, +completed_at, *approval_status",
      },
      headers,
      next,
    })
    .then(({ cart }) => {
      return cart as B2BCart
    })
    .catch(() => {
      return null
    })


    return company
}

export async function capturePayment(data: any) {


  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("order")),
  }

  let order = await sdk.client
    .fetch<any>(`/dashboard/capture-payment`, {
      credentials: "include",
      method: "POST",
      body: data,
      headers,
      next,
    })
    .then(({ order }) => {
      return order as any
    })
    .catch(() => {
      return null
    })


    return order
}

export async function getOrSetCart(id: any) {
  let user = await retrieveUser();

  const region = await getRegion('ph')
  const session_id = (user?.id || await getCachedId())


  if (!region) {
    throw new Error(`Region not found for country code: ${region?.county_code}`)
  }

    let priceListId = user?.metadata?.role === 'company' 
        ? user.employee?.company?.price_list_id 
        : user?.driver?.price_list_id;
    let customerGroupId = user?.metadata?.role === 'company' 
        ? user.employee?.company?.customer_group_id 
        : user?.driver?.customer_group_id;
  
  let cart = await retrieveCart(id, customerGroupId, priceListId) as any;

  const headers = {
    ...(await getAuthHeaders()),
  }


  console.log(user, "USER")
  if (!cart) {
    const body = {
      region_id: region.id,
      metadata: {
        seller_id: user?.id,
        session_id
      },
    }

    const {cart: cartData} = await sdk.store.cart.create(body, {}, headers)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
    
    setCartId(cartData?.id)
    cart = cartData;
  }


  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
  }

  return cart
}

export async function updateCart(data: any, id?: any) {
  const cartId = id ||await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }









  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }) => {
      const fullfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fullfillmentCacheTag, "max")
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
      return cart
    })
    .catch(medusaError)
}


export async function addToPosCart({
  variantId,
  quantity,
  countryCode = 'ph',
  unit_price,
  cart_id,
  regionId
}: {
  variantId: string
  quantity: number
  countryCode: string
  unit_price?: number
  regionId?: string
  cart_id?: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }
  
  const cart = await getOrSetCart(cart_id)
  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  let newCart = await sdk.client.fetch(`/dashboard/carts/custom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: {
          cart_id: cart_id,
          variant_id: variantId,
          quantity: quantity,
          custom_price: unit_price,
          region_id: regionId
        },
      });
   
      const fullfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fullfillmentCacheTag, "max")
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
    console.log(newCart, 'new carrt')
    return newCart
}

export async function addToCartBulk({
  lineItems,
  countryCode = 'ph',
  companyId
}: {
  lineItems: HttpTypes.StoreAddCartLineItem[]
  countryCode: string
  companyId?: string
}) {
  console.log(countryCode, lineItems, 'llssns', companyId)
  if(companyId){
  await setCompanyId(companyId)
  }
  const cart = await getOrSetCart(countryCode, companyId)
  console.log(cart, companyId, 'GETTTS SEEET')
  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }
  
  const headers = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
  } as Record<string, any>

  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  }

  console.log(lineItems, countryCode, 'addding', companyId)
  await fetch(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts/${cart.id}/line-items/bulk`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ line_items: lineItems }),
    }
  )
    .then(async () => {
      const fullfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fullfillmentCacheTag, "max")
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
    })
    .catch(medusaError)
}


export async function updateLineItem({
  lineId,
  data
}: {
  lineId: string
  data: HttpTypes.StoreUpdateCartLineItem
}) {

  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }
  let user = await retrieveUser();


  const cart = await getOrSetCart('ph', user?.id)
  console.log(cart, user, 'compaaanyyy iddd')

  if (!cart?.id) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await setCartId(cart?.id)
  await sdk.store.cart
    .updateLineItem(cart?.id, lineId, data, {}, headers)
    .then(async () => {
      const fullfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fullfillmentCacheTag, "max")
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
  const cartId = await getCartId()
  if (!cartId) {
    await removeCartId()
    return new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      const fullfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fullfillmentCacheTag, "max")
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
    })
    .catch(medusaError)
}

export async function emptyCart() {
  const cart = await retrieveCart()
  if (!cart) {
    throw new Error("No existing cart found when emptying cart")
  }

  for (const item of cart.items || []) {
    await deleteLineItem(item.id)
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, "max")
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
    })
    .catch(medusaError)
}



export async function initiatePaymentSession(
  cart: any,
  data: {
    provider_id: string;
    context?: Record<string, unknown>;
  }
): Promise<any> {
  const headers = await getAuthHeaders();
  
  try {
    const response = await sdk.store.payment.initiatePaymentSession(
      cart,
      data,
      {},
      headers
    );
    
    // Revalidate cart cache if needed
    const cartCacheTag = `cart-${cart?.id}`;
    revalidateTag(cartCacheTag, "max");
    
    return response;
  } catch (error) {
    console.error("Failed to initiate payment session:", error);
    throw medusaError(error);
  }
}







export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()
  if (!cartId) {
    throw new Error("No existing cart found")
  }

  await updateCart({ promo_codes: codes })
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag, "max")
      const fullfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fullfillmentCacheTag, "max")
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag(getCacheTag("carts"))
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag(getCacheTag("carts"))
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag(getCacheTag("carts"))
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setShippingAddress(formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }

    const cartId = await getCartId()
    const customer = await retrieveCustomer()

    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const data = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: formData.get("shipping_address.company"),
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: formData.get("shipping_address.phone"),
      },
      // customer_id: customer?.id,
      email: customer?.email || formData.get("email"),
    } as any
    await updateCart(data)
  } catch (e: any) {
    throw new Error(e)
  }
}

export async function setBillingAddress(formData: FormData) {
  try {
    const cartId = getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting billing address")
    }

    const data = {
      billing_address: {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: "",
        company: formData.get("billing_address.company"),
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
      },
    } as any

    await updateCart(data)
  } catch (e: any) {
    return e.message
  }
}

export async function setContactDetails(
  currentState: unknown,
  formData: FormData
) {
  try {
    const cartId = getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting contact details")
    }
    const data = {
      email: formData.get("email") as string,
      metadata: {
        invoice_recipient: formData.get("invoice_recipient"),
        cost_center: formData.get("cost_center"),
        requisition_number: formData.get("requisition_number"),
        door_code: formData.get("door_code"),
        notes: formData.get("notes"),
      },
    }
    await updateCart(data)
  } catch (e: any) {
    return e.message
  }
}


export async function setIsTakeOut(cart: any, isTakeOut: any) {
  try {
    const cartId = await getOrSetCart(cart?.id)
    if (!cartId) {
      throw new Error("No existing cart found when setting contact details")
    }
    const data = {
      metadata: {
        ...cart?.metadata,
        isTakeOut
      },
    }

    console.log()
    await updateCart(data, cart?.id)
  } catch (e: any) {
    return e.message
  }
}

// export async function updateCartMetadata(cartId: any, metadata: any) {
//   try {
//     const cart = await getOrSetCart(cartId)
//     if (!cart?.id) {
//       throw new Error("No existing cart found when setting contact details")
//     }
//     const data = {
//       metadata: {
//         ...cart?.metadata,
//         ...metadata
//       },
//     }

//     console.log(data)
//     await updateCart(data, cart?.id)
//   } catch (e: any) {
//     return e.message
//   }
// }


export async function placeOrder(
  cartId?: string, company_id?: string
): Promise<HttpTypes.StoreCompleteCartResponse> {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartsTag = await getCacheTag("carts")
  const ordersTag = await getCacheTag("orders")
  const approvalsTag = await getCacheTag("approvals")

  const response = await sdk.store.cart
    .complete(id, {}, headers)
    .catch(medusaError)

  if (response.type === "cart") {
    return response
  }

  let delivery = await createDelivery(id, company_id)

  track("order_completed", {
    order_id: response.order.id,
  })

  revalidateTag(cartsTag, "max")
  revalidateTag(ordersTag, "max")
  revalidateTag(approvalsTag, "max")

  await removeCartId()

  redirect(`/your-order?id=${delivery.id}`)
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag, "max")
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag, "max")

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag, "max")

  redirect(`/${countryCode}${currentPath}`)
}

export async function createCartApproval(cartId: string, createdBy: string) {
  const headers = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
  }

  const { approval } = await sdk.client
    .fetch<StoreApprovalResponse>(`/store/carts/${cartId}/approvals`, {
      method: "POST",
      headers,
      credentials: "include",
    })
    .catch((err) => {
      if (err.response?.json) {
        return err.response.json().then((body: any) => {
          throw new Error(body.message || err.message)
        })
      }
      throw err
    })

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, "max")

  const approvalsCacheTag = await getCacheTag("approvals")
  revalidateTag(approvalsCacheTag, "max")

  return approval
}
