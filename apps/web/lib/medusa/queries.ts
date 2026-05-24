// lib/medusa/queries.ts

// ==================== Product Queries ====================

export const getProductsQuery = `
  query GetProducts(
    $first: Int
    $offset: Int
    $sort: String
    $order: String
    $collection_id: [String!]
    $type_id: [String!]
    $category_id: [String!]
  ) {
    products(
      first: $first
      offset: $offset
      sort: $sort
      order: $order
      collection_id: $collection_id
      type_id: $type_id
      category_id: $category_id
    ) {
      edges {
        node {
          id
          title
          subtitle
          description
          handle
          is_giftcard
          status
          thumbnail
          weight
          length
          height
          width
          hs_code
          origin_country
          mid_code
          material
          discountable
          external_id
          created_at
          updated_at
          metadata
          collection {
            id
            title
            handle
          }
          categories {
            id
            name
            handle
            description
            parent_category_id
          }
          type {
            id
            value
          }
          tags {
            id
            value
          }
          options {
            id
            title
            metadata
            values {
              id
              value
            }
          }
          variants {
            id
            title
            sku
            barcode
            ean
            upc
            variant_rank
            inventory_quantity
            allow_backorder
            manage_inventory
            hs_code
            origin_country
            mid_code
            material
            weight
            length
            height
            width
            created_at
            updated_at
            metadata
            options {
              id
              value
              option_id
            }
            prices {
              id
              amount
              currency_code
              min_quantity
              max_quantity
              created_at
              updated_at
            }
            calculated_price {
              calculated_amount
              original_amount
              currency_code
              calculated_price {
                id
                amount
                currency_code
                min_quantity
                max_quantity
                price_list_id
                price_list_type
              }
              original_price {
                id
                amount
                currency_code
                min_quantity
                max_quantity
                price_list_id
                price_list_type
              }
            }
          }
          images {
            id
            url
            created_at
            updated_at
            metadata
          }
        }
      }
      totalCount
    }
  }
`

export const getProductByHandleQuery = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      subtitle
      description
      handle
      is_giftcard
      status
      thumbnail
      weight
      length
      height
      width
      hs_code
      origin_country
      mid_code
      material
      discountable
      external_id
      created_at
      updated_at
      metadata
      collection {
        id
        title
        handle
        description
      }
      categories {
        id
        name
        handle
        description
        parent_category_id
      }
      type {
        id
        value
      }
      tags {
        id
        value
      }
      options {
        id
        title
        metadata
        values {
          id
          value
        }
      }
      variants {
        id
        title
        sku
        barcode
        ean
        upc
        variant_rank
        inventory_quantity
        allow_backorder
        manage_inventory
        hs_code
        origin_country
        mid_code
        material
        weight
        length
        height
        width
        created_at
        updated_at
        metadata
        options {
          id
          value
          option_id
        }
        prices {
          id
          amount
          currency_code
          min_quantity
          max_quantity
          created_at
          updated_at
        }
        calculated_price {
          calculated_amount
          original_amount
          currency_code
          calculated_price {
            id
            amount
            currency_code
            min_quantity
            max_quantity
            price_list_id
            price_list_type
          }
          original_price {
            id
            amount
            currency_code
            min_quantity
            max_quantity
            price_list_id
            price_list_type
          }
        }
      }
      images {
        id
        url
        created_at
        updated_at
        metadata
      }
    }
  }
`

export const getFeaturedProductsQuery = `
  query GetFeaturedProducts($first: Int) {
    products(first: $first, sort: "created_at", order: DESC) {
      edges {
        node {
          id
          title
          handle
          description
          thumbnail
          created_at
          variants {
            id
            title
            prices {
              amount
              currency_code
            }
          }
        }
      }
      totalCount
    }
  }
`

// ==================== Collection Queries ====================

export const getCollectionsQuery = `
  query GetCollections($first: Int, $offset: Int) {
    collections(first: $first, offset: $offset) {
      edges {
        node {
          id
          title
          handle
          description
          metadata
          created_at
          updated_at
          products {
            id
            title
            handle
            thumbnail
          }
        }
      }
      totalCount
    }
  }
