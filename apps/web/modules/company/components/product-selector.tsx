// components/ui/product-selector-drawer.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, Plus, ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminProducts } from "@/hooks/api";

interface ProductSelectorDrawerProps {
  onSelect: (product: {
    id: string;
    name: string;
    handle: string;
    variants: Array<{
      id: string;
      title: string;
      sku?: string;
      price: number;
    }>;
  }) => void;
  multiple?: boolean;
  selectedProducts?: string[];
  fullPage?: boolean;
  trigger?: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
}

export function ProductSelector({ 
  onSelect, 
  multiple = false,
  selectedProducts = [],
  fullPage = true,
  trigger,
  side = "right"
}: ProductSelectorDrawerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  
  const { data: products, isLoading, error } = useAdminProducts({
    limit: 50,
    offset: 0,
    search: searchTerm,
  });
  
  useEffect(() => {
    if (selectedProduct) {
      setSelectedVariants(new Set());
    }
  }, [selectedProduct]);
  
  const handleProductClick = (product: any) => {
    if (multiple) {
      onSelect({
        id: product.id,
        name: product.title,
        handle: product.handle,
        variants: product.variants.map((variant: any) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.prices?.[0]?.amount || 0,
        })),
      });
      setOpen(false);
    } else {
      setSelectedProduct(product);
    }
  };
  
  const handleVariantToggle = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };
  
  const handleSelectAllVariants = () => {
    if (selectedProduct) {
      if (selectedVariants.size === selectedProduct.variants.length) {
        setSelectedVariants(new Set());
      } else {
        setSelectedVariants(new Set(selectedProduct.variants.map((v: any) => v.id)));
      }
    }
  };
  
  const handleConfirmSelection = () => {
    if (selectedProduct && selectedVariants.size > 0) {
      const selectedVariantsData = selectedProduct.variants
        .filter((variant: any) => selectedVariants.has(variant.id))
        .map((variant: any) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.prices?.[0]?.amount || 0,
        }));
      
      onSelect({
        id: selectedProduct.id,
        name: selectedProduct.title,
        handle: selectedProduct.handle,
        variants: selectedVariantsData,
      });
      
      setSelectedProduct(null);
      setOpen(false);
    }
  };
  
  const handleClose = () => {
    setSelectedProduct(null);
    setSelectedVariants(new Set());
    setSearchTerm("");
    setOpen(false);
  };
  
  const defaultTrigger = (
    <Button type="button" variant="outline" className="w-full">
      <Plus className="mr-2 h-4 w-4" />
      Select Products
    </Button>
  );
  
  return (
    <Drawer open={open} onOpenChange={handleClose} direction={side}>
      <DrawerTrigger asChild>
        {trigger || defaultTrigger}
      </DrawerTrigger>
      
      <DrawerContent className={cn(
        "flex flex-col",
        fullPage && side === "right" && "w-[95vw] max-w-[95vw]",
        fullPage && side === "left" && "w-[95vw] max-w-[95vw]",
        fullPage && (side === "top" || side === "bottom") && "h-[90vh] max-h-[90vh]"
      )}>
        {!selectedProduct ? (
          // Product List View
          <>
            <DrawerHeader>
              <DrawerTitle className="text-2xl">Select Products</DrawerTitle>
              <DrawerDescription>
                Search and select products to add to your company
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="flex-1 overflow-hidden px-4">
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, handle, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Products List */}
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-destructive">
                    Error loading products: {error.message}
                  </div>
                ) : products?.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No products found</p>
                  </div>
                ) : (
                  <div className="space-y-2 pb-6">
                    {products?.map((product) => {
                      const isSelected = selectedProducts.includes(product.id);
                      return (
                        <ProductCardDrawer
                          key={product.id}
                          product={product}
                          isSelected={isSelected}
                          onClick={() => !isSelected && handleProductClick(product)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            </div>
            
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : (
          // Variant Selection View
          <>
            <DrawerHeader>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedProduct(null)}
                  className="mr-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DrawerTitle>Select Variants</DrawerTitle>
                  <DrawerDescription>
                    Choose variants for {selectedProduct.title}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            
            <div className="flex-1 overflow-hidden px-4">
              {/* Select All */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={selectedVariants.size === selectedProduct.variants.length}
                    onCheckedChange={handleSelectAllVariants}
                  />
                  <span className="font-medium">Select All Variants</span>
                </label>
                <Badge variant="secondary">
                  {selectedVariants.size} / {selectedProduct.variants.length} selected
                </Badge>
              </div>
              
              {/* Variants List */}
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-2 pb-6">
                  {selectedProduct.variants.map((variant: any) => (
                    <VariantCardDrawer
                      key={variant.id}
                      variant={variant}
                      isSelected={selectedVariants.has(variant.id)}
                      onToggle={() => handleVariantToggle(variant.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <DrawerFooter>
              <div className="flex justify-end space-x-3 w-full">
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSelection}
                  disabled={selectedVariants.size === 0}
                >
                  Add {selectedVariants.size} Variant{selectedVariants.size !== 1 && "s"}
                </Button>
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// Simplified sub-components for drawer
function ProductCardDrawer({ product, isSelected, onClick }: any) {
  return (
    <Card className={cn("cursor-pointer", isSelected && "border-primary bg-primary/5")} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 rounded-md">
            <AvatarFallback><Package className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{product.title}</h4>
              <Badge variant="secondary" size="sm">{product.variants.length}</Badge>
            </div>
            <code className="text-xs text-muted-foreground">{product.handle}</code>
          </div>
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </div>
      </CardContent>
    </Card>
  );
}

function VariantCardDrawer({ variant, isSelected, onToggle }: any) {
  return (
    <Card className={isSelected ? "border-primary bg-primary/5" : ""}>
      <CardContent className="p-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{variant.title}</h4>
              {variant.prices?.[0] && (
                <Badge variant="secondary" size="sm">
                  {(variant.prices[0].amount / 100).toFixed(2)}
                </Badge>
              )}
            </div>
            {variant.sku && <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>}
          </div>
        </label>
      </CardContent>
    </Card>
  );
}

import { DrawerTrigger } from "@/components/ui/drawer";