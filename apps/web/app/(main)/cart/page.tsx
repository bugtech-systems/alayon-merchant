import { CartProvider } from "@/lib/context/cart-context"
import { retrieveCart } from "@/lib/data/cart"
import { retrieveCustomer } from "@/lib/data/customer"
import CartTemplate from "@/modules/cart/templates"
import { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart({searchParams}: any) {
  const cookieSession = await cookies();
  const params = await searchParams;
  const cartId = (params.cart_id || cookieSession.get("_medusa_cart_id")?.value);
  console.log(cartId, 'SEARCHH',  params.cart_id,await searchParams)
  // Redirect to cart if no cartId is found
  if (!cartId) {
    redirect("/cart");
  }

  const cart = await retrieveCart(cartId);
  const customer = await retrieveCustomer();
  const company = cart?.company;
  return (
    <CartProvider cart={cart} company={company}>
      <CartTemplate customer={customer} />
    </CartProvider>
  )
}
