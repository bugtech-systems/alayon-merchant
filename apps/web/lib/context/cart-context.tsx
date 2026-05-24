"use client"

import {
  addToCartBulk,
  deleteLineItem,
  emptyCart,
  updateLineItem,
} from "@/lib/data/cart"
import { addToCartEventBus } from "@/lib/data/cart-event-bus"
import { ApprovalStatusType } from "@/types/approval"
import { B2BCart } from "@/types/global"
import type {
  StoreCart,
  StoreCartLineItem,
  StoreProduct,
  StoreProductVariant,
} from "@medusajs/types"
import { toast } from "@medusajs/ui"
import { useParams } from "next/navigation"
import type { PropsWithChildren } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react"

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

const CartContext = createContext<
  | {
      cart: B2BCart | null
      company?: any
      handleDeleteItem: (lineItem: string) => Promise<void>
      handleUpdateCartQuantity: (
        lineItem: string,
        newQuantity: number
      ) => Promise<void>
      handleEmptyCart: () => Promise<void>
      isUpdatingCart: boolean
    }
  | undefined
>(undefined)

export function CartProvider({
  cart,
  company,
  children,
}: PropsWithChildren<{
  cart: B2BCart | null
  company?: any
}>) {
  const { countryCode = 'ph' } = useParams()

  const [optimisticCart, setOptimisticCart] = useOptimistic<B2BCart | null>(
    cart
  )

  const [isUpdatingCart, setIsUpdatingCart] = useState(false)

  const [, startTransition] = useTransition()

  useEffect(() => {
    setIsUpdatingCart(false)
  }, [cart, company])

  const handleOptimisticAddToCart = useCallback(
    async (payload: AddToCartEventPayload | any) => {
      let prevCart = {} as B2BCart
      
      if (
        cart?.approvals?.some(
          (approval) => approval.status === ApprovalStatusType.PENDING
        )
      ) {
        toast.error("Cart is locked for approval.")
        return
      }

      startTransition(async () => {
        setOptimisticCart((prev) => {
          prevCart = structuredClone(prev) as B2BCart

          // Preserve existing items order
          const items = [...(prev?.items || [])]
          const lineItems = payload.lineItems

          // Create a map for quick lookup of existing items by variant ID
          const existingItemIndexMap = new Map<string, number>()
          items.forEach((item, index) => {
            if (item.variant?.id) {
              existingItemIndexMap.set(item.variant.id, index)
            }
          })

          // Update or add items while preserving order
          for (const lineItem of lineItems) {
            const existingIndex = existingItemIndexMap.get(lineItem.productVariant.id)
            
            if (existingIndex !== undefined) {
              // Update existing item at its current position
              const item = items[existingIndex] as any;
              items[existingIndex] = {
                ...item,
                quantity: item.quantity + lineItem.quantity,
                total: (item.total || 0) + lineItem.quantity * item.unit_price,
                original_total:
                  (item.original_total || 0) + lineItem.quantity * item.unit_price,
              }
            } else {
              // Add new item at the end (or beginning if you prefer)
              const priceAmount =
                lineItem.productVariant.calculated_price?.calculated_amount || 0

              const newItem: StoreCartLineItem = {
                cart: (prev || {}) as StoreCart,
                cart_id: prev?.id || "",
                discount_tax_total: 0,
                discount_total: 0,
                id: generateOptimisticItemId(lineItem.productVariant.id),
                is_discountable: false,
                is_tax_inclusive: false,
                item_subtotal: priceAmount * lineItem.quantity,
                item_tax_total: 0,
                item_total: priceAmount * lineItem.quantity,
                original_subtotal: priceAmount * lineItem.quantity,
                original_tax_total: 0,
                original_total: priceAmount * lineItem.quantity,
                product: lineItem.productVariant.product || undefined,
                quantity: lineItem.quantity,
                requires_shipping: true,
                subtotal: priceAmount * lineItem.quantity,
                tax_total: 0,
                title: lineItem.productVariant.title || "",
                total: priceAmount * lineItem.quantity,
                thumbnail:
                  lineItem.productVariant.product?.thumbnail || undefined,
                unit_price: priceAmount,
                variant: lineItem.productVariant || undefined,
                // @ts-expect-error
                created_at: new Date().toISOString(),
              }

              items.push(newItem)
              existingItemIndexMap.set(lineItem.productVariant.id, items.length - 1)
            }
          }

          const newTotal = calculateCartTotal(items)

          return {
            ...prev,
            item_subtotal: newTotal,
            items: items, // Preserves original order
          } as B2BCart
        })

        setIsUpdatingCart(true)
        
        await addToCartBulk({
          lineItems: payload.lineItems.map((lineItem: any) => ({
            variant_id: lineItem.productVariant.id,
            quantity: lineItem.quantity,
          })),
          countryCode: countryCode as string,
          companyId: company?.id
        }).catch((e) => {
          if (e.message === "Cart is pending approval") {
            toast.error("Cart is locked for approval.")
          } else {
            toast.error("Failed to add to cart")
          }
          setOptimisticCart(prevCart)
        })
      })
    },
    [setOptimisticCart, cart?.approvals, countryCode, company]
  )

  useEffect(() => {
    addToCartEventBus.registerCartAddHandler(handleOptimisticAddToCart)
  }, [handleOptimisticAddToCart])

  const handleDeleteItem = async (lineItem: string) => {
    const item = optimisticCart?.items?.find(({ id }) => id === lineItem)

    if (!item) return

    let prevCart = {} as B2BCart

    startTransition(() => {
      setOptimisticCart((prev) => {
        if (!prev) return prev

        prevCart = structuredClone(prev) as B2BCart

        // Filter out item while preserving order of remaining items
        const optimisticItems = prev.items?.filter(({ id }) => id !== lineItem)

        const optimisticTotal = optimisticItems?.reduce(
          (acc, item) => acc + item.unit_price * item.quantity,
          0
        )

        return {
          ...prev,
          item_subtotal: optimisticTotal || 0,
          items: optimisticItems, // Order preserved automatically with filter
        }
      })
    })

    setIsUpdatingCart(true)

    await deleteLineItem(lineItem).catch((e) => {
      toast.error("Failed to delete item")
      setOptimisticCart(prevCart)
    })
  }

  const handleUpdateCartQuantity = async (
    lineItem: string,
    quantity: number
  ) => {
    const item = optimisticCart?.items?.find(({ id }) => id === lineItem)
    
    if (!item) return

    let prevCart = {} as B2BCart

    startTransition(() => {
      setOptimisticCart((prev) => {
        if (!prev) return prev

        prevCart = structuredClone(prev) as B2BCart

        // Update quantity while preserving order using map
        const optimisticItems = prev.items?.map((item) => {
          if (item.id === lineItem) {
            const newQuantity = quantity === 0 ? 0 : quantity
            const total = item.unit_price * newQuantity

            return {
              ...item,
              quantity: newQuantity,
              total,
              original_total: total,
            }
          }
          return item // Return unchanged items as-is
        })

        const optimisticTotal = optimisticItems?.reduce(
          (acc, item) => acc + item.unit_price * item.quantity,
          0
        )

        return {
          ...prev,
          item_subtotal: optimisticTotal || 0,
          items: optimisticItems, // Order preserved with map
        }
      })
    })
     
    console.log(company, 'CCCOMPPP STAT')
    if (!isOptimisticItemId(lineItem)) {
      setIsUpdatingCart(true)
      await updateLineItem({
        lineId: lineItem,
        data: { quantity },
        company: company
      }).catch((e) => {
        toast.error("Failed to update cart quantity")
        setOptimisticCart(prevCart)
      })
    }
  }

  const handleEmptyCart = async () => {
    let prevCart = {} as B2BCart

    startTransition(() => {
      setOptimisticCart((prev) => {
        prevCart = structuredClone(prev) as B2BCart
        return null
      })
    })

    setIsUpdatingCart(true)

    await emptyCart().catch((e) => {
      toast.error("Failed to empty cart")
      setOptimisticCart(prevCart)
    })
  }

  // No need to sort items - they maintain their order naturally
  const stableItems = useMemo(() => {
    return optimisticCart?.items
  }, [optimisticCart])

  return (
    <CartContext.Provider
      value={{
        cart: { ...optimisticCart, items: stableItems } as B2BCart,
        company,
        handleDeleteItem,
        handleUpdateCartQuantity,
        handleEmptyCart,
        isUpdatingCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

const OPTIMISTIC_ITEM_ID_PREFIX = "__optimistic__"

function generateOptimisticItemId(variantId: string) {
  return `${OPTIMISTIC_ITEM_ID_PREFIX}-${variantId}`
}

export function isOptimisticItemId(id: string) {
  return id.startsWith(OPTIMISTIC_ITEM_ID_PREFIX)
}

function calculateCartTotal(cartItems: StoreCartLineItem[]) {
  return (
    cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0) ||
    0
  )
}