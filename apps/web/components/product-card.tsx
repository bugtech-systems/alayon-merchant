// components/product-card.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Eye, Star, AlertCircle, CheckCircle, Package, Truck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addToCartEventBus } from "@/lib/data/cart-event-bus"

// Types
interface VariantPrice {
  id: string;
  title: string;
  calculated_price: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
    is_calculated_price_price_list: boolean;
  };
  inventory_quantity?: number;
  allow_backorder?: boolean;
  manage_inventory?: boolean;
  prices?: Array<{
    amount: number;
    currency_code: string;
  }>;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  images?: Array<{ url: string; id: string; alt?: string }>;
  variants: VariantPrice[];
  rating?: number;
  reviews?: number;
  isNew?: boolean;
  tags?: string[];
  description?: string;
}

interface ProductCardProps {
  product: any;
  index: number;
  priority?: boolean;
  regionId?: string;
  viewMode?: string;
}



// Helper: Get default variant (first available or first in stock)
const getDefaultVariant = (product: Product): VariantPrice | any => {
  if (!product.variants || product.variants.length === 0) return null;
  
  // First try to find in-stock variant
  const inStockVariant = product.variants.find(variant => 
    (variant.inventory_quantity && variant.inventory_quantity > 0) || 
    variant.allow_backorder || 
    !variant.manage_inventory
  );
  
  if (inStockVariant) return inStockVariant;
  
  // Fallback to first variant
  return product.variants[0];
};

// Helper: Get variant price info
const getVariantPriceInfo = (variant: VariantPrice | null) => {
  if (!variant) {
    return { current: 0, original: 0, hasDiscount: false, discountPercentage: 0 };
  }
  
  const current = variant.calculated_price?.calculated_amount || 0;
  const original = variant.calculated_price?.original_amount || current;
  const hasDiscount = current < original;
  const discountPercentage = hasDiscount 
    ? Math.round(((original - current) / original) * 100)
    : 0;
  
  return { current, original, hasDiscount, discountPercentage };
};

// Helper: Get product lowest price info (for badge display)
const getProductLowestPrice = (product: Product) => {
  if (!product.variants?.length) {
    return { lowestPrice: 0, originalPrice: 0, hasDiscount: false, discountPercentage: 0 };
  }
  
  let lowestPrice = Infinity;
  let originalPrice = 0;
  
  for (const variant of product.variants) {
    const current = variant.calculated_price?.calculated_amount || 0;
    const original = variant.calculated_price?.original_amount || current;
    
    if (current < lowestPrice) {
      lowestPrice = current;
      originalPrice = original;
    }
  }
  
  const hasDiscount = lowestPrice < originalPrice;
  const discountPercentage = hasDiscount 
    ? Math.round(((originalPrice - lowestPrice) / originalPrice) * 100)
    : 0;
  
  return { lowestPrice, originalPrice, hasDiscount, discountPercentage };
};

// Helper: Get variant stock status
const getVariantStockStatus = (variant: VariantPrice | null): { text: string; variant: "in-stock" | "low-stock" | "out-of-stock" | "pre-order" } => {
  if (!variant) return { text: "Out of Stock", variant: "out-of-stock" };
  
  if (variant.allow_backorder) return { text: "Pre-order Available", variant: "pre-order" };
  if (variant.inventory_quantity && variant.inventory_quantity > 10) return { text: "In Stock", variant: "in-stock" };
  if (variant.inventory_quantity && variant.inventory_quantity > 0) return { text: `Only ${variant.inventory_quantity} left`, variant: "low-stock" };
  if (!variant.manage_inventory) return { text: "In Stock", variant: "in-stock" };
  return { text: "Out of Stock", variant: "out-of-stock" };
};

// Helper: Check if variant is in stock
const isVariantInStock = (variant: VariantPrice | null): boolean => {
  if (!variant) return false;
  return (variant.inventory_quantity && variant.inventory_quantity > 0) || 
         variant.allow_backorder || 
         !variant.manage_inventory;
};