`

export const getCollectionByHandleQuery = `
  query GetCollectionByHandle($handle: String!, $first: Int) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      metadata
      created_at
      updated_at
      products(first: $first) {
        id
        title
        handle
        description
        thumbnail
        created_at
        variants {
          id
          title
          prices {
            amount
            currency_code
          }
        }
      }
    }
  }
`

// ==================== Search Queries ====================

export const searchProductsQuery = `
  query SearchProducts($q: String!, $first: Int, $offset: Int) {
    products(first: $first, offset: $offset, q: $q) {
      edges {
        node {
          id
          title
          handle
          description
          thumbnail
          created_at
          variants {
            id
            title
            prices {
              amount
              currency_code
            }
          }
        }
      }
      totalCount
    }
  }
`

// ==================== Cart Mutations ====================

export const createCartMutation = `
  mutation CreateCart($input: CreateCartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        region_id
        customer_id
        email
        sales_channel_id
        billing_address_id
        shipping_address_id
        subtotal
        discount_total
        gift_card_total
        gift_card_tax_total
        shipping_total
        tax_total
        total
        created_at
        updated_at
        metadata
        items {
          id
          variant_id
          quantity
          unit_price
          subtotal
          total
          metadata
          created_at
          updated_at
          variant {
            id
            title
            sku
            product {
              id
              title
              thumbnail
            }
            prices {
              amount
              currency_code
            }
          }
        }
        shipping_methods {
          id
          shipping_option_id
          price
          data
          metadata
          shipping_option {
            id
            name
            amount
            price_type
          }
        }
        discounts {
          id
          code
          rule {
            type
            value
            allocation
          }
        }
        gift_cards {
          id
          code
          value
          balance
        }
        payment_collection {
          id
          amount
          status
          payment_sessions {
            id
            provider_id
            status
          }
        }
      }
    }
  }
`

export const getCartQuery = `
  query GetCart($id: String!) {
    cart(id: $id) {
      id
      region_id
      customer_id
      email
      sales_channel_id
      billing_address_id
      shipping_address_id
      subtotal
      discount_total
      gift_card_total
      gift_card_tax_total
      shipping_total
      tax_total
      total
      created_at
      updated_at
      metadata
      items {
        id
        variant_id
        quantity
        unit_price
        subtotal
        total
        metadata
        created_at
        updated_at
        variant {
          id
          title
          sku
          product {
            id
            title
            thumbnail
          }
          prices {
            amount
            currency_code
          }
        }
      }
      shipping_methods {
        id
        shipping_option_id
        price
        data
        metadata
        shipping_option {
          id
          name
          amount
          price_type
        }
      }
      discounts {
        id
        code
        rule {
          type
          value
          allocation
        }
      }
      gift_cards {
        id
        code
        value
        balance
      }
      region {
        id
        name
        currency_code
        tax_rate
        countries {
          iso_2
          iso_3
          name
        }
      }
      payment_collection {
        id
        amount
        status
        payment_sessions {
          id
          provider_id
          status
          data
        }
      }
    }
  }
`

export const addToCartMutation = `
  mutation AddToCart($id: String!, $items: [LineItemInput!]!) {
    addToCart(id: $id, items: $items) {
      cart {
        id
        region_id
        subtotal
        discount_total
        gift_card_total
        shipping_total
        tax_total
        total
        items {
          id
          variant_id
          quantity
          unit_price
          subtotal
          total
          metadata
          variant {
            id
            title
            product {
              id
              title
              thumbnail
            }
          }
        }
      }
    }
  }
`

export const updateCartMutation = `
  mutation UpdateCartItem($id: String!, $line_id: String!, $quantity: Int!, $metadata: JSONObject) {
    updateCartItem(id: $id, line_id: $line_id, quantity: $quantity, metadata: $metadata) {
      cart {
        id
        region_id
        subtotal
        discount_total
        gift_card_total
        shipping_total
        tax_total
        total
        items {
          id
          variant_id
          quantity
          unit_price
          subtotal
          total
          metadata
          variant {
            id
            title
            product {
              id
              title
              thumbnail
            }
          }
        }
      }
    }
  }
