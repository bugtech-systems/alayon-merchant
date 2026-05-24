// components/cart/cart-drawer.tsx
"use client"

import { useCart } from "@/lib/context/cart-context"
import { checkSpendingLimit } from "@/lib/medusa/util/check-spending-limit"
import { getCheckoutStep } from "@/lib/medusa/util/get-checkout-step"
import { convertToLocale } from "@/lib/medusa/util/money"
import AppliedPromotions from "@/modules/cart/components/applied-promotions"
import ApprovalStatusBanner from "@/modules/cart/components/approval-status-banner"
import ItemsTemplate from "@/modules/cart/templates/items"
import Button from "@/modules/common/components/button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import FreeShippingPriceNudge from "@/modules/shipping/components/free-shipping-price-nudge"
import { B2BCustomer } from "@/types"
import { StoreFreeShippingPrice } from "@/types/shipping-option/http"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  X, 
  ShoppingCart, 
  AlertCircle, 
  Lock, 
  Truck, 
  Percent,
  Landmark,
  Wallet,
  ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type CartDrawerProps = {
  freeShippingPrices: StoreFreeShippingPrice[]
}

// Helper to calculate tax amount
const calculateTaxAmount = (cart: any): number => {
  if (!cart) return 0
  
  // If tax_total is available from Medusa, use it
  if (cart.tax_total && cart.tax_total > 0) {
    return cart.tax_total
  }
  
  // Fallback: Calculate from tax lines if available
  if (cart.tax_lines && cart.tax_lines.length > 0) {
    return cart.tax_lines.reduce((sum: number, line: any) => sum + (line.rate / 100 * line.subtotal), 0)
  }
  
  return 0
}

// Helper to calculate total including taxes
const calculateTotalWithTax = (cart: any): number => {
  if (!cart) return 0
  
  // If Medusa provides total with tax
  if (cart.total && cart.total > 0) {
    return cart.total
  }
  
  // Calculate: subtotal + tax_total + shipping_total - discount_total
  const subtotal = cart.item_subtotal || 0
  const taxTotal = cart.tax_total || calculateTaxAmount(cart)
  const shippingTotal = cart.shipping_total || 0
  const discountTotal = cart.discount_total || 0
  
  return subtotal + taxTotal + shippingTotal - discountTotal
}

// Helper to get tax rate display
const getTaxRate = (cart: any): number | null => {
  if (!cart?.tax_lines || cart.tax_lines.length === 0) return null
  
  // Get the first tax line's rate (assuming standard rate applies)
  const taxLine = cart.tax_lines[0]
  return taxLine.rate
}

