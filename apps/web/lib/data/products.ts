// lib/data/products.ts
import { sdk } from "@/lib/config";
import { getAuthHeaders, getCacheOptions } from "@/lib/data/cookies";
import { getRegion } from "@/lib/data/regions";
import { sortProducts } from "@/lib/util/sort-products";
import { SortOptions } from "@/modules/store/components/refinement-list/sort-products";
import { HttpTypes } from "@medusajs/types";
import { adminFetch } from "@/lib/apiClient";

// ============================================
// TYPES
// ============================================

interface PriceListPrice {
  id: string;
  amount: number;
  currency_code: string;
  variant_id: string;
  min_quantity?: number;
  price_list_id: string;
}

interface PriceList {
  id: string;
  name: string;
  type: string;
  prices: PriceListPrice[];
}

interface ProductWithPricing extends HttpTypes.StoreProduct {
  variants: Array<HttpTypes.StoreProductVariant & {
    price_list_price?: number | null;
    price_list_id?: string | null;
    customer_group_price?: number | null;
    customer_price?: number | null;
    has_price_list_price?: boolean;
    has_customer_group_price?: boolean;
    has_customer_price?: boolean;
    applied_price_list_id?: string | null;
    applied_customer_group_id?: string | null;
    applied_customer_id?: string | null;
  }>;
  has_price_list_prices?: boolean;
  has_customer_group_prices?: boolean;
  has_customer_prices?: boolean;
  applied_price_list_id?: string;
  applied_customer_group_id?: string;
  applied_customer_id?: string;
}

export const getProductsById = async ({
  ids,
  regionId,
}: {
  ids: string[]
  regionId: string
}): Promise<any> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return await sdk.client.fetch(`/store/products`, {
      credentials: "include",
      method: "GET",
      query: {
        id: ids,
        region_id: regionId,
        fields:
          "*variants,*variants.calculated_price,*variants.inventory_quantity",
      },
      headers,
      next,
    })
}

export const getProductByHandle = async (handle: string, regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch(`/store/products`, {
      credentials: "include",
      method: "GET",
      query: {
        handle,
        region_id: regionId,
        fields:
          "*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags",
      },
      headers,
      next,
    })
}



/**
 * Fetch and apply price list prices to products
 */
export async function applyPriceListToProducts(
  products: any[],
  priceListId: string,
  currencyCode: string = 'php',
  options?: {
    customerGroupId?: string;
    customerId?: string;
    regionId?: string;
  }
): Promise<any[]> {
  try {
    // Fetch price list with prices and variant relationships
    const priceListResponse = await adminFetch(`/admin/price-lists/${priceListId}/prices`, {
      method: "GET",
      query: {
      },
    });

    const priceList = priceListResponse;
    if (!priceList || !priceList.prices || priceList.prices.length === 0) {
      console.warn(`Price list ${priceListId} has no prices`);
      return products as any[];
    }

    console.log(`Found ${priceList.prices.length} prices in price list`);

    // Create a map: variant_id -> best price info
    const priceMap = new Map<string, any>();
    
    priceList.prices.forEach((price: any) => {
      // Filter by currency
      if (price.price_rules.length < 1) return;
      
      // Extract variant ID from price_set relationship
      let variantId = null;
      // Handle different response structures
      if (price.price_set?.variants && price.price_set.variants.length > 0) {
        variantId = price.price_set.variants[0].id;
      } else if (price.price_set?.variant?.id) {
        variantId = price.price_set.variant.id;
      } else if (price.variant_id) {
        variantId = price.variant_id;
      }
      
      if (!variantId) {
        console.warn(`Cannot extract variant ID for price ${price.id}`);
        return;
      }
      
      // For multiple prices per variant, keep the one with lowest min_quantity
      const existing = priceMap.get(variantId);
      if (!existing || (price.min_quantity || 0) < (existing.min_quantity || 0)) {
        priceMap.set(variantId, {
          ...price,
          id: price.id,
          amount: price.amount,
          currency_code: price.currency_code,
          min_quantity: price.min_quantity || null,
          max_quantity: price.max_quantity || null,
          price_set_id: price.price_set_id,
          variant_id: variantId,
        });
      }
    });

    console.log(`Mapped ${priceMap.size} variants with prices for ${currencyCode}`);

    if (priceMap.size === 0) {
      console.warn(`No prices found for currency ${currencyCode} in price list ${priceListId}`);
      return products as any[];
    }

    // Apply price list prices to products
    const enrichedProducts = products
      .filter(product => {
        const hasPriceInList = product.variants?.some((variant: any) => priceMap.has(variant.id));
        if (!hasPriceInList) {
          console.log(`Product ${product.id} (${product.title}) has no variants in price list`);
        }
        return hasPriceInList;
      })
      .map((product: any) => ({
        ...product,
        variants: product.variants?.map((variant: any) => {
          const priceListPrice = priceMap.get(variant.id);
          if (!priceListPrice) return variant;
          
          // Get original price (regular price without discount)
          let originalPrice = getOriginalPrice(variant, currencyCode);
          
          const finalPrice = priceListPrice.amount;
          const hasDiscount = originalPrice > finalPrice && originalPrice > 0;
          const discountPercent = hasDiscount 
            ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) 
            : 0;
          
          // Determine pricing strategy
          let pricingStrategy: 'price_list' | 'customer_group' | 'customer' | 'default' = 'price_list';
          if (options?.customerGroupId) pricingStrategy = 'customer_group';
          if (options?.customerId) pricingStrategy = 'customer';
          
          if (hasDiscount) {
            console.log(`Variant ${variant.id} (${variant.title}): ${originalPrice} -> ${finalPrice} (${discountPercent}% off)`);
          }
          
          return {
            ...variant,
            // Price list info
            price_list_price: finalPrice,
            price_list_id: priceListId,
            price_list_price_id: priceListPrice.id,
            min_quantity: priceListPrice.min_quantity,
            max_quantity: priceListPrice.max_quantity,
            prices: [priceListPrice],
            // Price calculation
            original_price: originalPrice,
            calculated_price: {
              calculated_amount: finalPrice,
              original_amount: originalPrice > finalPrice ? originalPrice : finalPrice,
              currency_code: currencyCode,
            },
            
            // Flags and metadata
            has_price_list_price: true,
            discount_percentage: discountPercent,
            has_discount: hasDiscount,
            pricing_strategy: pricingStrategy,
          };
        }),
        has_price_list_prices: true,
        applied_price_list_id: priceListId,
        pricing_type: 'price_list',
      }));

    return enrichedProducts;
  } catch (error) {
    console.error('Error applying price list to products:', error);
    return products as any[];
  }
}

