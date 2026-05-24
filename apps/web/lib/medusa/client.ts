
// lib/medusa/client.ts
import Medusa from '@medusajs/medusa-js'
import { sdk } from './config'
import type {
  MedusaProduct,
  MedusaCollection,
  MedusaCart,
  MedusaRegion,
  MedusaCustomer,
  MedusaPricedProduct,
  MedusaStorefrontCart,
} from './types'
import { getAuthHeaders, getCacheOptions } from "./data/cookies"
import { HttpTypes } from "@medusajs/types"
import { getRegion } from '../actions/regions'


// Cache configuration for React Server Components
const defaultCacheOptions: RequestCache = 'force-cache'
const noCacheOptions: RequestCache = 'no-store'


// ==================== Product Operations ====================

// lib/medusa/client.ts - Update getProducts function
export async function getProducts(options?: {
  limit?: number
  offset?: number
  order?: string
  collection_id?: string[]
  type_id?: string[]
  category_id?: string[]
  q?: string
}): Promise<{ products: MedusaProduct[]; count: number }> {
  let region = await getRegion('ph');
  const params: Record<string, any> = {
    fields: "variants.prices.*,company.*",
    limit: options?.limit ?? 20,
    offset: options?.offset ?? 0,
    region_id: region?.id
  }

  // if (options?.order) params.order = options.order
  if (options?.collection_id?.length) params.collection_id = options.collection_id
  if (options?.type_id?.length) params.type_id = options.type_id
  if (options?.category_id?.length) params.category_id = options.category_id
  if (options?.q) params.q = options.q

  try {
    const {products, count} = await sdk.store.product.list(params) as any
    return {products, count}
  } catch (error) {
    console.error('Error fetching products:', error)
    return { products: [], count: 0 }
  }
}

// Add product types helper
export async function getProductTypes(): Promise<string[]> {
  try {
    const { products } = await medusaClient.products.list({ 
      fields: "variants.prices.*,company.*",
      limit: 100
     })
    const types = new Set(products.map(p => p.type?.value).filter(Boolean))
    return Array.from(types) as string[]
  } catch (error) {
    console.error('Error fetching product types:', error)
    return []
  }
}

// lib/medusa/client.js

/**
 * Get product by handle
 * @param {string} handle - Product handle
 * @returns {Promise<Object|null>} Product object or null if not found
 */
export async function getProductByHandle(handle) {
  try {
    // Method 1: Using the list endpoint with handle filter (recommended)
   const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }


  let region = await getRegions()


 let product =  await sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[] }>(`/store/products`, {
      credentials: "include",
      method: "GET",
      query: {
        handle,
        region_id: region[0].id,
        fields:
          "*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags,*company",
      },
      headers,
      next,
    })
    .then(({ products }) => products[0])

    return product
  } catch (error) {
    console.error(`Product with handle ${handle} not found:`, error)
    return null
  }
}

export async function getProductById(id: string): Promise<any | null> {
  try {
    const { product } = await sdk.store.product.retrieve(id)
    return product
  } catch (error) {
    console.error(`Product with id ${id} not found:`, error)
    return null
  }
}

export async function getFeaturedProducts(limit = 8): Promise<any[]> {
  const { products } = await sdk.store.product.list({
    limit,
    // order: 'created_at DESC',
  })
  return products
}

// ==================== Collection Operations ====================
// lib/medusa/client.ts - Fix collections
export async function getCollections(options?: {
  limit?: number
  offset?: number
}): Promise<{ collections: MedusaCollection[]; count: number }> {
  try {
    const { collections, count, limit, offset } = await sdk.store.collection.list({
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    })
    return { collections, count }
  } catch (error) {
    console.error('Error fetching collections:', error)
    return { collections: [], count: 0 }
  }
}

// ==================== Region Operations ====================

export async function getRegions(): Promise<any[]> {
  const { regions } = await sdk.store.region.list()
  return regions
}
