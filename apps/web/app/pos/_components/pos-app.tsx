"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  Package,
  RefreshCw,
  X,
  Loader2,
  MapPin,
  UserPlus,
  User,
  CreditCard,
  Save,
  History,
  DollarSign,
  Tag,
  Printer,
  ChevronDown,
  Minus,
} from "lucide-react";
import { cn, fetchPriceListWithVariants } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { sdk } from "@/lib/config";
import { getAuthHeaders, removeCartId } from "@/lib/data/cookies";
import { listPriceListProducts } from "@/lib/data/products";
import { CartSidebar } from "./sidebar-cart";
import { initiatePaymentSession } from "@/lib/data/cart";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { PrintDialog } from "./print-dialog";
import { updateLineItemPrice } from "@/lib/actions";
import { assignCustomerToCart } from "@/lib/data/customer";

// ============================================
// TYPES
// ============================================

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  variant_title?: string;
  subtotal: number;
  is_custom_priced?: boolean;
  price_list_id?: string;
  metadata?: any;
}

export interface SimpleTable {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_order_ids?: string[];
  current_order_numbers?: number[];
  customer_name?: string;
  occupied_since?: Date;
  order_total?: number;
}

export interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

export interface MedusaProduct {
  id: string;
  title: string;
  thumbnail: string | null;
  variants: MedusaProductVariant[];
  categories?: { id: string; name: string }[];
}

export interface MedusaProductVariant {
  id: string;
  title: string;
  prices: { amount: number; currency_code: string }[];
  inventory_quantity: number;
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
  };
}

export interface Customer {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  customer_group_id?: string;
}

export interface DraftOrder {
  id: string;
  cart_id: string;
  created_at: Date;
  updated_at: Date;
  items: CartItem[];
  total: number;
  customer_id?: string;
  customer_name?: string;
  table_ids?: string[];
  notes?: string;
}

// ============================================
// CUSTOM PRICE DIALOG
// ============================================

