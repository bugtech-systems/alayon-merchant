// modules/cart/templates/items.tsx
"use client"

import { getCartApprovalStatus } from "@/lib/util/get-cart-approval-status"
import { convertToLocale } from "@/lib/util/money"
import ItemFull from "@/modules/cart/components/item-full"
import { B2BCart } from "@/types/global"
import { StoreCartLineItem } from "@medusajs/types"
import { cn } from "@/lib/utils"
import { Package, ShoppingBag } from "lucide-react"
import { useMemo } from "react"

type ItemsTemplateProps = {
  cart: B2BCart | any
  showBorders?: boolean
  showTotal?: boolean
  variant?: "default" | "compact"
}

const ItemsTemplate = ({
  cart,
  showBorders = true,
  showTotal = true,
  variant = "default",
}: ItemsTemplateProps) => {
  const items = cart?.items
  const totalQuantity = useMemo(
    () => cart?.items?.reduce((acc, item) => acc + item.quantity, 0),
    [cart?.items]
  )

  const { isPendingAdminApproval, isPendingSalesManagerApproval } =
    getCartApprovalStatus(cart)

  const isPendingApproval =
    isPendingAdminApproval || isPendingSalesManagerApproval

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <ShoppingBag className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm text-muted-foreground">Your cart is empty</p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-y-3">
      <div className="flex flex-col gap-y-3 w-full">
        {items.map((item: StoreCartLineItem, index: number) => {
          const isLast = index === items.length - 1
          
          return (
            <div
              key={item.id}
              className={cn(
                variant === "compact" && "py-2",
                showBorders && !isLast && "border-b border-gray-100 pb-3"
              )}
            >
              <ItemFull
                disabled={isPendingApproval}
                currencyCode={cart?.currency_code}
                showBorders={showBorders}
                variant={variant}
                item={
                  item as StoreCartLineItem & {
                    metadata?: { note?: string }
                  }
                }
              />
            </div>
          )
        })}
      </div>
      
      {showTotal && (
        <div className={cn(
          "mt-4 pt-3",
          showBorders && "border-t border-gray-100"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total items</p>
              <p className="text-sm font-medium text-gray-900">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total amount</p>
              <p className="text-base font-bold text-primary">
                {convertToLocale({
                  amount: cart?.item_total,
                  currency_code: cart?.currency_code,
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItemsTemplate