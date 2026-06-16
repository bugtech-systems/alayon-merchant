// lib/data/payment-capture.ts

import { sdk } from "@/lib/config";
import { getAuthHeaders } from "@/lib/data/cookies";
import { capturePayment } from "../data/cart";

// ============================================================================
// TYPES
// ============================================================================

export interface CapturePaymentParams {
  order_id: string;
  payment_method: "cash" | "card" | "other";
  payment_data: {
    amount: number;
    change?: number;
    cash_amount?: number;
    provider_id?: string;
    transaction_id?: string;
  };
}

export interface CapturePaymentResponse {
  success: boolean;
  order: any;
  payment: any;
  message: string;
}

export interface InitiatePaymentSessionParams {
  cart_id: string;
  provider_id: string;
  context?: Record<string, any>;
}

export interface PaymentSessionResponse {
  id: string;
  provider_id: string;
  status: string;
  data: Record<string, any>;
  amount: number;
  currency_code: string;
  headers?: any;
}

// ============================================================================
// PAYMENT CAPTURE FUNCTIONS
// ============================================================================

/**
 * Capture payment for an order using the custom API endpoint
 */
export async function captureOrderPayment(
  params: CapturePaymentParams
): Promise<CapturePaymentResponse> {
  const headers = await getAuthHeaders();

  try {
    const response = await  sdk.client.fetch("/dashboard/capture-payment", {
      method: "POST",
      body: params,
    });
console.log(response, 'cappptue')
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to capture payment");
    }

    return data;
  } catch (error) {
    console.error("Error capturing payment:", error);
    throw error;
  }
}

/**
 * Capture payment using Medusa Admin API (alternative method)
 */
