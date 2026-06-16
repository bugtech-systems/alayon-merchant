// services/order-pricing.service.ts
export interface OrderPricingBreakdown {
  orderId: string;
  items: OrderItemPricing[];
  summary: {
    subtotal: number;
    total_discount: number;
    tax_amount: number;
    total: number;
    custom_priced_count: number;
    price_list_count: number;
  };
}

export interface OrderItemPricing {
  item_id: string;
  product_title: string;
  variant_title: string;
  quantity: number;
  original_price: number;
  applied_price: number;
  discount_amount: number;
  discount_percentage: number;
  pricing_strategy: string;
  is_custom_priced: boolean;
  custom_price_reason?: string;
  price_list_id?: string;
}

export class OrderPricingService {
  static extractPricingFromOrder(order: any): OrderPricingBreakdown {
    const items: OrderItemPricing[] = order.items?.map((item: any) => ({
      item_id: item.id,
      product_title: item.title,
      variant_title: item.variant_title,
      quantity: item.quantity,
      original_price: item.metadata?.original_unit_price || item.unit_price,
      applied_price: item.metadata?.applied_unit_price || item.unit_price,
      discount_amount: (item.metadata?.original_unit_price || item.unit_price) - item.unit_price,
      discount_percentage: item.metadata?.discount_percentage || 0,
      pricing_strategy: item.metadata?.pricing_strategy || 'default',
      is_custom_priced: item.metadata?.is_custom_priced || false,
      custom_price_reason: item.metadata?.custom_price_reason,
      price_list_id: item.metadata?.price_list_id,
    })) || [];
    
    const subtotal = items.reduce((sum, i) => sum + (i.original_price * i.quantity), 0);
    const total_applied = items.reduce((sum, i) => sum + (i.applied_price * i.quantity), 0);
    
    return {
      orderId: order.id,
      items,
      summary: {
        subtotal,
        total_discount: subtotal - total_applied,
        tax_amount: order.tax_total || 0,
        total: order.total || 0,
        custom_priced_count: items.filter(i => i.is_custom_priced).length,
        price_list_count: items.filter(i => i.price_list_id).length,
      }
    };
  }
}