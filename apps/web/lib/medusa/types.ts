// lib/medusa/types.ts

// ==================== Base Types ====================

export interface MedusaPrice {
  id?: string
  amount: number
  currency_code: string
  min_quantity?: number
  max_quantity?: number
  created_at?: string
  updated_at?: string
}

export interface MedusaMoneyAmount {
  id: string
  amount: number
  currency_code: string
  min_quantity: number | null
  max_quantity: number | null
}

export interface MedusaImage {
  id: string
  url: string
  created_at?: string
  updated_at?: string
  metadata?: Record<string, any>
}

export interface MedusaOption {
  id: string
  title: string
  product_id: string
  metadata?: Record<string, any>
  values?: MedusaOptionValue[]
}

export interface MedusaOptionValue {
  id: string
  value: string
  option_id: string
  metadata?: Record<string, any>
  variant_ids?: string[]
}

// ==================== Product Types ====================

export interface MedusaProductVariant {
  id: string
  title: string
  sku: string | null
  barcode: string | null
  ean: string | null
  upc: string | null
  variant_rank: number | null
  inventory_quantity: number
  allow_backorder: boolean
  manage_inventory: boolean
  hs_code: string | null
  origin_country: string | null
  mid_code: string | null
  material: string | null
  weight: number | null
  length: number | null
  height: number | null
  width: number | null
  options: MedusaVariantOption[]
  prices: MedusaPrice[]
  product_id: string
  product?: MedusaProduct
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
  calculated_price?: number
  original_price?: number
  currency_code?: string
}

export interface MedusaVariantOption {
  id: string
  value: string
  option_id: string
  option?: MedusaOption
  variant_id: string
  metadata?: Record<string, any>
}

