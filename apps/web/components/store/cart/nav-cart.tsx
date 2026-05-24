import { retrieveCart } from "@/lib/data";
import { cookies } from "next/headers";
import CartButton from "./cart-button";

export default async function NavCart() {
  const cartId = await cookies();

  
  let cart;

  if (cartId) {
    cart = await retrieveCart(cartId);
  }

  return (
    <div className="relative">
      <CartButton cart={cart} />
    </div>
  );
}
