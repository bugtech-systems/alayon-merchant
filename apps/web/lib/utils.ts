import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import sdk from "./config";
import { listPriceListProducts } from "./data/products";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "PHP", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}


// Helper function to fetch price list with variants
export async function fetchPriceListWithVariants(priceListId: string, currencyCode: string): Promise<Map<string, number>> {
  const priceMap = new Map();
  
  try {
    // Fetch price list with its prices
    const priceList = await listPriceListProducts({priceListId, countryCode: 'ph'});

    let prices = [] as any;
    if(!priceList || !priceList?.products?.length) return priceMap
    priceList?.products.map((a: any) => {
        if(a?.va)
      console.log(a?.variants, "AAA")
        a?.variants.map(v => {
            v.prices.map(p => {
              prices.push({
                  ...p,
                  variant_id: v.id,
              })
            })
        })
    })


    if (prices) {
      for (const price of prices) {
        if (price.currency_code === currencyCode && price.variant_id) {
          const key = `${price.variant_id}-${currencyCode}`;
          priceMap.set(key, price.amount);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching price list:', error);
  }
  
  return priceMap;
}

// Helper function to fetch customer group pricing
export async function fetchCustomerGroupPricing(customerGroupId: string, currencyCode: string): Promise<Map<string, number>> {
  const priceMap = new Map();
  
  try {
    // Fetch price lists associated with customer group
    const priceLists = await sdk.admin.priceList.list({
      customer_group_id: customerGroupId,
      status: 'active'
    });
    
    for (const priceList of priceLists.price_lists) {
      if (priceList.prices) {
        for (const price of priceList.prices) {
          if (price.currency_code === currencyCode && price.variant_id) {
            const key = `${price.variant_id}-${currencyCode}`;
            if (!priceMap.has(key)) {
              priceMap.set(key, price.amount);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching customer group pricing:', error);
  }
  
  return priceMap;
}


// Helper function to calculate cart totals
export function calculateCartTotals(items: any[], cartData: any) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.tax_total || 0), 0);
  const shippingTotal = cartData.shipping_total || 0;
  const discountTotal = cartData.discount_total || 0;
  const total = subtotal + taxTotal + shippingTotal - discountTotal;
  
  return {
    subtotal,
    tax_total: taxTotal,
    shipping_total: shippingTotal,
    discount_total: discountTotal,
    total
  };
}

// Types for better type safety
interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail: string;
  quantity: number;
  unit_price: number;
  original_unit_price: number;
  is_custom_priced: boolean;
  variant_title?: string;
  variant_sku?: string;
  subtotal: number;
  tax_total?: number;
  total?: number;
  pricing_source: 'default' | 'price_list' | 'customer_group' | 'custom';
  metadata?: Record<string, any>;
}

interface PricingStrategy {
  type: 'default' | 'price_list' | 'customer_group' | 'custom';
  priceListId?: string;
  customerGroupId?: string;
  hasCustomPrices: boolean;
}