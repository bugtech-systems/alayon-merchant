// modules/cart/templates/summary.tsx
"use client"

import { convertToLocale } from "@/lib/util/money"
import { B2BCustomer } from "@/types/global"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCart } from "@/lib/context/cart-context"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { getCheckoutStep } from "@/lib/util/get-checkout-step"
import { AlertCircle, Lock, Tag, Truck, Gift } from "lucide-react"

type SummaryProps = {
  customer: B2BCustomer | null
  spendLimitExceeded: boolean
}

const Summary = ({ customer, spendLimitExceeded }: SummaryProps) => {
  const { cart } = useCart()
  
  const subtotal = cart?.item_subtotal ?? 0
  const discountTotal = cart?.discount_total ?? 0
  const shippingTotal = cart?.shipping_total ?? 0
  const taxTotal = cart?.tax_total ?? 0
  const total = cart?.total ?? 0
  
  const hasDiscounts = discountTotal > 0
  const hasShipping = shippingTotal > 0
  const hasTax = taxTotal > 0
  
  const checkoutStep = cart ? getCheckoutStep(cart) : undefined
  const checkoutPath = customer
    ? checkoutStep
      ? `/checkout?step=${checkoutStep}`
      : "/checkout"
    : "/account"

  return (
    <div className="space-y-4">
      {/* Price Breakdown */}
      <div className="space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-sm font-medium">
            {convertToLocale({
              amount: subtotal,
              currency_code: cart?.currency_code,
            })}
          </span>
        </div>
        
        {/* Discount */}
        {hasDiscounts && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-green-600" />
              <span className="text-sm text-green-600">Discount</span>
            </div>
            <span className="text-sm text-green-600">
              -{convertToLocale({
                amount: discountTotal,
                currency_code: cart?.currency_code,
              })}
            </span>
          </div>
        )}
        
        {/* Shipping */}
        {hasShipping && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Truck className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Shipping</span>
            </div>
            <span className="text-sm font-medium">
              {convertToLocale({
                amount: shippingTotal,
                currency_code: cart?.currency_code,
              })}
            </span>
          </div>
        )}
        
        {/* Tax */}
        {hasTax && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tax</span>
            <span className="text-sm font-medium">
              {convertToLocale({
                amount: taxTotal,
                currency_code: cart?.currency_code,
              })}
            </span>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Total */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <span className="text-base font-semibold text-gray-900">Total</span>
          {hasDiscounts && (
            <p className="text-xs text-green-600 mt-0.5">You saved {convertToLocale({
              amount: discountTotal,
              currency_code: cart?.currency_code,
            })}</p>
          )}
        </div>
        <span className="text-xl font-bold text-primary">
          {convertToLocale({
            amount: total,
            currency_code: cart?.currency_code,
          })}
        </span>
      </div>
      
      {/* Checkout Button */}
      <div className="pt-2">
        <LocalizedClientLink href={checkoutPath}>
          <Button
            className="w-full gap-2 h-11 text-base"
            disabled={!cart?.items?.length || spendLimitExceeded}
            size="lg"
          >
            {customer ? (
              spendLimitExceeded ? (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Limit Exceeded
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Proceed to Checkout
                </>
              )
            ) : (
              "Sign in to Checkout"
            )}
          </Button>
        </LocalizedClientLink>
      </div>
      
      {/* Spending Limit Warning */}
      {spendLimitExceeded && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-3 w-3 text-red-600" />
          <AlertDescription className="text-xs text-red-800">
            This order exceeds your spending limit. Please contact your manager for approval.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Promotion Code Link */}
      {!hasDiscounts && cart?.items?.length > 0 && (
        <div className="pt-2">
          <button className="text-xs text-primary hover:underline flex items-center gap-1">
            <Gift className="h-3 w-3" />
            Have a promo code?
          </button>
        </div>
      )}
    </div>
  )
}

export default Summary