// components/pos-app.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, RefreshCw, History, ShoppingCart, Save, Tag, Users, Star, Radio, MessageCircle, Bell, X } from "lucide-react";
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
import { usePosBeepers } from "@/hooks/use-pos-beepers";
import { useSocket } from "@/hooks/useSocket";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { Region, Customer } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "sonner";
import { toast } from "sonner";

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
  const [showChat, setShowChat] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);
  const { toast: toastShadcn } = useToast();

  // Socket connection for real-time features
  const { 
    socket, 
    isConnected, 
    notifications, 
    messages,
    sendMessage,
    markNotificationRead,
    clearNotifications,
    getUnreadCount,
  } = useSocket({
    userId: user?.id,
    role: 'cashier',
    customerId: user?.id
  });

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
    location_id: user?.metadata?.role == 'company' ? user.employee?.company?.stock_location_id :  user?.driver?.stock_location_id,
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
    locationId: pricingContext.location_id,
    customerId: selectedCustomer?.id
  }) as any;
   
  const { categories, products, isLoading: isLoadingProducts, productVariants, handleVariantChange, refreshProducts } = 
    usePosProducts({ 
      countryCode, 
      priceListId: pricingContext.priceListId,
      customerGroupId: pricingContext.customerGroupId,
      regionId: region?.id,
      customerId: selectedCustomer?.id,
      companyId: pricingContext.companyId,
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

  // Handle socket notifications for new orders
  useEffect(() => {
    if (!socket) return;

    // Listen for new orders from kitchen
    socket.on('order_received', (data) => {
      console.log('New order notification received:', data);
      
      // Show toast notification
      toast.info(`📦 New Order #${data.order?.display_id || 'Unknown'}`, {
        description: `Items: ${data.order?.items?.length || 0} | Total: ₱${data.order?.total || 0}`,
        duration: 8000,
        action: {
          label: 'View Order',
          onClick: () => {
            // Open order details or highlight the order
            console.log('View order:', data.order);
          }
        }
      });

      // Play notification sound
      if (isSoundEnabled) {
        playNotificationSound();
      }

      // Update unread count
      setUnreadOrderCount(prev => prev + 1);

      // Send acknowledgment back to kitchen
      socket.emit('order_acknowledged', {
        orderId: data.order?.id,
        acknowledgedBy: user?.id,
        acknowledgedAt: new Date()
      });
    });

    // Listen for order status updates
    socket.on('order_updated', (data) => {
      console.log('Order status update:', data);
      
      toast.info(`📋 Order #${data.order?.display_id} Updated`, {
        description: `Status: ${data.status}`,
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => console.log('View order:', data.order)
        }
      });

      if (isSoundEnabled) {
        playNotificationSound();
      }
    });

    // Listen for messages from kitchen
    socket.on('message_received', (data) => {
      console.log('Message from kitchen:', data);
      
      toast.info(`💬 ${data.senderName || 'Kitchen'}`, {
        description: data.text,
        duration: 6000,
        action: {
          label: 'Reply',
          onClick: () => setShowChat(true)
        }
      });

      if (isSoundEnabled) {
        playNotificationSound();
      }
    });

    // Listen for customer messages
    socket.on('customer_message', (data) => {
      console.log('Customer message:', data);
      
      toast.info(`👤 Customer: ${data.customerName || 'Customer'}`, {
        description: data.text,
        duration: 6000,
        action: {
          label: 'Reply',
          onClick: () => setShowChat(true)
        }
      });

      if (isSoundEnabled) {
        playNotificationSound();
      }
    });

    // Listen for kitchen status updates
    socket.on('kitchen_status', (data) => {
      console.log('Kitchen status update:', data);
      
      toast.info(`🍳 Kitchen ${data.status}`, {
        description: data.message || 'Kitchen status updated',
        duration: 3000
      });
    });

    return () => {
      socket.off('order_received');
      socket.off('order_updated');
      socket.off('message_received');
      socket.off('customer_message');
      socket.off('kitchen_status');
    };
  }, [socket, isSoundEnabled, user?.id]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!isSoundEnabled) return;

    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 1.0;
      audio.play().catch(err => console.log('Audio play error:', err));
    } catch (error) {
      console.log('Sound playback failed:', error);
    }
  }, [isSoundEnabled]);

  // Handle beeper attachment/detachment for current order
  const handleAttachOrderToBeeper = useCallback(async (beeperId: string, orderId: string) => {
    try {
      await attachOrderToBeeper(beeperId, orderId);
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
      
      toastShadcn({
        title: "Success",
        description: "Order attached to beeper successfully"
      });
    } catch (error) {
      console.error("Error attaching order to beeper:", error);
      toastShadcn({
        title: "Error",
        description: "Failed to attach order to beeper",
        variant: "destructive"
      });
    }
  }, [attachOrderToBeeper, updateMetadata, selectedBeeperIds, cart, user, toastShadcn]);

  const handleDetachOrderFromBeeper = useCallback(async (beeperId: string, orderId: string) => {
    try {
      await detachOrderFromBeeper(beeperId, orderId);
      const updatedBeeperIds = selectedBeeperIds.filter(id => id !== beeperId);
      await updateMetadata({
        beeper_ids: updatedBeeperIds,
        beeper_assignments: {
          ...cart?.metadata?.beeper_assignments,
          [beeperId]: undefined
        }
      });
      
      toastShadcn({
        title: "Success",
        description: "Order detached from beeper successfully"
      });
    } catch (error) {
      console.error("Error detaching order from beeper:", error);
      toastShadcn({
        title: "Error",
        description: "Failed to detach order from beeper",
        variant: "destructive"
      });
    }
  }, [detachOrderFromBeeper, updateMetadata, selectedBeeperIds, cart, toastShadcn]);

  // Handle customer change
  const handleCustomerChange = useCallback(async (customer: Customer | null) => {
    if (customer) {
      setSelectedCustomer(customer?.id);
    } else {
      setSelectedCustomer(null);
    }
    await attachCustomer(customer);
    
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
    
    const newBeepers = beeperIds.filter(id => !selectedBeeperIds.includes(id));
    newBeepers.forEach(async (beeperId) => {
      if (cart?.id) {
        await handleAttachOrderToBeeper(beeperId, cart.id);
      }
    });
    
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
      await prepareCartForCheckout();
      setPaymentDialogOpen(true);
      setSearchQuery('');
    } catch (error) {
      console.error("Error preparing cart:", error);
      toastShadcn({ 
        title: "Error", 
        description: "Failed to prepare order. Please try again.", 
        variant: "destructive" 
      });
    }
  }, [cart, prepareCartForCheckout, toastShadcn]);

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
    
    if (draft.beeper_ids) {
      setSelectedBeeperIds(draft.beeper_ids);
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
          Promo Pricing
        </Badge>
      )}
      {pricingContext.pricingStrategy === 'customer_group' && pricingContext.customerGroupId && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Users className="h-3 w-3 mr-1" />
          Group Pricing
        </Badge>
      )}
      {selectedCustomer && (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Star className="h-3 w-3 mr-1" />
          {selectedCustomer.first_name}
        </Badge>
      )}
      {selectedBeeperIds.length > 0 && (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Radio className="h-3 w-3 mr-1" />
          {selectedBeeperIds.length} Beeper{selectedBeeperIds.length !== 1 ? 's' : ''}
        </Badge>
      )}
      {unreadOrderCount > 0 && (
        <Badge variant="destructive" className="animate-pulse">
          <Bell className="h-3 w-3 mr-1" />
          {unreadOrderCount} New Order{unreadOrderCount !== 1 ? 's' : ''}
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
        <Toaster position="top-right" richColors />
        <div className="flex flex-col h-[90vh] pb-14">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b p-2">
            <div className="flex justify-between items-center mb-2">
              <PricingInfoBadge />
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 px-2 relative"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageCircle className="h-3 w-3" />
                  {messages.filter(m => !m.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">
                      {messages.filter(m => !m.read).length}
                    </span>
                  )}
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={refreshProducts}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
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
              <Button className="absolute right-4 top-1/2 h-3 w-5 -translate-y-1/2" onClick={() => setSearchQuery('')}>Clear</Button>
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
                Cart • ₱{cartTotal.toFixed(2)}
                {cartItems.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {cartItems.length}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="relative"
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              >
                <Bell className="h-4 w-4" />
                {unreadOrderCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">
                    {unreadOrderCount}
                  </span>
                )}
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
        


        {/* Notification Panel for Mobile */}
        {showNotificationPanel && (
          <div className="fixed bottom-16 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t max-h-96 overflow-y-auto">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-semibold">Notifications</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNotificationPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="divide-y">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div key={notification.id} className="p-3 hover:bg-muted/50">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
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
            if (selectedBeeperIds.length > 0) {
              for (const beeperId of selectedBeeperIds) {
                await releaseBeeper(beeperId);
              }
            }
            handleCustomerChange(null);
            await createCart();
            setSelectedBeeperIds([]);
            setSelectedCustomer(null);
            setOrderNotes("");
            setPaymentDialogOpen(false);
            setMobileCartOpen(false);
            setUnreadOrderCount(0);
            
            // Notify kitchen about completed order
            if (socket) {
              socket.emit('order_completed', {
                orderId: order.id,
                completedBy: user?.id,
                timestamp: new Date()
              });
            }
            
            toastShadcn({ 
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
      <Toaster position="top-right" richColors />
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-3">
          <div className="flex justify-between items-center mb-3">
            <PricingInfoBadge />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected ? 'Online' : 'Offline'}
              </div>


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
            <Button className="absolute right-4 top-1/2 h-3 w-5 -translate-y-1/2" onClick={() => setSearchQuery('')}>Clear</Button>
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
          if (selectedBeeperIds.length > 0) {
            for (const beeperId of selectedBeeperIds) {
              await releaseBeeper(beeperId);
            }
          }
          handleCustomerChange(null);
          await createCart();
          setSelectedBeeperIds([]);
          setSelectedCustomer(null);
          setOrderNotes("");
          setPaymentDialogOpen(false);
          setMobileCartOpen(false);
          setUnreadOrderCount(0);
          
          if (socket) {
            socket.emit('order_completed', {
              orderId: order.id,
              completedBy: user?.id,
              timestamp: new Date()
            });
          }
          
          toastShadcn({ 
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