/**
 * Get original price from variant
 */
function getOriginalPrice(variant: any, currencyCode: string): number {
  // Try to get from variant.prices array
  if (variant.prices && Array.isArray(variant.prices)) {
    const regularPrice = variant.prices.find(
      (p: any) => p.currency_code === currencyCode && !p.price_list_id && !p.customer_group_id
    );
    if (regularPrice?.amount) {
      return regularPrice.amount;
    }
  }
  
  // Try calculated_price
  if (variant.calculated_price) {
    if (variant.calculated_price.original_amount) {
      return variant.calculated_price.original_amount;
    }
    if (variant.calculated_price.calculated_amount) {
      return variant.calculated_price.calculated_amount;
    }
  }
  
  // Fallback: use the first available price
  if (variant.prices && variant.prices.length > 0) {
    return variant.prices[0].amount;
  }
  
  return 0;
}

/**
 * Get the best price for a variant considering quantity
 */
export function getBestPriceForVariant(
  variant: any,
  quantity: number = 1,
  options?: {
    customerGroupId?: string;
    customerId?: string;
  }
): {
  price: number;
  originalPrice: number;
  pricingStrategy: string;
  minQuantity: number | null;
  maxQuantity: number | null;
} {
  // Check for price list price with quantity breaks
  if (variant.has_price_list_price && variant.price_list_price) {
    // Check if quantity meets min_quantity requirement
    const meetsMinQuantity = !variant.min_quantity || quantity >= variant.min_quantity;
    const meetsMaxQuantity = !variant.max_quantity || quantity <= variant.max_quantity;
    
    if (meetsMinQuantity && meetsMaxQuantity) {
      return {
        price: variant.price_list_price,
        originalPrice: variant.original_price || variant.price_list_price,
        pricingStrategy: variant.pricing_strategy || 'price_list',
        minQuantity: variant.min_quantity || null,
        maxQuantity: variant.max_quantity || null,
      };
    }
  }
  
  // Fallback to regular price
  const regularPrice = getRegularPrice(variant);
  
  return {
    price: regularPrice,
    originalPrice: regularPrice,
    pricingStrategy: 'default',
    minQuantity: null,
    maxQuantity: null,
  };
}

/**
 * Get regular price from variant
 */
function getRegularPrice(variant: any): number {
  if (variant.calculated_price?.calculated_amount) {
    return variant.calculated_price.calculated_amount;
  }
  if (variant.prices && variant.prices.length > 0) {
    return variant.prices[0].amount;
  }
  return 0;
}






