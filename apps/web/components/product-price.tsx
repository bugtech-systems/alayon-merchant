// components/product-price.tsx
"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

interface PriceInfo {
  amount: number;
  currency_code: string;
  isOriginal?: boolean;
  min_quantity?: number | null;
  max_quantity?: number | null;
}

interface VariantPrice {
  id: string;
  title: string;
  calculated_price: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
    is_calculated_price_price_list: boolean;
  };
  prices: Array<{
    amount: number;
    currency_code: string;
    min_quantity?: number | null;
    max_quantity?: number | null;
  }>;
}

interface ProductPriceProps {
  product: {
    variants: VariantPrice[];
    title?: string;
  };
  variantId?: string;
  className?: string;
  showOriginal?: boolean;
  showLowestPrice?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
}

// Helper to format currency
const formatCurrency = (amount: number, currencyCode: string = "PHP") => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Get the lowest price across all variants
const getLowestPrice = (variants: VariantPrice[]) => {
  if (!variants.length) return null;
  
  let lowest = {
    amount: Infinity,
    currency_code: variants[0]?.calculated_price?.currency_code || "PHP",
  };
  
  for (const variant of variants) {
    const amount = variant.calculated_price?.calculated_amount;
    if (amount && amount < lowest.amount) {
      lowest.amount = amount;
      lowest.currency_code = variant.calculated_price.currency_code;
    }
  }
  
  return lowest.amount !== Infinity ? lowest : null;
};

// Get the highest original price (for showing "up to" scenarios)
const getHighestOriginalPrice = (variants: VariantPrice[]) => {
  if (!variants.length) return null;
  
  let highest = {
    amount: -Infinity,
    currency_code: variants[0]?.calculated_price?.currency_code || "PHP",
  };
  
  for (const variant of variants) {
    const amount = variant.calculated_price?.original_amount;
    if (amount && amount > highest.amount) {
      highest.amount = amount;
      highest.currency_code = variant.calculated_price.currency_code;
    }
  }
  
  return highest.amount !== -Infinity ? highest : null;
};

// Check if any variant has a price list discount (sale)
const hasSale = (variants: VariantPrice[]) => {
  return variants.some(
    (variant) => variant.calculated_price?.calculated_amount < 
                  variant.calculated_price?.original_amount
  );
};

// Calculate discount percentage
const getDiscountPercentage = (original: number, current: number) => {
  if (original <= 0 || current >= original) return null;
  return Math.round(((original - current) / original) * 100);
};

