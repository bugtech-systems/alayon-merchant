// modules/products/components/related-products.tsx
import { listProducts } from "@/lib/data/products"
import { getRegion } from "@/lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"
import { ProductCard } from "@/components/product-card"
import { Card, CardContent } from "@/components/ui/card"
import { Package, ChevronRight } from "lucide-react"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { cn } from "@/lib/utils"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  // Define related products logic
  const queryParams: HttpTypes.StoreProductParams & {
    tags?: string[]
  } = {}
  if (region?.id) {
    queryParams.region_id = region.id
  }
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id]
  }
  if (product.tags) {
    queryParams.tag_id = product.tags
      .map((t) => t.id)
      .filter(Boolean) as string[]
  }
  queryParams.is_giftcard = false

  const products = await listProducts({
    queryParams,
    countryCode,
  }).then(({ response }) => {
    return response.products.filter(
      (responseProduct) => responseProduct.id !== product.id
    )
  })

  // If no related products found, try to get products from the same collection or category
  let displayProducts = products
  if (!displayProducts.length && product.collection_id) {
    const collectionProducts = await listProducts({
      queryParams: {
        collection_id: [product.collection_id],
        region_id: region.id,
        is_giftcard: false,
      },
      countryCode,
    }).then(({ response }) => {
      return response.products.filter(
        (responseProduct) => responseProduct.id !== product.id
      )
    })
    displayProducts = collectionProducts.slice(0, 8)
  }

  // If still no products, try to get recent products
  if (!displayProducts.length) {
    const recentProducts = await listProducts({
      queryParams: {
        region_id: region.id,
        is_giftcard: false,
        limit: 8,
      },
      countryCode,
    }).then(({ response }) => {
      return response.products.filter(
        (responseProduct) => responseProduct.id !== product.id
      )
    })
    displayProducts = recentProducts
  }

  if (!displayProducts.length) {
    return null
  }

  return (
    <div className="w-full py-8 md:py-12">
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                You May Also Like
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Complete Your Look
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Customers who bought this also enjoyed these items
            </p>
          </div>
          
          <LocalizedClientLink 
            href="/catalog" 
            className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View All Products
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </LocalizedClientLink>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {displayProducts.slice(0, 8).map((relatedProduct, index) => (
            <div key={relatedProduct.id} className="group">
              <ProductCard 
                regionId={region?.id} 
                product={relatedProduct} 
                index={index}
              />
            </div>
          ))}
        </div>

        {/* View All Button - Mobile */}
        <div className="sm:hidden flex justify-center pt-4">
          <LocalizedClientLink href="/catalog">
            <button className="w-full max-w-xs px-6 py-3 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors">
              Browse All Products
            </button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}