/**
 * Apply customer group pricing to products
 */
async function applyCustomerGroupPricing(
  products: any[],
  customerGroupId: string,
  currencyCode: string,
  headers: any
): Promise<ProductWithPricing[]> {
  try {
    console.log(`Applying customer group pricing for group ID: ${customerGroupId}, currency: ${currencyCode}`);
    
    // Fetch customer group with its price lists using adminFetch
    const customerGroupResponse = await adminFetch(`/admin/customer-groups/${customerGroupId}`, {
      method: "GET",
      query: {
        fields: "id,name,price_lists,price_lists.id,price_lists.name,price_lists.prices,price_lists.prices.variant_id,price_lists.prices.amount,price_lists.prices.currency_code,price_lists.prices.min_quantity",
      },
    });
    
    const customerGroup = customerGroupResponse.customer_group || customerGroupResponse;
    
    if (!customerGroup) {
      console.warn(`Customer group ${customerGroupId} not found`);
      return products;
    }
    
    if (!customerGroup.price_lists || customerGroup.price_lists.length === 0) {
      console.warn(`Customer group ${customerGroupId} has no price lists`);
      return products;
    }
    
    console.log(`Found ${customerGroup.price_lists.length} price lists for customer group`);
    
    // Collect all prices from all price lists in the customer group
    const groupPriceMap = new Map<string, { amount: number; min_quantity?: number; price_list_name: string }>();
    
    for (const priceList of customerGroup.price_lists) {
      if (priceList.prices && priceList.prices.length > 0) {
        console.log(`Processing price list: ${priceList.name} with ${priceList.prices.length} prices`);
        
        priceList.prices.forEach((price: any) => {
          if (price.currency_code === currencyCode) {
            const existing = groupPriceMap.get(price.variant_id);
            // Prefer price with lower min_quantity or higher amount (better for customer)
            if (!existing || (price.min_quantity || 0) < (existing.min_quantity || 0)) {
              groupPriceMap.set(price.variant_id, {
                amount: price.amount,
                min_quantity: price.min_quantity,
                price_list_name: priceList.name,
              });
            }
          }
        });
      }
    }
    
    console.log(`Mapped ${groupPriceMap.size} variants with customer group prices`);
    
    // Apply pricing to variants
    const updatedProducts = products.map((product: any) => ({
      ...product,
      variants: product.variants?.map((variant: any) => {
        const groupPrice = groupPriceMap.get(variant.id);
        if (!groupPrice) return variant;
        
        const originalPrice = variant.prices?.find((p: any) => p.currency_code === currencyCode)?.amount || 
                             variant.calculated_price?.original_amount || 0;
        
        const hasDiscount = originalPrice > groupPrice.amount;
        
        return {
          ...variant,
          customer_group_price: groupPrice.amount,
          customer_group_price_list: groupPrice.price_list_name,
          min_quantity: groupPrice.min_quantity || null,
          calculated_price: {
            calculated_amount: groupPrice.amount,
            original_amount: originalPrice,
            currency_code: currencyCode,
          },
          has_customer_group_price: true,
          discount_percentage: hasDiscount ? ((originalPrice - groupPrice.amount) / originalPrice * 100) : 0,
        };
      }),
      has_customer_group_prices: true,
      applied_customer_group_id: customerGroupId,
      pricing_type: 'customer_group',
    }));
    
    console.log(`Applied customer group pricing to ${updatedProducts.length} products`);
    return updatedProducts;
  } catch (error) {
    console.error("Error applying customer group pricing:", error);
    return products;
  }
}

/**
 * Apply customer-specific pricing to products
 */
