// components/store/checkout/order-summary.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { retrieveCompany } from "@/lib/medusa/data/companies";
import Image from "next/image";
import { convertToLocale } from "@/lib/medusa/util/money";
import { 
  ShoppingBag, 
  Store, 
  Truck, 
  Clock, 
  CreditCard, 
  Tag, 
  Percent, 
  Shield,
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderSummaryProps {
  showDetailedBreakdown?: boolean;
  className?: string;
  cart?: any;
}

export function OrderSummary({ showDetailedBreakdown = true, className, cart }: OrderSummaryProps) {
  const [company, setCompany] = useState<any>(cart?.company);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      if (cart?.metadata?.company_id) {
        try {
          const companyData = await retrieveCompany(
            cart.metadata.company_id as string
          );
          console.log(companyData, 'wwdwa')
          setCompany(companyData);
        } catch (error) {
          console.error("Error fetching company:", error);
        }
      }
      setLoading(false);
    };

    fetchCompany();
  }, [cart?.metadata?.company_id]);

  // Calculate totals using Medusa V2 cart structure
  const totals = useMemo(() => {
    if (!cart) return null;

    // Calculate item subtotal (original price without adjustments)
    const itemSubtotal = cart.items?.reduce(
      (sum: number, item: any) => sum + (item.unit_price * item.quantity),
      0
    ) || 0;

    // Get shipping total
    const shippingTotal = cart.shipping_methods?.reduce(
      (sum: number, method: any) => sum + (method.amount || 0),
      0
    ) || 0;

    // Get discount total from adjustments
    const discountTotal = cart.items?.reduce(
      (sum: number, item: any) => {
        const itemAdjustments = item.adjustments?.reduce(
          (adjSum: number, adjustment: any) => adjSum + (adjustment.amount || 0),
          0
        ) || 0;
        return sum + itemAdjustments;
      },
      0
    ) || 0;

    // Add any cart-level discounts
    const cartDiscountTotal = cart.discount_total || 0;
    const totalDiscounts = discountTotal + cartDiscountTotal;

    // Get tax total
    const taxTotal = cart.tax_total || 0;

    // Get gift card total
    const giftCardTotal = cart.gift_card_total || 0;

    // Calculate final total
    const finalTotal = (cart.total || 0) - (cart.gift_card_total || 0);

    // Get subtotal after discounts but before shipping and taxes
    const subtotalAfterDiscounts = itemSubtotal - totalDiscounts;

    return {
      itemSubtotal,
      shippingTotal,
      discountTotal: totalDiscounts,
      taxTotal,
      giftCardTotal,
      finalTotal,
      subtotalAfterDiscounts,
      currencyCode: cart.currency_code,
    };
  }, [cart]);

  // Group discounts by type for better display
  const discountBreakdown = useMemo(() => {
    if (!cart || !cart.items) return [];

    const discounts: { type: string; amount: number; code?: string; description?: string }[] = [];

    // Item-level discounts
    cart.items.forEach((item: any) => {
      item.adjustments?.forEach((adjustment: any) => {
        discounts.push({
          type: adjustment.adjustment_source || 'item_discount',
          amount: adjustment.amount,
          description: adjustment.description || `Discount on ${item.title}`,
          code: adjustment.code,
        });
      });
    });

    // Cart-level discounts from promo codes
    if (cart.discount_total > 0 && cart.discounts?.length) {
      cart.discounts.forEach((discount: any) => {
        discounts.push({
          type: discount.rule?.type || 'promotion',
          amount: discount.amount || cart.discount_total,
          code: discount.code,
          description: discount.rule?.description || discount.code,
        });
      });
    }

    return discounts;
  }, [cart]);

  // Get active promotions
  const activePromotions = useMemo(() => {
    if (!cart?.promotions) return [];
    return cart.promotions;
  }, [cart?.promotions]);

  if (loading) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-100 shadow-sm p-6", className)}>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm mt-4">Loading order summary...</p>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items?.length) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-100 shadow-sm p-6", className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">Your cart is empty</h3>
          <p className="text-muted-foreground text-sm">Add items to see order summary</p>
        </div>
      </div>
    );
  }

  if (!totals) return null;

  return (
    <div className={cn("bg-white rounded-lg border border-gray-100 shadow-sm", className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
          <span className="ml-auto bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
            {cart.items?.length || 0} {cart.items?.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Seller Info */}
      {company && (
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-foreground text-sm">Sold by</h3>
              <p className="text-foreground font-medium mt-0.5">{company.name}</p>
              {company.address && (
                <p className="text-muted-foreground text-xs mt-1">{company.address}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Promotions */}
      {activePromotions.length > 0 && (
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start gap-2">
            <Gift className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Active Promotions</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {activePromotions.map((promo: any, idx: number) => (
                  <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {promo.code || promo.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="p-6 border-b border-gray-100 max-h-[400px] overflow-y-auto">
        <div className="space-y-4">
          {cart.items?.map((item: any) => {
            const image = item.thumbnail;
            const itemOriginalTotal = (item.unit_price ?? 0) * item.quantity;
            const itemDiscountTotal = item.adjustments?.reduce(
              (sum: number, adj: any) => sum + (adj.amount || 0), 0
            ) || 0;
            const itemFinalTotal = itemOriginalTotal - itemDiscountTotal;
            
            // Check if item has discounts
            const hasDiscount = itemDiscountTotal > 0;
            
            return (
              <div key={item.id} className="flex gap-4">
                {/* Product Image */}
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {image ? (
                    <Image
                      src={image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm line-clamp-2">
                    {item.title}
                  </h3>
                  {item.variant_title && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.variant_title}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">
                      Qty: {item.quantity}
                    </span>
                    <div className="text-right">
                      {hasDiscount ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through mr-2">
                            {convertToLocale({ 
                              amount: itemOriginalTotal, 
                              currency_code: totals.currencyCode 
                            })}
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            {convertToLocale({ 
                              amount: itemFinalTotal, 
                              currency_code: totals.currencyCode 
                            })}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {convertToLocale({ 
                            amount: itemFinalTotal, 
                            currency_code: totals.currencyCode 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Item-level discount badges */}
                  {item.adjustments?.map((adjustment: any, idx: number) => (
                    <div key={idx} className="mt-1">
                      <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <Tag className="h-2 w-2" />
                        {adjustment.code || 'Discount'} applied
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="p-6 space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">
            {convertToLocale({ 
              amount: totals.itemSubtotal, 
              currency_code: totals.currencyCode 
            })}
          </span>
        </div>

        {/* Discounts Section */}
        {totals.discountTotal > 0 && (
          <>
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Discount
              </span>
              <span>-{convertToLocale({ 
                amount: totals.discountTotal, 
                currency_code: totals.currencyCode 
              })}</span>
            </div>
            
            {/* Detailed discount breakdown */}
            {showDetailedBreakdown && discountBreakdown.length > 0 && (
              <div className="ml-4 pl-2 border-l-2 border-green-200 space-y-1">
                {discountBreakdown.map((discount, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {discount.code ? `Promo: ${discount.code}` : discount.description}
                    </span>
                    <span className="text-green-600">
                      -{convertToLocale({ 
                        amount: discount.amount, 
                        currency_code: totals.currencyCode 
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Subtotal after discounts */}
        {totals.discountTotal > 0 && (
          <div className="flex justify-between text-sm pt-1 border-t border-dashed border-gray-200">
            <span className="text-muted-foreground">Subtotal after discounts</span>
            <span className="text-foreground font-medium">
              {convertToLocale({ 
                amount: totals.subtotalAfterDiscounts, 
                currency_code: totals.currencyCode 
              })}
            </span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-foreground">
            {totals.shippingTotal === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              convertToLocale({ 
                amount: totals.shippingTotal, 
                currency_code: totals.currencyCode 
              })
            )}
          </span>
        </div>

        {/* Tax */}
        {totals.taxTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="text-foreground">
              {convertToLocale({ 
                amount: totals.taxTotal, 
                currency_code: totals.currencyCode 
              })}
            </span>
          </div>
        )}

        {/* Gift Card */}
        {totals.giftCardTotal > 0 && (
          <div className="flex justify-between text-sm text-purple-600">
            <span className="flex items-center gap-1">
              <Gift className="h-3 w-3" />
              Gift Card
            </span>
            <span>-{convertToLocale({ 
              amount: totals.giftCardTotal, 
              currency_code: totals.currencyCode 
            })}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 my-2"></div>

        {/* Final Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-base font-semibold text-foreground">Total</span>
          <div className="text-right">
            <span className="text-xl font-bold text-primary">
              {convertToLocale({ 
                amount: totals.finalTotal, 
                currency_code: totals.currencyCode 
              })}
            </span>
            {totals.giftCardTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                After gift card application
              </p>
            )}
          </div>
        </div>

        {/* Savings Summary */}
        {totals.discountTotal > 0 && (
          <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center gap-2">
              <Percent className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-700">
                You saved {convertToLocale({ 
                  amount: totals.discountTotal, 
                  currency_code: totals.currencyCode 
                })} on this order!
              </p>
            </div>
          </div>
        )}

        {/* Shipping Notice */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Shipping and tax calculations are estimates and may vary based on your location.
            </p>
          </div>
        </div>

        {/* Delivery Estimate */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <Clock className="h-3 w-3" />
          <span>Estimated delivery: 3-5 business days</span>
        </div>
      </div>

      {/* Secure Checkout Notice */}
      <div className="p-6 border-t border-gray-100 bg-gray-50/30 rounded-b-lg">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secure checkout • SSL encrypted</span>
        </div>
      </div>
    </div>
  );
}