// components/payment-button.tsx
"use client"

import { isManual, isPaypal, isStripeLike } from "@/lib/constants"
import { createCartApproval, placeOrder } from "@/lib/data/cart"
import ErrorMessage from "@/modules/checkout/components/error-message"
import Button from "@/modules/common/components/button"
import Spinner from "@/modules/common/icons/spinner"
import { B2BCart } from "@/types"
import { ApprovalStatusType } from "@/types/approval/module"
import { Container, Text, toast } from "@medusajs/ui"
import React, { useState } from "react"
import { Loader2, Shield, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PaymentButtonProps = {
  cart: B2BCart
  "data-testid"?: string
  className?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

const completeCart = async (cart: B2BCart, company_id?: any) => {
  const response = await placeOrder(cart.id, company_id).catch((err) => {
    if (!err.message.includes("NEXT_REDIRECT")) {
      throw new Error(err)
    }
  })

  if (response?.type === "cart") {
    throw new Error(response.error.message)
  }
  
  return response
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId = "payment-button",
  className,
  onSuccess,
  onError,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address 
    // !cart.billing_address ||
    // || (cart.shipping_methods?.length ?? 0) < 1

  const { requires_admin_approval, requires_sales_manager_approval } =
    cart.company?.approval_settings || {}

  const requiresApproval =
    requires_admin_approval || requires_sales_manager_approval

  const cartApprovalStatus = cart?.approval_status?.status

  // Handle approval flow
  if (requiresApproval && cartApprovalStatus !== ApprovalStatusType.APPROVED) {
    return <RequestApprovalButton cart={cart} notReady={notReady} onError={onError} />
  }

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  // Return appropriate payment button based on provider
  switch (true) {
    case isManual(paymentSession?.provider_id):
      return (
        <ManualPaymentButton
          notReady={notReady}
          data-testid={dataTestId}
          cart={cart}
          className={className}
          onSuccess={onSuccess}
          onError={onError}
        />
      )
    default:
      return (
        <Button disabled className="w-full" size="large">
          Select a payment method
        </Button>
      )
  }
}

// Request Approval Button Component
const RequestApprovalButton = ({
  cart,
  notReady,
  onError,
}: {
  cart: B2BCart
  notReady: boolean
  onError?: (error: string) => void
}) => {
  const [submitting, setSubmitting] = useState(false)

  const { requires_admin_approval, requires_sales_manager_approval } =
    cart.company?.approval_settings || {}

  const cartApprovalStatus = cart?.approval_status?.status
  const isPendingAdminApproval = cartApprovalStatus === ApprovalStatusType.PENDING

  const createApproval = async () => {
    setSubmitting(true)

    try {
      await createCartApproval(cart.id, cart.customer!.id)
      toast.success("Approval request sent successfully")
    } catch (err: any) {
      toast.error(err.message)
      onError?.(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Approval Required</p>
            <p className="text-xs text-yellow-700 mt-1">
              {requires_admin_approval && requires_sales_manager_approval
                ? "This order requires approval by both a company admin and a sales manager."
                : requires_admin_approval
                ? "This order requires approval by a company admin."
                : "This order requires approval by a sales manager."}
            </p>
          </div>
        </div>
      </div>
      
      <Button
        className="w-full h-11 rounded-lg"
        disabled={notReady || isPendingAdminApproval}
        onClick={createApproval}
        isLoading={submitting}
        size="large"
      >
        {isPendingAdminApproval ? "Approval Requested" : "Request Approval"}
      </Button>
    </div>
  )
}



// Manual Payment Button (COD, Bank Transfer, etc.)
const ManualPaymentButton = ({
  notReady,
  cart,
  "data-testid": dataTestId,
  className,
  onSuccess,
  onError,
}: {
  notReady: boolean
  cart: B2BCart
  "data-testid"?: string
  className?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    try {
      await completeCart(cart, cart?.metadata?.company_id)
      onSuccess?.()
    } catch (err: any) {
      setErrorMessage(err.message)
      onError?.(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = () => {
    setSubmitting(true)
    setErrorMessage(null)
    onPaymentCompleted()
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Button
        className="w-full h-11 rounded-lg gap-2 bg-primary hover:bg-primary/90"
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid={dataTestId}
      >
        {submitting ? (
          <>
            Processing...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Place Order
          </>
        )}
      </Button>
      <ErrorMessage error={errorMessage} data-testid="manual-payment-error-message" />
    </div>
  )
}

export default PaymentButton