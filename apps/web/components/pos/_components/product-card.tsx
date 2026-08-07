// components/product-card.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { 
  ShoppingCart, 
  Package, 
  Loader2, 
  ChevronDown, 
  Minus, 
  Plus, 
  Tag, 
  Users, 
  Star, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Info,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { MedusaProduct, Region } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

// Error types for better error handling
enum ProductErrorType {
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  NO_VARIANT = 'NO_VARIANT',
  INVALID_PRICE = 'INVALID_PRICE',
  ADD_TO_CART_FAILED = 'ADD_TO_CART_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE',
}

interface ProductError {
  type: ProductErrorType;
  message: string;
  details?: any;
}

// Helper function to extract the best price from variant prices
const getVariantPriceInfo = (variant: any, priceListId?: string, customerGroupId?: string) => {
  if (!variant || !variant.prices || variant.prices.length === 0) {
    return {
      price: 0,
      originalPrice: 0,
      type: priceListId ? 'price_list' : customerGroupId ? 'customer_group' : 'default',
      priceListId: null,
      discountPercent: 0,
      hasDiscount: false
    };
  }

  let bestPrice = null;
  let bestPriceType = priceListId ? 'price_list' : customerGroupId ? 'customer_group' : 'default';
  let bestOriginalPrice = null;

  const prices = variant.prices;
  
  // 1. Check for price list prices
  if (priceListId) {
    const priceListPrice = prices.find((p: any) => p.price_list_id === priceListId);
    if (priceListPrice) {
      bestPrice = priceListPrice;
      bestPriceType = 'price_list';
    }
  }
  
  // 2. Check for customer group prices
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
  
  // Find original price (non-discounted)
  const originalPriceRecord = prices.find((p: any) => 
    !p.price_list_id && !p.customer_group_id && !p.customer_id
  );
  
  const calculatedPrice = bestPrice?.amount || 0;
  const calculatedOriginalPrice = originalPriceRecord?.amount || calculatedPrice;
  const hasDiscount = calculatedOriginalPrice > calculatedPrice && calculatedPrice > 0;
  const discountPercent = hasDiscount ? Math.round(((calculatedOriginalPrice - calculatedPrice) / calculatedOriginalPrice) * 100) : 0;
  
  return {
    price: calculatedPrice,
    originalPrice: calculatedOriginalPrice,
    type: bestPriceType,
    priceListId: bestPrice?.price_list_id || null,
    discountPercent,
    hasDiscount
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
  const [error, setError] = useState<ProductError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  let pricingStrategy = priceListId ? 'price_list' : customerGroupId ? 'customer_group' : 'default';
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalSelectedVariantId(selectedVariantId);
  }, [selectedVariantId]);
  
  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  const hasVariants = product.variants && product.variants.length > 0;
  const hasMultipleVariants = product.variants && product.variants.length > 1;
  const selectedVariant = product.variants?.find((v: any) => v.id === localSelectedVariantId) || product.variants?.[0];
  
  // Get price information using the helper
  const { price, originalPrice, hasDiscount, discountPercent } = useMemo(() => 
    getVariantPriceInfo(selectedVariant, priceListId, customerGroupId),
    [selectedVariant, priceListId, customerGroupId]
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
  const currencySymbol = region?.currency_code?.toUpperCase() || "PHP";
  const isPriceValid = price > 0;
  
  // Error handling functions
  const showErrorToast = useCallback((errorType: ProductErrorType, customMessage?: string, details?: any) => {
    const errorMessages = {
      [ProductErrorType.OUT_OF_STOCK]: {
        title: "Out of Stock",
        message: `${selectedVariant?.title || product.title} is currently out of stock. Please check back later.`,
      },
      [ProductErrorType.INSUFFICIENT_STOCK]: {
        title: "Insufficient Stock",
        message: `Only ${inventoryQuantity} available. Please reduce the quantity.`,
      },
      [ProductErrorType.NO_VARIANT]: {
        title: "No Variant Selected",
        message: "Please select a product variant before adding to cart.",
      },
      [ProductErrorType.INVALID_PRICE]: {
        title: "Invalid Price",
        message: "This product has an invalid price. Please contact support.",
      },
      [ProductErrorType.ADD_TO_CART_FAILED]: {
        title: "Add to Cart Failed",
        message: "Failed to add item to cart. Please try again.",
      },
      [ProductErrorType.NETWORK_ERROR]: {
        title: "Network Error",
        message: "Connection issue detected. Please check your internet connection and try again.",
      },
      [ProductErrorType.PRODUCT_UNAVAILABLE]: {
        title: "Product Unavailable",
        message: "This product is currently unavailable. Please try another product.",
      },
    };

    const errorInfo = errorMessages[errorType] || {
      title: "Error",
      message: customMessage || "An unexpected error occurred.",
    };

    setError({
      type: errorType,
      message: customMessage || errorInfo.message,
      details
    });

    toast({
      title: errorInfo.title,
      description: customMessage || errorInfo.message,
      variant: "destructive",
      duration: 5000,
    });
  }, [product.title, selectedVariant, inventoryQuantity, toast]);

  const showSuccessToast = useCallback((message: string) => {
    setSuccessMessage(message);
    toast({
      title: "Success",
      description: message,
      variant: "default",
      duration: 3000,
    });
  }, [toast]);

  // Validate before adding to cart
  const validateAddToCart = useCallback((): { isValid: boolean; error?: ProductError } => {
    if (!selectedVariant) {
      return {
        isValid: false,
        error: {
          type: ProductErrorType.NO_VARIANT,
          message: "Please select a product variant before adding to cart."
        }
      };
    }
    
    if (isOutOfStock) {
      return {
        isValid: false,
        error: {
          type: ProductErrorType.OUT_OF_STOCK,
          message: `${selectedVariant.title || product.title} is out of stock.`
        }
      };
    }
    
    if (quantity > inventoryQuantity) {
      return {
        isValid: false,
        error: {
          type: ProductErrorType.INSUFFICIENT_STOCK,
          message: `Only ${inventoryQuantity} items available. Please reduce quantity.`
        }
      };
    }
    
    if (!isPriceValid) {
      return {
        isValid: false,
        error: {
          type: ProductErrorType.INVALID_PRICE,
          message: "This product has an invalid price. Please contact support."
        }
      };
    }
    
    return { isValid: true };
  }, [selectedVariant, isOutOfStock, quantity, inventoryQuantity, isPriceValid, product.title]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validate before proceeding
    const validation = validateAddToCart();
    if (!validation.isValid && validation.error) {
      showErrorToast(validation.error.type, validation.error.message);
      return;
    }
    
    setIsAdding(true);
    setError(null);
    
    try {
      await onAddToCart({
        variantId: selectedVariant!.id,
        quantity,
        variantTitle: selectedVariant!.title || "Default",
        productTitle: product.title,
        unitPrice: price,
        originalPrice: originalPrice,
        pricingStrategy: pricingStrategy,
        companyId: companyId
      });
      
      // Success feedback
      const variantText = hasVariants ? ` (${selectedVariant!.title})` : '';
      showSuccessToast(`${quantity}x ${product.title}${variantText} added to cart`);
      
      // Reset quantity after adding
      setQuantity(1);
      
      // Animate success
      setSuccessMessage("Added to cart!");
      
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      
      // Determine error type from response
      let errorType = ProductErrorType.ADD_TO_CART_FAILED;
      let errorMessage = "Failed to add item to cart. Please try again.";
      
      if (error?.message?.includes('network') || error?.message?.includes('connection')) {
        errorType = ProductErrorType.NETWORK_ERROR;
        errorMessage = "Network connection issue. Please check your internet and try again.";
      } else if (error?.message?.includes('stock') || error?.message?.includes('inventory')) {
        errorType = ProductErrorType.INSUFFICIENT_STOCK;
        errorMessage = "Stock issue detected. Please check availability.";
      } else if (error?.code === 'ECONNABORTED') {
        errorType = ProductErrorType.NETWORK_ERROR;
        errorMessage = "Request timed out. Please try again.";
      }
      
      showErrorToast(errorType, errorMessage, error);
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleVariantChange = (variantId: string) => {
    setLocalSelectedVariantId(variantId);
    onVariantChange(product.id, variantId);
    setQuantity(1);
    setError(null);
  };
  
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > inventoryQuantity) {
      showErrorToast(
        ProductErrorType.INSUFFICIENT_STOCK,
        `Only ${inventoryQuantity} items available.`
      );
      return;
    }
    setQuantity(newQuantity);
  };
  
  const handleOpenVariantDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVariantDialog(true);
  };
  
  const VariantSelectionDialog = () => (
    <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select {product.title} Variant
          </DialogTitle>
          <DialogDescription>
            Choose the variant you want to add to cart
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-2">
            {product.variants.map((variant: any) => {
              const variantInventory = variant.inventory_quantity || 999;
              const isVariantOutOfStock = variantInventory <= 0;
              const { price: variantPrice, originalPrice: variantOriginalPrice, type: variantPricingType, hasDiscount: variantHasDiscount } = 
                getVariantPriceInfo(variant, priceListId, customerGroupId);
              const isSelected = localSelectedVariantId === variant.id;
              
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
                    isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                    isVariantOutOfStock && "opacity-50 cursor-not-allowed bg-muted/50",
                    !isVariantOutOfStock && "hover:border-primary/50"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{variant.title || "Default"}</p>
                        {variantPricingType !== 'default' && variantPricingType !== 'price_list' && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {variantPricingType === 'customer_group' && <Users className="h-2 w-2 mr-1" />}
                            {variantPricingType === 'customer' && <Star className="h-2 w-2 mr-1" />}
                            Special
                          </Badge>
                        )}
                        {priceListId && variantPricingType === 'price_list' && (
                          <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 shrink-0">
                            <Tag className="h-2 w-2 mr-1" />
                            Promo
                          </Badge>
                        )}
                      </div>
                      {variant.sku && (
                        <p className="text-xs text-muted-foreground mt-1">SKU: {variant.sku}</p>
                      )}
                      <div className="mt-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={cn(
                            "text-lg font-bold",
                            variantHasDiscount ? "text-primary" : "text-foreground"
                          )}>
                            {currencySymbol} {(variantPrice).toFixed(2)}
                          </span>
                          {variantHasDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                              {currencySymbol} {(variantOriginalPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {variantHasDiscount && (
                          <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 text-[10px]">
                            Save {currencySymbol} {((variantOriginalPrice - variantPrice)).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      {isVariantOutOfStock ? (
                        <Badge variant="destructive" className="mt-2">Out of Stock</Badge>
                      ) : variantInventory <= 5 && (
                        <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800 text-[10px]">
                          <Clock className="h-2 w-2 mr-1" />
                          Only {variantInventory} left
                        </Badge>
                      )}
                    </div>
                    {isSelected && (
                      <div className="ml-2 shrink-0">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowVariantDialog(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => setShowVariantDialog(false)}
            className="w-full sm:w-auto"
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  const QuantitySelector = () => (
    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 w-full justify-between bg-muted/30 rounded-lg p-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-muted" 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (quantity > 1) handleQuantityChange(quantity - 1);
              }} 
              disabled={quantity <= 1 || isAdding}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Decrease quantity</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <div className="flex flex-col items-center min-w-[40px]">
        <span className="text-base font-semibold">{quantity}</span>
        <span className="text-[10px] text-muted-foreground">Qty</span>
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-muted" 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleQuantityChange(quantity + 1);
              }} 
              disabled={quantity >= inventoryQuantity || isAdding}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Increase quantity (max {inventoryQuantity})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
  
  const getStockStatus = () => {
    if (isOutOfStock) {
      return { 
        text: "Out of Stock", 
        className: "text-red-600 bg-red-50 border-red-200",
        icon: XCircle
      };
    }
    if (isLowStock) {
      return { 
        text: `Only ${inventoryQuantity} left`, 
        className: "text-yellow-600 bg-yellow-50 border-yellow-200",
        icon: AlertCircle
      };
    }
    return { 
      text: "In Stock", 
      className: "text-green-600 bg-green-50 border-green-200",
      icon: CheckCircle2
    };
  };
  
  const stockStatus = getStockStatus();
  const StockStatusIcon = stockStatus.icon;
  
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
  
  // Don't render if no price is available and not loading
  if (!isPriceValid && !isLoading) {
    return (
      <Card className="opacity-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32 text-center">
            <div>
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Product unavailable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOutOfStock && "opacity-70",
          !isOutOfStock && "hover:shadow-xl hover:-translate-y-1",
          isHovered && "shadow-lg",
          error && "ring-2 ring-red-500/20",
          successMessage && "ring-2 ring-green-500/20"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-0">
          {/* Image Section */}
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            {product.thumbnail ? (
              <Image 
                src={product.thumbnail} 
                alt={product.title} 
                fill 
                className="object-cover transition-transform duration-300 group-hover:scale-105" 
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {hasDiscount && discountPercent > 0 && (
                <Badge className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs font-semibold animate-pulse">
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
                <Badge variant="destructive" className="text-sm px-3 py-1.5 font-semibold animate-pulse">
                  <XCircle className="h-3 w-3 mr-1" />
                  Out of Stock
                </Badge>
              </div>
            )}
            
            {/* Success Overlay */}
            {successMessage && !isOutOfStock && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                <Badge className="bg-green-500 text-white text-sm px-3 py-1.5 font-semibold">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Added!
                </Badge>
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="p-3 space-y-3">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="p-2 text-xs">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="ml-1">
                  {error.message}
                </AlertDescription>
              </Alert>
            )}
            
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
                    disabled={isAdding}
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
                <span className={cn(
                  "text-xl font-bold",
                  hasDiscount ? "text-primary" : "text-foreground"
                )}>
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
                "text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 border",
                stockStatus.className
              )}>
                <StockStatusIcon className="h-3 w-3" />
                {stockStatus.text}
              </div>
            </div>
            
            {/* Action Section */}
            {!isOutOfStock && (
              <div className="space-y-2 pt-1">
                <QuantitySelector />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <Button 
                          size="default"
                          className={cn(
                            "w-full gap-2 h-9 transition-all",
                            isAdding && "opacity-70"
                          )}
                          onClick={handleAddToCart}
                          disabled={isAdding || isLoading || !selectedVariant || !isPriceValid}
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
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add {quantity}x {product.title} to cart</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <VariantSelectionDialog />
    </>
  );
}