export const ProductPrice = memo(function ProductPrice({
  product,
  variantId,
  className,
  showOriginal = true,
  showLowestPrice = true,
  size = "md",
  align = "left",
}: ProductPriceProps) {
  const { variants } = product as any;
  
  if (!variants || variants.length === 0) {
    return null;
  }

  // Find selected variant
  const selectedVariant = variantId 
    ? variants.find((v: any) => v.id === variantId)
    : null;
  
  // If a specific variant is selected, show its price
  if (selectedVariant) {
    const currentPrice = selectedVariant.calculated_price?.calculated_amount;
    const originalPrice = selectedVariant.calculated_price?.original_amount;
    const currencyCode = selectedVariant.calculated_price?.currency_code || "PHP";
    const isOnSale = currentPrice < originalPrice;
    const discountPercent = isOnSale ? getDiscountPercentage(originalPrice, currentPrice) : null;

    const sizeClasses = {
      sm: {
        current: "text-base font-semibold",
        original: "text-xs",
        discount: "text-xs",
      },
      md: {
        current: "text-xl font-bold",
        original: "text-sm",
        discount: "text-xs",
      },
      lg: {
        current: "text-2xl font-bold",
        original: "text-base",
        discount: "text-sm",
      },
    };

    const alignClasses: any = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    };

    return (
      <div className={cn("space-y-1", alignClasses[align], className)}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Current Price */}
          <span className={cn("text-gray-900", sizeClasses[size].current)}>
            {formatCurrency(currentPrice, currencyCode)}
          </span>

          {/* Original Price (crossed out) */}
          {showOriginal && isOnSale && (
            <span className={cn("text-gray-400 line-through", sizeClasses[size].original)}>
              {formatCurrency(originalPrice, currencyCode)}
            </span>
          )}

          {/* Discount Badge */}
          {isOnSale && discountPercent && (
            <span className={cn(
              "bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium",
              sizeClasses[size].discount
            )}>
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Bulk pricing info if available */}
        {selectedVariant.prices?.some((p: any) => p.min_quantity) && (
          <p className="text-xs text-gray-500">
            Bulk pricing available for quantities of{" "}
            {selectedVariant.prices
              .filter((p: any) => p.min_quantity)
              .map((p: any) => `${p.min_quantity}+`)
              .join(", ")}
          </p>
        )}
      </div>
    );
  }

  // Show price range across all variants
  const lowestPrice = getLowestPrice(variants);
  const highestOriginal = getHighestOriginalPrice(variants);
  const hasAnySale = hasSale(variants);
  
  // Find the variant with the lowest current price for discount calculation
  const lowestVariant = variants.reduce((lowest: any, current: any) => {
    const currentAmount = current.calculated_price?.calculated_amount;
    const lowestAmount = lowest.calculated_price?.calculated_amount;
    return currentAmount < lowestAmount ? current : lowest;
  }, variants[0]);
  
  const lowestCurrent = lowestPrice?.amount || 0;
  const lowestOriginal = lowestVariant.calculated_price?.original_amount;
  const isLowestOnSale = hasAnySale && lowestCurrent < lowestOriginal;
  const discountPercent = isLowestOnSale 
    ? getDiscountPercentage(lowestOriginal, lowestCurrent)
    : null;

  const sizeClasses = {
    sm: {
      current: "text-base font-semibold",
      original: "text-xs",
      discount: "text-xs",
      range: "text-xs",
    },
    md: {
      current: "text-xl font-bold",
      original: "text-sm",
      discount: "text-xs",
      range: "text-sm",
    },
    lg: {
      current: "text-2xl font-bold",
      original: "text-base",
      discount: "text-sm",
      range: "text-base",
    },
  };

  // If all variants have the same price
  const allSamePrice = variants.every(
    (v: any) => v.calculated_price?.calculated_amount === lowestCurrent
  );

 const alignClasses: any = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    };

  if (allSamePrice) {
    return (
      <div className={cn(alignClasses[align], className)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-gray-900", sizeClasses[size].current)}>
            {formatCurrency(lowestCurrent, lowestPrice?.currency_code || "PHP")}
          </span>
          
          {showOriginal && isLowestOnSale && (
            <span className={cn("text-gray-400 line-through", sizeClasses[size].original)}>
              {formatCurrency(lowestOriginal, lowestPrice?.currency_code || "PHP")}
            </span>
          )}

          {discountPercent && (
            <span className={cn(
              "bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium",
              sizeClasses[size].discount
            )}>
              -{discountPercent}%
            </span>
          )}
        </div>
      </div>
    );
  }

  // Show price range
  const highestCurrent = variants.reduce((highest: any, current: any) => {
    const currentAmount = current.calculated_price?.calculated_amount;
    const highestAmount = highest.calculated_price?.calculated_amount;
    return currentAmount > highestAmount ? current : highest;
  }, variants[0]).calculated_price?.calculated_amount;

  return (
    <div className={cn("space-y-1", alignClasses[align], className)}>
      {/* Price Range */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-gray-900", sizeClasses[size].current)}>
          {formatCurrency(lowestCurrent, lowestPrice?.currency_code || "PHP")}
          {highestCurrent !== lowestCurrent && (
            <span className="text-gray-500 font-normal">
              {" "}
              - {formatCurrency(highestCurrent, lowestPrice?.currency_code || "PHP")}
            </span>
          )}
        </span>

        {showOriginal && hasAnySale && (
          <span className={cn("text-gray-400 line-through", sizeClasses[size].original)}>
            {formatCurrency(highestOriginal?.amount || 0, lowestPrice?.currency_code || "PHP")}
          </span>
        )}

        {discountPercent && showLowestPrice && (
          <span className={cn(
            "bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium",
            sizeClasses[size].discount
          )}>
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Lowest price label */}
      {showLowestPrice && !allSamePrice && (
        <p className={cn("text-gray-500", sizeClasses[size].range)}>
          Lowest price: {formatCurrency(lowestCurrent, lowestPrice?.currency_code || "PHP")}
        </p>
      )}
    </div>
  );
});

// Compact version for product cards
export function CompactProductPrice({ product, className }: { product: any; className?: string }) {
  const variants = product.variants || [];
  
  if (!variants.length) return null;
  
  const lowestPrice = getLowestPrice(variants);
  const hasMultiplePrices = variants.some(
    (v: any) => v.calculated_price?.calculated_amount !== lowestPrice?.amount
  );
  
  if (hasMultiplePrices) {
    const highestPrice = variants.reduce((highest: any, current: any) => {
      const currentAmount = current.calculated_price?.calculated_amount;
      const highestAmount = highest.calculated_price?.calculated_amount;
      return currentAmount > highestAmount ? current : highest;
    }, variants[0]).calculated_price?.calculated_amount;
    
    return (
      <div className={cn("text-gray-900", className)}>
        <span className="font-semibold">
          {formatCurrency(lowestPrice?.amount || 0, lowestPrice?.currency_code || "PHP")}
        </span>
        {highestPrice !== lowestPrice?.amount && (
          <span className="text-gray-500 text-sm">
            {" - "}
            {formatCurrency(highestPrice, lowestPrice?.currency_code || "PHP")}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn("font-semibold text-gray-900", className)}>
      {formatCurrency(lowestPrice?.amount || 0, lowestPrice?.currency_code || "PHP")}
    </div>
  );
}

// Export helper functions for use in other components
export { formatCurrency, getLowestPrice, hasSale, getDiscountPercentage };