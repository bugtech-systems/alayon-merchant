// hooks/use-pos-cart.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { sdk } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { MedusaCart, MedusaCartItem, Customer, Region } from "../types";
import { assignCart, removeCart, updateLineItemPrice } from "@/lib/actions";
import { getFinalPrice } from "@/lib/utils";

interface UsePosCartProps {
  region?: Region;
  priceListId?: string;
  customerGroupId?: string;
  userId?: string;
  customerId?: any;
  companyId?: any;
  locationId?: any;
}

interface CustomPriceMetadata {
  reason?: string;
  applied_by?: string;
  applied_at?: string;
  original_price?: number;
  original_strategy?: string;
}

export function usePosCart({ region, priceListId, customerGroupId, userId, customerId, companyId, locationId }: UsePosCartProps) {
  const { toast } = useToast();
  const [cart, setCart] = useState<MedusaCart | null>(null);
  const [cartItems, setCartItems] = useState<MedusaCartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);
  const refreshInProgressRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

const updateCartState = useCallback((cartData: MedusaCart | null) => {
  if (!isMountedRef.current) return;
  
  if (!cartData) {
    setCart(null);
    setCartItems([]);
    setCartTotal(0);
    return;
  }
  
  const transformedItems: MedusaCartItem[] = cartData.items?.map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    title: item.title,
    thumbnail: item.thumbnail,
    quantity: item.quantity,
    unit_price: getFinalPrice(item.unit_price),
    original_unit_price: item.original_unit_price || getFinalPrice(item.unit_price),
    subtotal: item.subtotal || (getFinalPrice(item.unit_price) * item.quantity),
    tax_total: item.tax_total,
    total: item.total,
    metadata: item.metadata || {}
  })) || [];
  
  setCart(cartData);
  setCartItems(transformedItems);
  setCartTotal(cartData.total || cartData.subtotal || 0);
}, []);

  const refreshCart = useCallback(async (cartId?: string) => {
    const storedCartId = cartId || localStorage.getItem("pos_cart_id");
    if (!storedCartId) return null;
    
    if (refreshInProgressRef.current) return null;
    refreshInProgressRef.current = true;
    
    setIsLoading(true);
    try {
      // Fetch cart with expanded fields for pricing
      const response = await sdk.store.cart.retrieve(storedCartId, {
        fields: "customer_id,*items,items.metadata,items.unit_price,items.subtotal,items.total"
      });

      const cartData = response.cart || response;
      
      if (cartData && isMountedRef.current) {
        // Process cart items to ensure pricing is correct
        const processedItems = cartData.items?.map((item: any) => {
          // Check if item has custom pricing
          const isCustomPriced = item.metadata?.is_custom_priced === true;
          const hasPriceListPrice = item.metadata?.price_list_id && !isCustomPriced;
          
          // Calculate effective pricing
          let effectivePrice = getFinalPrice(item.unit_price);
          let effectiveOriginalPrice = item.metadata?.original_price || item.unit_price;
          let pricingStrategy = item.metadata?.pricing_strategy || 'default';
          let discountPercentage = 0;
          let discountAmount = 0;
          
          if (isCustomPriced) {
            // Custom price takes highest priority
            pricingStrategy = 'custom';
            effectivePrice = item.metadata?.custom_price || getFinalPrice(item.unit_price);
            effectiveOriginalPrice = item.metadata?.original_price || effectivePrice;
          } else if (hasPriceListPrice) {
            // Price list price
            pricingStrategy = 'price_list';
            effectivePrice = item.metadata?.price_list_price || getFinalPrice(item.unit_price);
            effectiveOriginalPrice = item.metadata?.original_price || effectivePrice;
          } else if (item.metadata?.customer_group_price) {
            // Customer group price
            pricingStrategy = 'customer_group';
            effectivePrice = item.metadata.customer_group_price;
            effectiveOriginalPrice = item.metadata.original_price || effectivePrice;
          }
          
          // Calculate discounts
          const hasDiscount = effectiveOriginalPrice > effectivePrice;
          if (hasDiscount) {
            discountAmount = effectiveOriginalPrice - effectivePrice;
            discountPercentage = (discountAmount / effectiveOriginalPrice) * 100;
          }
          
          return {
            ...item,
            unit_price: effectivePrice,
            original_unit_price: effectiveOriginalPrice,
            subtotal: effectivePrice * item.quantity,
            metadata: {
              ...item.metadata,
              pricing_strategy: pricingStrategy,
              is_custom_priced: isCustomPriced,
              has_discount: hasDiscount,
              discount_amount: discountAmount,
              discount_percentage: discountPercentage,
              effective_price_applied_at: new Date().toISOString()
            }
          };
        });
        
        // Recalculate cart totals with processed pricing
        const processedCart = {
          ...cartData,
          items: processedItems,
          subtotal: processedItems?.reduce((sum: number, item: any) => sum + (getFinalPrice(item.unit_price) * item.quantity), 0) || 0,
        };
        
        updateCartState(processedCart);
        return processedCart;
      }
      return null;
    } catch (error) {
      console.error("Error refreshing cart:", error);
      return null;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
      refreshInProgressRef.current = false;
    }
  }, [updateCartState]);

  const createCart = useCallback(async () => {
    setIsLoading(true);
    try {
      const newCart = await sdk.store.cart.create({
        currency_code: region?.currency_code || "php",
        metadata: {
          company_id: companyId,
          seller_id: userId,
          price_list_id: priceListId,
          customer_group_id: customerGroupId,
          customer_id: customerId,
          stock_location_id: locationId,
          pricing_strategy: priceListId ? 'price_list' : (customerGroupId ? 'customer_group' : 'default')
        }
      });
      
      const cartData = newCart.cart || newCart;
      localStorage.setItem("pos_cart_id", cartData.id);
      
      if (isMountedRef.current) {
        updateCartState(cartData);
      }
      
      return cartData;
    } catch (error) {
      console.error("Error creating cart:", error);
      toast({ title: "Error", description: "Failed to create cart", variant: "destructive" });
      return null;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [region, userId, priceListId, customerGroupId, customerId, toast, updateCartState]);

// Simplified addToCart that uses prices from ProductCard
// hooks/use-pos-cart.ts

const addToCart = useCallback(async (params: any) => {
  let storedCartId = localStorage.getItem("pos_cart_id") || cart?.id;
  
  if (!storedCartId) {
    const newCart = await createCart();
    storedCartId = newCart?.id;
    if (!storedCartId) return;
  }
  
  setIsLoading(true);
  
  try {
    // Determine the final unit price based on pricing strategy
    let finalUnitPrice = params.unitPrice || 0;
    let finalOriginalPrice = params.originalPrice || finalUnitPrice;
    let effectiveStrategy = params.pricingStrategy || 'default';
    
    // Price List takes precedence over default
    if (params.priceListId && params.priceListPrice) {
      finalUnitPrice = params.priceListPrice;
      finalOriginalPrice = params.originalPrice || finalUnitPrice;
      effectiveStrategy = 'price_list';
    }
    
    // Custom pricing takes highest precedence
    if (params.isCustomPriced && params.customPrice) {
      finalUnitPrice = params.customPrice;
      finalOriginalPrice = params.originalPrice || finalUnitPrice;
      effectiveStrategy = 'custom';
    }
    
    const priceMetadata: Record<string, any> = {
      variant_title: params.variantTitle,
      product_title: params.productTitle,
      added_at: new Date().toISOString(),
      pricing_strategy: effectiveStrategy,
      original_price: finalOriginalPrice,
    };
    
    // Add pricing source specific metadata
    if (effectiveStrategy === 'price_list') {
      priceMetadata.price_list_id = params.priceListId;
      priceMetadata.price_list_price = finalUnitPrice;
      priceMetadata.discount_amount = finalOriginalPrice - finalUnitPrice;
      priceMetadata.discount_percentage = finalOriginalPrice > 0 
        ? ((finalOriginalPrice - finalUnitPrice) / finalOriginalPrice) * 100 
        : 0;
    }
    
    if (effectiveStrategy === 'custom') {
      priceMetadata.is_custom_priced = true;
      priceMetadata.custom_price = finalUnitPrice;
      priceMetadata.custom_price_reason = params.customPriceReason;
      priceMetadata.custom_price_applied_by = params.customPriceAppliedBy;
    }
    
    const existingItem = cartItems.find(item => item.variant_id === params.variantId);
    
    if (existingItem) {
      await sdk.store.cart.updateLineItem(storedCartId, existingItem.id, {
        quantity: existingItem.quantity + params.quantity,
        // unit_price: finalUnitPrice,  // ← CRITICAL: Set the unit price
        metadata: {
          ...existingItem.metadata,
          ...priceMetadata,
        }
      });
    } else {
     let {cart} = await sdk.store.cart.createLineItem(storedCartId, {
        variant_id: params.variantId,
        quantity: params.quantity,
        // unit_price: finalUnitPrice,  // ← CRITICAL: Set the unit price
        metadata: priceMetadata
      });

      let lineItem = cart.items.find(a => a.variant_id == params.variantId);
      let updatedItem = await updateLineItemPrice(lineItem?.id, {...params, cartId: cart?.id, customUnitPrice: finalUnitPrice })

      console.log(lineItem, updatedItem, 'DDE')
    }
    
    await refreshCart(storedCartId);
    toast({ title: "Added to Cart", description: `${params.quantity}x ${params.productTitle} added` });
  } catch (error) {
    console.error("Error adding to cart:", error);
    toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
  } finally {
    setIsLoading(false);
  }
}, [cart?.id, cartItems, createCart, refreshCart, toast]);

  const applyCustomPrice = useCallback(async (
    lineId: string,
    variantId: string,
    newPrice: number,
    metadata?: CustomPriceMetadata
  ) => {
      let storedCartId = localStorage.getItem("pos_cart_id") || cart?.id;

    if (!storedCartId) return;
    
    setIsLoading(true);
    try {
      // Find existing line item
      const existingItem = cart?.items?.find(item => item.id === lineId);
      if (!existingItem) throw new Error("Item not found");
      
      // Update line item with custom price
      await sdk.store.cart.updateLineItem(cart?.id, lineId, {
        quantity: existingItem.quantity,
        metadata: {
          ...existingItem.metadata,
          unit_price: getFinalPrice(newPrice || existingItem.unit_price),
          original_price: existingItem.metadata?.original_price || existingItem.unit_price,
          is_custom_priced: true,
          custom_price: newPrice,
          custom_price_applied_by: metadata?.applied_by || userId,
          custom_price_reason: metadata?.reason,
          custom_price_applied_at: new Date().toISOString(),
          pricing_strategy: 'custom',
          previous_pricing_strategy: existingItem.metadata?.pricing_strategy
        }
      });


      console.log(newPrice, 'NEW PRICE', existingItem, 'ECCS')
            let {cart: updatedCart} = await updateLineItemPrice(lineId, { ...metadata, variantId, cartId: cart?.id, customUnitPrice: getFinalPrice(newPrice || existingItem.unit_price), quantity: existingItem.quantity })





      console.log(updatedCart, 'DDE')

      
      // Refresh cart to get updated pricing
      await refreshCart(updatedCart.id);
      toast({ title: "Price Updated", description: "Custom price applied successfully" });
    } catch (error) {
      console.error("Error applying custom price:", error);
      toast({ title: "Error", description: "Failed to apply custom price", variant: "destructive" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cart, refreshCart, userId, toast]);

  const removeCustomPrice = useCallback(async (lineId: string, variantId: string) => {
    if (!cart?.id) return;
    
    setIsLoading(true);
    try {
      const existingItem = cart.items?.find(item => item.id === lineId);
      if (!existingItem) throw new Error("Item not found");
      
      // Revert to original price (from price list or default)
      const originalPrice = existingItem.metadata?.original_price || existingItem.unit_price;
      const originalStrategy = existingItem.metadata?.previous_pricing_strategy || 'default';
      
      // Update line item to remove custom pricing
      await sdk.store.cart.lineItem.update(cart.id, lineId, {
        quantity: existingItem.quantity,
        metadata: {
          ...existingItem.metadata,
          unit_price: originalPrice,
          is_custom_priced: false,
          custom_price_removed_at: new Date().toISOString(),
          pricing_strategy: originalStrategy,
          custom_price: undefined,
          custom_price_applied_by: undefined,
          custom_price_reason: undefined
        }
      });
      
      // Refresh cart
      await refreshCart(cart.id);
      toast({ title: "Price Updated", description: "Original price restored" });
    } catch (error) {
      console.error("Error removing custom price:", error);
      toast({ title: "Error", description: "Failed to remove custom price", variant: "destructive" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cart, refreshCart, toast]);

  const updateQuantity = useCallback(async (lineId: string, quantity: number) => {
    const storedCartId = localStorage.getItem("pos_cart_id") || cart?.id;
    if (!storedCartId) return;
    
    try {
      if (quantity <= 0) {
        await sdk.store.cart.deleteLineItem(storedCartId, lineId);
      } else {
        await sdk.store.cart.updateLineItem(storedCartId, lineId, { quantity });
      }
      await refreshCart(storedCartId);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" });
    }
  }, [cart?.id, refreshCart, toast]);

  const removeFromCart = useCallback(async (lineId: string) => {
    const storedCartId = localStorage.getItem("pos_cart_id") || cart?.id;
    if (!storedCartId) return;
    
    try {
      await sdk.store.cart.deleteLineItem(storedCartId, lineId);
      await refreshCart(storedCartId);
      toast({ title: "Removed", description: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing item:", error);
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    }
  }, [cart?.id, refreshCart, toast]);

  const clearCart = useCallback(async () => {
    const storedCartId = localStorage.getItem("pos_cart_id") || cart?.id;
    if (!storedCartId) return;
    
    try {

      
 
      localStorage.removeItem('pos_cart_id')
      setCart(null)
      setCartItems([])
      setCartTotal(0)
      // await refreshCart(storedCartId);
      toast({ title: "Cleared", description: "Cart has been cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      localStorage.removeItem('pos_cart_id')
      toast({ title: "Error", description: "Failed to clear cart", variant: "destructive" });
    }
  }, [cart?.id, cartItems, refreshCart, toast]);

  const attachCustomer = useCallback(async (customer: Customer | null) => {
    const storedCartId = localStorage.getItem("pos_cart_id") || cart?.id;
    if (!storedCartId) return;
    
    try {
      if (customer) {
        await assignCart(storedCartId, customer?.id);
      } else {
        await removeCart(storedCartId);
      }
      await refreshCart(storedCartId);
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
    }
  }, [cart?.id, refreshCart, toast]);

  const updateMetadata = useCallback(async (metadata: Record<string, any>) => {
    const storedCartId = localStorage.getItem("pos_cart_id") || cart?.id;
    if (!storedCartId) return;
    
    try {
      await sdk.store.cart.update(storedCartId, {
        metadata: { ...cart?.metadata, ...metadata }
      });
      await refreshCart(storedCartId);
    } catch (error) {
      console.error("Error updating metadata:", error);
    }
  }, [cart?.id, cart?.metadata, refreshCart]);

// hooks/use-pos-cart.ts - Add this method

const prepareCartForCheckout = useCallback(async () => {
  if (!cart?.id) return;
  
  setIsLoading(true);
  try {
    // Update each line item with final pricing metadata before checkout
    for (const item of cartItems as any) {
      const pricingMetadata = {
        original_unit_price: item.original_unit_price || item.unit_price,
        applied_unit_price: item.unit_price,
        pricing_strategy: item.metadata?.pricing_strategy || 'default',
        is_custom_priced: item.metadata?.is_custom_priced || false,
        custom_price_reason: item.metadata?.custom_price_reason,
        custom_price_applied_by: item.metadata?.custom_price_applied_by,
        custom_price_applied_at: item.metadata?.custom_price_applied_at,
        price_list_id: item.metadata?.price_list_id,
        price_list_price: item.metadata?.price_list_price,
        discount_amount: item.metadata?.discount_amount,
        discount_percentage: item.metadata?.discount_percentage,
        finalized_for_checkout: true,
        finalized_at: new Date().toISOString(),
      };
      
      await sdk.store.cart.updateLineItem(cart.id, item.id, {
        quantity: item.quantity,
        metadata: {
          ...item.metadata,
          ...pricingMetadata,
        }
      });
    }
    
    // Also update cart metadata with pricing summary
    await sdk.store.cart.update(cart.id, {
      metadata: {
        ...cart.metadata,
        checkout_pricing_summary: {
          total_items: cartItems.length,
          custom_priced_items: cartItems.filter(i => i.metadata?.is_custom_priced).length,
          price_list_items: cartItems.filter(i => i.metadata?.price_list_id).length,
          total_discount: cartItems.reduce((sum, i) => {
            const discount = (i.original_unit_price || i.unit_price) - i.unit_price;
            return sum + (discount > 0 ? discount * i.quantity : 0);
          }, 0),
          prepared_at: new Date().toISOString(),
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error preparing cart for checkout:", error);
    throw error;
  } finally {
    setIsLoading(false);
  }
}, [cart, cartItems]);



  return {
    cart,
    cartItems,
    cartTotal,
    isLoading,
    refreshCart,
    prepareCartForCheckout,
    createCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    applyCustomPrice,
    removeCustomPrice,
    clearCart,
    attachCustomer,
    updateMetadata,
    updateCartState
  };
}