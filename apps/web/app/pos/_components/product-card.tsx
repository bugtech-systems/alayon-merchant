// components/product-card.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Package, Loader2, ChevronDown, Minus, Plus, Tag, Users, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { MedusaProduct, Region } from "@/types";

interface ProductCardProps {
  product: MedusaProduct;
  onAddToCart: (params: {
    variantId: string;
    quantity: number;
    variantTitle: string;
    productTitle: string;
    unitPrice: number;
    originalPrice: number;
    pricingStrategy: string;
    companyId?: string;
  }) => Promise<void>;
  region?: Region;
  isLoading: boolean;
  selectedVariantId?: any;
  onVariantChange: (productId: string, variantId: string) => void;
  priceListId?: string;
  customerGroupId?: string;
  companyId?: string;
}

// Helper function to extract the best price from variant prices
const getVariantPriceInfo = (variant: any, priceListId?: string, customerGroupId?: string) => {
  if (!variant || !variant.prices || variant.prices.length === 0) {
    return {
      price: 0,
      originalPrice: 0,
      type: priceListId ? 'price_list' : customerGroupId ? 'customer_group' : 'default',
      priceListId: null
    };
  }

  let bestPrice = null;
  let bestPriceType = priceListId ? 'price_list' : customerGroupId ? 'customer_group' : 'default';
  let bestOriginalPrice = null;

  // Priority order: customer specific > customer group > price list > default
  const prices = variant.prices;
  // 1. Check for price list prices
  if (priceListId) {
    const priceListPrice = prices.find((p: any) => p.price_list_id === priceListId);
    if (priceListPrice) {
      bestPrice = priceListPrice;
      bestPriceType = 'price_list';
    }
  }
  
  // 2. Check for customer group prices (if we have customerGroupId and no price list price yet)
  if (customerGroupId && (!bestPrice || bestPriceType !== 'price_list')) {
    const groupPrice = prices.find((p: any) => p.customer_group_id === customerGroupId);
    if (groupPrice) {
      bestPrice = groupPrice;
      bestPriceType = 'customer_group';
    }
  }
  
  // 3. Fallback to any available price
  if (!bestPrice && prices.length > 0) {
    bestPrice = prices[0];
    bestPriceType = 'default';
  }
  
  // Find original price (non-discounted price from default price list or regular price)
  const originalPriceRecord = prices.find((p: any) => 
    !p.price_list_id && !p.customer_group_id && !p.customer_id
  );
  
  const calculatedPrice = bestPrice?.amount || 0;
  const calculatedOriginalPrice = originalPriceRecord?.amount || calculatedPrice;
  
  return {
    price: calculatedPrice,
    originalPrice: calculatedOriginalPrice,
    type: bestPriceType,
    priceListId: bestPrice?.price_list_id || null
  };
};