export interface MedusaProduct {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  handle: string | null
  is_giftcard: boolean
  status: 'draft' | 'proposed' | 'published' | 'rejected'
  thumbnail: string | null
  weight: number | null
  length: number | null
  height: number | null
  width: number | null
  hs_code: string | null
  origin_country: string | null
  mid_code: string | null
  material: string | null
  collection_id: string | null
  collection?: MedusaCollection
  categories?: MedusaProductCategory[]
  type_id: string | null
  type?: MedusaProductType
  tags?: MedusaProductTag[]
  options?: MedusaOption[]
  variants?: MedusaProductVariant[]
  images?: MedusaImage[]
  discountable: boolean
  external_id: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaPricedProduct extends MedusaProduct {
  variants: MedusaProductVariant[]
  calculated_price?: number
  original_price?: number
  currency_code?: string
}

export interface MedusaProductType {
  id: string
  value: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaProductTag {
  id: string
  value: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaProductCategory {
  id: string
  name: string
  description: string | null
  handle: string
  is_active: boolean
  is_internal: boolean
  parent_category_id: string | null
  parent_category?: MedusaProductCategory
  category_children?: MedusaProductCategory[]
  products?: MedusaProduct[]
  rank: number | null
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

// ==================== Collection Types ====================

export interface MedusaCollection {
  id: string
  title: string
  handle: string
  description: string | null
  metadata?: Record<string, any>
  products?: MedusaProduct[]
  created_at: string
  updated_at: string
}

// ==================== Cart Types ====================

export interface MedusaCartLineItem {
  id: string
  cart_id: string
  cart?: MedusaCart
  variant_id: string
  variant?: MedusaProductVariant
  quantity: number
  unit_price: number
  subtotal: number
  total: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MedusaCartShippingMethod {
  id: string
  cart_id: string
  shipping_option_id: string
  shipping_option?: MedusaShippingOption
  price: number
  data?: Record<string, any>
  metadata?: Record<string, any>
}

export interface MedusaCart {
  id: string
  region_id: string
  region?: MedusaRegion
  customer_id: string | null
  customer?: MedusaCustomer
  sales_channel_id: string | null
  email: string | null
  billing_address_id: string | null
  billing_address?: MedusaAddress
  shipping_address_id: string | null
  shipping_address?: MedusaAddress
  items: MedusaCartLineItem[]
  shipping_methods?: MedusaCartShippingMethod[]
  discounts?: MedusaDiscount[]
  gift_cards?: MedusaGiftCard[]
  payment_collection?: MedusaPaymentCollection
  payment_session?: MedusaPaymentSession | null
  payment_authorized_at: string | null
  subtotal: number
  discount_total: number
  gift_card_total: number
  gift_card_tax_total: number
  shipping_total: number
  tax_total: number
  total: number
  context?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

// ==================== Region Types ====================

export interface MedusaRegion {
  id: string
  name: string
  currency_code: string
  currency?: MedusaCurrency
  tax_rate: number
  tax_codes?: MedusaTaxCode[]
  countries?: MedusaCountry[]
  payment_providers?: MedusaPaymentProvider[]
  fulfillment_providers?: MedusaFulfillmentProvider[]
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaCurrency {
  code: string
  symbol: string
  symbol_native: string
  name: string
  decimal_digits: number
  rounding: number
}

export interface MedusaTaxCode {
  code: string
  name: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaCountry {
  id: number
  iso_2: string
  iso_3: string
  num_code: number
  name: string
  display_name: string
  region_id: string | null
}

// ==================== Address Types ====================

export interface MedusaAddress {
  id: string
  customer_id: string | null
  company: string | null
  first_name: string | null
  last_name: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  country_code: string | null
  province: string | null
  postal_code: string | null
  phone: string | null
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

// ==================== Customer Types ====================

export interface MedusaCustomer {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  billing_address_id: string | null
  billing_address?: MedusaAddress
  shipping_addresses?: MedusaAddress[]
  phone: string | null
  has_account: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  orders?: MedusaOrder[]
}

// ==================== Order Types ====================

export interface MedusaOrder {
  id: string
  display_id: number
  status: OrderStatus
  fulfillment_status: FulfillmentStatus
  payment_status: PaymentStatus
  region_id: string
  region?: MedusaRegion
  customer_id: string | null
  customer?: MedusaCustomer
  email: string
  billing_address_id: string | null
  billing_address?: MedusaAddress
  shipping_address_id: string | null
  shipping_address?: MedusaAddress
  items: MedusaOrderItem[]
  shipping_methods: MedusaOrderShippingMethod[]
  discounts: MedusaDiscount[]
  gift_cards: MedusaGiftCard[]
  gift_card_transactions: MedusaGiftCardTransaction[]
  subtotal: number
  discount_total: number
  gift_card_total: number
  shipping_total: number
  tax_total: number
  total: number
  currency_code: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MedusaOrderItem {
  id: string
  order_id: string
  variant_id: string
  variant?: MedusaProductVariant
  quantity: number
  unit_price: number
  tax_total: number
  discount_total: number
  subtotal: number
  total: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MedusaOrderShippingMethod {
  id: string
  order_id: string
  shipping_option_id: string
  shipping_option?: MedusaShippingOption
  price: number
  tax_total: number
  subtotal: number
  total: number
  data?: Record<string, any>
  metadata?: Record<string, any>
}

export type OrderStatus = 
  | 'pending'
  | 'completed'
  | 'archived'
  | 'canceled'
  | 'requires_action'

export type FulfillmentStatus = 
  | 'not_fulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'shipped'
  | 'partially_shipped'
  | 'canceled'
  | 'returned'

export type PaymentStatus = 
  | 'not_paid'
  | 'awaiting'
  | 'captured'
  | 'partially_refunded'
  | 'refunded'
  | 'canceled'
  | 'requires_action'

// ==================== Discount Types ====================

export interface MedusaDiscount {
  id: string
  code: string
  is_dynamic: boolean
  rule: MedusaDiscountRule
  parent_discount_id: string | null
  usage_count: number
  usage_limit: number | null
  starts_at: string
  ends_at: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaDiscountRule {
  id: string
  type: DiscountRuleType
  description: string | null
  value: number
  allocation: DiscountAllocationType
  conditions?: MedusaDiscountCondition[]
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export type DiscountRuleType = 'fixed' | 'percentage' | 'free_shipping'
export type DiscountAllocationType = 'total' | 'item'

export interface MedusaDiscountCondition {
  id: string
  operator: 'in' | 'not_in'
  type: DiscountConditionType
  discount_rule_id: string
  products?: MedusaProduct[]
  product_types?: MedusaProductType[]
  product_collections?: MedusaCollection[]
  product_tags?: MedusaProductTag[]
  customer_groups?: MedusaCustomerGroup[]
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export type DiscountConditionType = 
  | 'products'
  | 'product_types'
  | 'product_collections'
  | 'product_tags'
  | 'customer_groups'

// ==================== Gift Card Types ====================

export interface MedusaGiftCard {
  id: string
  code: string
  value: number
  balance: number
  region_id: string
  region?: MedusaRegion
  is_disabled: boolean
  ends_at: string | null
  tax_rate: number | null
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaGiftCardTransaction {
  id: string
  gift_card_id: string
  gift_card?: MedusaGiftCard
  order_id: string
  amount: number
  created_at: string
  is_taxable: boolean
  tax_rate: number | null
}

// ==================== Payment Types ====================

export interface MedusaPaymentProvider {
  id: string
  is_installed: boolean
  created_at: string
  updated_at: string
}

export interface MedusaPaymentCollection {
  id: string
  type: PaymentCollectionType
  status: PaymentCollectionStatus
  description: string | null
  amount: number
  authorized_amount: number
  region_id: string
  region?: MedusaRegion
  currency_code: string
  currency?: MedusaCurrency
  payment_sessions?: MedusaPaymentSession[]
  payments?: MedusaPayment[]
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export type PaymentCollectionType = 'order_edit' | 'cart'
export type PaymentCollectionStatus = 
  | 'not_paid'
  | 'awaiting'
  | 'authorized'
  | 'partially_authorized'
  | 'canceled'

export interface MedusaPaymentSession {
  id: string
  cart_id: string
  cart?: MedusaCart
  provider_id: string
  provider?: MedusaPaymentProvider
  status: PaymentSessionStatus
  is_selected: boolean | null
  data: Record<string, any>
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export type PaymentSessionStatus = 
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'canceled'
  | 'requires_more'

export interface MedusaPayment {
  id: string
  order_id: string
  cart_id: string
  currency_code: string
  amount: number
  provider_id: string
  data: Record<string, any>
  captured_at: string | null
  canceled_at: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

// ==================== Shipping Types ====================

export interface MedusaShippingOption {
  id: string
  name: string
  region_id: string
  region?: MedusaRegion
  provider_id: string
  provider?: MedusaFulfillmentProvider
  price_type: 'flat_rate' | 'calculated'
  amount: number
  is_return: boolean
  admin_only: boolean
  requirements?: MedusaShippingOptionRequirement[]
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface MedusaShippingOptionRequirement {
  id: string
  shipping_option_id: string
  type: 'min_subtotal' | 'max_subtotal'
  amount: number
  created_at: string
  updated_at: string
}

export interface MedusaFulfillmentProvider {
  id: string
  is_installed: boolean
  created_at: string
  updated_at: string
}

// ==================== Customer Group Types ====================

export interface MedusaCustomerGroup {
  id: string
  name: string
  customers?: MedusaCustomer[]
  price_lists?: MedusaPriceList[]
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

// ==================== Price List Types ====================

export interface MedusaPriceList {
  id: string
  name: string
  description: string
  type: 'sale' | 'override'
  status: 'active' | 'draft'
  starts_at: string | null
  ends_at: string | null
  customer_groups?: MedusaCustomerGroup[]
  prices?: MedusaPriceListPrice[]
  created_at: string
  updated_at: string
}

export interface MedusaPriceListPrice {
  id: string
  amount: number
  currency_code: string
  min_quantity: number | null
  max_quantity: number | null
  variant_id: string
  price_list_id: string
  created_at: string
  updated_at: string
}

// ==================== Sales Channel Types ====================

export interface MedusaSalesChannel {
  id: string
  name: string
  description: string | null
  is_disabled: boolean
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

// ==================== API Response Types ====================

export interface MedusaResponse<T> {
  data: T
  message?: string
}

export interface MedusaListResponse<T> {
  data: T[]
  count: number
  limit: number
  offset: number
}

// ==================== Storefront Specific Types ====================

export interface MedusaStorefrontProduct extends MedusaProduct {
  calculated_price?: number
  original_price?: number
  currency_code?: string
  in_stock?: boolean
}

export interface MedusaStorefrontCart extends MedusaCart {
  items_quantity?: number
  items_subtotal?: number
  gift_cards_total?: number
}

// ==================== Error Types ====================

export interface MedusaError {
  code: string
  message: string
  type: string
}