async function applyCustomerPricing(
  products: any[],
  customerId: string,
  currencyCode: string,
  headers: any
): Promise<ProductWithPricing[]> {
  try {
    console.log(`Applying customer-specific pricing for customer ID: ${customerId}, currency: ${currencyCode}`);
    
    // Get customer with their groups and price lists using adminFetch
    const customerResponse = await adminFetch(`/admin/customers/${customerId}`, {
      method: "GET",
      query: {
        fields: "id,email,first_name,last_name,groups,groups.id,groups.name,groups.price_lists,groups.price_lists.id,groups.price_lists.name,groups.price_lists.prices,groups.price_lists.prices.variant_id,groups.price_lists.prices.amount,groups.price_lists.prices.currency_code,groups.price_lists.prices.min_quantity",
      },
    });
    
    const customer = customerResponse.customer || customerResponse;
    
    if (!customer) {
      console.warn(`Customer ${customerId} not found`);
      return products;
    }
    
    if (!customer.groups || customer.groups.length === 0) {
      console.log(`Customer ${customerId} has no groups`);
      return products;
    }
    
    console.log(`Customer ${customer.email} belongs to ${customer.groups.length} groups`);
    
    // Collect prices from all groups the customer belongs to
    const customerPriceMap = new Map<string, { amount: number; min_quantity?: number; group_name: string; price_list_name: string }>();
    
    for (const group of customer.groups) {
      if (group.price_lists && group.price_lists.length > 0) {
        console.log(`Processing group: ${group.name} with ${group.price_lists.length} price lists`);
        
        for (const priceList of group.price_lists) {
          if (priceList.prices && priceList.prices.length > 0) {
            priceList.prices.forEach((price: any) => {
              if (price.currency_code === currencyCode) {
                const existing = customerPriceMap.get(price.variant_id);
                // Prefer price with lower min_quantity or higher amount
                if (!existing || (price.min_quantity || 0) < (existing.min_quantity || 0)) {
                  customerPriceMap.set(price.variant_id, {
                    amount: price.amount,
                    min_quantity: price.min_quantity,
                    group_name: group.name,
                    price_list_name: priceList.name,
                  });
                }
              }
            });
          }
        }
      }
    }
    
    console.log(`Mapped ${customerPriceMap.size} variants with customer-specific prices`);
    
    // Apply pricing to variants
    const updatedProducts = products.map((product: any) => ({
      ...product,
      variants: product.variants?.map((variant: any) => {
        const customerPrice = customerPriceMap.get(variant.id);
        if (!customerPrice) return variant;
        
        const originalPrice = variant.prices?.find((p: any) => p.currency_code === currencyCode)?.amount || 
                             variant.calculated_price?.original_amount || 0;
        
        const hasDiscount = originalPrice > customerPrice.amount;
        
        return {
          ...variant,
          customer_price: customerPrice.amount,
          customer_price_group: customerPrice.group_name,
          customer_price_list: customerPrice.price_list_name,
          min_quantity: customerPrice.min_quantity || null,
          calculated_price: {
            calculated_amount: customerPrice.amount,
            original_amount: originalPrice,
            currency_code: currencyCode,
          },
          has_customer_price: true,
          discount_percentage: hasDiscount ? ((originalPrice - customerPrice.amount) / originalPrice * 100) : 0,
        };
      }),
      has_customer_prices: true,
      applied_customer_id: customerId,
      pricing_type: 'customer',
    }));
    
    console.log(`Applied customer-specific pricing to ${updatedProducts.length} products`);
    return updatedProducts;
  } catch (error) {
    console.error("Error applying customer pricing:", error);
    return products;
  }
}

// Update the main listPriceListProducts function to use the new adminFetch versions
export async function listPriceListProducts({
  countryCode = "ph",
  priceListId,
  customerGroupId,
  customerId,
}: {
  countryCode?: string;
  priceListId?: string;
  customerGroupId?: string;
  customerId?: string;
}): Promise<{ products: ProductWithPricing[] }> {
  try {
    const headers = await getAuthHeaders();
    const region = await getRegion(countryCode);
    const currencyCode = region?.currency_code || 'php';
    
    console.log(`Fetching products for region: ${region?.id}, currency: ${currencyCode}`);
    console.log(`Pricing context: priceListId=${priceListId}, customerGroupId=${customerGroupId}, customerId=${customerId}`);
    
   
const productsResponse = await adminFetch("/admin/products", {
  method: "GET",
  query: {
    limit: 100,
    region_id: region?.id,
    // currency_code: region?.currency_code, // or your desired currency
    fields: "id,title,thumbnail,handle,status,*categories,*variants,variants.id,variants.title,variants.sku,variants.inventory_quantity,*variants.prices",
    price_list_id: [priceListId],  // Array of price list IDs
    // Optional: Add other filters
    // status: ["published"],
    // sales_channel_id: [salesChannelId],
  },
});
    


    let products = productsResponse.products || [];
    console.log(`Fetched ${products.length} total products`, products, productsResponse);
    
    // Apply pricing based on priority: Price List > Customer Group > Customer Specific
    if (priceListId) {
      console.log(`Applying price list pricing with ID: ${priceListId}`);
      const pricedProducts = await applyPriceListToProducts(products, priceListId, currencyCode);
      return { products: pricedProducts };
    } 
    
    if (customerGroupId) {
      console.log(`Applying customer group pricing with ID: ${customerGroupId}`);
      const pricedProducts = await applyCustomerGroupPricing(products, customerGroupId, currencyCode, headers);
      console.log(`After customer group pricing: ${pricedProducts.length} products`);
      return { products: pricedProducts };
    }
    
    if (customerId) {
      console.log(`Applying customer-specific pricing with ID: ${customerId}`);
      const pricedProducts = await applyCustomerPricing(products, customerId, currencyCode, headers);
      console.log(`After customer pricing: ${pricedProducts.length} products`);
      return { products: pricedProducts };
    }
    
    console.log(`No pricing context provided, returning ${products.length} products with default pricing`);
    return { products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [] };
  }
}