export function ProductCard({
  product,
  onAddToCart,
  region,
  isLoading,
  selectedVariantId,
  onVariantChange,
  priceListId,
  customerGroupId,
  companyId
}: ProductCardProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [localSelectedVariantId, setLocalSelectedVariantId] = useState(selectedVariantId);
  let pricingStrategy = priceListId ? 'price_list' : customerGroupId ? 'customer_group' : 'default';
  // Update local state when prop changes
  useEffect(() => {
    setLocalSelectedVariantId(selectedVariantId);
  }, [selectedVariantId]);
  
  const hasVariants = product.variants && product.variants.length > 0;
  const hasMultipleVariants = product.variants && product.variants.length > 1;
  const selectedVariant = product.variants?.find((v: any) => v.id === localSelectedVariantId) || product.variants?.[0];
  
  // Get price information using the helper
  const { price, originalPrice } = getVariantPriceInfo(
    selectedVariant, 
    priceListId, 
    customerGroupId
  );
  
  const getInventoryQuantity = () => {
    if (!selectedVariant) return 0;
    return selectedVariant.inventory_quantity || 
           selectedVariant.manage_inventory?.quantity || 
           selectedVariant.inventory?.quantity || 
           999;
  };
  
  const inventoryQuantity = getInventoryQuantity();
  const isOutOfStock = inventoryQuantity <= 0;
  const isLowStock = inventoryQuantity > 0 && inventoryQuantity <= 5;
  const hasDiscount = originalPrice > price && price > 0;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const currencySymbol = region?.currency_code?.toUpperCase() || "PHP";
  
  const getPricingBadge = () => {
    switch (pricingStrategy) {
      case 'price_list':
        return { text: 'Promo Price', icon: Tag, className: 'bg-blue-500 text-white' };
      case 'customer_group':
        return { text: 'Group Price', icon: Users, className: 'bg-green-500 text-white' };
      case 'customer':
        return { text: 'Special Price', icon: Star, className: 'bg-purple-500 text-white' };
      default:
        return null;
    }
  };
  
  const pricingBadge = getPricingBadge();
  
  const handleVariantChange = (variantId: string) => {
    setLocalSelectedVariantId(variantId);
    onVariantChange(product.id, variantId);
    setQuantity(1);
  };
  

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!selectedVariant) {
      toast({ title: "Error", description: "Please select a variant", variant: "destructive" });
      return;
    }
    
    if (isOutOfStock) {
      toast({ title: "Out of Stock", description: `${selectedVariant.title || product.title} is out of stock`, variant: "destructive" });
      return;
    }
    
    if (quantity > inventoryQuantity) {
      toast({ title: "Insufficient Stock", description: `Only ${inventoryQuantity} available`, variant: "destructive" });
      return;
    }
    
    if (price <= 0) {
      toast({ title: "Error", description: "Invalid price for this product", variant: "destructive" });
      return;
    }
    
    setIsAdding(true);
    try {
      await onAddToCart({
        variantId: selectedVariant.id,
        quantity,
        variantTitle: selectedVariant.title || "Default",
        productTitle: product.title,
        unitPrice: price,
        originalPrice: originalPrice,
        pricingStrategy: pricingStrategy,
        companyId: companyId
      });
      
      toast({ 
        title: "Added to Cart", 
        description: `${quantity}x ${product.title}${hasVariants ? ` (${selectedVariant.title})` : ''} added`,
      });
      setQuantity(1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({ title: "Error", description: "Failed to add item to cart", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleOpenVariantDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVariantDialog(true);
  };
  
  const VariantSelectionDialog = () => (
    <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select {product.title} Variant</DialogTitle>
          <DialogDescription>Choose the variant you want to add to cart</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-2">
            {product.variants.map((variant: any) => {
              const variantInventory = variant.inventory_quantity || 999;
              const isVariantOutOfStock = variantInventory <= 0;
              const { price: variantPrice, originalPrice: variantOriginalPrice, type: variantPricingType } = 
                getVariantPriceInfo(variant, priceListId, customerGroupId);
              const hasVariantDiscount = variantOriginalPrice > variantPrice && variantPrice > 0;
              
              return (
                <button
                  key={variant.id}
                  onClick={() => {
                    handleVariantChange(variant.id);
                    setShowVariantDialog(false);
                  }}
                  disabled={isVariantOutOfStock}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-all hover:shadow-md",
                    localSelectedVariantId === variant.id && "border-primary bg-primary/5",
                    isVariantOutOfStock && "opacity-50 cursor-not-allowed bg-muted"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{variant.title || "Default"}</p>
                        {variantPricingType !== 'default' && variantPricingType !== 'price_list' && (
                          <Badge variant="secondary" className="text-[10px]">
                            {variantPricingType === 'customer_group' && <Users className="h-2 w-2 mr-1" />}
                            {variantPricingType === 'customer' && <Star className="h-2 w-2 mr-1" />}
                            Special Price
                          </Badge>
                        )}
                        {priceListId && variantPricingType === 'price_list' && (
                          <Badge variant="secondary" className="text-[10px] bg-blue-100">
                            <Tag className="h-2 w-2 mr-1" />
                            Promo Price
                          </Badge>
                        )}
                      </div>
                      {variant.sku && (
                        <p className="text-xs text-muted-foreground mt-1">SKU: {variant.sku}</p>
                      )}
                      <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-primary">
                            {currencySymbol} {(variantPrice).toFixed(2)}
                          </span>
                          {hasVariantDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                              {currencySymbol} {(variantOriginalPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {hasVariantDiscount && (
                          <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 text-[10px]">
                            Save {currencySymbol} {((variantOriginalPrice - variantPrice)).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      {isVariantOutOfStock ? (
                        <Badge variant="destructive" className="mt-2">Out of Stock</Badge>
                      ) : variantInventory <= 5 && (
                        <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800 text-[10px]">
                          Only {variantInventory} left
                        </Badge>
                      )}
                    </div>
                    {localSelectedVariantId === variant.id && (
                      <div className="ml-2">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowVariantDialog(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  const QuantitySelector = () => (
    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 w-full justify-between">
      <Button 
        variant="outline" 
        size="icon" 
        className="h-8 w-8" 
        onClick={(e) => { 
          e.stopPropagation(); 
          setQuantity(prev => Math.max(1, prev - 1)); 
        }} 
        disabled={quantity <= 1}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-base font-semibold">{quantity}</span>
        <span className="text-[10px] text-muted-foreground">Qty</span>
      </div>
      <Button 
        variant="outline" 
        size="icon" 
        className="h-8 w-8" 
        onClick={(e) => { 
          e.stopPropagation(); 
          setQuantity(prev => Math.min(inventoryQuantity, prev + 1)); 
        }} 
        disabled={quantity >= inventoryQuantity}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
  
  const getStockStatus = () => {
    if (isOutOfStock) {
      return { text: "Out of Stock", className: "text-red-600 bg-red-50" };
    }
    if (isLowStock) {
      return { text: `Only ${inventoryQuantity} left`, className: "text-yellow-600 bg-yellow-50" };
    }
    return { text: "In Stock", className: "text-green-600 bg-green-50" };
  };
  
  const stockStatus = getStockStatus();
  
  // Don't render if no price is available
  if (price <= 0 && !isLoading) {
    return null;
  }
  
  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all hover:shadow-lg group",
        isOutOfStock && "opacity-60"
      )}>
        <CardContent className="p-0">
          {/* Image Section */}
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            {product.thumbnail ? (
              <Image 
                src={product.thumbnail} 
                alt={product.title} 
                fill 
                className="object-cover transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {hasDiscount && discountPercent > 0 && (
                <Badge className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs font-semibold">
                  -{discountPercent}% OFF
                </Badge>
              )}
              {pricingBadge && (
                <Badge className={cn("px-2 py-1 text-xs font-semibold", pricingBadge.className)}>
                  <pricingBadge.icon className="h-2 w-2 mr-1" />
                  {pricingBadge.text}
                </Badge>
              )}
            </div>
            
            {/* Stock Status Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <Badge variant="destructive" className="text-sm px-3 py-1.5 font-semibold">
                  Out of Stock
                </Badge>
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="p-3 space-y-3">
            {/* Product Title */}
            <div>
              <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px]">
                {product.title}
              </h3>
              {product.categories && product.categories.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {product.categories.map(c => c.name).join(", ")}
                </p>
              )}
            </div>
            
            {/* Variant Selector */}
            {hasVariants && (
              <div>
                {hasMultipleVariants ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-xs h-8"
                    onClick={handleOpenVariantDialog}
                  >
                    <span className="truncate">
                      {selectedVariant?.title || "Select Variant"}
                    </span>
                    <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground px-2 py-1.5 bg-muted/50 rounded-md text-center">
                    {selectedVariant?.title || "Default"}
                  </div>
                )}
              </div>
            )}
            
            {/* Price Section */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-bold text-primary">
                  {currencySymbol} {(price).toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through">
                    {currencySymbol} {(originalPrice).toFixed(2)}
                  </span>
                )}
              </div>
              
              {/* Stock Status */}
              <div className={cn(
                "text-xs px-2 py-0.5 rounded-full inline-block",
                stockStatus.className
              )}>
                {stockStatus.text}
              </div>
              
              {/* Quantity x Price Preview */}
   
            </div>
            
            {/* Action Section */}
            {!isOutOfStock && (
              <div className="space-y-2 pt-1">
                <QuantitySelector />
                <Button 
                  size="default"
                  className="w-full gap-2 h-9"
                  onClick={handleAddToCart}
                  disabled={isAdding || isLoading || !selectedVariant || price <= 0}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add to Cart
                      {quantity > 1 && (
                        <Badge variant="secondary" className="ml-1 bg-white/20 text-[10px] px-1">
                          {quantity}x
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <VariantSelectionDialog />
    </>
  );
}