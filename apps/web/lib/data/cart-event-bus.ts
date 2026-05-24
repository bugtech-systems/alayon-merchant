import type { StoreProduct, StoreProductVariant } from "@medusajs/types"
import { track } from "@vercel/analytics"

export type AddToCartEventPayload = {
  lineItems: {
    productVariant: StoreProductVariant & {
      product: StoreProduct
    }
    quantity: number
  }[]
  regionId: string
  companyId?: string
}

type CartAddEventHandler = (payload: AddToCartEventPayload) => void

type CartAddEventBus = {
  emitCartAdd: (payload: AddToCartEventPayload) => void
  handler: CartAddEventHandler
  registerCartAddHandler: (handler: CartAddEventHandler) => void
}

export const addToCartEventBus: CartAddEventBus | any = {
  emitCartAdd(payload: AddToCartEventPayload) {
    this.handler(payload)

    for (const lineItem of payload.lineItems) {
      track("add_to_cart", {
        product_name: lineItem.productVariant.title,
        quantity: lineItem.quantity,
        companyId: payload?.companyId,
        regionId: payload?.regionId
      })
    }
  },

  handler: () => {},

  registerCartAddHandler(handler: CartAddEventHandler) {
    this.handler = handler
  },
}
