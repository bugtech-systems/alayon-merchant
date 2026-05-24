// modules/cart/templates/cart-template.tsx
"use client"

import { useCart } from "@/lib/context/cart-context"
import { checkSpendingLimit } from "@/lib/util/check-spending-limit"
import ApprovalStatusBanner from "@/modules/cart/components/approval-status-banner"
import EmptyCartMessage from "@/modules/cart/components/empty-cart-message"
import SignInPrompt from "@/modules/cart/components/sign-in-prompt"
import ItemsTemplate from "@/modules/cart/templates/items"
import Summary from "@/modules/cart/templates/summary"
import { B2BCustomer } from "@/types/global"
import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ShoppingBag, Package, TrendingUp, Truck } from "lucide-react"

const CartTemplate = ({ customer }: { customer: B2BCustomer | null }) => {
  const { cart } = useCart()

  const spendLimitExceeded = useMemo(
    () => checkSpendingLimit(cart, customer),
    [cart, customer]
  )

  const totalItems = useMemo(
    () => cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0,
    [cart?.items]
  )

  const isWholesale = customer?.groups?.some(group => group.name === "Wholesale") || false

  if (!cart?.items?.length) {
    return <EmptyCartMessage />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-10 max-w-7xl">
        
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  Shopping Cart
                </h1>
                {isWholesale && (
                  <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                    Wholesale
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                You have {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
            
            {/* Free Shipping Threshold Indicator */}
            {cart?.items?.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
                <Truck className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-green-700">
                  Free shipping on orders ₱1,000+
                </span>
              </div>
            )}
          </div>
          <Separator className="mt-2" />
               <div className="flex justify-start pt-2">
              <button 
                onClick={() => window.history.back()}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                ← Continue Shopping
              </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Sign In Prompt */}
            {/* {!customer && <SignInPrompt />} */}
            
            {/* Approval Status Banner */}
            {cart?.approvals && cart.approvals.length > 0 && (
              <ApprovalStatusBanner cart={cart} />
            )}
            
            {/* Cart Items Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 md:p-6">
                <ItemsTemplate cart={cart} />
              </CardContent>
            </Card>

            {/* Continue Shopping Link */}
     
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-4 md:p-5">
                  {/* Summary Header */}
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">
                      Order Summary
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Review your items and proceed to checkout
                    </p>
                  </div>
                  
                  <Separator className="mb-4" />
                  
                  {/* Summary Component */}
                  {cart && cart.region && (
                    <Summary
                      customer={customer}
                      spendLimitExceeded={spendLimitExceeded}
                    />
                  )}
                  
                  {/* Trust Badges */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <Package className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Secure Checkout
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <TrendingUp className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Price Guarantee
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Wholesale Info Banner */}
              {!isWholesale && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs text-primary">
                    🏷️ Interested in wholesale pricing? Contact us for bulk orders and special rates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartTemplate