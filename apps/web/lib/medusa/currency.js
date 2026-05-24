// lib/medusa/currency.js

/**
 * Currency configuration for different regions
 */
export const CURRENCY_CONFIG = {
  USD: { symbol: '$', code: 'USD', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', locale: 'en-GB' },
  CAD: { symbol: 'C$', code: 'CAD', locale: 'en-CA' },
  AUD: { symbol: 'A$', code: 'AUD', locale: 'en-AU' },
  JPY: { symbol: '¥', code: 'JPY', locale: 'ja-JP', noCents: true },
  CNY: { symbol: '¥', code: 'CNY', locale: 'zh-CN' },
}

/**
 * Format price with currency support
 * @param {number} amount - Price amount in cents
 * @param {string} currencyCode - Currency code (USD, EUR, etc.)
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted price
 */
export function formatCurrency(amount, currencyCode = 'USD', showSymbol = true) {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.USD
  const amountInUnits = config.noCents ? amount : amount / 100
  
  const formatter = new Intl.NumberFormat(config.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currencyCode,
    minimumFractionDigits: config.noCents ? 0 : 2,
    maximumFractionDigits: config.noCents ? 0 : 2,
  })
  
  return formatter.format(amountInUnits)
}