function CustomPriceDialog({ 
  open, 
  onOpenChange, 
  item, 
  onApplyCustomPrice, 
  region 
}: any) {
  const [customPrice, setCustomPrice] = useState<number>(item?.unit_price || 0);

  useEffect(() => {
    if (item) {
      setCustomPrice(item.unit_price);
    }
  }, [item]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Custom Price</DialogTitle>
          <DialogDescription>
            Override the price for {item?.title} {item?.variant_title && `(${item.variant_title})`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Unit Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {region?.currency_code?.toUpperCase() || "PHP"}
              </span>
              <Input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
                className="pl-12"
                step="0.01"
                min="0"
              />
            </div>
            {item?.original_unit_price && item.original_unit_price !== customPrice && (
              <p className="text-xs text-muted-foreground">
                Original price: {region?.currency_code?.toUpperCase() || "PHP"} {item.original_unit_price.toFixed(2)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            onApplyCustomPrice(item.id, item.variant_id, customPrice);
            onOpenChange(false);
          }}>
            Apply Custom Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// PRODUCT CARD
// ============================================

const ProductCard = ({ 
  product, 
  onAddToCart, 
  region, 
  isLoading, 
  selectedVariantId, 
  onVariantChange, 
  showCustomPrice 
}: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [localSelectedVariantId, setLocalSelectedVariantId] = useState(selectedVariantId);
  
  const hasVariants = product.variants && product.variants.length > 0;
  const hasMultipleVariants = product.variants && product.variants.length > 1;
  
  // Get selected variant
  const selectedVariant = product.variants?.find((v: any) => v.id === localSelectedVariantId) || product.variants?.[0];
  
  // Get inventory quantity
  const getInventoryQuantity = () => {
    if (!selectedVariant) return 0;
    // Check various possible inventory fields
    return selectedVariant.inventory_quantity || 
           selectedVariant.manage_inventory?.quantity || 
           selectedVariant.inventory?.quantity || 
           selectedVariant.stock_quantity ||
           999; // Default if not specified
  };
  
  const inventoryQuantity = getInventoryQuantity();
  const isOutOfStock = inventoryQuantity <= 0;
  const isLowStock = inventoryQuantity > 0 && inventoryQuantity <= 5;
  
  // Get price with proper fallbacks
  const getPrice = () => {
    if (!selectedVariant) return 0;
    
    // Check for calculated price (from price lists)
    if (selectedVariant.calculated_price) {
      return selectedVariant.calculated_price.calculated_amount;
    }
    
    // Check for variant prices array
    if (selectedVariant.prices && selectedVariant.prices.length > 0) {
      const variantPrice = selectedVariant.prices.find(
        (p: any) => p.currency_code === region?.currency_code || p.currency_code === 'php'
      );
      if (variantPrice) return variantPrice.amount;
      return selectedVariant.prices[0].amount;
    }
    
    // Check for unit_price
    if (selectedVariant.unit_price) return selectedVariant.unit_price;
    
    // Check product level price
    if (product.unit_price) return product.unit_price;
    
    return 0;
  };
  
  const price = getPrice();
  const originalPrice = selectedVariant?.calculated_price?.original_amount || 
                        selectedVariant?.original_price || 
                        price;
  
  const hasDiscount = originalPrice > price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  
  // Handle variant selection
  const handleVariantChange = (variantId: string) => {
    setLocalSelectedVariantId(variantId);
    if (onVariantChange) {
      onVariantChange(product.id, variantId);
    }
    setQuantity(1); // Reset quantity when variant changes
  };
  
  // Handle add to cart with variant selection
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      console.error('No variant selected');
      return;
    }
    
    if (isOutOfStock) {
      toast({
        title: "Out of Stock",
        description: `${selectedVariant.title || product.title} is out of stock`,
        variant: "destructive",
      });
      return;
    }
    
    if (quantity > inventoryQuantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${inventoryQuantity} available`,
        variant: "destructive",
      });
      return;
    }
    
    setIsAdding(true);
    try {
      await onAddToCart({
        variantId: selectedVariant.id,
        quantity: quantity,
        variantTitle: selectedVariant.title,
        productTitle: product.title,
        unitPrice: price,
        originalPrice: originalPrice,
      });
      
      // Show success feedback
      toast({
        title: "Added to Cart",
        description: `${quantity}x ${product.title}${hasVariants ? ` (${selectedVariant.title})` : ''} added`,
      });
      
      setQuantity(1); // Reset quantity after adding
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };
  
  // Handle quick add (single item)
  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (hasMultipleVariants && !localSelectedVariantId) {
      setShowVariantDialog(true);
      return;
    }
    
    if (quantity > 1) {
      await handleAddToCart();
    } else {
      setIsAdding(true);
      try {
        await onAddToCart({
          variantId: selectedVariant.id,
          quantity: 1,
          variantTitle: selectedVariant.title,
          productTitle: product.title,
          unitPrice: price,
          originalPrice: originalPrice,
        });
        toast({
          title: "Added to Cart",
          description: `${product.title}${hasVariants ? ` (${selectedVariant.title})` : ''} added`,
        });
      } catch (error) {
        console.error('Error adding to cart:', error);
        toast({
          title: "Error",
          description: "Failed to add item to cart",
          variant: "destructive",
        });
      } finally {
        setIsAdding(false);
      }
    }
  };
  
  // Variant selection dialog for products with multiple variants
  const VariantSelectionDialog = () => (
    <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select {product.title} Variant</DialogTitle>
          <DialogDescription>
            Choose the variant you want to add to cart
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {product.variants.map((variant: any) => {
                const variantPrice = variant.calculated_price?.calculated_amount || 
                                    variant.prices?.[0]?.amount || 
                                    variant.unit_price || 0;
                const variantInventory = variant.inventory_quantity || 999;
                const isVariantOutOfStock = variantInventory <= 0;
                
                return (
                  <button
                    key={variant.id}
                    onClick={() => {
                      handleVariantChange(variant.id);
                      setShowVariantDialog(false);
                      setTimeout(() => handleQuickAdd({ stopPropagation: () => {} } as any), 100);
                    }}
                    disabled={isVariantOutOfStock}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      localSelectedVariantId === variant.id && "border-primary bg-primary/5",
                      isVariantOutOfStock && "opacity-50 cursor-not-allowed bg-muted"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{variant.title}</p>
                        {variant.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                        )}
                        {isVariantOutOfStock && (
                          <Badge variant="destructive" className="mt-1 text-[10px]">
                            Out of Stock
                          </Badge>
                        )}
                        {!isVariantOutOfStock && variantInventory <= 5 && (
                          <Badge variant="secondary" className="mt-1 text-[10px] bg-yellow-100 text-yellow-800">
                            Only {variantInventory} left
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {region?.currency_code?.toUpperCase() || "PHP"} {variantPrice.toFixed(2)}
                        </p>
                        {variant.calculated_price?.original_amount > variantPrice && (
                          <p className="text-xs text-muted-foreground line-through">
                            {region?.currency_code?.toUpperCase() || "PHP"} {variant.calculated_price.original_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowVariantDialog(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  // Quantity selector component
  const QuantitySelector = () => (
    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6"
        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
        disabled={quantity <= 1}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-8 text-center text-sm font-medium">{quantity}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6"
        onClick={() => setQuantity(prev => Math.min(inventoryQuantity, prev + 1))}
        disabled={quantity >= inventoryQuantity}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
  
  return (
    <>
      <Card 
        className={cn(
          "group overflow-hidden transition-all hover:shadow-lg",
          !isOutOfStock && "cursor-pointer",
          isOutOfStock && "opacity-60"
        )} 
        onClick={!isOutOfStock ? handleQuickAdd : undefined}
      >
        <CardContent className="p-0">
          {/* Image Section */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.thumbnail ? (
              <Image 
                src={product.thumbnail} 
                alt={product.title} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {hasDiscount && (
                <Badge className="bg-red-500 text-white text-[10px]">
                  -{discountPercent}%
                </Badge>
              )}
              {isLowStock && !isOutOfStock && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[10px]">
                  Low Stock
                </Badge>
              )}
            </div>
            
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="destructive" className="text-sm">
                  Out of Stock
                </Badge>
              </div>
            )}
            
            {showCustomPrice && (
              <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">
                <DollarSign className="h-2 w-2 mr-1" />
                Custom Price
              </Badge>
            )}
          </div>
          
          <div className="p-3">
            {/* Product Title */}
            <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px]">
              {product.title}
            </h3>
            
            {/* Variant Selector */}
            {hasVariants && (
              <div onClick={(e) => e.stopPropagation()} className="mt-2">
                {hasMultipleVariants ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs justify-between"
                    onClick={() => setShowVariantDialog(true)}
                  >
                    <span className="truncate">
                      {selectedVariant?.title || "Select Variant"}
                    </span>
                    <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                  </Button>
                ) : (
                  // Single variant - show as text
                  <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {selectedVariant?.title}
                  </div>
                )}
              </div>
            )}
            
            {/* Price and Actions */}
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
    
                  {originalPrice !== price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {region?.currency_code?.toUpperCase() || "PHP"} {originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                
                {!isOutOfStock && (
                  <div className="flex items-center gap-1">
                    {quantity > 1 && (
                      <QuantitySelector />
                    )}
                    <Button 
                      size="sm" 
                      onClick={handleQuickAdd}
                      disabled={isAdding || isLoading || !selectedVariant}
                      className={cn(
                        "h-8 w-8 rounded-full",
                        quantity > 1 && "h-8 px-3 rounded-md w-auto gap-1"
                      )}
                    >
                      {isAdding ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          {quantity > 1 && <span className="text-xs">{quantity}</span>}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Bulk quantity selector for mobile */}
              {!isOutOfStock && quantity === 1 && hasMultipleVariants && (
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-muted-foreground">Quantity</span>
                  <QuantitySelector />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Variant Selection Dialog */}
      <VariantSelectionDialog />
    </>
  );
};

// ============================================
// DRAFTS DIALOG
// ============================================

function DraftsDialog({ open, onOpenChange, drafts, onLoadDraft, onDeleteDraft, region }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Saved Drafts</DialogTitle>
          <DialogDescription>Load or delete saved draft orders</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No saved drafts</div>
            ) : (
              drafts.map((draft: DraftOrder) => (
                <div key={draft.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {new Date(draft.created_at).toLocaleString()}
                    </Badge>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onLoadDraft(draft)}>
                        Load
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => onDeleteDraft(draft.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {draft.table_ids && draft.table_ids.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-1">Tables: {draft.table_ids.join(', ')}</div>
                  )}
                  {draft.customer_name && (
                    <div className="text-xs text-muted-foreground mb-1">Customer: {draft.customer_name}</div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span>{draft.items.length} items</span>
                    <span className="font-semibold">
                      {region?.currency_code?.toUpperCase() || "PHP"} {draft?.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// PAYMENT DIALOG
// ============================================

function PaymentDialog({ open, onOpenChange, cartTotal, region, onComplete }: any) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("cash");
  const [cashAmount, setCashAmount] = useState<number>(cartTotal);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setCashAmount(cartTotal);
    }
  }, [open, cartTotal]);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete({ 
        paymentMethod, 
        amount: cartTotal, 
        change: paymentMethod === "cash" ? cashAmount - cartTotal : 0 
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const change = cashAmount - cartTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Collection</DialogTitle>
          <DialogDescription>Complete the payment for this order</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount:</span>
            <span>{region?.currency_code?.toUpperCase() || "PHP"} {cartTotal.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("cash")}
              >
                Cash
              </Button>
              <Button
                type="button"
                disabled
                variant={paymentMethod === "card" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("card")}
              >
                Card
              </Button>
              <Button
                type="button"
                disabled
                variant={paymentMethod === "other" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("other")}
              >
                Other
              </Button>
            </div>
          </div>
          
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Cash Amount</label>
              <Input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(parseFloat(e.target.value))}
                className="text-lg"
                step="0.01"
                min="0"
              />
              {change >= 0 && (
                <div className="text-sm text-green-600">
                  Change: {region?.currency_code?.toUpperCase() || "PHP"} {change.toFixed(2)}
                </div>
              )}
              {change < 0 && (
                <div className="text-sm text-red-600">
                  Insufficient: Need {region?.currency_code?.toUpperCase() || "PHP"} {Math.abs(change).toFixed(2)} more
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || (paymentMethod === "cash" && cashAmount < cartTotal)}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// MAIN POS COMPONENT
// ============================================

interface PosAppProps {
  region?: Region;
  user?: any;
  countryCode?: string;
}

export default function PosApp({ region, user, countryCode = "ph" }: PosAppProps) {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Cart state
  const [cart, setCart] = useState<any>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  
  // Order assignment
  const [selectedTableIds, setSelectedTableIds] = useLocalStorage<string[]>("current_order_table_ids", []);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  
  // Draft state
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false);
  
  // Payment state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState<any>(null);
  
  // UI state
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  
  // Products state
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<MedusaProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productVariants, setProductVariants] = useState<Record<string, string>>({});
  
  // Custom pricing state
  const [customPriceDialogOpen, setCustomPriceDialogOpen] = useState(false);
  const [selectedItemForCustomPrice, setSelectedItemForCustomPrice] = useState<CartItem | null>(null);
  
  // Get customer group and price list from user
  const customerGroupId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.customer_group_id 
    : user?.driver?.customer_group_id;
    
  const priceListId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.price_list_id 
    : user?.driver?.price_list_id;

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const calculateOrderTotals = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax = subtotal * (region?.tax_rate || 0) / 100;
    const total = subtotal + tax;
    
    return {
      subtotal,
      tax,
      total,
      currency_code: region?.currency_code || "php"
    };
  };

  const calculateTotalDiscount = (items: CartItem[]) => {
    return items.reduce((total, item) => {
      if (item.original_unit_price && item.original_unit_price > item.unit_price) {
        const discount = (item.original_unit_price - item.unit_price) * item.quantity;
        return total + discount;
      }
      return total;
    }, 0);
  };


  const handleCustomerChange = async (data: any) => {
      console.log(data, 'DATAAA')
        await assignCustomerToCart(cartId, data)
        setSelectedCustomer(data)
        // refreshCart()
  }


  useEffect(() => {
    const stored = localStorage.getItem("pos-drafts");
    if (stored) {
      setDrafts(JSON.parse(stored));
    }
  }, []);

  // Save drafts to localStorage
  const saveDrafts = useCallback((newDrafts: DraftOrder[]) => {
    setDrafts(newDrafts);
    localStorage.setItem("pos-drafts", JSON.stringify(newDrafts));
  }, []);

// ============================================
// SHARED PRICING LOGIC (DRY)
// ============================================

const processCartItemsWithPricing = useCallback(async (
  cartData: any,
  customPrices: Record<string, number>,
  appliedPriceListId?: string,
  appliedCustomerGroupId?: string
): Promise<CartItem[]> => {
  // Fetch price list if needed
  let priceListPrices = new Map();
  if (appliedPriceListId && cartData.items?.length) {
    try {
      const priceListData = await fetchPriceListWithVariants(appliedPriceListId, cartData.currency_code);
      priceListPrices = priceListData;
    } catch (error) {
      console.warn('Failed to fetch price list:', error);
    }
  }
  
  // Process each item with same pricing logic
  return cartData.items?.map((item: any) => {
    let unitPrice = item.unit_price;
    let originalUnitPrice = unitPrice;
    let isCustomPriced = false;
    
    // Priority 1: Custom pricing
    if (customPrices[item.variant_id] !== undefined) {
      unitPrice = customPrices[item.variant_id];
      originalUnitPrice = item.unit_price;
      isCustomPriced = true;
    }
    // Priority 2: Price list pricing
    else if (appliedPriceListId) {
      const priceListKey = `${item.variant_id}-${cartData.currency_code}`;
      const priceListPrice = priceListPrices.get(priceListKey);
      if (priceListPrice !== undefined) {
        unitPrice = priceListPrice;
        originalUnitPrice = item.unit_price;
      }
    }
    // Priority 3: Customer group pricing
    else if (appliedCustomerGroupId && !appliedPriceListId) {
      // Add customer group pricing logic here
    }
    
    // Calculate totals
    const subtotal = unitPrice * item.quantity;
    const taxRate = (region?.tax_rate || 0) / 100;
    const taxAmount = subtotal * taxRate;
    
    return {
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      title: item.title,
      thumbnail: item.thumbnail,
      quantity: item.quantity,
      unit_price: unitPrice,
      original_unit_price: originalUnitPrice,
      is_custom_priced: isCustomPriced,
      variant_title: item.variant_title,
      variant_sku: item.variant_sku,
      subtotal: subtotal,
      tax_total: taxAmount,
      total: subtotal + taxAmount,
    };
  }) || [];
}, [region?.tax_rate]);

// ============================================
// REFRESH CART - Using shared logic
// ============================================

const refreshCart = useCallback(async (cartIdToRefresh?: string) => {
  const targetCartId = cartIdToRefresh || cartId;
  if (!targetCartId) return;
  
  try {
    setIsLoadingCart(true);
    
    // 1. Retrieve existing cart
    const updatedCart = await sdk.store.cart.retrieve(targetCartId);
    
    const cartData = updatedCart.cart || updatedCart;
    
    // 2. Get pricing context from cart metadata
    const customPrices = cartData.metadata?.custom_prices || {};
    const appliedPriceListId = priceListId;
    const appliedCustomerGroupId = customerGroupId;
    
    // 3. Process items with shared pricing logic
    const transformedItems = await processCartItemsWithPricing(
      cartData,
      customPrices,
      appliedPriceListId,
      appliedCustomerGroupId
    );
    
    // 4. Calculate totals
    const subtotal = transformedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxTotal = transformedItems.reduce((sum, item) => sum + (item.tax_total || 0), 0);
    const total = subtotal + taxTotal;
    
    // 5. Update state (repopulate, not replace)
    setCart({
      ...cartData,
      items: transformedItems,
      subtotal,
      tax_total: taxTotal,
      total,
    });
    setCartItems(transformedItems);
    setCartTotal(total);
    
    console.log('Cart refreshed:', {
      cartId: targetCartId,
      itemsCount: transformedItems.length,
      total
    });
    
  } catch (error) {
    console.error("Error refreshing cart:", error);
  } finally {
    setIsLoadingCart(false);
  }
}, [cartId, processCartItemsWithPricing]);

// ============================================
// INIT CART - Using the same shared logic
// ============================================

const initCart = useCallback(async (options?: { 
  priceListId?: string; 
  customerGroupId?: string; 
  customPricing?: Record<string, number>;
}) => {
  setIsLoadingCart(true);
  try {
    const storedCartId = localStorage.getItem("pos_cart_id");
    let activeCart;
    
    // Retrieve or create cart (only difference from refreshCart)
    if (storedCartId) {
      try {
        activeCart = await sdk.store.cart.retrieve(storedCartId);
        if (activeCart.cart.metadata?.is_draft) {
          activeCart = null;
        }
      } catch {
        activeCart = null;
      }
    }
    
    if (!activeCart) {
      activeCart = await sdk.store.cart.create({
        currency_code: region?.currency_code || "php",
        customer_id: selectedCustomer?.id,
      });
      localStorage.setItem("pos_cart_id", activeCart.cart.id);
    }
    
    const cartData = activeCart.cart || activeCart;
    setCart(cartData);
    setCartId(cartData.id);
    console.log(cartData, 'caart')
    // Apply pricing strategy
    const appliedPriceListId = options?.priceListId || priceListId;
    const appliedCustomerGroupId = options?.customerGroupId || customerGroupId;
    

    
    // Get custom prices
    const customPrices = options?.customPricing || cartData.metadata?.custom_prices || {};
    
    // Process items with shared pricing logic
    const transformedItems = await processCartItemsWithPricing(
      cartData,
      customPrices,
      appliedPriceListId,
      appliedCustomerGroupId
    );
    

    // Calculate totals
    const subtotal = transformedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxTotal = transformedItems.reduce((sum, item) => sum + (item.tax_total || 0), 0);
    const total = subtotal + taxTotal;



    // Update state
    setCart({
      ...cartData,
      items: transformedItems,
      subtotal,
      tax_total: taxTotal,
      total,
    });
    setCartItems(transformedItems);
    setCartTotal(total);
    
    // // Restore metadata state
    if (cartData.metadata) {
      if (cartData.metadata.table_ids) setSelectedTableIds(cartData.metadata.table_ids);
      if (cartData.metadata.customer_id && cartData.metadata.customer_name) {
        setSelectedCustomer({
          id: cartData.customer_id,
          first_name: cartData.metadata.customer_name,
          email: cartData.metadata.customer_email || "",
        });
      }
      if (cartData.metadata.notes) setOrderNotes(cartData.metadata.notes);
    }
    
  } catch (error) {
    console.error("Error initializing cart:", error);
  } finally {
    setIsLoadingCart(false);
  }
}, [region, customerGroupId, priceListId, selectedCustomer?.id, processCartItemsWithPricing]);


  // Delete a draft
  const deleteDraft = useCallback((draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    saveDrafts(updatedDrafts);
    toast({ title: "Draft deleted", description: "Draft order removed" });
  }, [drafts, saveDrafts, toast]);

  // Save current cart as draft
  const saveAsDraft = useCallback(async () => {
    if (cartItems.length === 0 && selectedTableIds.length === 0 && !selectedCustomer) {
      toast({ title: "Cannot save", description: "Add items or assign table/customer first", variant: "destructive" });
      return;
    }

    const draftData: DraftOrder = {
      id: cartId!,
      cart_id: cartId!,
      created_at: new Date(),
      updated_at: new Date(),
      items: [...cartItems],
      total: cartTotal,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.first_name,
      table_ids: selectedTableIds || [],
      notes: orderNotes,
    };

    if (cartId) {
      try {
        await sdk.store.cart.update(cartId, {
          metadata: {
            ...cart?.metadata,
            is_draft: true,
          },
        });
      } catch (error) {
        console.error("Error updating cart metadata:", error);
      }
    }

    const existingDraftIndex = drafts.findIndex(draft => draft.id === draftData.id);
    let updatedDrafts;
    
    if (existingDraftIndex !== -1) {
      updatedDrafts = [...drafts];
      updatedDrafts[existingDraftIndex] = draftData;
    } else {
      updatedDrafts = [draftData, ...drafts];
    }
    
    saveDrafts(updatedDrafts);
    
    localStorage.removeItem("pos_cart_id");
    setCart(null);
    setCartId(null);
    setCartItems([]);
    setCartTotal(0);
    setSelectedTableIds([]);
    setSelectedCustomer(null);
    setOrderNotes("");
    
    await initCart();
    
    toast({ title: "Draft saved", description: "Order saved as draft" });
  }, [cartItems, selectedTableIds, selectedCustomer, orderNotes, cartTotal, cartId, cart?.metadata, drafts, saveDrafts, toast, initCart]);

  // Load a draft
  const loadDraft = useCallback(async (draft: DraftOrder) => {
    try {
      const activeCart = await sdk.store.cart.retrieve(draft.cart_id);
      const cartData = activeCart.cart || activeCart;
      
      setCart(cartData);
      setCartId(cartData.id);
      localStorage.setItem('pos_cart_id', draft.cart_id);
      
      const transformedItems: CartItem[] = cartData.items?.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        variant_title: item.variant_title,
        subtotal: item.subtotal || (item.unit_price * item.quantity),
      })) || [];
      
      setCartItems(transformedItems);
      setCartTotal(cartData.total || 0);
      
      if (draft.table_ids) setSelectedTableIds(draft.table_ids);
      if (draft.customer_id && draft.customer_name) {
        setSelectedCustomer({
          id: draft.customer_id,
          first_name: draft.customer_name,
          email: "",
        });
      }
      if (draft.notes) setOrderNotes(draft.notes);
      
      toast({ title: "Draft loaded", description: `Draft from ${new Date(draft.created_at).toLocaleString()}` });
      setDraftsDialogOpen(false);
    } catch (error) {
      console.error("Error loading draft:", error);
      toast({ title: "Error", description: "Failed to load draft", variant: "destructive" });
    }
  }, [setSelectedTableIds, toast]);

  useEffect(() => {
    initCart();
  }, [initCart]);

  // Update cart metadata
  const updateCartMetadata = useCallback(async () => {
    if (!cartId) return;
    try {
      // await sdk.store.cart.update(cartId, {
      //   customer_id: selectedCustomer?.id,
      //   metadata: {
      //     ...cart?.metadata,
      //     table_ids: selectedTableIds,
      //     customer_name: selectedCustomer?.first_name,
      //     customer_email: selectedCustomer?.email,
      //     notes: orderNotes,
      //   },
      // });
    } catch (error) {
      console.error("Error updating cart metadata:", error);
    }
  }, [cartId, selectedTableIds, selectedCustomer, orderNotes, cart?.metadata]);
  
  useEffect(() => {
    if (cartId) {
      updateCartMetadata();
    }
  }, [selectedTableIds, selectedCustomer, orderNotes, updateCartMetadata]);

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await sdk.client.fetch("/store/product-categories", {
          method: "GET",
          headers,
        });
        setCategories(response.product_categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products with price list
  const fetchProducts = useCallback(async () => {
    if (isLoadingProducts) return;
    
    setIsLoadingProducts(true);
    try {
      const response = await listPriceListProducts({ countryCode, priceListId });
      setProducts(response.products || []);
      
      const initialVariants: Record<string, string> = {};
      (response.products || []).forEach((product: MedusaProduct) => {
        if (product.variants?.[0]) {
          initialVariants[product.id] = product.variants[0].id;
        }
      });
      setProductVariants(initialVariants);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [priceListId, countryCode]);

  useEffect(() => {
    if (priceListId) {
      fetchProducts();
    }
  }, [selectedCategoryId, searchQuery, priceListId]);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategoryId === "all" || 
      product.categories?.some(cat => cat.id === selectedCategoryId);
    const matchesSearch = searchQuery === "" || 
      product.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ============================================
  // CART OPERATIONS
  // ============================================

  // Add to cart
  const addToCart = async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
    if (!cartId) return;
    
    try {
      const existingItem = cartItems.find(item => item.variant_id === variantId);
      
      if (existingItem) {
        await sdk.store.cart.updateLineItem(cartId, existingItem.id, {
          quantity: existingItem.quantity + quantity,
        });
      } else {
      const priceListData = await fetchPriceListWithVariants(priceListId, 'php');
        

      let updatedCart = await sdk.store.cart.createLineItem(cartId, {
          variant_id: variantId,
          quantity,
        }) as any;

      let priceListKey = `${variantId}-${cart.currency_code}`
      let customUnitPrice = priceListData.get(priceListKey)
        console.log(updatedCart, 'cAAAT', customUnitPrice)
      
      let lineItem = updatedCart?.cart.items.find(a => a.variant_id == variantId);
      console.log(lineItem, 'lineee')
      if(lineItem && customUnitPrice){
        await updateLineItemPrice(lineItem.id, { cartId, variantId, customUnitPrice, quantity, priceListId, customerGroupId});

      const currentCustomPrices = cart?.metadata?.custom_prices || {};
      const updatedCustomPrices = {
        ...currentCustomPrices,
        [variantId]: customUnitPrice
      };
      
        

      await sdk.store.cart.update(cartId, {
        metadata: {
          ...cart?.metadata,
          custom_prices: updatedCustomPrices,
          custom_prices_enabled: true,
          last_price_update: new Date().toISOString()
        }
      });
      }

      }
      
      await refreshCart();
      toast({ title: "Added", description: "Item added to cart" });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    }
  };
  
  // Update quantity
  const updateQuantity = async (lineId: string, quantity: number) => {
    if (!cartId) return;
    try {
      if (quantity <= 0) {
        await sdk.store.cart.deleteLineItem(cartId, lineId);
      } else {
        await sdk.store.cart.updateLineItem(cartId, lineId, { quantity });
      }
      await refreshCart();
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };
  
  // Remove from cart
  const removeFromCart = async (lineId: string) => {
    if (!cartId) return;
    try {
      await sdk.store.cart.deleteLineItem(cartId, lineId);
      await refreshCart();
      toast({ title: "Removed", description: "Item removed" });
    } catch (error) {
      console.error("Error removing item:", error);
      toast({ title: "Error", description: "Failed to remove", variant: "destructive" });
    }
  };
  
  // Apply custom price to item
  const applyCustomPrice = async (itemId: string, variantId: string, customUnitPrice: number, quantity: any) => {
    if (!cartId) return;
    
    try {
      await updateLineItemPrice(itemId, { cartId, variantId, customUnitPrice, quantity, priceListId, customerGroupId});
      
      const currentCustomPrices = cart?.metadata?.custom_prices || {};
      const updatedCustomPrices = {
        ...currentCustomPrices,
        [variantId]: customUnitPrice
      };
      
      await sdk.store.cart.update(cartId, {
        metadata: {
          ...cart?.metadata,
          custom_prices: updatedCustomPrices,
          custom_prices_enabled: true,
          last_price_update: new Date().toISOString()
        }
      });




      await refreshCart();
      
      toast({ title: "Price Updated", description: `Custom price of ${region?.currency_code?.toUpperCase()} ${customUnitPrice.toFixed(2)} applied` });
    } catch (error) {
      console.error("Error applying custom price:", error);
      toast({ title: "Error", description: "Failed to apply custom price", variant: "destructive" });
    }
  };
  
  // Clear cart
  const clearCart = async () => {
    if (!cartId) return;
    try {
      for (const item of cartItems) {
        await sdk.store.cart.deleteLineItem(cartId, item.id);
      }
  
      removeCartId();
      localStorage.removeItem('pos_cart_id');
      await refreshCart();
      setSelectedTableIds([]);
      setSelectedCustomer(null);
      setOrderNotes("");
      toast({ title: "Cleared", description: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  // ============================================
  // CHECKOUT & PAYMENT
  // ============================================

  const handlePaymentComplete = async (paymentData: any) => {
    if (!cartId) return;
    
    setIsCheckingOut(true);
    try {

    console.log(cart, 'cartt')
      // Update line items with custom prices before checkout
      if (cart?.metadata?.custom_prices) {
        const customPrices = cart.metadata.custom_prices;
        
        for (const item of cartItems) {
          if (customPrices[item.variant_id] && customPrices[item.variant_id] !== item.unit_price) {
              console.log(customPrices[item.variant_id], 'cusstom')
            // await updateLineItemPrice(item.id, {...customPrices[item.variant_id],  cartId, variantId: item.variant_id, quantity: item.quantity, priceListId, customerGroupId });
          }
        }
        
        await refreshCart();
      }
      
      const orderTotals = calculateOrderTotals(cartItems);
      
      const orderItemsWithPricing = cartItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        original_unit_price: item.original_unit_price,
        is_custom_priced: item.is_custom_priced || !!(cart?.metadata?.custom_prices?.[item.variant_id]),
        subtotal: item.unit_price * item.quantity,
        metadata: {
          price_list_id: item.price_list_id || cart?.metadata?.price_list_id,
          customer_group_id: cart?.metadata?.customer_group_id,
          pricing_strategy: cart?.metadata?.pricing_strategy,
          custom_price_applied: !!(cart?.metadata?.custom_prices?.[item.variant_id]),
        }
      }));
      
      await sdk.store.cart.update(cartId, {
        metadata: {
          ...cart?.metadata,
          order_pricing_snapshot: {
            items: orderItemsWithPricing,
            totals: orderTotals,
            applied_at: new Date().toISOString(),
            pricing_strategy: cart?.metadata?.pricing_strategy,
            price_list_id: cart?.metadata?.price_list_id,
            customer_group_id: cart?.metadata?.customer_group_id,
          }
        }
      });
      
      let paymentProviderId = "pp_system_default";
      switch (paymentData.paymentMethod) {
        case "cash": paymentProviderId = "pp_system_default"; break;
        case "card": paymentProviderId = "pp_stripe_stripe"; break;
        default: paymentProviderId = "pp_system_default";
      }
      
      await initiatePaymentSession(cart, {
        provider_id: paymentProviderId
      });
      
      const completeResult = await sdk.store.cart.complete(cartId);
      
      if (!completeResult.order) throw new Error("Failed to create order");
      
      const createdOrder = completeResult.order;
      
  
      // Save to order history
      const orders = JSON.parse(localStorage.getItem("pos_order_history") || "[]");
      orders.unshift({
        id: createdOrder.id,
        cart_id: cartId,
        order_number: createdOrder.display_id,
        table_ids: selectedTableIds,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.first_name,
        notes: orderNotes,
        totals: orderTotals,
        payment: {
          method: paymentData.paymentMethod,
          amount: paymentData.amount,
          change: paymentData.change || 0,
          timestamp: new Date().toISOString()
        },
        items: orderItemsWithPricing,
        pricing_summary: {
          strategy: cart?.metadata?.pricing_strategy,
          price_list_id: cart?.metadata?.price_list_id,
          customer_group_id: cart?.metadata?.customer_group_id,
          custom_prices_count: Object.keys(cart?.metadata?.custom_prices || {}).length,
          total_discount: calculateTotalDiscount(cartItems)
        },
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("pos_order_history", JSON.stringify(orders.slice(0, 100)));
      
      // Update table occupancy
      if (selectedTableIds.length > 0) {
        const tables = JSON.parse(localStorage.getItem("simple-tables") || "[]");
        const updatedTables = tables.map((table: any) => {
          if (selectedTableIds.includes(table.id)) {
            return {
              ...table,
              status: "occupied",
              current_order_ids: [...(table.current_order_ids || []), createdOrder.id],
              current_order_numbers: [...(table.current_order_numbers || []), createdOrder.display_id],
              customer_name: selectedCustomer?.first_name || table.customer_name,
              occupied_since: new Date(),
              order_total: orderTotals.total,
              order_items_count: cartItems.length,
            };
          }
          return table;
        });
        localStorage.setItem("simple-tables", JSON.stringify(updatedTables));
      }
      
      toast({ 
        title: "Order Complete", 
        description: `Order #${createdOrder.display_id} completed. Total: ${orderTotals.currency_code.toUpperCase()} ${orderTotals.total.toFixed(2)}` 
      });
      
      // Clean up
      setPaymentDialogOpen(false);
      setMobileCartOpen(false);
      removeCartId();
      localStorage.removeItem("pos_cart_id");
      const updatedDrafts = drafts.filter(d => d.id !== cartId);
      saveDrafts(updatedDrafts);
      
      setSelectedTableIds([]);
      setSelectedCustomer(null);
      setOrderNotes('');
      
      const receiptData = {
        order_id: createdOrder.id,
        display_id: createdOrder.display_id,
        customer: selectedCustomer,
        tables: selectedTableIds,
        items: orderItemsWithPricing,
        totals: orderTotals,
        payment: paymentData,
        pricing_info: {
          strategy: cart?.metadata?.pricing_strategy,
          has_custom_prices: Object.keys(cart?.metadata?.custom_prices || {}).length > 0,
          price_list_applied: !!cart?.metadata?.price_list_id,
          total_discount: calculateTotalDiscount(cartItems)
        },
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`receipt_${createdOrder.id}`, JSON.stringify(receiptData));
      setCurrentReceiptData(receiptData);
      setPrintOpen(true);
      
      await refreshCart();
      
    } catch (error) {
      console.error("Error completing order:", error);
      toast({ title: "Error", description: "Failed to complete order", variant: "destructive" });
    } finally {
      setIsCheckingOut(false);
    }
  };
  
  const handleVariantChange = (productId: string, variantId: string) => {
    setProductVariants(prev => ({ ...prev, [productId]: variantId }));
  };

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ============================================
  // MOBILE LAYOUT
  // ============================================
console.log(selectedCustomer, 'selll')
  if (isMobile) {
    return (
      <>
        <div className="flex flex-col h-full overflow-hidden pb-14">
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="p-2">
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search products..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-7 h-8 text-sm" 
                  />
                </div>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={fetchProducts}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setDraftsDialogOpen(true)}>
                  <History className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button 
                  onClick={() => setSelectedCategoryId("all")} 
                  className={cn("px-2 py-1 rounded text-xs whitespace-nowrap", 
                    selectedCategoryId === "all" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedCategoryId(cat.id)} 
                    className={cn("px-2 py-1 rounded text-xs whitespace-nowrap", 
                      selectedCategoryId === cat.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={addToCart} 
                  region={region}
                  isLoading={isLoadingProducts}
                  selectedVariantId={productVariants[product.id]}
                  onVariantChange={handleVariantChange}
                  showCustomPrice={!!priceListId}
                />
              ))}
            </div>
            {isLoadingProducts && <Loader2 className="h-6 w-6 animate-spin mx-auto my-4" />}
            {!isLoadingProducts && filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No products found</div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={saveAsDraft} className="flex-1">
                <Save className="mr-1 h-3 w-3" />
                Draft
              </Button>
              <Button variant="default" className="flex-1" onClick={() => setMobileCartOpen(true)}>
                <ShoppingCart className="mr-1 h-3 w-3" />
                Cart • {cartTotal.toFixed(2)}
              </Button>
            </div>
          </div>

          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetContent side="bottom" className="rounded-t-xl p-0 h-[85vh]">
              <SheetHeader className="border-b p-3">
                <SheetTitle className="text-sm">Your Order</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-auto">
                <CartSidebar
                  cartItems={cartItems}
                  cartTotal={cartTotal}
                  isLoading={isLoadingCart}
                  region={region}
                  selectedTableIds={selectedTableIds}
                  selectedCustomer={selectedCustomer}
                  orderNotes={orderNotes}
                  onUpdateQuantity={updateQuantity}
                  onRemoveFromCart={removeFromCart}
                  onClearCart={clearCart}
                  onTablesChange={setSelectedTableIds}
                  onCustomerChange={handleCustomerChange}
                  onNotesChange={setOrderNotes}
                  onCheckout={() => setPaymentDialogOpen(true)}
                  onSaveDraft={saveAsDraft}
                  onCustomPrice={applyCustomPrice}
                  cart={cart}
                  user={user}

                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <DraftsDialog
          open={draftsDialogOpen}
          onOpenChange={setDraftsDialogOpen}
          drafts={drafts}
          onLoadDraft={loadDraft}
          onDeleteDraft={deleteDraft}
          region={region}
        />
        
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          cartTotal={cartTotal}
          region={region}
          onComplete={handlePaymentComplete}
        />
        
        <CustomPriceDialog
          open={customPriceDialogOpen}
          onOpenChange={setCustomPriceDialogOpen}
          item={selectedItemForCustomPrice}
          onApplyCustomPrice={applyCustomPrice}
          region={region}
        />

        <PrintDialog
          open={printOpen}
          onOpenChange={setPrintOpen}
          cart={cart}
          receiptData={currentReceiptData}
          region={region}
        />
      </>
    );
  }

  // ============================================
  // DESKTOP LAYOUT
  // ============================================

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-background border-b flex-shrink-0">
          <div className="p-3">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-7 h-8 text-sm" 
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={fetchProducts}>
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setDraftsDialogOpen(true)}>
                <History className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button 
                onClick={() => setSelectedCategoryId("all")} 
                className={cn("px-3 py-1 rounded text-xs whitespace-nowrap", 
                  selectedCategoryId === "all" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategoryId(cat.id)} 
                  className={cn("px-3 py-1 rounded text-xs whitespace-nowrap", 
                    selectedCategoryId === cat.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={addToCart} 
                region={region}
                isLoading={isLoadingProducts}
                selectedVariantId={productVariants[product.id]}
                onVariantChange={handleVariantChange}
                showCustomPrice={!!priceListId}
              />
            ))}
          </div>
          {isLoadingProducts && <Loader2 className="h-8 w-8 animate-spin mx-auto my-8" />}
          {!isLoadingProducts && filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No products found</div>
          )}
        </div>
      </div>
      
      <aside className="hidden w-96 flex-col border-l bg-card lg:flex">
        <CartSidebar
          cartItems={cartItems}
          cartTotal={cartTotal}
          isLoading={isLoadingCart}
          region={region}
          selectedTableIds={selectedTableIds}
          selectedCustomer={selectedCustomer}
          orderNotes={orderNotes}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          onClearCart={clearCart}
          onTablesChange={setSelectedTableIds}
          onCustomerChange={handleCustomerChange}
          onNotesChange={setOrderNotes}
          onCheckout={() => setPaymentDialogOpen(true)}
          onSaveDraft={saveAsDraft}
          onCustomPrice={applyCustomPrice}
          cart={cart}
          user={user}
        />
      </aside>
      
      <DraftsDialog
        open={draftsDialogOpen}
        onOpenChange={setDraftsDialogOpen}
        drafts={drafts}
        onLoadDraft={loadDraft}
        onDeleteDraft={deleteDraft}
        region={region}
      />
      
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        cartTotal={cartTotal}
        region={region}
        onComplete={handlePaymentComplete}
      />
      
      <CustomPriceDialog
        open={customPriceDialogOpen}
        onOpenChange={setCustomPriceDialogOpen}
        item={selectedItemForCustomPrice}
        onApplyCustomPrice={applyCustomPrice}
        region={region}
      />


    </div>
  );
}