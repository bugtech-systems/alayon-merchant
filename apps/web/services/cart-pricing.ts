// utils/cart-pricing.ts

export interface CartItemPricing {
  displayPrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  discountAmount: number;
  discountPercentage: number;
  pricingStrategy: 'custom' | 'price_list' | 'customer_group' | 'default';
  isCustomPriced: boolean;
  metadata: Record<string, any>;
}

export function getCartItemPricing(item: any): CartItemPricing {
  const isCustomPriced = item.metadata?.is_custom_priced === true;
  const hasPriceList = !!item.metadata?.price_list_id;
  const hasGroupPrice = !!item.metadata?.customer_group_id;
  
  let displayPrice = item.unit_price;
  let originalPrice = item.metadata?.original_price || item.unit_price;
  let pricingStrategy: CartItemPricing['pricingStrategy'] = 'default';
  
  if (isCustomPriced) {
    pricingStrategy = 'custom';
    displayPrice = item.metadata?.custom_price || item.unit_price;
    originalPrice = item.metadata?.original_price || displayPrice;
  } else if (hasPriceList) {
    pricingStrategy = 'price_list';
    displayPrice = item.metadata?.price_list_price || item.unit_price;
    originalPrice = item.metadata?.original_price || displayPrice;
  } else if (hasGroupPrice) {
    pricingStrategy = 'customer_group';
    displayPrice = item.metadata?.customer_group_price || item.unit_price;
    originalPrice = item.metadata?.original_price || displayPrice;
  }
  
  const hasDiscount = originalPrice > displayPrice;
  const discountAmount = hasDiscount ? originalPrice - displayPrice : 0;
  const discountPercentage = hasDiscount ? (discountAmount / originalPrice) * 100 : 0;
  
  return {
    displayPrice,
    originalPrice,
    hasDiscount,
    discountAmount,
    discountPercentage,
    pricingStrategy,
    isCustomPriced,
    metadata: item.metadata
  };
}

export function formatCartTotal(cart: any, region?: Region): {
  subtotal: number;
  taxTotal: number;
  total: number;
  discountTotal: number;
} {
  const items = cart.items || [];
  let subtotal = 0;
  let discountTotal = 0;
  
  items.forEach((item: any) => {
    const pricing = getCartItemPricing(item);
    const itemSubtotal = pricing.displayPrice * item.quantity;
    const itemOriginalSubtotal = pricing.originalPrice * item.quantity;
    
    subtotal += itemSubtotal;
    discountTotal += itemOriginalSubtotal - itemSubtotal;
  });
  
  const taxRate = region?.tax_rate || 0;
  const taxTotal = subtotal * (taxRate / 100);
  const total = subtotal + taxTotal;
  
  return {
    subtotal,
    taxTotal,
    total,
    discountTotal
  };
}