export async function capturePaymentViaAdminAPI(
  paymentId: string,
  metadata?: Record<string, any>
): Promise<any> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`/admin/payments/${paymentId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ metadata }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to capture payment");
    }

    return data;
  } catch (error) {
    console.error("Error capturing payment via admin API:", error);
    throw error;
  }
}

/**
 * Capture payment using Medusa SDK (if available)
 */
export async function capturePaymentWithSDK(data: any): Promise<any> {
  try {
      const headers = {
        ...(await getAuthHeaders()),
      }


    // Using the admin API through SDK
    const response = await sdk.client.fetch(`/dashboard/capture-payment`, {
      method: "POST",
      body: data,
      headers,
    });
    
    return response;
  } catch (error) {
    console.error("Error capturing payment with SDK:", error);
    throw error;
  }
}

// ============================================================================
// PAYMENT SESSION FUNCTIONS
// ============================================================================

/**
 * Initiate a payment session for a cart
 */
export async function initiateCapturePaymentSession(
  cart: any,
  params: InitiatePaymentSessionParams,
  headers?: any
): Promise<PaymentSessionResponse> {
  const headersAuth = await getAuthHeaders();
  try {
    const response = await sdk.store.payment.initiatePaymentSession(
      cart,
      {
        provider_id: params?.provider_id || "pp_system_default",
        context: params?.context,
      },
      {},
      {...headersAuth, ...headers}
    );

    return response?.payment_collection?.payment_sessions[0] || null;
  } catch (error) {
    console.error("Error initiating payment session:", error);
    throw error;
  }
}

/**
 * Authorize a payment session
 */
export async function authorizePaymentSession(
  cartId: string,
  context?: Record<string, any>
): Promise<PaymentSessionResponse> {
  const headers = await getAuthHeaders();

  try {
    const response = await sdk.store.payment.authorizePaymentSession(
      cartId,
      { context },
      headers
    );
    
    return response;
  } catch (error) {
    console.error("Error authorizing payment session:", error);
    throw error;
  }
}

/**
 * Update a payment session
 */
export async function updatePaymentSession(
  cartId: string,
  providerId: string,
  data: Record<string, any>
): Promise<PaymentSessionResponse> {
  const headers = await getAuthHeaders();

  try {
    const response = await sdk.store.payment.updatePaymentSession(
      cartId,
      providerId,
      data,
      headers
    );
    
    return response;
  } catch (error) {
    console.error("Error updating payment session:", error);
    throw error;
  }
}

/**
 * Get payment session status
 */
export async function getPaymentSessionStatus(cartId: string): Promise<any> {
  const headers = await getAuthHeaders();

  try {
    const cart = await sdk.store.cart.retrieve(cartId, {}, headers);
    return cart.cart.payment_session;
  } catch (error) {
    console.error("Error getting payment session status:", error);
    throw error;
  }
}

// ============================================================================
// ORDER PAYMENT FUNCTIONS
// ============================================================================

/**
 * Get order with payment details
 */
export async function getOrderWithPayments(orderId: string): Promise<any> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`/admin/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to retrieve order");
    }

    return data;
  } catch (error) {
    console.error("Error retrieving order with payments:", error);
    throw error;
  }
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: string): Promise<any> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`/admin/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to retrieve payment");
    }

    return data;
  } catch (error) {
    console.error("Error retrieving payment:", error);
    throw error;
  }
}

/**
 * Refund a captured payment
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
  reason?: string
): Promise<any> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`/admin/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ amount, reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to refund payment");
    }

    return data;
  } catch (error) {
    console.error("Error refunding payment:", error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Process complete payment flow for POS
 */
export async function processPOSPayment(params: {
  cart: any;
  orderId?: string;
  paymentMethod: "cash" | "card" | "other";
  amount: number;
  cashAmount?: number;
  change?: number;
  customerId?: string;
}): Promise<{
  success: boolean;
  order: any;
  payment: any;
  message: string;
}> {
  const { cart, orderId, paymentMethod, amount, cashAmount, change, customerId } = params;
  
  // Validate required params
  if (!cart?.id) {
    return {
      success: false,
      order: null,
      payment: null,
      message: "Cart ID is required",
    };
  }

  const headers = await getAuthHeaders();
  
  // Generate unique idempotency key for this transaction
  const idempotencyKey = `pos_${cart.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Add idempotency key to headers
  const headersWithIdempotency = {
    ...headers,
    "Idempotency-Key": idempotencyKey,
  };

  try {
    // Step 1: Determine payment provider
    const providerId = getPaymentProviderId(paymentMethod);

    // Step 2: Verify cart status before processing
    const cartStatus = await verifyCartStatus(cart.id, headers);
    if (cartStatus === "completed" || cartStatus === "processing") {
      return {
        success: false,
        order: null,
        payment: null,
        message: "Cart is already being processed or completed",
      };
    }

    // Step 3: Initiate payment session on cart
    let payment;
    try {
       payment = await initiateCapturePaymentSession(cart, {cart_id: cart?.id, provider_id: providerId}, headersWithIdempotency) as any;
      console.log(payment, 'PAAYMMM')
      if (!payment?.id) {
        throw new Error("Failed to initiate payment session");
      }
    } catch (paymentError: any) {
      console.error("Payment initiation failed:", paymentError);
      return {
        success: false,
        order: null,
        payment: null,
        message: `Payment initiation failed: ${paymentError.message}`,
      };
    }

    // Step 4: Complete the cart with retry logic for idempotency conflicts
    let orderResult;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        orderResult = await sdk.store.cart.complete(
          cart.id, 
          {}, 
          headersWithIdempotency
        );
        break; // Success, exit retry loop
      } catch (completeError: any) {
        // Handle idempotency conflicts
        if (completeError?.code === "invalid_state_error" || 
            completeError?.type === "conflict") {
          retryCount++;
          if (retryCount >= maxRetries) {
            return {
              success: false,
              order: null,
              payment: null,
              message: "Cart completion is taking longer than expected. Please check order status.",
            };
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
          continue;
        }
        throw completeError; // Re-throw other errors
      }
    }

    if (!orderResult?.order) {
      throw new Error("Failed to create order");
    }

    // Step 5: Capture payment if not already captured
    let captureResult;
    try {
      // captureResult = await capturePayment({
      //   order_id: orderResult.order.id,
      //   payment_method: paymentMethod,
      //   payment_data: {
      //     amount,
      //     change,
      //     cash_amount: cashAmount,
      //     payment_id: payment?.id,
      //   },
      // });


      console.log(captureResult, 'VAPPPACPAP')
      if (!captureResult?.id) {
        // Log the failure but don't throw - order is created, we need to handle payment separately
        console.error("Payment capture failed:", captureResult);
        return {
          success: false,
          order: orderResult.order,
          payment: null,
          message: "Order created but payment capture failed. Please check payment status.",
        };
      }
    } catch (captureError: any) {
      console.error("Payment capture error:", captureError);
      return {
        success: false,
        order: orderResult.order,
        payment: null,
        message: `Order created but payment capture failed: ${captureError.message}`,
      };
    }

    // Step 6: Verify order status after completion
    const verifiedOrder = await verifyOrderStatus(orderResult.order.id, headers);
    
    return {
      success: true,
      order: verifiedOrder || orderResult.order,
      payment: captureResult.payment || captureResult,
      message: "Payment processed successfully",
    };
  } catch (error: any) {
    console.error("Error processing POS payment:", error);
    
    // Check for specific error types
    let errorMessage = error.message || "Failed to process payment";
    let errorCode = error.code || "unknown_error";
    
    // Handle idempotency errors
    if (errorCode === "invalid_state_error" || error.type === "conflict") {
      errorMessage = "This transaction is already being processed. Please wait.";
    }
    
    return {
      success: false,
      order: null,
      payment: null,
      message: errorMessage,
    };
  }
}

/**
 * Helper: Get payment provider ID based on method
 */
function getPaymentProviderId(method: "cash" | "card" | "other"): string {
  switch (method) {
    case "cash":
      return "pp_cash_cash";
    case "card":
      return "pp_stripe_stripe";
    default:
      return "pp_system_default";
  }
}

/**
 * Helper: Verify cart status
 */
async function verifyCartStatus(cartId: string, headers: any): Promise<string> {
  try {
    const cart = await sdk.store.cart.retrieve(cartId, {}, headers);
    return cart?.status || "pending";
  } catch (error) {
    console.warn("Failed to verify cart status:", error);
    return "pending";
  }
}

/**
 * Helper: Verify order status
 */
async function verifyOrderStatus(orderId: string, headers: any): Promise<any> {
  try {
    const order = await sdk.store.order.retrieve(orderId, {}, headers);
    return order;
  } catch (error) {
    console.warn("Failed to verify order status:", error);
    return null;
  }
}

// /**
//  * Helper: Initiate payment session
//  */
// async function initiatePaymentSession(data: {
//   cart_id: string;
//   provider_id: string;
//   data?: any;
// }): Promise<any> {
//   try {
//     // Implementation depends on your SDK/API
//     const response = await sdk.store.payment.initiate(data);
//     return response;
//   } catch (error: any) {
//     console.error("Initiate payment session error:", error);
//     throw new Error(`Payment session initiation failed: ${error.message}`);
//   }
// }

/**
 * Helper: Capture payment
 */
// async function capturePayment(data: {
//   order_id: string;
//   payment_method: string;
//   payment_data?: any;
// }): Promise<any> {
//   try {
//     // Implementation depends on your SDK/API
//     const response = await sdk.admin.payment.capture(data);
//     return response;
//   } catch (error: any) {
//     console.error("Capture payment error:", error);
//     throw new Error(`Payment capture failed: ${error.message}`);
//   }
// }

/**
 * Validate payment amount
 */
export function validatePaymentAmount(total: number, paidAmount: number): {
  isValid: boolean;
  change: number;
  message?: string;
} {
  if (paidAmount < total) {
    return {
      isValid: false,
      change: 0,
      message: `Insufficient payment. Need ${(total - paidAmount).toFixed(2)} more.`,
    };
  }

  return {
    isValid: true,
    change: paidAmount - total,
  };
}

/**
 * Format payment for display
 */
export function formatPayment(payment: any, currencyCode: string = "PHP"): string {
  if (!payment) return "₱0.00";
  
  const symbol = currencyCode === "PHP" ? "₱" : "$";
  return `${symbol}${payment.amount?.toFixed(2) || "0.00"}`;
}

/**
 * Get payment status badge color
 */
export function getPaymentStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "captured":
    case "completed":
      return "bg-green-100 text-green-800";
    case "authorized":
      return "bg-yellow-100 text-yellow-800";
    case "pending":
      return "bg-blue-100 text-blue-800";
    case "refunded":
      return "bg-purple-100 text-purple-800";
    case "failed":
    case "error":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Save payment record to localStorage (for offline/backup)
 */
export function savePaymentRecord(paymentData: {
  orderId: string;
  tableIds: string[];
  amount: number;
  method: string;
  status: string;
  timestamp: Date;
}): void {
  try {
    const payments = JSON.parse(localStorage.getItem("pos_payment_records") || "[]");
    payments.unshift({
      ...paymentData,
      id: crypto.randomUUID(),
      timestamp: paymentData.timestamp.toISOString(),
    });
    localStorage.setItem("pos_payment_records", JSON.stringify(payments.slice(0, 500)));
  } catch (error) {
    console.error("Error saving payment record:", error);
  }
}

/**
 * Get payment records from localStorage
 */
export function getPaymentRecords(): any[] {
  try {
    const payments = JSON.parse(localStorage.getItem("pos_payment_records") || "[]");
    return payments.map((p: any) => ({
      ...p,
      timestamp: new Date(p.timestamp),
    }));
  } catch (error) {
    console.error("Error getting payment records:", error);
    return [];
  }
}