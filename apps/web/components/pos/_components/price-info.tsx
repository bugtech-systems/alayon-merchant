// components/cart/price-info.tsx

import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { cn, getFinalPrice } from "@/lib/utils";

interface PriceInfoProps {
  unitPrice: number;
  originalPrice?: number;
  currencyCode: string;
  pricingStrategy?: string;
}

export function PriceInfo({ 
  unitPrice, 
  originalPrice, 
  currencyCode, 
  pricingStrategy 
}: PriceInfoProps) {
  const finalPrice = getFinalPrice(unitPrice);
  const hasDiscount = originalPrice && originalPrice > unitPrice;
  const discountPercent = hasDiscount 
    ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100) 
    : 0;

  const getStrategyBadge = () => {
    switch (pricingStrategy) {
      case 'price_list': 
        return { text: 'Promo', color: 'bg-blue-100 text-blue-700' };
      case 'customer_group': 
        return { text: 'Group Price', color: 'bg-green-100 text-green-700' };
      case 'custom': 
        return { text: 'Custom', color: 'bg-purple-100 text-purple-700' };
      default: 
        return null;
    }
  };

  const strategyBadge = getStrategyBadge();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-semibold text-primary">
          {currencyCode} {finalPrice.toFixed(2)}
        </span>
        {hasDiscount && (
          <span className="text-xs text-muted-foreground line-through">
            {currencyCode} {originalPrice.toFixed(2)}
          </span>
        )}
      </div>
      {hasDiscount && discountPercent > 0 && (
        <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">
          -{discountPercent}%
        </Badge>
      )}
      {strategyBadge && (
        <Badge className={cn("text-[10px]", strategyBadge.color)}>
          <Tag className="h-2 w-2 mr-1" />
          {strategyBadge.text}
        </Badge>
      )}
    </div>
  );
}