`

export const removeFromCartMutation = `
  mutation RemoveFromCart($id: String!, $line_ids: [String!]!) {
    removeFromCart(id: $id, line_ids: $line_ids) {
      cart {
        id
        region_id
        subtotal
        discount_total
        gift_card_total
        shipping_total
        tax_total
        total
        items {
          id
          variant_id
          quantity
          unit_price
          subtotal
          total
          variant {
            id
            title
            product {
              id
              title
              thumbnail
            }
          }
        }
      }
    }
  }
`

export const updateCartShippingMethodMutation = `
  mutation UpdateCartShippingMethod($id: String!, $shipping_method_id: String!) {
    updateCartShippingMethod(id: $id, shipping_method_id: $shipping_method_id) {
      cart {
        id
        shipping_methods {
          id
          price
          shipping_option {
            id
            name
          }
        }
        shipping_total
        total
      }
    }
  }
`

export const updateCartBillingAddressMutation = `
  mutation UpdateCartBillingAddress($id: String!, $address: AddressInput!) {
    updateCartBillingAddress(id: $id, address: $address) {
      cart {
        id
        billing_address {
          id
          first_name
          last_name
          company
          address_1
          address_2
          city
          country_code
          province
          postal_code
          phone
        }
      }
    }
  }
`

export const updateCartShippingAddressMutation = `
  mutation UpdateCartShippingAddress($id: String!, $address: AddressInput!) {
    updateCartShippingAddress(id: $id, address: $address) {
      cart {
        id
        shipping_address {
          id
          first_name
          last_name
          company
          address_1
          address_2
          city
          country_code
          province
          postal_code
          phone
        }
      }
    }
  }
`

export const applyDiscountToCartMutation = `
  mutation ApplyDiscountToCart($id: String!, $code: String!) {
    applyDiscountToCart(id: $id, code: $code) {
      cart {
        id
        discounts {
          id
          code
          rule {
            type
            value
          }
        }
        discount_total
        total
      }
    }
  }
`

export const removeDiscountFromCartMutation = `
  mutation RemoveDiscountFromCart($id: String!, $code: String!) {
    removeDiscountFromCart(id: $id, code: $code) {
      cart {
        id
        discounts {
          id
          code
        }
        discount_total
        total
      }
    }
  }
`

// ==================== Payment Queries/Mutations ====================

export const initiatePaymentSessionMutation = `
  mutation InitiatePaymentSession($cart_id: String!, $provider_id: String!, $context: JSONObject) {
    initiatePaymentSession(cart_id: $cart_id, provider_id: $provider_id, context: $context) {
      payment_session {
        id
        provider_id
        status
        data
      }
    }
  }
`

export const authorizePaymentSessionMutation = `
  mutation AuthorizePaymentSession($cart_id: String!, $provider_id: String!, $context: JSONObject) {
    authorizePaymentSession(cart_id: $cart_id, provider_id: $provider_id, context: $context) {
      payment_session {
        id
        provider_id
        status
        data
      }
    }
  }
`

// ==================== Customer Queries/Mutations ====================

export const getCustomerQuery = `
  query GetCustomer {
    customer {
      id
      email
      first_name
      last_name
      phone
      has_account
      metadata
      created_at
      updated_at
      billing_address {
        id
        first_name
        last_name
        company
        address_1
        address_2
        city
        country_code
        province
        postal_code
        phone
      }
      shipping_addresses {
        id
        first_name
        last_name
        company
        address_1
        address_2
        city
        country_code
        province
        postal_code
        phone
      }
      orders {
        id
        display_id
        status
        fulfillment_status
        payment_status
        total
        created_at
      }
    }
  }
`

export const createCustomerMutation = `
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      customer {
        id
        email
        first_name
        last_name
        phone
        has_account
      }
    }
  }
