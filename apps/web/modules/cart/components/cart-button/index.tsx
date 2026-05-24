import { CartProvider } from "@/lib/context/cart-context"
import { retrieveCart, retrieveCompanyCart } from "@/lib/data/cart"
import { retrieveCustomer } from "@/lib/data/customer"
import { getProductByHandle } from "@/lib/data/products"
import { listCartFreeShippingPrices } from "@/lib/medusa/data/fulfillment"
import CartDrawer from "@/modules/cart/components/cart-drawer"
import { StoreFreeShippingPrice } from "@/types/shipping-option/http"

export default async function CartButton({ company }: any) {
  const cart = await retrieveCompanyCart(company?.id).catch(() => null)
  let freeShippingPrices: StoreFreeShippingPrice[] = []

  if (cart) {
    freeShippingPrices = await listCartFreeShippingPrices(cart.id)
  }



  return (
    <CartProvider cart={cart} company={company}>
      <CartDrawer freeShippingPrices={freeShippingPrices}/>
    </CartProvider>
  )
}
