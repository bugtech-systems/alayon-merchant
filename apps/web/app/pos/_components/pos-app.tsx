// components/pos-app.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, RefreshCw, History, ShoppingCart, Save, Tag, Users, Star, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { CartSidebar } from "./cart-sidebar";
import { ProductCard } from "./product-card";
import { DraftsDialog } from "./drafts-dialog";
import { PaymentDialog } from "./payment-dialog";
import { PrintDialog } from "./print-dialog";
import { usePosCart } from "@/hooks/use-pos-cart";
import { usePosProducts } from "@/hooks/use-pos-products";
import { usePosDrafts } from "@/hooks/use-pos-drafts";
import { usePosBeepers } from "@/hooks/use-pos-beepers"; // New hook for beepers
import { Region, Customer } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface PosAppProps {
  region?: Region;
  user?: any;
  countryCode?: string;
}

export default function PosApp({ region, user, countryCode = "ph" }: PosAppProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBeeperIds, setSelectedBeeperIds] = useLocalStorage<string[]>("current_order_beeper_ids", []);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const { toast } = useToast();

  // Pricing strategy from user context
  const pricingContext = useMemo(() => ({
    priceListId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.price_list_id 
      : user?.driver?.price_list_id,
    customerGroupId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.customer_group_id 
      : user?.driver?.customer_group_id,
    customerId: user?.id,
    companyId: user?.metadata?.role === 'company' 
      ? user.employee?.company_id 
      : user?.driver?.company_id,
    pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group'
  }), [user]);
  
  // Hooks
  const { 
    cart, cartItems, cartTotal, isLoading: isLoadingCart,
    refreshCart, createCart, addToCart, updateQuantity, removeFromCart, clearCart, 
    attachCustomer, updateMetadata, applyCustomPrice, removeCustomPrice, prepareCartForCheckout
  } = usePosCart({ 
    region, 
    priceListId: pricingContext.priceListId,
    companyId: pricingContext.companyId,
    customerGroupId: pricingContext.customerGroupId,
    userId: user?.id,
    customerId: selectedCustomer?.id
  }) as any;
   
  const { categories, products, isLoading: isLoadingProducts, productVariants, handleVariantChange, refreshProducts } = 
    usePosProducts({ 
      countryCode, 
      priceListId: pricingContext.priceListId,
      customerGroupId: pricingContext.customerGroupId,
      regionId: region?.id,
      customerId: selectedCustomer?.id
    });
  
  const { drafts, saveAsDraft, deleteDraft } = usePosDrafts();
  
  // New beeper hook
  const { 
    assignedBeeperIds, 
    attachOrderToBeeper, 
    detachOrderFromBeeper,
    releaseBeeper,
  } = usePosBeepers();

  // Initialize cart
  useEffect(() => {
    const init = async () => {
      const storedCartId = localStorage.getItem("pos_cart_id");
      if (storedCartId) {
        await refreshCart(storedCartId);
      } else {
        await createCart();
      }
    };
    init();
  }, [createCart, refreshCart]);
  
  // Update cart metadata when pricing context changes
  useEffect(() => {
    if (cart?.id && pricingContext) {
      updateMetadata({
        price_list_id: pricingContext.priceListId,
        customer_group_id: pricingContext.customerGroupId,
        pricing_strategy: pricingContext.pricingStrategy
      });
      if (cart.customer_id) {
        setSelectedCustomer(cart.customer_id);
      }
    }
  }, [pricingContext, cart?.id, updateMetadata]);

  // Handle beeper attachment/detachment for current order
  const handleAttachOrderToBeeper = useCallback(async (beeperId: string, orderId: string) => {
    try {
      await attachOrderToBeeper(beeperId, orderId);
      // Update cart metadata to track beeper assignments
      await updateMetadata({
        beeper_ids: [...selectedBeeperIds, beeperId],
        beeper_assignments: {
          ...cart?.metadata?.beeper_assignments,
          [beeperId]: {
            orderId,
            attachedAt: new Date().toISOString(),
            attachedBy: user?.id
          }
        }
      });
      
      toast({
        title: "Success",
        description: "Order attached to beeper successfully"
      });
    } catch (error) {
      console.error("Error attaching order to beeper:", error);
      toast({
        title: "Error",
        description: "Failed to attach order to beeper",
        variant: "destructive"
      });
    }
  }, [attachOrderToBeeper, updateMetadata, selectedBeeperIds, cart, user, toast]);

  const handleDetachOrderFromBeeper = useCallback(async (beeperId: string, orderId: string) => {
    try {
      await detachOrderFromBeeper(beeperId, orderId);
      // Update cart metadata
      const updatedBeeperIds = selectedBeeperIds.filter(id => id !== beeperId);
      await updateMetadata({
        beeper_ids: updatedBeeperIds,
        beeper_assignments: {
          ...cart?.metadata?.beeper_assignments,
          [beeperId]: undefined
        }
      });
      
      toast({
        title: "Success",
        description: "Order detached from beeper successfully"
      });
    } catch (error) {
      console.error("Error detaching order from beeper:", error);
      toast({
        title: "Error",
        description: "Failed to detach order from beeper",
        variant: "destructive"
      });
    }
  }, [detachOrderFromBeeper, updateMetadata, selectedBeeperIds, cart, toast]);

  // Handle customer change
  const handleCustomerChange = useCallback(async (customer: Customer | null) => {
    if (customer) {
      setSelectedCustomer(customer?.id);
    } else {
      setSelectedCustomer(null);
    }
    await attachCustomer(customer);
    
    // Update pricing context for customer-specific pricing
    if (customer?.customer_group_id) {
      await updateMetadata({
        customer_group_id: customer.customer_group_id,
        pricing_strategy: 'customer_group'
      });
    }
    refreshCart(cart?.id);
  }, [attachCustomer, updateMetadata, refreshCart, cart?.id]);
  
  // Handle notes change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (orderNotes) {
        updateMetadata({ notes: orderNotes });
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [orderNotes, updateMetadata]);
  
  // Handle beeper change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedBeeperIds.length > 0) {
        updateMetadata({ beeper_ids: selectedBeeperIds });
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedBeeperIds, updateMetadata]);
  
  // Handle beeper selection change
  const handleBeepersChange = useCallback((beeperIds: string[]) => {
    setSelectedBeeperIds(beeperIds);
    
    // Auto-attach current order to newly selected beepers
    const newBeepers = beeperIds.filter(id => !selectedBeeperIds.includes(id));
    newBeepers.forEach(async (beeperId) => {
      if (cart?.id) {
        await handleAttachOrderToBeeper(beeperId, cart.id);
      }
    });
    
    // Auto-detach from removed beepers
    const removedBeepers = selectedBeeperIds.filter(id => !beeperIds.includes(id));
    removedBeepers.forEach(async (beeperId) => {
      if (cart?.id) {
        await handleDetachOrderFromBeeper(beeperId, cart.id);
      }
    });
  }, [selectedBeeperIds, cart, handleAttachOrderToBeeper, handleDetachOrderFromBeeper]);

  const handleCheckout = useCallback(async () => {
    if (!cart?.id) return;
    
    try {
      // Prepare cart with pricing metadata before opening payment dialog
      await prepareCartForCheckout();
      setPaymentDialogOpen(true);
    } catch (error) {
      console.error("Error preparing cart:", error);
      toast({ 
        title: "Error", 
        description: "Failed to prepare order. Please try again.", 
        variant: "destructive" 
      });
    }
  }, [cart, prepareCartForCheckout, toast]);

  // Handle add to cart with pricing strategy tracking
  const handleAddToCart = useCallback(async (params: {
    variantId: string;
    quantity: number;
    variantTitle: string;
    productTitle: string;
    unitPrice: number;
    originalPrice: number;
    pricingStrategy: string;
    companyId?: any;
  }) => {
    await addToCart({
      ...pricingContext,
      ...params,
      variantId: params.variantId,
      quantity: params.quantity,
      metadata: {
        company_id: params.companyId,
        variant_title: params.variantTitle,
        original_price: params.originalPrice,
        pricing_strategy: params.pricingStrategy,
        price_list_id: pricingContext.priceListId,
        applied_by: user?.id,
        applied_at: new Date().toISOString()
      }
    });
  }, [addToCart, pricingContext.priceListId, user?.id]);
  
  // Handle custom price application
  const handleApplyCustomPrice = useCallback(async (
    lineId: string, 
    variantId: string, 
    price: number, 
    reason?: string
  ) => {
    await applyCustomPrice(lineId, variantId, price, {
      ...pricingContext,
      reason,
      applied_by: user?.id,
      applied_at: new Date().toISOString()
    });
  }, [applyCustomPrice, user?.id]);
  
  // Handle remove custom price
  const handleRemoveCustomPrice = useCallback(async (lineId: string, variantId: string) => {
    await removeCustomPrice(lineId, variantId);
  }, [removeCustomPrice]);
  
  // Handle save draft with pricing context
  const handleSaveDraft = useCallback(async () => {
    if (cart?.id) {
      await updateMetadata({ 
        is_draft: true, 
        draft_name: `Draft - ${new Date().toLocaleString()}`,
        saved_pricing_strategy: pricingContext.pricingStrategy,
        saved_price_list_id: pricingContext.priceListId,
        beeper_ids: selectedBeeperIds
      });
      await saveAsDraft(
        cart.id, 
        cartItems, 
        cartTotal, 
        selectedCustomer, 
        selectedBeeperIds, 
        orderNotes, 
        cart?.metadata
      );
    }
  }, [cart, cartItems, cartTotal, selectedCustomer, selectedBeeperIds, orderNotes, pricingContext, updateMetadata, saveAsDraft]);
  
  // Handle load draft with pricing restoration
  const handleLoadDraft = useCallback(async (draft: any) => {
    localStorage.setItem("pos_cart_id", draft.cart_id);
    await refreshCart(draft.cart_id);
    
    // Restore draft state
    if (draft.beeper_ids) {
      setSelectedBeeperIds(draft.beeper_ids);
      // Re-attach orders to beepers
      draft.beeper_ids.forEach(async (beeperId: string) => {
        if (draft.cart_id) {
          await attachOrderToBeeper(beeperId, draft.cart_id);
        }
      });
    }
    if (draft.customer_id && draft.customer_name) {
      setSelectedCustomer({ id: draft.customer_id, first_name: draft.customer_name, email: "" });
    }
    if (draft.notes) setOrderNotes(draft.notes);
    
    // Restore pricing context if available
    if (draft.saved_price_list_id) {
      await updateMetadata({
        price_list_id: draft.saved_price_list_id,
        pricing_strategy: draft.saved_pricing_strategy || 'price_list'
      });
    }
    
    setDraftsDialogOpen(false);
  }, [refreshCart, setSelectedBeeperIds, attachOrderToBeeper, updateMetadata]);
  
  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategoryId === "all" || product.categories?.some(cat => cat.id === selectedCategoryId);
      const matchesSearch = searchQuery === "" || product.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);
  
  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Pricing info component for header
  const PricingInfoBadge = () => (
    <div className="flex items-center gap-2 flex-wrap">
      {pricingContext.pricingStrategy === 'price_list' && pricingContext.priceListId && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Tag className="h-3 w-3 mr-1" />
          Promo Pricing Active
        </Badge>
      )}
      {pricingContext.pricingStrategy === 'customer_group' && pricingContext.customerGroupId && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Users className="h-3 w-3 mr-1" />
          Group Pricing Active
        </Badge>
      )}
      {selectedCustomer && (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Star className="h-3 w-3 mr-1" />
          Customer: {selectedCustomer.first_name}
        </Badge>
      )}
      {selectedBeeperIds.length > 0 && (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Radio className="h-3 w-3 mr-1" />
          {selectedBeeperIds.length} Beeper{selectedBeeperIds.length !== 1 ? 's' : ''} Assigned
        </Badge>
      )}
    </div>
  );
  
  const cartSidebarProps = {
    ...pricingContext,
    cart,
    region,
    selectedBeeperIds,
    selectedCustomer,
    orderNotes,
    isLoading: isLoadingCart,
    onUpdateQuantity: updateQuantity,
    onRemoveFromCart: removeFromCart,
    onClearCart: clearCart,
    onBeepersChange: handleBeepersChange,
    onCustomerChange: handleCustomerChange,
    onNotesChange: setOrderNotes,
    onCheckout: handleCheckout,
    onSaveDraft: handleSaveDraft,
    onApplyCustomPrice: handleApplyCustomPrice,
    onRemoveCustomPrice: handleRemoveCustomPrice,
    onLoadDraft: handleLoadDraft,
    onAttachOrderToBeeper: handleAttachOrderToBeeper,
    onDetachOrderFromBeeper: handleDetachOrderFromBeeper,
    user,
    assignedBeeperIds,
    availableOrders: cart ? [{ 
      id: cart.id, 
      orderNumber: cart.metadata?.order_number || cart.id.slice(0, 8),
      customerName: selectedCustomer?.first_name || 'Guest',
      status: 'active',
      items: cart.items?.length || 0,
      total: cartTotal
    }] : []
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <div className="flex flex-col h-[90vh] pb-14">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b p-2">
            <div className="flex justify-between items-center mb-2">
              <PricingInfoBadge />
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={refreshProducts}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
                {/* <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setDraftsDialogOpen(true)}>
                  <History className="h-3 w-3" />
                </Button> */}
              </div>
            </div>
            
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" />
              <Input 
                placeholder="Search products..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-7 h-8 text-sm" 
              />
            </div>
            
            <div className="flex gap-1 overflow-x-auto">
              <button 
                onClick={() => setSelectedCategoryId("all")} 
                className={cn("px-2 py-1 rounded text-xs whitespace-nowrap", 
                  selectedCategoryId === "all" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                All
              </button>
              {categories.map(cat => (
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
          
          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  region={region}
                  isLoading={isLoadingProducts}
                  selectedVariantId={productVariants[product.id]}
                  onVariantChange={handleVariantChange}
                  priceListId={pricingContext.priceListId}
                  customerGroupId={pricingContext.customerGroupId}
                  companyId={pricingContext?.companyId}
                />
              ))}
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-2">
            <div className="flex gap-2">
              <Button variant="default" className="flex-1" onClick={() => setMobileCartOpen(true)}>
                <ShoppingCart className="h-3 w-3 mr-1" />
                Cart • {cartTotal.toFixed(2)}
              </Button>
            </div>
          </div>
          
          {/* Mobile Cart Sheet */}
          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetContent side="bottom" className="rounded-t-xl p-0 h-[95vh]">
              <SheetHeader className="border-b p-3">
                <SheetTitle>Your Order</SheetTitle>
              </SheetHeader>
              <CartSidebar {...cartSidebarProps} />
            </SheetContent>
          </Sheet>
        </div>
        
        <DraftsDialog 
          open={draftsDialogOpen} 
          onOpenChange={setDraftsDialogOpen} 
          drafts={drafts} 
          onLoadDraft={handleLoadDraft} 
          onDeleteDraft={deleteDraft} 
          region={region} 
        />
        <PaymentDialog 
          {...pricingContext}
          cart={cart}
          cartItems={cart?.items ?? []}
          open={paymentDialogOpen} 
          onOpenChange={setPaymentDialogOpen} 
          cartTotal={cartTotal} 
          region={region} 
          onComplete={async (order) => {
            console.log("Order completed:", order);
            // Release all beepers associated with this order
            if (selectedBeeperIds.length > 0) {
              for (const beeperId of selectedBeeperIds) {
                await releaseBeeper(beeperId);
              }
            }
            // Reset POS state
            handleCustomerChange(null);
            await createCart();
            setSelectedBeeperIds([]);
            setSelectedCustomer(null);
            setOrderNotes("");
            setPaymentDialogOpen(false);
            setMobileCartOpen(false);
            toast({ 
              title: "Success", 
              description: `Order #${order.display_id} completed successfully` 
            });
          }} 
        />
        <PrintDialog 
          open={printOpen} 
          onOpenChange={setPrintOpen} 
          cart={cart} 
          region={region} 
        />
      </>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-[90vh] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-3">
          <div className="flex justify-between items-center mb-3">
            <PricingInfoBadge />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshProducts}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>

            </div>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" />
            <Input 
              placeholder="Search products..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-7 h-9" 
            />
          </div>
          
          <div className="flex gap-1 overflow-x-auto">
            <button 
              onClick={() => setSelectedCategoryId("all")} 
              className={cn("px-3 py-1 rounded text-sm whitespace-nowrap", 
                selectedCategoryId === "all" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              All Products
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)} 
                className={cn("px-3 py-1 rounded text-sm whitespace-nowrap", 
                  selectedCategoryId === cat.id ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                region={region}
                isLoading={isLoadingProducts}
                selectedVariantId={productVariants[product.id]}
                onVariantChange={handleVariantChange}
                priceListId={pricingContext.priceListId}
                customerGroupId={pricingContext.customerGroupId}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Cart Sidebar */}
      <aside className="hidden w-86 flex-col border-l bg-card lg:flex h-[90vh]">
        <CartSidebar {...cartSidebarProps} />
      </aside>
      
      {/* Dialogs */}
      <DraftsDialog 
        open={draftsDialogOpen} 
        onOpenChange={setDraftsDialogOpen} 
        drafts={drafts} 
        onLoadDraft={handleLoadDraft} 
        onDeleteDraft={deleteDraft} 
        region={region} 
      />
      <PaymentDialog
        cart={cart}
        cartItems={cart?.items ?? []}
        open={paymentDialogOpen} 
        onOpenChange={setPaymentDialogOpen} 
        cartTotal={cartTotal} 
        region={region} 
        onComplete={async (order) => {
          console.log("Order completed:", order);
          // Release all beepers associated with this order
          if (selectedBeeperIds.length > 0) {
            for (const beeperId of selectedBeeperIds) {
              await releaseBeeper(beeperId);
            }
          }
          // Reset POS state
          handleCustomerChange(null);
          await createCart();
          setSelectedBeeperIds([]);
          setSelectedCustomer(null);
          setOrderNotes("");
          setPaymentDialogOpen(false);
          setMobileCartOpen(false);
          
          toast({ 
            title: "Success", 
            description: `Order #${order.display_id} completed successfully` 
          });
        }}
      />
      <PrintDialog 
        open={printOpen} 
        onOpenChange={setPrintOpen} 
        cart={cart} 
        region={region} 
      />
    </div>
  );
}