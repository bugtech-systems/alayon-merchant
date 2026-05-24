// lib/medusa/utils.js

/**
 * Format price from amount and currency
 * @param {Object} price - Price object with amount and currency_code
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  if (!price || !price.amount) return 'Price unavailable'
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency_code || 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(price.amount)
}

/**
 * Get default variant (first variant with inventory)
 * @param {Object} product - Medusa product object
 * @returns {Object|null} Default variant or null
 */
export function getDefaultVariant(product) {
  if (!product?.variants?.length) return null
  
  // Prioritize variants with inventory
  const inStockVariant = product.variants.find(variant => 
    variant.inventory_quantity > 0 || variant.allow_backorder
  )
  
  return inStockVariant || product.variants[0]
}

/**
 * Get lowest price from product variants
 * @param {Object} product - Medusa product object
 * @returns {Object} Price information
 */
export function getLowestPrice(product) {
  if (!product?.variants?.length) {
    return {
      lowestPrice: null,
      originalPrice: null,
      hasDiscount: false,
      discountPercentage: 0,
    }
  }

  let lowestPrice = null
  let originalPrice = null
  let hasDiscount = false
  let discountPercentage = 0

  // Find the lowest price across all variants
  for (const variant of product.variants) {
    if (!variant.prices?.length) continue
    
    // Get calculated price if available
    const calculatedPrice = variant.calculated_price
    const originalCalcPrice = variant.original_price
    
    if (calculatedPrice) {
      const priceAmount = calculatedPrice.calculated_amount
      const originalAmount = originalCalcPrice?.original_amount || priceAmount
      
      if (!lowestPrice || priceAmount < lowestPrice.amount) {
        lowestPrice = {
          amount: priceAmount,
          currency_code: calculatedPrice.currency_code || 'USD',
        }
        originalPrice = {
          amount: originalAmount,
          currency_code: calculatedPrice.currency_code || 'USD',
        }
        hasDiscount = priceAmount < originalAmount
        discountPercentage = hasDiscount 
          ? Math.round(((originalAmount - priceAmount) / originalAmount) * 100)
          : 0
      }
    } else {
      // Fallback to regular prices
      const regularPrice = variant.prices.find(p => !p.price_list_id)
      if (regularPrice && (!lowestPrice || regularPrice.amount < lowestPrice.amount)) {
        lowestPrice = {
          amount: regularPrice.amount,
          currency_code: regularPrice.currency_code,
        }
        originalPrice = lowestPrice
        hasDiscount = false
        discountPercentage = 0
      }
    }
  }


  return {
    lowestPrice,
    originalPrice,
    hasDiscount,
    discountPercentage,
  }
}

/**
 * Calculate discount percentage between two prices
 * @param {number} originalPrice - Original price amount
 * @param {number} discountedPrice - Discounted price amount
 * @returns {number} Discount percentage
 */
export function calculateDiscountPercentage(originalPrice, discountedPrice) {
  if (!originalPrice || !discountedPrice || originalPrice <= discountedPrice) return 0
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
}

/**
 * Check if product has any available variants
 * @param {Object} product - Medusa product object
 * @returns {boolean} True if product has available variants
 */
export function isProductAvailable(product) {
  if (!product?.variants?.length) return false
  return product.variants.some(variant => 
    variant.inventory_quantity > 0 || variant.allow_backorder
  )
}

/**
 * Get all unique product types from products array
 * @param {Array} products - Array of Medusa products
 * @returns {Array} Unique product types
 */
export function getUniqueProductTypes(products) {
  const types = new Set()
  products.forEach(product => {
    if (product.type?.value) {
      types.add(product.type.value)
    }
  })
  return Array.from(types)
}

/**
 * Get all unique product tags from products array
 * @param {Array} products - Array of Medusa products
 * @returns {Array} Unique product tags
 */
export function getUniqueProductTags(products) {
  const tags = new Set()
  products.forEach(product => {
    if (product.tags?.length) {
      product.tasks.forEach(tag => {
        if (tag.value) tags.add(tag.value)
      })
    }
  })
  return Array.from(tags)
}

/**
 * Format product variant options for display
 * @param {Object} variant - Medusa product variant
 * @returns {Object} Formatted options
 */
export function formatVariantOptions(variant) {
  if (!variant?.options?.length) return {}
  
  const options = {}
  variant.options.forEach(option => {
    options[option.option_id] = option.value
  })
  return options
}

/**
 * Get product URL with variant preselection
 * @param {Object} product - Medusa product
 * @param {Object} variant - Medusa variant
 * @returns {string} Product URL with variant query params
 */
export function getProductUrlWithVariant(product, variant) {
  if (!product?.handle) return '#'
  if (!variant?.options?.length) return `/products/${product.handle}`
  
  const params = new URLSearchParams()
  variant.options.forEach(option => {
    params.append(option.option_id, option.value)
  })
  
  return `/products/${product.handle}?${params.toString()}`
}