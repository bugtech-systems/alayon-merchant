// types/index.ts
export interface MedusaCart {
  id: string;
  region_id: string;
  customer_id?: string;
  email?: string;
  currency_code: string;
  items: MedusaCartItem[];
  shipping_methods?: any[];
  payment_collection?: any;
  metadata?: {
    table_ids?: string[];
    pricing_strategy?: 'default' | 'price_list' | 'customer_group' | 'custom';
    price_list_id?: string;
    customer_group_id?: string;
    custom_prices?: Record<string, number>;
    custom_prices_enabled?: boolean;
    last_price_update?: string;
    is_draft?: boolean;
    draft_name?: string;
    notes?: string;
    order_pricing_snapshot?: any;
  };
  total?: number;
  subtotal?: number;
  tax_total?: number;
  created_at: string;
  updated_at: string;
}

export interface MedusaCartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail?: string;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  subtotal: number;
  tax_total?: number;
  total?: number;
  metadata?: {
    variant_title?: string;
    variant_sku?: string;
    is_custom_priced?: boolean;
    custom_price_applied_by?: string;
    original_price?: number;
    pricing_strategy?: string;
  };
}


export interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

export interface MedusaProduct {
  id: string;
  title: string;
  thumbnail: string | null;
  variants: MedusaProductVariant[];
  categories?: { id: string; name: string }[];
}

export interface MedusaProductVariant {
  id: string;
  title: string;
  sku?: string;
  prices: { amount: number; currency_code: string }[];
  inventory_quantity: number;
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
  };
}

export interface Customer {
  id: string;
  first_name: string;
  last_name?: string;
  customer_email: string;
  phone?: string;
  customer_group_id?: string;
}

export interface DraftOrder {
  id: string;
  cart_id: string;
  created_at: Date;
  updated_at: Date;
  items: MedusaCartItem[];
  total: number;
  customer_id?: string;
  customer_name?: string;
  table_ids?: string[];
  notes?: string;
}




export interface Customer {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  customer_group_id?: string;
  customer_group?: {
    id: string;
    name: string;
  };
}

export interface SimpleTable {
  id: string;
  name: string;
  number: string;
  capacity: number;
  status?: 'available' | 'occupied' | 'reserved' | 'clearing';
}

export interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

export interface DraftOrder {
  id: string;
  name: string;
  cart: MedusaCart;
  table_ids?: string[];
  customer_id?: string;
  customer_name?: string;
  item_count: number;
  total_amount: number;
}