// ============================================
// PRICE HELPER FUNCTIONS
// ============================================

/**
 * Get product price based on context (price list, customer group, customer)
 */
export function getProductPrice(
  variant: any,
  context: {
    priceListId?: string;
    customerGroupId?: string;
    customerId?: string;
  }
): { price: number; originalPrice: number; type: string } {
  // Priority 1: Price list price
  if (context.priceListId && variant.price_list_price) {
    return {
      price: variant.price_list_price,
      originalPrice: variant.prices?.[0]?.amount || variant.calculated_price?.original_amount || variant.price_list_price,
      type: 'price_list',
    };
  }
  
  // Priority 2: Customer group price
  if (context.customerGroupId && variant.customer_group_price) {
    return {
      price: variant.customer_group_price,
      originalPrice: variant.prices?.[0]?.amount || variant.calculated_price?.original_amount || variant.customer_group_price,
      type: 'customer_group',
    };
  }
  
  // Priority 3: Customer-specific price
  if (context.customerId && variant.customer_price) {
    return {
      price: variant.customer_price,
      originalPrice: variant.prices?.[0]?.amount || variant.calculated_price?.original_amount || variant.customer_price,
      type: 'customer',
    };
  }
  
  // Priority 4: Calculated price from Medusa
  if (variant.calculated_price?.calculated_amount) {
    return {
      price: variant.calculated_price.calculated_amount,
      originalPrice: variant.calculated_price.original_amount || variant.calculated_price.calculated_amount,
      type: variant.calculated_price.calculated_amount !== variant.calculated_price.original_amount ? 'price_list' : 'default',
    };
  }
  
  // Priority 5: Default price from variant prices
  const defaultPrice = variant.prices?.[0]?.amount || 0;
  
  return {
    price: defaultPrice,
    originalPrice: defaultPrice,
    type: 'default',
  };
}

/**
 * Get variant price with quantity-based pricing
 */
export function getVariantPriceWithQuantity(
  variant: any,
  quantity: number,
  context: {
    priceListId?: string;
    customerGroupId?: string;
    customerId?: string;
  }
): { price: number; originalPrice: number; type: string; quantityBreak?: { min: number; price: number } } {
  const basePrice = getProductPrice(variant, context);
  
  // Check for quantity-based pricing in price list if available
  if (context.priceListId && variant.min_quantity && variant.min_quantity > 1 && quantity >= variant.min_quantity) {
    return {
      ...basePrice,
      quantityBreak: { min: variant.min_quantity, price: basePrice.price },
    };
  }
  
  return basePrice;
}

/**
 * Check if product has price in price list
 */
export function productHasPriceInList(product: any, priceListId: string): boolean {
  return product.variants?.some((variant: any) => variant.price_list_id === priceListId) || false;
}

/**
 * Filter products by price list
 */
export function filterProductsByPriceList(products: any[], priceListId: string): any[] {
  return products.filter(product => productHasPriceInList(product, priceListId));
}

// ============================================
// PRODUCT LIST WITH SORT (Enhanced)
// ============================================

/**
 * Fetch products with pricing and sorting
 */
export const listProductsWithSortAndPricing = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  priceListId,
  customerGroupId,
  customerId,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
  priceListId?: string
  customerGroupId?: string
  customerId?: string
}): Promise<{
  response: { products: ProductWithPricing[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  // Fetch products with pricing
  const { products } = await listPriceListProducts({
    countryCode,
    priceListId,
    customerGroupId,
    customerId,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = products.length > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count: products.length,
    },
    nextPage,
    queryParams,
  }
}



export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = (_pageParam - 1) * limit
  const region = await getRegion(countryCode)

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client.fetch(
      `/store/products`,
      {
        credentials: "include",
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region.id,
          fields: "*variants.calculated_price",
          ...queryParams,
        },
        headers,
        next,
      }
    )
    .then(({ products, count }: any) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}



/**
 * Legacy function for backward compatibility
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}