"use client"

import { convertToLocale } from "@/lib/util/money"
import { B2BCart, B2BOrder } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  ShoppingBag, 
  Truck, 
  Landmark, 
  Gift, 
  TicketPercent,
  AlertCircle 
} from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react"

interface CheckoutTotalsProps {
  cartOrOrder: B2BCart | B2BOrder
  showBreakdown?: boolean
  className?: string
}

const CheckoutTotals: React.FC<CheckoutTotalsProps> = ({ 
  cartOrOrder, 
  showBreakdown = true,
  className 
}) => {
  if (!cartOrOrder) return null

  const {
    currency_code,
    total,
    item_subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
  } = cartOrOrder

  // Helper to determine if there are any discounts or gift cards
  const hasDiscounts = (discount_total && discount_total > 0) || (gift_card_total && gift_card_total > 0)
  
  // Helper to get shipping display text
  const getShippingDisplay = () => {
    if (shipping_total === 0) return "Free Shipping"
    if (shipping_total && shipping_total > 0) return convertToLocale({ amount: shipping_total, currency_code })
    return "Calculated at next step"
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b">
          <h3 className="text-lg font-semibold">Order Summary</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ShoppingBag className="h-4 w-4" />
            <span>Items total</span>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="space-y-4">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShoppingBag className="h-4 w-4" />
              <span>Subtotal</span>
            </div>
            <span className="font-medium" data-testid="cart-item-subtotal" data-value={item_subtotal || 0}>
              {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
            </span>
          </div>

          {/* Discount */}
          {discount_total && discount_total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <TicketPercent className="h-4 w-4" />
                <span>Discount</span>
              </div>
              <span className="text-green-600 font-medium" data-testid="cart-discount" data-value={discount_total}>
                - {convertToLocale({ amount: discount_total, currency_code })}
              </span>
            </div>
          )}

          {/* Shipping */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Truck className="h-4 w-4" />
              <span>Shipping</span>
            </div>
            <span 
              className={cn(
                "font-medium",
                shipping_total === 0 && "text-green-600"
              )}
              data-testid="cart-shipping" 
              data-value={shipping_total || 0}
            >
              {getShippingDisplay()}
            </span>
          </div>

          {/* Taxes */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Landmark className="h-4 w-4" />
              <span>Taxes</span>
            </div>
            <span className="font-medium" data-testid="cart-taxes" data-value={tax_total || 0}>
              {convertToLocale({ amount: tax_total ?? 0, currency_code })}
            </span>
          </div>

          {/* Gift Card */}
          {gift_card_total && gift_card_total > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-purple-600">
                <Gift className="h-4 w-4" />
                <span>Gift Card</span>
              </div>
              <span className="text-purple-600 font-medium" data-testid="cart-gift-card-amount" data-value={gift_card_total}>
                - {convertToLocale({ amount: gift_card_total, currency_code })}
              </span>
            </div>
          )}

          {/* Divider */}
          <Separator className="my-2" />

          {/* Total */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col">
              <span className="text-base font-semibold">Total</span>
              {hasDiscounts && (
                <span className="text-xs text-green-600">
                  You saved {discount_total && discount_total > 0 && convertToLocale({ amount: discount_total, currency_code })}
                  {gift_card_total && gift_card_total > 0 && ` + ${convertToLocale({ amount: gift_card_total, currency_code })} gift`}
                </span>
              )}
            </div>
            <span 
              className="text-2xl font-bold text-primary"
              data-testid="cart-total" 
              data-value={total || 0}
            >
              {convertToLocale({ amount: total ?? 0, currency_code })}
            </span>
          </div>

          {/* Additional Info */}
          {showBreakdown && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p>Taxes and shipping calculated at checkout</p>
                  {shipping_total === 0 && (
                    <p className="text-green-600">✓ Free shipping applied</p>
                  )}
                  {discount_total && discount_total > 0 && (
                    <p className="text-green-600">✓ Discount applied to your order</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Optional: Export a condensed version for mobile or sidebar
export const CompactCheckoutTotals: React.FC<CheckoutTotalsProps> = ({ 
  cartOrOrder, 
  className 
}) => {
  if (!cartOrOrder) return null

  const { currency_code, total, item_subtotal, discount_total } = cartOrOrder

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{convertToLocale({ amount: item_subtotal ?? 0, currency_code })}</span>
      </div>
      {discount_total && discount_total > 0 && (
        <div className="flex items-center justify-between text-sm text-green-600">
          <span>Discount</span>
          <span>- {convertToLocale({ amount: discount_total, currency_code })}</span>
        </div>
      )}
      <Separator />
      <div className="flex items-center justify-between font-semibold">
        <span>Total</span>
        <span className="text-lg text-primary">
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
    </div>
  )
}

// Optional: Export a summary card for order confirmation page
export const OrderSummaryCard: React.FC<CheckoutTotalsProps> = ({ 
  cartOrOrder, 
  className 
}) => {
  if (!cartOrOrder) return null

  const {
    currency_code,
    total,
    item_subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
  } = cartOrOrder

  const hasDiscounts = (discount_total && discount_total > 0) || (gift_card_total && gift_card_total > 0)

  return (
    <Card className={cn("bg-muted/30", className)}>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">Payment Summary</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{convertToLocale({ amount: item_subtotal ?? 0, currency_code })}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className={shipping_total === 0 ? "text-green-600" : ""}>
              {shipping_total === 0 ? "Free" : convertToLocale({ amount: shipping_total ?? 0, currency_code })}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{convertToLocale({ amount: tax_total ?? 0, currency_code })}</span>
          </div>
          
          {discount_total && discount_total > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{convertToLocale({ amount: discount_total, currency_code })}</span>
            </div>
          )}
          
          {gift_card_total && gift_card_total > 0 && (
            <div className="flex justify-between text-sm text-purple-600">
              <span>Gift Card</span>
              <span>-{convertToLocale({ amount: gift_card_total, currency_code })}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">
              {convertToLocale({ amount: total ?? 0, currency_code })}
            </span>
          </div>
          
          {hasDiscounts && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 text-center">
                🎉 You saved {
                  discount_total && discount_total > 0 && convertToLocale({ amount: discount_total, currency_code })
                } on this order!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CheckoutTotals