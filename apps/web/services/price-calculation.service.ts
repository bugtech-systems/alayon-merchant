// services/price-calculation.service.ts
import { MedusaCartItem } from "../types";

export class PriceCalculationService {
  // Use product data already fetched from listPriceListProducts
  static calculatePriceFromProductData(
    variant: {
      id: string;
      title: string;
      prices?: Array<{ amount: number; currency_code: string }>;
      calculated_price?: {
        calculated_amount: number;
        original_amount: number;
        currency_code: string;
      };
    },
    quantity: number,
    context: {
      currencyCode: string;
      priceListId?: string;
      customerGroupId?: string;
    }
  ): { unitPrice: number; originalPrice: number; strategy: string } {
    let unitPrice = 0;
    let originalPrice = 0;
    let strategy = 'default';

    // Get original price from variant data
    if (variant.calculated_price) {
      originalPrice = variant.calculated_price.original_amount || 
                     variant.calculated_price.calculated_amount || 0;
      unitPrice = variant.calculated_price.calculated_amount || originalPrice;
    } else if (variant.prices && variant.prices.length > 0) {
      const price = variant.prices.find(p => p.currency_code === context.currencyCode);
      originalPrice = price?.amount || variant.prices[0]?.amount || 0;
      unitPrice = originalPrice;
    }

    // Apply price list discount if available (from metadata)
    if (context.priceListId && (variant as any).price_list_price) {
      unitPrice = (variant as any).price_list_price;
      strategy = 'price_list';
    }
    // Apply customer group discount if available
    else if (context.customerGroupId && (variant as any).customer_group_price) {
      unitPrice = (variant as any).customer_group_price;
      strategy = 'customer_group';
    }

    return { unitPrice, originalPrice, strategy };
  }

  // Static method to update price list prices on products
  static applyPriceListToProducts(
    products: any[],
    priceListId: string,
    priceListPrices: Map<string, number>
  ): any[] {
    return products.map(product => ({
      ...product,
      variants: product.variants?.map((variant: any) => ({
        ...variant,
        price_list_price: priceListPrices.get(variant.id) || null,
        price_list_applied: priceListPrices.has(variant.id)
      }))
    }));
  }

  // Static method to update customer group prices on products
  static applyCustomerGroupToProducts(
    products: any[],
    customerGroupId: string,
    groupPrices: Map<string, number>
  ): any[] {
    return products.map(product => ({
      ...product,
      variants: product.variants?.map((variant: any) => ({
        ...variant,
        customer_group_price: groupPrices.get(variant.id) || null,
        customer_group_applied: groupPrices.has(variant.id)
      }))
    }));
  }

  static calculateCartTotals(
    items: MedusaCartItem[], 
    taxRate: number = 0
  ): {
    subtotal: number;
    taxTotal: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const taxTotal = subtotal * (taxRate / 100);
    const total = subtotal + taxTotal;
    
    return { subtotal, taxTotal, total };
  }

  // Calculate item total with tax
  static calculateItemTotal(item: MedusaCartItem, taxRate: number): number {
    const subtotal = item.unit_price * item.quantity;
    const tax = subtotal * (taxRate / 100);
    return subtotal + tax;
  }
}