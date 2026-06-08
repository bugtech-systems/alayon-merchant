// app/(pos)/components/pos-app.tsx
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// Types
export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  variant_title?: string;
  subtotal: number;
}

export interface SimpleTable {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied";
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

// Simplified Product Card - Add only button (1 each tap)
const ProductCard = ({ product, onAddToCart, region, isLoading, selectedVariantId, onVariantChange }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const hasVariants = product.variants && product.variants.length > 1;
  const selectedVariant = product.variants?.find((v: any) => v.id === selectedVariantId) || product.variants?.[0];
  
  const getPrice = () => {
    if (selectedVariant?.calculated_price) return selectedVariant.calculated_price.calculated_amount;
    if (selectedVariant?.prices?.[0]) return selectedVariant.prices[0].amount;
    return 0;
  };

  const price = getPrice();

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    // setIsAdding(true);
    try {
      await onAddToCart({
        variantId: selectedVariant.id,
        quantity: 1, // Always add 1
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer" onClick={handleAddToCart}>
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.thumbnail ? (
            <Image src={product.thumbnail} alt={product.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-1">{product.title}</h3>
          
          {hasVariants && (
            <div onClick={(e) => e.stopPropagation()}>
              <Select value={selectedVariantId} onValueChange={(value) => onVariantChange(product.id, value)}>
                <SelectTrigger className="mt-2 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {product.variants.map((variant: any) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-primary">
              {region?.currency_code?.toUpperCase() || "PHP"} {price.toFixed(2)}
            </span>
            <Button 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={isAdding || isLoading}
              className="h-8 w-8 rounded-full"
            >
              {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


// Drafts Dialog Component
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
                  {draft.table_id && (
                    <div className="text-xs text-muted-foreground mb-1">Table: {draft.table_id}</div>
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

// Payment Dialog Component
function PaymentDialog({ open, onOpenChange, cartTotal, region, onComplete }: any) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("cash");
  const [cashAmount, setCashAmount] = useState<number>(cartTotal);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset cash amount when dialog opens or cartTotal changes
  useEffect(() => {
    if (open) {
      setCashAmount(cartTotal);
    }
  }, [open, cartTotal]);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Simulate payment processing
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
                onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
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

// Main POS Component
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
  const [printOpen, setPrintOpen] = useState(false)
  // UI state
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  
  // Products state
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<MedusaProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productVariants, setProductVariants] = useState<Record<string, string>>({});
  
  // Get customer group and price list from user
  const customerGroupId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.customer_group_id 
    : user?.driver?.customer_group_id;
    
  const priceListId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.price_list_id 
    : user?.driver?.price_list_id;

  // Load drafts from localStorage
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

  // Save current cart as draft
  const saveAsDraft = useCallback(async () => {
    if (cartItems.length === 0 && selectedTableIds.length == 0 && !selectedCustomer) {
      toast({ title: "Cannot save", description: "Add items or assign table/customer first", variant: "destructive" });
      return;
    }

    const draftData: any = {
      id: cartId,
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

    // Update cart metadata with draft ID
    if (cartId) {
      try {
        await sdk.store.cart.update(cartId, {
          metadata: {
            ...cart?.metadata,
            is_draft: true,
          },
        });
        localStorage.removeItem("pos_cart_id");
       setCart(null)
       setCartId(null)
       setCartItems([])
       setCartTotal(0)
      } catch (error) {
        console.error("Error saving draft to cart metadata:", error);
      }
    }


    

        const index = drafts.findIndex(draft => draft.id === draftData.id);
        console.log(index, drafts, draftData, 'draaft')
        if (index !== -1) {
          // Update existing
          const updatedDrafts = [...drafts];
          updatedDrafts[index] = draftData;
          saveDrafts(updatedDrafts);
        } else {
          // Add new
          saveDrafts([draftData, ...drafts]);
        }
    initCart()
    toast({ title: "Draft saved", description: "Order saved as draft" });
  }, [cartItems, selectedTableIds, selectedCustomer, orderNotes, cartTotal, cartId, cart?.metadata, drafts, saveDrafts, toast]);

  // Load a draft
  const loadDraft = useCallback(async (draft: DraftOrder) => {
    console.log(draft, 'DRAFT')
    
    let activeCart = await sdk.store.cart.retrieve(draft?.id);
    const cartData = activeCart.cart || activeCart;
console.log(activeCart, cartData, 'dddaa')

    setCartId(draft?.id)
    localStorage.setItem('pos_cart_id', draft?.id)

    toast({ title: "Draft loaded", description: `Draft from ${new Date(draft.created_at).toLocaleString()}` });
    setDraftsDialogOpen(false);
    refreshCart(draft?.id)

  }, [cartId, cartItems]);

  // Delete a draft
  const deleteDraft = useCallback((draftId: string) => {
    saveDrafts(drafts.filter(d => d.id !== draftId));
    toast({ title: "Draft deleted", description: "Draft removed" });
  }, [drafts, saveDrafts, toast]);

  // Initialize or get cart
  const initCart = useCallback(async () => {
    setIsLoadingCart(true);
    try {
      const storedCartId = localStorage.getItem("pos_cart_id");
      
      let activeCart;
      if (storedCartId) {
        try {
          activeCart = await sdk.store.cart.retrieve(storedCartId);
          if (activeCart.cart.metadata?.is_draft) {
            // If it's a draft, treat as new cart
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
      console.log(cartData, 'caataa')
      setCart(cartData);
      setCartId(cartData.id);
      
      // Apply customer group pricing if available
      if (customerGroupId && cartData.id) {
        await sdk.store.cart.update(cartData.id, {
          customer_id: selectedCustomer?.id,
          metadata: {
            ...cartData.metadata,
            customer_group_id: customerGroupId,
            price_list_id: priceListId,
          },
        });
      }
      
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
      
      if (cartData.metadata) {
        if (cartData.metadata.table_id) setSelectedTableIds(cartData.metadata.table_ids);
        if (cartData.metadata.customer_id && cartData.metadata.customer_name) {
          setSelectedCustomer({
            id: cartData.metadata.customer_id,
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
  }, [region, customerGroupId, priceListId, selectedCustomer?.id, user]);

  // Refresh cart with pricing
  const refreshCart = useCallback(async (id: any) => {
    if (!cartId && !id) return;
    // setIsLoadingCart(true);
    try {
      const updatedCart = await sdk.store.cart.retrieve(id || cartId);
      console.log(updatedCart, 'reefgres')
      setCart(updatedCart.cart);
      
      const transformedItems: CartItem[] = updatedCart.cart.items?.map((item: any) => ({
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
      setCartTotal(updatedCart.cart.total || 0);
    } catch (error) {
      console.error("Error refreshing cart:", error);
    } finally {
      setIsLoadingCart(false);
    }
  }, [cartId]);

  useEffect(() => {
    initCart();
  }, [initCart]);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    if (isLoadingProducts || !priceListId) return;
    
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

  // Add to cart (always quantity 1)
  const addToCart = async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
    if (!cartId) return;
    
    try {
      const existingItem = cartItems.find(item => item.variant_id === variantId);
      
      if (existingItem) {
        await sdk.store.cart.updateLineItem(cartId, existingItem.id, {
          quantity: existingItem.quantity + quantity,
        });
      } else {
        await sdk.store.cart.createLineItem(cartId, {
          variant_id: variantId,
          quantity,
        });
      }
      
      await refreshCart();
      toast({ title: "Added", description: "Item added to cart" });
      // if (isMobile) setMobileCartOpen(true);
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
  
  // Update cart metadata
  const updateCartMetadata = useCallback(async () => {
    if (!cartId) return;
    try {
      await sdk.store.cart.update(cartId, {
        customer_id: selectedCustomer?.id,
        metadata: {
          ...cart?.metadata,
          table_ids: selectedTableIds,
          customer_name: selectedCustomer?.first_name,
          customer_email: selectedCustomer?.email,
          notes: orderNotes,
        },
      });
    } catch (error) {
      console.error("Error updating cart metadata:", error);
    }
  }, [cartId, selectedTableIds, selectedCustomer, orderNotes, cart?.metadata]);
  
  useEffect(() => {
    if (cartId) {
      updateCartMetadata();
    }
  }, [selectedTableIds, selectedCustomer, orderNotes, updateCartMetadata]);
  
  // Clear cart
  const clearCart = async () => {
    if (!cartId) return;
    try {
      for (const item of cartItems) {
        await sdk.store.cart.deleteLineItem(cartId, item.id);
      }
  
      removeCartId()
      localStorage.removeItem('pos_cart_id')
      await refreshCart();
      setSelectedTableIds([]);
      setSelectedCustomer(null);
      setOrderNotes("");
      toast({ title: "Cleared", description: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };
  
  // Handle payment and checkout
// app/(pos)/components/pos-app.tsx - Updated handlePaymentComplete

const handlePaymentComplete = async (paymentData: any) => {
  if (!cartId) return;
  
  setIsCheckingOut(true);
  try {
    // Initialize payment session
    let paymentProviderId = "pp_system_default";
    switch (paymentData.paymentMethod) {
      case "cash": paymentProviderId = "pp_system_default"; break;
      case "card": paymentProviderId = "pp_stripe_stripe"; break;
      default: paymentProviderId = "pp_system_default";
    }
    
   let order = await initiatePaymentSession(cart, {
      provider_id: paymentProviderId,
      // context: { amount: cartTotal, currency: region?.currency_code || "php", ...paymentData },
    }).then(() => {
      return sdk.store.cart.complete(cartId);;
    })
    .catch(err => err)
    

    
    if (!order.order) throw new Error("Failed to create order");
    
    // Occupy tables in localStorage
    if (selectedTableIds.length > 0) {
      const tables = JSON.parse(localStorage.getItem("simple-tables") || "[]");
      const updatedTables = tables.map((table: any) => {
        if (selectedTableIds.includes(table.id)) {
          return {
            ...table,
            status: "occupied",
            current_order_ids: [...(table.current_order_ids || []), order.order.id],
            customer_name: selectedCustomer?.first_name || table.customer_name,
            occupied_since: new Date(),
          };
        }
        return table;
      });
      localStorage.setItem("simple-tables", JSON.stringify(updatedTables));
    }
    
    // Save order history
    const orders = JSON.parse(localStorage.getItem("pos_order_history") || "[]");
    orders.unshift({
      id: order.order.id,
      cart_id: cartId,
      table_ids: selectedTableIds,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.first_name,
      notes: orderNotes,
      total: cartTotal,
      payment: paymentData,
      items: cartItems,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("pos_order_history", JSON.stringify(orders.slice(0, 100)));
    
    toast({ title: "Order Complete", description: `Order #${order.order.display_id} completed. Tables assigned.` });
    removeCartId()
    localStorage.removeItem("pos_cart_id");
    setDrafts(drafts.filter(a => a.id != cartId))
    setSelectedTableIds([])
    setPaymentDialogOpen(false);
    setMobileCartOpen(false);
    setOrderNotes('')
    setPrintOpen(true)
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

  // Mobile Layout
  if (isMobile) {
    return (
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
                onCustomerChange={setSelectedCustomer}
                onNotesChange={setOrderNotes}
                onCheckout={() => setPaymentDialogOpen(true)}
                onSaveDraft={saveAsDraft}
              />
            </div>
          </SheetContent>
        </Sheet>
        
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
      </div>
    );
  }

  console.log(cart, cartId, 'ccaaaa')

  // Desktop Layout
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
              />
            ))}
          </div>
          {isLoadingProducts && <Loader2 className="h-8 w-8 animate-spin mx-auto my-8" />}
          {!isLoadingProducts && filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No products found</div>
          )}
        </div>
      </div>
      
      <aside className="hidden w-80 flex-col border-l bg-card lg:flex">
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
          onCustomerChange={setSelectedCustomer}
          onNotesChange={setOrderNotes}
          onCheckout={() => setPaymentDialogOpen(true)}
          onSaveDraft={saveAsDraft}
          cart={cart}
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

     
    </div>
  );
}