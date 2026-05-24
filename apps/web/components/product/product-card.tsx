'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { formatPrice, getDefaultVariant, getLowestPrice } from '@/lib/medusa/utils'
import { useCart } from '@/lib/context/cart-context'
import { Button } from '@/components/ui/button'

export function ProductCard({ product, priority = false }: any) {
  const { addToCart, isLoading } = useCart() as any
  
  // Get default variant (first available variant with inventory)
  const defaultVariant = getDefaultVariant(product)
  
  // Get product pricing
  const { lowestPrice, originalPrice, hasDiscount, discountPercentage } = getLowestPrice(product)
  
  // Check if product is in stock
  const isInStock = product.variants?.some((variant: any) => 
    variant.inventory_quantity > 0 || variant.allow_backorder
  ) ?? !defaultVariant?.manage_inventory


  
  // Get product image
  const productImage = product.images?.[0] || product.thumbnail
  const imageAlt = productImage?.alt || product.title

  const handleQuickAdd = async (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (defaultVariant) {
      await addToCart(defaultVariant.id, 1)
    }
  }

  return (
    <div className="group relative">
      <Link href={`/products/${product.handle}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-[3/4] bg-secondary rounded-lg overflow-hidden mb-4">
          {productImage ? (
            <Image
              src={productImage.url}
              alt={imageAlt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12" />
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && discountPercentage > 0 && (
            <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
              -{discountPercentage}%
            </div>
          )}

          {/* Out of Stock Badge */}
          {!isInStock && (
            <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded">
              Sold Out
            </div>
          )}

          {/* Quick Add Button */}
          {isInStock && defaultVariant && (
            <div className="absolute inset-x-3 bottom-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              <Button
                onClick={handleQuickAdd}
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading tracking-wider"
              >
                ADD TO BAG
              </Button>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-1">
          {/* Product Type / Category */}
          {product.type?.value && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {product.type.value}
            </p>
          )}
          
          {/* Product Title */}
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {product.title}
          </h3>
          
          {/* Pricing */}
          <div className="flex items-center gap-2">
            <p className="text-primary font-medium">
              {formatPrice(lowestPrice)}
            </p>
            {hasDiscount && originalPrice && (
              <p className="text-sm text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </p>
            )}
          </div>

          {/* Inventory Status */}
          {isInStock && defaultVariant?.inventory_quantity <= 5 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Only {defaultVariant.inventory_quantity} left in stock
            </p>
          )}
        </div>
      </Link>
    </div>
  )
}