`

export const updateCustomerMutation = `
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      customer {
        id
        email
        first_name
        last_name
        phone
        metadata
      }
    }
  }
`

export const createCustomerAddressMutation = `
  mutation CreateCustomerAddress($input: CreateCustomerAddressInput!) {
    createCustomerAddress(input: $input) {
      address {
        id
        first_name
        last_name
        company
        address_1
        address_2
        city
        country_code
        province
        postal_code
        phone
      }
    }
  }
`

export const updateCustomerAddressMutation = `
  mutation UpdateCustomerAddress($address_id: String!, $input: UpdateCustomerAddressInput!) {
    updateCustomerAddress(address_id: $address_id, input: $input) {
      address {
        id
        first_name
        last_name
        company
        address_1
        address_2
        city
        country_code
        province
        postal_code
        phone
      }
    }
  }
`

// ==================== Order Queries ====================

export const getOrderQuery = `
  query GetOrder($id: String!) {
    order(id: $id) {
      id
      display_id
      status
      fulfillment_status
      payment_status
      region_id
      email
      subtotal
      discount_total
      gift_card_total
      shipping_total
      tax_total
      total
      currency_code
      metadata
      created_at
      updated_at
      items {
        id
        quantity
        unit_price
        subtotal
        total
        metadata
        variant {
          id
          title
          sku
          product {
            id
            title
            thumbnail
          }
        }
      }
      shipping_address {
        id
        first_name
        last_name
        company
        address_1
        address_2
        city
        country_code
        province
        postal_code
        phone
      }
      billing_address {
        id
        first_name
        last_name
        company
        address_1
        address_2
        city
        country_code
        province
        postal_code
        phone
      }
      shipping_methods {
        id
        price
        shipping_option {
          id
          name
        }
      }
      discounts {
        id
        code
        rule {
          type
          value
        }
      }
      gift_cards {
        id
        code
        value
      }
    }
  }
`

export const getOrdersQuery = `
  query GetOrders($first: Int, $offset: Int) {
    orders(first: $first, offset: $offset) {
      edges {
        node {
          id
          display_id
          status
          fulfillment_status
          payment_status
          total
          created_at
        }
      }
      totalCount
    }
  }
`

// ==================== Region Queries ====================

export const getRegionsQuery = `
  query GetRegions {
    regions {
      id
      name
      currency_code
      tax_rate
      created_at
      updated_at
      metadata
      countries {
        id
        iso_2
        iso_3
        name
        display_name
      }
      payment_providers {
        id
      }
      fulfillment_providers {
        id
      }
    }
  }
`

// ==================== Shipping Option Queries ====================

export const getShippingOptionsQuery = `
  query GetShippingOptions($cart_id: String, $region_id: String) {
    shippingOptions(cart_id: $cart_id, region_id: $region_id) {
      id
      name
      price_type
      amount
      provider_id
      requirements {
        id
        type
        amount
      }
    }
  }
`

// ==================== Payment Provider Queries ====================

export const getPaymentProvidersQuery = `
  query GetPaymentProviders($cart_id: String, $region_id: String) {
    paymentProviders(cart_id: $cart_id, region_id: $region_id) {
      id
    }
  }
`

// ==================== Store Queries ====================

export const getStoreQuery = `
  query GetStore {
    store {
      id
      name
      default_currency_code
      currencies {
        code
        name
        symbol
      }
      default_sales_channel_id
      payment_providers {
        id
      }
      fulfillment_providers {
        id
      }
      metadata
      created_at
      updated_at
    }
  }
`

// ==================== Sales Channel Queries ====================

export const getSalesChannelsQuery = `
  query GetSalesChannels {
    salesChannels {
      id
      name
      description
      is_disabled
      created_at
      updated_at
    }
  }
`

// ==================== Gift Card Queries ====================

export const getGiftCardByCodeQuery = `
  query GetGiftCardByCode($code: String!) {
    giftCard(code: $code) {
      id
      code
      value
      balance
      region_id
      is_disabled
      ends_at
      created_at
      updated_at
      region {
        id
        currency_code
      }
    }
  }
`