// Helper: Get product image
const getProductImage = (product: Product | any): string => {
  if (product.thumbnail) return product.thumbnail;
  if (product.images && product.images.length > 0) return product.images[0].url;
  return "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop";
};

// Helper: Get hover image
const getHoverImage = (product: Product | any): string | undefined => {
  if (product.images && product.images.length > 1) return product.images[1].url;
  return undefined;
};

// Variant Selector Component
function VariantSelector({ 
  variants, 
  selectedVariantId, 
  onVariantSelect,
  disabled = false 
}: { 
  variants: VariantPrice[];
  selectedVariantId: string;
  onVariantSelect: (variantId: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedVariant = variants.find(v => v.id === selectedVariantId);
  
  if (variants.length <= 3) {
    return (
      <div className="flex gap-1 mt-2 pt-1 flex-wrap">
        {variants.map((variant) => {
          const isInStock = isVariantInStock(variant);
          const isSelected = selectedVariantId === variant.id;
          const { current, hasDiscount } = getVariantPriceInfo(variant);
          
          return (
            <button
              key={variant.id}
              onClick={() => !disabled && onVariantSelect(variant.id)}
              disabled={disabled || !isInStock}
              className={cn(
                "px-2 py-0.5 text-xs rounded-full border transition-all",
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                !isInStock && "opacity-50 cursor-not-allowed line-through"
              )}
            >
              {variant.title}
              {hasDiscount && isSelected && (
                <span className="ml-1 text-red-500">(-{Math.round(((variant.calculated_price?.original_amount || 0) - (variant.calculated_price?.calculated_amount || 0)) / (variant.calculated_price?.original_amount || 1) * 100)}%)</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
  
  return (
    <div className="relative mt-2">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1 text-xs rounded-md border transition-all",
          "bg-white hover:border-gray-300",
          isOpen && "border-blue-600 ring-1 ring-blue-600"
        )}
      >
        <span className="text-gray-600">
          {selectedVariant?.title || "Select variant"}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
          {variants.map((variant) => {
            const isInStock = isVariantInStock(variant);
            const { current, original, hasDiscount } = getVariantPriceInfo(variant);
            
            return (
              <button
                key={variant.id}
                onClick={() => {
                  onVariantSelect(variant.id);
                  setIsOpen(false);
                }}
                disabled={!isInStock}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                  !isInStock && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  selectedVariantId === variant.id && "font-medium text-blue-600"
                )}>
                  {variant.title}
                </span>
                <div className="flex items-center gap-2">
                  {hasDiscount && (
                    <span className="text-red-500 text-xs font-medium">
                      ₱{current.toLocaleString()}
                    </span>
                  )}
                  {hasDiscount && (
                    <span className="text-gray-400 text-xs line-through">
                      ₱{original.toLocaleString()}
                    </span>
                  )}
                  {!hasDiscount && (
                    <span className="text-gray-900 text-xs font-medium">
                      ₱{current.toLocaleString()}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProductCard({ product, index, priority = false, regionId }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    const defaultVariant = getDefaultVariant(product);
    return defaultVariant?.id || "";
  });
  
  // Get selected variant object
  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return product.variants?.find((v: any) => v.id === selectedVariantId) || null;
  }, [product.variants, selectedVariantId]);
  
  // Get variant-specific price info
  const variantPriceInfo = useMemo(() => getVariantPriceInfo(selectedVariant), [selectedVariant]);
  
  // Get product lowest price (for "from" price display when no variant selected)
  const productLowestPrice = useMemo(() => getProductLowestPrice(product), [product]);
  
  // Get variant stock status
  const variantStockStatus = useMemo(() => getVariantStockStatus(selectedVariant), [selectedVariant]);
  
  // Check if variant is in stock
  const isInStock = useMemo(() => isVariantInStock(selectedVariant), [selectedVariant]);
  
  // Memoized values
  const productImage = useMemo(() => getProductImage(product), [product]);
  const hoverImage = useMemo(() => getHoverImage(product), [product]);
  const hasVariants = product.variants?.length > 1;
  const company = Array.isArray(product.company) ? product.company[0] : product.company;
  // Determine what price to display
  const displayPrice = useMemo(() => {
    if (selectedVariant) {
      return variantPriceInfo.current;
    } else if (hasVariants) {
      return productLowestPrice.lowestPrice;
    }
    return 0;
  }, [selectedVariant, variantPriceInfo.current, hasVariants, productLowestPrice.lowestPrice]);
  
  const displayOriginalPrice = useMemo(() => {
    if (selectedVariant) {
      return variantPriceInfo.original;
    } else if (hasVariants) {
      return productLowestPrice.originalPrice;
    }
    return 0;
  }, [selectedVariant, variantPriceInfo.original, hasVariants, productLowestPrice.originalPrice]);
  
  const displayHasDiscount = useMemo(() => {
    if (selectedVariant) {
      return variantPriceInfo.hasDiscount;
    } else if (hasVariants) {
      return productLowestPrice.hasDiscount;
    }
    return false;
  }, [selectedVariant, variantPriceInfo.hasDiscount, hasVariants, productLowestPrice.hasDiscount]);
  
  const displayDiscountPercentage = useMemo(() => {
    if (selectedVariant) {
      return variantPriceInfo.discountPercentage;
    } else if (hasVariants) {
      return productLowestPrice.discountPercentage;
    }
    return 0;
  }, [selectedVariant, variantPriceInfo.discountPercentage, hasVariants, productLowestPrice.discountPercentage]);
  
  // Handle quick add to cart using event bus
  const handleQuickAdd = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedVariant) {
      toast.error("Please select a variant");
      return;
    }
    
    if (!isInStock && !selectedVariant.allow_backorder) {
      toast.error("This variant is currently out of stock");
      return;
    }
    
    if (!regionId) {
      toast.error("Region information is missing");
      return;
    }
    
    setIsAdding(true);
    
    try {
      // Create line item in the format expected by Medusa
      const lineItem = {
        productVariant: {
          ...selectedVariant,
          product: product,
        },
        quantity: 1,
      } as any;
      addToCartEventBus.emitCartAdd({
      lineItems: [lineItem],
      regionId,
      companyId: company?.id
    })

      
      // Show success toast with product details
      toast.success(`Added ${product.title}${selectedVariant.title ? ` (${selectedVariant.title})` : ''} to cart`, {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }, [selectedVariant, product, isInStock, regionId]);
  
  // Handle variant selection
  const handleVariantSelect = useCallback((variantId: string) => {
    setSelectedVariantId(variantId);
  }, []);
  
  // Stock status color mapping
  const stockStatusColors = {
    "in-stock": "text-green-600 bg-green-50",
    "low-stock": "text-orange-600 bg-orange-50",
    "out-of-stock": "text-red-600 bg-red-50",
    "pre-order": "text-blue-600 bg-blue-50",
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.5) }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
        <Link href={`/products/${product.handle}`} className="relative w-full h-full block">
          <Image
            src={productImage}
            alt={product.title}
            fill
            priority={priority}
            className={cn(
              "object-cover transition-all duration-700 ease-out",
              isHovered && hoverImage ? "scale-110 opacity-0" : "scale-100 opacity-100",
              !imageLoaded && "blur-sm"
            )}
            onLoad={() => setImageLoaded(true)}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt={product.title}
              fill
              className={cn(
                "object-cover transition-all duration-700 ease-out",
                isHovered ? "scale-110 opacity-100" : "scale-100 opacity-0"
              )}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            />
          )}
        </Link>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {displayHasDiscount && displayDiscountPercentage > 0 && (
            <div className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
              -{displayDiscountPercentage}%
            </div>
          )}
          {product.isNew && (
            <div className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
              New
            </div>
          )}
          {hasVariants && (
            <div className="bg-gray-800/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg">
              {product.variants.length} variants
            </div>
          )}
        </div>
        
        {/* Stock Status Badge (bottom left) */}
        {variantStockStatus.variant === "out-of-stock" && (
          <div className="absolute bottom-3 left-3 bg-red-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg">
            Out of Stock
          </div>
        )}
        
        {/* Pre-order Badge */}
        {variantStockStatus.variant === "pre-order" && (
          <div className="absolute bottom-3 left-3 bg-blue-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Package className="w-3 h-3" />
            Pre-order
          </div>
        )}
        
        {/* Free Shipping Badge - based on selected variant price */}
        {displayPrice > 1000 && isInStock && (
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-green-600 text-xs font-medium px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Free Shipping
          </div>
        )}
        
        {/* Quick Actions - Appears on hover */}
        {/* {isInStock && (
          <div className={cn(
            "absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent transition-all duration-300",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="flex gap-2">
              <Button 
                onClick={handleQuickAdd}
                disabled={isAdding || !selectedVariant || !regionId}
                className="flex-1 bg-white hover:bg-gray-100 text-gray-900 rounded-full text-sm font-medium disabled:opacity-50"
                size="sm"
              >
                {isAdding ? (
                  <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Quick Add
                  </>
                )}
              </Button>
            </div>
          </div>
        )} */}
        
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
        )}
      </div>
      
      {/* Product Info */}
      <div className="mt-4 space-y-2">
        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5 fill-current",
                    i < Math.floor(product.rating!)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              ({product.reviews})
            </span>
          </div>
        )}
        
        {/* Product Title */}
        <Link href={`/products/${product.handle}`}>
          <h3 className="font-medium text-gray-900 line-clamp-2 text-sm sm:text-base hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
        </Link>
        
        {/* Selected Variant Title */}
        {hasVariants && selectedVariant?.title && (
          <p className="text-xs text-gray-500">
            {selectedVariant.title}
          </p>
        )}
        
        {/* Price Display - Shows selected variant price */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasVariants && !selectedVariant && (
            <span className="text-xs text-gray-500 mr-1">From</span>
          )}
          <span className="text-lg font-bold text-gray-900">
            ₱{displayPrice.toLocaleString()}
          </span>
          {displayHasDiscount && displayOriginalPrice > displayPrice && (
            <span className="text-sm text-gray-400 line-through">
              ₱{displayOriginalPrice.toLocaleString()}
            </span>
          )}
          {displayHasDiscount && displayDiscountPercentage > 0 && (
            <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
              Save {displayDiscountPercentage}%
            </span>
          )}
        </div>
        
        {/* Stock Status - Shows selected variant stock */}
        <div className={cn(
          "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
          stockStatusColors[variantStockStatus.variant]
        )}>
          {variantStockStatus.variant === "low-stock" && <AlertCircle className="w-3 h-3" />}
          {variantStockStatus.variant === "in-stock" && <CheckCircle className="w-3 h-3" />}
          {variantStockStatus.variant === "pre-order" && <Package className="w-3 h-3" />}
          <span>{variantStockStatus.text}</span>
        </div>
        
        {/* Variant Selector */}
        {hasVariants && (
          <div onClick={(e) => e.preventDefault()}>
            <VariantSelector
              variants={product.variants}
              selectedVariantId={selectedVariantId}
              onVariantSelect={handleVariantSelect}
              disabled={isAdding}
            />
          </div>
        )}
        
        {/* Wholesale Badge - based on selected variant */}
        {selectedVariant?.calculated_price?.is_calculated_price_price_list && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Wholesale Price
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Skeleton component for loading state
export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-gray-200 rounded-2xl" />
      <div className="mt-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-6 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

// Global event listener component for handling add-to-cart events
export function AddToCartEventListener({ 
  onAddToCart 
}: { 
  onAddToCart: (lineItems: any[], regionId: string) => Promise<void> 
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleAddToCart = async (data: any) => {
      if (isProcessing) return;
      
      setIsProcessing(true);
      try {
        await onAddToCart(data.lineItems, data.regionId);
      } catch (error) {
        console.error("Failed to add to cart:", error);
        toast.error("Failed to add to cart");
      } finally {
        setIsProcessing(false);
      }
    };

    const unsubscribe = addToCartEventBus.subscribe(handleAddToCart);
    return unsubscribe;
  }, [onAddToCart, isProcessing]);

  return null;
}