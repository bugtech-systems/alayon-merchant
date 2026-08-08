"use server";

import { UpsertAddressDTO } from "@medusajs/types";
import { revalidateTag } from "next/cache";
import { sdk } from "../medusa/config";
import { retrieveCart } from "../medusa/data/cart";
import { getAuthHeaders, getCacheOptions, removeCartId } from "../medusa/data/cookies";
import { DeliveryDTO } from "../types";
import medusaError from "../medusa/util/medusa-error";
import { track } from "@vercel/analytics/server"
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function updateCart(cartId: string, data: Record<string, unknown>) {
  if (!cartId) {
    throw new Error("No cart found");
  }

  const response = await sdk.store.cart.update(
    cartId,
    data,
    {},
    {
      ...(await getAuthHeaders()),
    }
  );

  revalidateTag("carts", "max");

  return response;
}

export async function completeCart(cartId: string) {
  if (!cartId) {
    throw new Error("No cart found");
  }

  const response = await sdk.store.cart.complete(
    cartId,
    {},
    {
      ...(await getAuthHeaders()),
    }
  );

  revalidateTag("carts", "max");

  return response;
}

export async function initiatePaymentSession(
  cart: any,
  data: {
    provider_id: string
    context?: Record<string, unknown>
  }
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  
    return sdk.store.payment
    .initiatePaymentSession(cart as any, data, {}, headers)
    .then(async (resp) => {
      revalidateTag('carts', 'max')
      return resp
    })
    .catch(medusaError);
}

export async function addPaymentSession(cartId: string) {
  const cart = await retrieveCart(cartId);
  console.log(await getAuthHeaders(), 'jeadss')
  const res = await sdk.store.payment.initiatePaymentSession(
    cart,
    {},
    undefined,
    {
      ...(await getAuthHeaders()),
    }
  );

  return res;
}

export async function createDelivery(data: any) {
  const { delivery } = await sdk.client.fetch<{
    delivery: DeliveryDTO;
  }>("/store/deliveries", {
    method: "POST",
    body: data,
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders())
    }
  });

  revalidateTag("deliveries", 'max');

  return delivery;
}

// export async function placeOrder(prevState: any, data: FormData) {
//   // Get cart_id from FormData instead of cookies
//   const cartId = data.get("cart-id")?.toString();
  
//   if (!cartId) {
//     return { message: "No cart found" };
//   }

//   const firstName = data.get("first-name")?.toString();
//   const lastName = data.get("last-name")?.toString();
//   const address = data.get("address")?.toString();
//   const city = data.get("city")?.toString();
//   const zip = data.get("zip")?.toString();
//   const phone = data.get("phone")?.toString();
//   const email = data.get("email")?.toString();
//   const restaurantId = data.get("restaurant-id")?.toString();
//   const notes = data.get("notes")?.toString();

//   if (
//     !firstName ||
//     !lastName ||
//     !address ||
//     !city ||
//     !zip ||
//     !phone ||
//     !email 
//   ) {
//     return { message: "Please fill in all fields" };
//   }

//   const shippingAddress: UpsertAddressDTO = {
//     first_name: firstName,
//     last_name: lastName,
//     address_1: address,
//     city,
//     postal_code: zip,
//     phone,
//   };

//   try {
//     // Update cart with shipping address and notes
//     const updatedCart = await updateCart(cartId, {
//       shipping_address: shippingAddress,
//       metadata: {
//         notes: notes || "",
//         customer_email: email,
//       },
//     });

//     if (!updatedCart) {
//       return { message: "Error updating cart" };
//     }

//     // Create delivery
//     // const delivery = await createDelivery(cartId, restaurantId);

//     // Optional: Clear cart from localStorage by setting cookie (if you still use cookies)
//     const cookieStore = await cookies();
//     cookieStore.set("_medusa_cart_id", "", { maxAge: 0 });
//     cookieStore.set("_medusa_delivery_id", delivery.id);
    
//     // Return success response
//     return { 
//       success: true, 
//       deliveryId: delivery.id,
//       message: "Order placed successfully!" 
//     };
    
//   } catch (error) {
//     console.error('Error placing order:', error);
//     return { message: "Error placing order. Please try again." };
//   }
// }

export async function placeOrder(
  prevState: any, data: FormData
) {
  
  const cart = await retrieveCart();

  console.log(cart, 'CAAARRTT')
  if (!cart) {
    throw new Error("No existing cart found when placing an order")
  }


  const firstName = data.get("first_name")?.toString();
  const lastName = data.get("last_name")?.toString();
  const address = data.get("address_1")?.toString();
  const city = data.get("city_code")?.toString();
  const barangay = data.get("barangay_code")?.toString();
  const zip = data.get("zip")?.toString();
  const phone = data.get("phone")?.toString();
  const email = data.get("email")?.toString();
  const notes = data.get("notes")?.toString();
console.log(firstName, lastName, address, city, phone, barangay, 'FOOORM')
  if (
    !firstName ||
    !lastName ||
    !address ||
    !city ||
    // !zip ||
    !phone 
    // || !email 
  ) {
    return { message: "Please fill in all fields" };
  }

  const shippingAddress: UpsertAddressDTO = {
    first_name: firstName,
    last_name: lastName,
    address_1: address,
    city,
    postal_code: zip,
    phone,
  };

  // const cartsTag = await getCacheOptions("carts")
  // const ordersTag = await getCacheOptions("orders")
  // const approvalsTag = await getCacheOptions("approvals")

  // const response = await sdk.store.cart
  //   .complete(id, {}, {...(await getAuthHeaders())})
  //   .catch(medusaError) as any



  const delivery = await createDelivery(cart?.id, cart?.metadata?.company_id);

  // track("order_completed", {
  //   order_id: delivery.id,
  // })

  console.log(delivery, 'DELIVERY')
//     // Optional: Clear cart from localStorage by setting cookie (if you still use cookies)
    const cookieStore = await cookies();
    cookieStore.set("_medusa_cart_id", "", { maxAge: 0 });
    cookieStore.set("_medusa_delivery_id", delivery.id);


  revalidateTag("carts", "max")
  // revalidateTag("orders", "max")
  // revalidateTag("approvals", "max")
    // Return success response
    
    redirect(`/your-order?id=${delivery.id}`);
    
}

export async function updateCartShippingAddress(cartId: string, shippingAddress: any) {
  try {
    const headers = await getAuthHeaders();
    
    const response = await sdk.client.fetch(
      `/store/carts/${cartId}`,
      {
        method: "POST",
        body: {
          shipping_address: shippingAddress,
        },
        headers,
      }
    ) as any;
    
    revalidateTag(`carts`, "max");
    
    return { success: true, cart: response.cart };
  } catch (error: any) {
    console.error("Error updating cart shipping address:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCartEmail(cartId: string, email: string) {
  try {
    const { cart } = await sdk.store.cart.update(cartId, { email });
    return { success: true, cart };
  } catch (error) {
    console.error("Error updating cart email:", error);
    return { success: false, error };
  }
}

export async function updateCartMetadata(cartId: string, metadata: Record<string, any>) {
  try {
    const { cart } = await sdk.store.cart.update(cartId, { metadata });
    return { success: true, cart };
  } catch (error) {
    console.error("Error updating cart metadata:", error);
    return { success: false, error };
  }
}
