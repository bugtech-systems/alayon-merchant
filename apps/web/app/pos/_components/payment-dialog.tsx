// app/(pos)/components/payment-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle,
  Receipt,
  AlertCircle,
  Home,
} from "lucide-react";
import { sdk } from "@/lib/config";
import { processPOSPayment } from "@/lib/actions/capture-payments";
import { Switch } from "@/components/ui/switch";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartId?: any;
  cart?: any;
  cartTotal: number;
  cartItems: any[];
  region?: {
    id: string;
    currency_code: string;
    tax_rate: number;
  };
  onComplete: (order: any) => Promise<void>;
  isLoading?: boolean;
  orderNumber?: string;
  customerName?: string;
  tableNumbers?: string[];
  companyId?: string;
}

export function PaymentDialog({
  open,
  onOpenChange,
  cart,
  cartTotal,
  cartItems,
  region,
  onComplete,
  isLoading = false,
  orderNumber,
  customerName,
  tableNumbers,
  companyId
}: PaymentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTakeOut, setIsTakeOut] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyCode = region?.currency_code?.toUpperCase() || "PHP";
  const taxRate = region?.tax_rate || 0;
  const taxAmount = cartTotal * (taxRate / 100);
  const subtotal = cartTotal - taxAmount;


  useEffect(() => {
    if (open) {
      setError(null);
      setPaymentSuccess(false);
    }
  }, [open]);

  const handlePayment = async () => {
    if (!cart?.id || !region) {
      setError("Cart or region information missing");
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      // First, ensure cart items have proper pricing metadata
      // This is critical - update each line item with its pricing strategy
      for (const item of cartItems) {
        console.log(item, 'ITEMMSSS')
        await sdk.store.cart.updateLineItem(cart?.id, item.id, {
          quantity: item.quantity,
          metadata: {
            ...item.metadata,
            // Preserve pricing information
            original_unit_price: item.original_unit_price || item.unit_price,
            applied_unit_price: item.unit_price,
            pricing_strategy: item.metadata?.pricing_strategy || 'default',
            is_custom_priced: item.metadata?.is_custom_priced || false,
            custom_price_reason: item.metadata?.custom_price_reason,
            custom_price_applied_by: item.metadata?.custom_price_applied_by,
            price_list_id: item.metadata?.price_list_id,
            price_list_price: item.metadata?.price_list_price,
            discount_amount: item.metadata?.discount_amount,
            discount_percentage: item.metadata?.discount_percentage,
            // Add timestamps
            pricing_finalized_at: new Date().toISOString(),
          }
        });
      }
      
      // Complete the cart to create the order
      const completeResult = await processPOSPayment({cart, paymentMethod: 'other', amount: cartTotal, isTakeOut});
      
      if (!completeResult.order) {
        throw new Error("Failed to create order");
      }
      
   
  
      
      setPaymentSuccess(true);
      await onComplete(completeResult.order);
      
      setTimeout(() => {
        onOpenChange(false);
        setPaymentSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Complete Order</span>
            {orderNumber && (
              <Badge variant="outline" className="text-xs">
                #{orderNumber}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Review order summary and confirm payment
          </DialogDescription>
        </DialogHeader>

        {paymentSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Order Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Order has been completed successfully.
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Order Summary with Pricing Details */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currencyCode} {subtotal.toFixed(2)}</span>
              </div>
              
              {/* Show discount summary if any */}
              {cartItems.some(item => item.metadata?.discount_amount > 0) && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Total Discount</span>
                  <span>-{currencyCode} {cartItems.reduce((sum, item) => {
                    const discount = (item.metadata?.original_price || item.unit_price) - item.unit_price;
                    return sum + (discount > 0 ? discount * item.quantity : 0);
                  }, 0).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>{currencyCode} {taxAmount.toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{currencyCode} {cartTotal.toFixed(2)}</span>
              </div>
              
              {/* Pricing Strategy Summary */}
              {cartItems.some(item => item.metadata?.pricing_strategy !== 'default') && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Pricing Applied:</p>
                  {cartItems.filter(item => item.metadata?.is_custom_priced).length > 0 && (
                    <Badge variant="outline" className="text-xs mr-1 mb-1 bg-purple-50">
                      Custom Prices: {cartItems.filter(item => item.metadata?.is_custom_priced).length} items
                    </Badge>
                  )}
                  {cartItems.filter(item => item.metadata?.price_list_id).length > 0 && (
                    <Badge variant="outline" className="text-xs mr-1 mb-1 bg-blue-50">
                      Price List: {cartItems.filter(item => item.metadata?.price_list_id).length} items
                    </Badge>
                  )}
                </div>
              )}
              
              {(customerName || (tableNumbers && tableNumbers.length > 0)) && (
                <>
                  <Separator className="my-1" />
                  {customerName && (
                    <div className="text-xs text-muted-foreground">
                      Customer: {customerName}
                    </div>
                  )}
                  {tableNumbers && tableNumbers.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Tables: {tableNumbers.join(", ")}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex p-4 bg-muted rounded-lg space-y-2 w-full">
              <div className="flex flex-grow items-center gap-2">
                <Home className="h-4 w-4" />
                <Label htmlFor="print-type">Take Out?</Label>
              </div>
              <Switch
                id="print-type"
                checked={isTakeOut}
                onCheckedChange={(checked) => 
                  setIsTakeOut(checked)
                }
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="min-w-[140px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Create Order
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}