import { getRegion } from "@/lib/actions/regions"
import { retrieveCart, retrieveCompanyCart } from "@/lib/data/cart"
import { setCartId } from "@/lib/data/cookies"
import { retrieveCustomer } from "@/lib/data/customer"
import { listCartFreeShippingPrices } from "@/lib/data/fulfillment"
import { getProductByHandle } from "@/lib/data/products"
import { getBaseURL } from "@/lib/util/env"
import CartMismatchBanner from "@/modules/layout/components/cart-mismatch-banner"
import { NavigationHeader } from "@/modules/layout/templates/nav"
import { StoreNavigationHeader } from "@/modules/layout/templates/store-nav"
import FreeShippingPriceNudge from "@/modules/shipping/components/free-shipping-price-nudge"
import { StoreFreeShippingPrice } from "@/types/shipping-option/http"
import { StoreCart } from "@medusajs/types"
import { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode, params: any }) {
  const customer = await retrieveCustomer().catch(() => null)
  let freeShippingPrices: StoreFreeShippingPrice[] = []
  const params = await props.params
  const product = await getProductByHandle(params?.handle) as any;
  const company = product?.company;

  const cart = await retrieveCart();



  if (cart) {
    freeShippingPrices = await listCartFreeShippingPrices(cart.id)
  }



  return (
    <>
    <StoreNavigationHeader company={company}/>
          {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}
      {props.children}
      {/* <Footer /> */}
      {cart && freeShippingPrices && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart as StoreCart}
          freeShippingPrices={freeShippingPrices}
        />
      )}
    </>
  )
}
