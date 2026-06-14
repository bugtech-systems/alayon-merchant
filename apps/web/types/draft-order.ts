// types/draft-order.ts
export interface DraftOrderItem {
  id?: string;
  variant_id?: string;
  title?: string;
  unit_price: number;
  quantity: number;
  thumbnail?: string;
  is_custom?: boolean;
}

export interface DraftOrderShippingMethod {
  option_id?: string;
  price?: number;
  name?: string;
}

export interface DraftOrderCustomer {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface DraftOrderAddress {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  country_code?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
}

export interface DraftOrder {
  id: string;
  email: string;
  region_id: string;
  region?: any;
  items: DraftOrderItem[];
  shipping_methods: DraftOrderShippingMethod[];
  customer_id?: string;
  customer?: DraftOrderCustomer;
  shipping_address?: DraftOrderAddress;
  billing_address?: DraftOrderAddress;
  discount_code?: string;
  total?: number;
  subtotal?: number;
  tax_total?: number;
  shipping_total?: number;
  discount_total?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
  countries: { id: string; iso_2: string; display_name: string }[];
  payment_providers: { id: string }[];
  fulfillment_providers: { id: string }[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  prices: { amount: number; currency_code: string }[];
  product: {
    id: string;
    title: string;
    thumbnail: string;
  };
}

export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}