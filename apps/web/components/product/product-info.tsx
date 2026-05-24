// components/product/product-info.jsx
'use client'

import { useState, useEffect } from 'react'
import { Check, Minus, Plus, ShoppingBag, Truck, Shield, Heart, Share2 } from 'lucide-react'
import { formatPrice, getLowestPrice, calculateDiscountPercentage } from '@/lib/medusa/utils'
import { useCart } from '@/lib/context/cart-context'
import { Button } from '@/components/ui/button'

export function ProductInfo({ product }) {
  const { addToCart, isLoading } = useCart()
  
  // Get variants and options
  const variants = product.variants || []
  const options = product.options || []
  // Get pricing
  const { lowestPrice, originalPrice, hasDiscount, discountPercentage } = getLowestPrice(product)
  
  // State for selected variant and quantity
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [isWishlisted, setIsWishlisted] = useState(false)

  // Find available variants
  const inStockVariants = variants.filter(v => 
    v.inventory_quantity > 0 || v.allow_backorder
  )
  
  const isInStock =  inStockVariants.length > 0 || !selectedVariant?.manage_inventory
    
  // Set default variant on mount
  useEffect(() => {
    if (variants.length > 0) {
      // Prefer in-stock variant
      const defaultVariant = inStockVariants[0] || variants[0]
      setSelectedVariant(defaultVariant)
      
      // Initialize selected options from default variant
      if (defaultVariant?.options) {
        const initialOptions = {}
        defaultVariant.options.forEach(opt => {
          initialOptions[opt.option_id] = opt.value
        })
        setSelectedOptions(initialOptions)
      }
    }
  }, [product.id])

  // Handle option change
  const handleOptionChange = (optionId, value) => {
    const newOptions = { ...selectedOptions, [optionId]: value }
    setSelectedOptions(newOptions)
    
    // Find variant that matches all selected options
    const matchingVariant = variants.find(variant => {
      return variant.options?.every(opt => 
        newOptions[opt.option_id] === opt.value
      )
    })
    
    setSelectedVariant(matchingVariant || null)
  }

  // Handle quantity change
  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta
    if (newQuantity >= 1 && newQuantity <= (selectedVariant?.inventory_quantity || 99)) {
      setQuantity(newQuantity)
    }
  }

  // Add to cart
  const handleAddToCart = async () => {
    if (!selectedVariant) return
    console.log(selectedVariant, 'selected vari')
    await addToCart(selectedVariant.id, quantity)
    // Optional: reset quantity or show success message
    // setQuantity(1)
  }

  // Get variant pricing
  const getVariantPrice = () => {
    if (!selectedVariant) return lowestPrice
    
    // Check if variant has calculated price
    if (selectedVariant.calculated_price) {
      return {
        amount: selectedVariant.calculated_price.calculated_amount,
        currency_code: selectedVariant.calculated_price.currency_code || 'USD'
      }
    }

      console.log(selectedVariant, 'SELECTERDD VARIANT')

    // Fallback to first price
    const price = selectedVariant.prices?.find(p => !p.price_list_id)
    return price || lowestPrice
  }

  const variantPrice = getVariantPrice()
  const variantHasDiscount = selectedVariant?.original_price?.original_amount > variantPrice?.amount
  const variantDiscountPercent = variantHasDiscount && selectedVariant?.original_price?.original_amount
    ? calculateDiscountPercentage(
        selectedVariant.original_price.original_amount,
        variantPrice.amount
      )
    : discountPercentage

  return (
    <div className="lg:sticky lg:top-24 space-y-6">
      {/* Product Type/Category */}
      {product.type?.value && (
        <p className="text-primary font-medium tracking-widest uppercase">
          {product.type.value}
        </p>
      )}

      {/* Title */}
      <h1 className="font-heading text-4xl lg:text-5xl tracking-wider text-foreground">
        {product.title}
      </h1>

      {/* Price */}
      <div className="flex items-center gap-3">
        <p className="text-2xl font-medium text-primary">
          {formatPrice(variantPrice)}
        </p>
        {variantHasDiscount && (
          <>
            <p className="text-lg text-muted-foreground line-through">
              {formatPrice({
                amount: selectedVariant?.original_price?.original_amount,
                currency_code: variantPrice?.currency_code
              })}
            </p>
            <span className="bg-primary text-primary-foreground text-sm font-medium px-2 py-0.5 rounded">
              -{variantDiscountPercent}%
            </span>
          </>
        )}
      </div>

      {/* Description */}
      {product.description && (
        <p className="text-muted-foreground leading-relaxed">
          {product.description}
        </p>
      )}

      {/* Variant Options */}
      {options.length > 0 && (
        <div className="space-y-4">
          {options.map((option) => (
            <div key={option.id}>
              <label className="block text-sm font-medium text-foreground mb-2">
                {option.title}
              </label>
              <div className="flex flex-wrap gap-2">
                {option.values?.map((value) => {
                  const isSelected = selectedOptions[option.id] === value.value
                  const isAvailable = variants.some(variant =>
                    variant.options?.some(opt => 
                      opt.option_id === option.id && opt.value === value.value
                    )
                  )
                  
                  return (
                    <button
                      key={value.id}
                      onClick={() => handleOptionChange(option.id, value.value)}
                      disabled={!isAvailable}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : isAvailable
                            ? 'border-border hover:border-foreground'
                            : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {value.value}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quantity Selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-medium">{quantity}</span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={selectedVariant && quantity >= selectedVariant.inventory_quantity}
            className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
          {selectedVariant?.inventory_quantity <= 5 && selectedVariant?.inventory_quantity > 0 && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Only {selectedVariant.inventory_quantity} left
            </span>
          )}
        </div>
      </div>

      {/* Add to Cart Button */}
      <div className="space-y-3 pt-4">
        {isInStock && selectedVariant ? (
          <Button
            onClick={handleAddToCart}
            disabled={isLoading}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-lg tracking-wider"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            {isLoading ? 'ADDING...' : 'ADD TO BAG'}
          </Button>
        ) : (
          <Button
            disabled
            size="lg"
            className="w-full font-heading text-lg tracking-wider"
          >
            SOLD OUT
          </Button>
        )}

        {/* Wishlist and Share Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsWishlisted(!isWishlisted)}
            className="flex-1 gap-2"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            {isWishlisted ? 'SAVED' : 'SAVE'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: product.title,
                  text: product.description,
                  url: window.location.href,
                })
              }
            }}
            className="flex-1 gap-2"
          >
            <Share2 className="w-4 h-4" />
            SHARE
          </Button>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="pt-6 space-y-3 border-t border-border">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Truck className="w-5 h-5 flex-shrink-0" />
          <span>Free shipping on orders over $100</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <span>Secure checkout & buyer protection</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>30-day hassle-free returns</span>
        </div>
      </div>

      {/* Product Tags */}
      {product.tags?.length > 0 && (
        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-secondary text-sm rounded-full"
              >
                {tag.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Product Details */}
      <div className="pt-6 border-t border-border">
        <details className="group">
          <summary className="flex justify-between items-center cursor-pointer list-none">
            <span className="font-medium">Product Details</span>
            <span className="transition-transform group-open:rotate-180">▼</span>
          </summary>
          <dl className="mt-4 space-y-2 text-sm">
            {product.material && (
              <div className="flex">
                <dt className="w-32 text-muted-foreground">Material:</dt>
                <dd className="text-foreground">{product.material}</dd>
              </div>
            )}
            {product.weight && (
              <div className="flex">
                <dt className="w-32 text-muted-foreground">Weight:</dt>
                <dd className="text-foreground">{product.weight}g</dd>
              </div>
            )}
            {product.collection?.title && (
              <div className="flex">
                <dt className="w-32 text-muted-foreground">Collection:</dt>
                <dd className="text-foreground">{product.collection.title}</dd>
              </div>
            )}
            {product.origin_country && (
              <div className="flex">
                <dt className="w-32 text-muted-foreground">Origin:</dt>
                <dd className="text-foreground">{product.origin_country}</dd>
              </div>
            )}
          </dl>
        </details>
      </div>
    </div>
  )
}