const CartDrawer = ({
  freeShippingPrices,
  ...props
}: CartDrawerProps) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [isOpen, setIsOpen] = useState(false)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  const { cart, isUpdatingCart } = useCart()

  // Stable items with preserved order - use useMemo with cart items as dependency
  const items = useMemo(() => {
    if (!cart?.items) return []
    // Return items as-is without reordering
    return cart.items
  }, [cart?.items])

  const promotions = cart?.promotions || []

  const totalItems = useMemo(() => {
    return items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0
  }, [items])

  // Calculate various totals
  const subtotal = useMemo(() => cart?.item_subtotal ?? 0, [cart])
  const taxAmount = useMemo(() => calculateTaxAmount(cart), [cart])
  const shippingTotal = useMemo(() => cart?.shipping_total ?? 0, [cart])
  const discountTotal = useMemo(() => cart?.discount_total ?? 0, [cart])
  const totalWithTax = useMemo(() => calculateTotalWithTax(cart), [cart])
  const taxRate = useMemo(() => getTaxRate(cart), [cart])
  
  // Check if taxes are included in prices (Medusa setting)
  const taxesIncluded = cart?.region?.automatic_taxes ? true : false

  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = useCallback(() => {
    if (isOpen) {
      return
    }
    open()
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  const cancelTimer = useCallback(() => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }
  }, [activeTimer])

  useEffect(() => {
    if (
      itemRef.current !== totalItems &&
      !pathname.includes("/cart") &&
      !pathname.includes("/account")
    ) {
      timedOpen()
      return
    }
  }, [totalItems, pathname, timedOpen])

  useEffect(() => {
    cancelTimer()
    close()
  }, [pathname, cancelTimer])

  const checkoutStep = cart ? getCheckoutStep(cart) : undefined
  const checkoutPath = checkoutStep
      ? `/checkout?step=${checkoutStep}&cart_id=${cart?.id}`
      : `/checkout?cart_id=${cart?.id}`

  // Check if free shipping is applicable
  const hasFreeShipping = useMemo(() => {
    return freeShippingPrices?.some(
      (price) => subtotal >= price.min_cart_value
    )
  }, [freeShippingPrices, subtotal])

  // Update itemRef after totalItems changes
  useEffect(() => {
    itemRef.current = totalItems
  }, [totalItems])

  // Key for forcing re-render of ItemsTemplate when updating cart
  // but without changing order
  const itemsKey = useMemo(() => {
    if (!items) return 'empty'
    // Create a stable key based on item IDs and quantities, but preserve order
    return items.map(item => `${item.id}-${item.quantity}`).join(',')
  }, [items])

  
  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
      <DrawerTrigger asChild>
        <button
          className={cn(
            "relative inline-flex w-fit items-center justify-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200",
            "hover:bg-gray-100 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            isUpdatingCart && "opacity-70 cursor-wait"
          )}
          onMouseEnter={cancelTimer}
          disabled={isUpdatingCart}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </button>
      </DrawerTrigger>
      
      {/* Wider drawer - increased max width */}
      <DrawerContent className={cn(
        "fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300",
        "w-[95vw] sm:w-[500px] md:w-[600px] lg:w-[680px] xl:w-[720px]"
      )}>
        <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-white z-10">
          <DrawerHeader className="p-0">
            <DrawerTitle className="text-base font-semibold">
              {totalItems > 0 ? (
                <>Your Cart ({totalItems})</>
              ) : (
                "Your Cart"
              )}
              {isUpdatingCart && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Updating...
                </span>
              )}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Your shopping cart with {totalItems} items
            </DrawerDescription>
          </DrawerHeader>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isUpdatingCart}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-3">
            {/* Approval Status Banner */}
            {cart?.approvals && cart.approvals.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200 py-2">
                <AlertCircle className="h-3 w-3 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-800">
                  <ApprovalStatusBanner cart={cart} />
                </AlertDescription>
              </Alert>
            )}

            {/* Promotions */}
            {promotions.length > 0 && (
              <div className="bg-primary/5 rounded-md p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Percent className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Promotions Applied</span>
                </div>
                <AppliedPromotions promotions={promotions} />
              </div>
            )}

            {/* Cart Items - Using compact variant for smaller display */}
            {items.length > 0 ? (
              <>
                <ItemsTemplate
                  key={itemsKey}
                  cart={{ ...cart, items }}
                  showBorders={false}
                  showTotal={false}
                  variant="compact"
                />

                {/* Free Shipping Nudge */}
                {cart && freeShippingPrices && (
                  <div className="mt-2">
                    <FreeShippingPriceNudge
                      variant="inline"
                      cart={cart}
                      freeShippingPrices={freeShippingPrices}
                    />
                  </div>
                )}

                <Separator className="my-2" />

                {/* Detailed Breakdown */}
                <div className="space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Subtotal</span>
                    <span className="text-sm font-medium">
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cart?.currency_code,
                      })}
                    </span>
                  </div>

                  {/* Discount */}
                  {discountTotal > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <div className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        <span className="text-xs">Discount</span>
                      </div>
                      <span className="text-sm font-medium">
                        -{convertToLocale({
                          amount: discountTotal,
                          currency_code: cart?.currency_code,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Shipping */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Shipping</span>
                    </div>
                    {hasFreeShipping && shippingTotal === 0 ? (
                      <span className="text-xs text-green-600 font-medium">Free</span>
                    ) : (
                      <span className="text-sm font-medium">
                        {convertToLocale({
                          amount: shippingTotal,
                          currency_code: cart?.currency_code,
                        })}
                      </span>
                    )}
                  </div>

                  {/* Taxes */}
                  {taxAmount > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-between items-center cursor-help">
                            <div className="flex items-center gap-1">
                              <Landmark className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Tax {taxRate ? `(${taxRate}% VAT)` : ''}
                              </span>
                            </div>
                            <span className="text-sm font-medium">
                              {convertToLocale({
                                amount: taxAmount,
                                currency_code: cart?.currency_code,
                              })}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          <p>Value Added Tax (VAT)</p>
                          {taxesIncluded && <p className="text-muted-foreground">Included in prices</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <Separator className="my-2" />

                  {/* Total (including taxes) */}
                  <div className="flex justify-between items-center pt-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Total</span>
                      {taxAmount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {taxesIncluded ? "Tax included" : "Plus tax"}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">
                        {convertToLocale({
                          amount: totalWithTax,
                          currency_code: cart?.currency_code,
                        })}
                      </span>
                      {shippingTotal > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          + shipping
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tax Information Note */}
                  {taxAmount === 0 && cart?.region?.automatic_taxes && (
                    <div className="bg-blue-50 rounded-md p-2 mt-2">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 text-blue-600" />
                        <span className="text-[10px] text-blue-700">
                          Taxes will be calculated at checkout
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Your cart is empty</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Looks like you haven't added any items yet
                </p>
                <LocalizedClientLink href="/catalog">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    Start Shopping
                  </Button>
                </LocalizedClientLink>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Actions */}
        {items.length > 0 && (
          <DrawerFooter className="border-t bg-gray-50/50 p-3 space-y-2 sticky bottom-0 bg-white">
            <div className="space-y-2">
              <LocalizedClientLink href={`/cart?cart_id=${cart?.id}`}>
                <Button 
                  variant="outline" 
                  className="w-full text-sm h-9"
                  disabled={isUpdatingCart}
                >
                  View Cart ({totalItems})
                </Button>
              </LocalizedClientLink>
              <LocalizedClientLink href={checkoutPath}>
                <Button
                  className="w-full gap-1.5 text-sm h-9"
                  disabled={totalItems === 0 || isUpdatingCart}
                >
                  <>
                    <Wallet className="h-3.5 w-3.5" />
                    Proceed to Checkout
                  </>
                </Button>
              </LocalizedClientLink>
            </div>
            
            {/* Total in Footer */}
            {totalWithTax > 0 && (
              <div className="flex justify-between items-center pt-1 border-t mt-1">
                <span className="text-xs font-medium">Total to pay:</span>
                <span className="text-base font-bold text-primary">
                  {convertToLocale({
                    amount: totalWithTax,
                    currency_code: cart?.currency_code,
                  })}
                </span>
              </div>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export default CartDrawer