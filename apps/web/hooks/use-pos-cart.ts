// hooks/use-pos-cart.ts
"use client";

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

export function usePosCart({
  region,
  priceListId,
  customerGroupId,
  userId,
  customerId,
  companyId,
  locationId,
}: UsePosCartProps) {
  const { toast } = useToast();

  const [cart, setCart] = useState<MedusaCart | null>(null);
  const [cartItems, setCartItems] = useState<MedusaCartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingLineUpdates, setPendingLineUpdates] = useState<Record<string, boolean>>({});

  const isMountedRef = useRef(true);
  const refreshInProgressRef = useRef(false);
  const cartRef = useRef(cart);
  const cartItemsRef = useRef(cartItems);

  // Keep refs updated synchronously inside state setters
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Update local cart state and refs with a new list of items.
   */
  const applyLocalItems = useCallback((newItems: MedusaCartItem[]) => {
    if (!isMountedRef.current) return;

    const subtotal = newItems.reduce(
      (sum, item) => sum + getFinalPrice(item.unit_price) * item.quantity,
      0
    );

    setCartItems(newItems);
    cartItemsRef.current = newItems; // keep ref in sync immediately

    setCart((prev) =>
      prev
        ? {
            ...prev,
            items: newItems as any,
            subtotal,
            total: subtotal,
          }
        : prev
    );
    setCartTotal(subtotal);
  }, []);

  /**
   * Update internal state from a full cart response.
   */
  const updateCartState = useCallback(
    (cartData: MedusaCart | null) => {
      if (!isMountedRef.current) return;

      if (!cartData) {
        setCart(null);
        setCartItems([]);
        setCartTotal(0);
        cartItemsRef.current = [];
        return;
      }

      const transformedItems: MedusaCartItem[] =
        cartData.items?.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          title: item.title,
          thumbnail: item.thumbnail,
          quantity: item.quantity,
          unit_price: getFinalPrice(item.unit_price),
          original_unit_price: item.original_unit_price || getFinalPrice(item.unit_price),
          subtotal: item.subtotal || getFinalPrice(item.unit_price) * item.quantity,
          tax_total: item.tax_total,
          total: item.total,
          metadata: item.metadata || {},
        })) || [];

      setCart(cartData);
      setCartItems(transformedItems);
      cartItemsRef.current = transformedItems;
      setCartTotal(cartData.total || cartData.subtotal || 0);
    },
    []
  );

  /**
   * Refresh cart from server.
   */
  const refreshCart = useCallback(
    async (cartId?: string) => {
      const storedCartId = cartId || localStorage.getItem("pos_cart_id");
      if (!storedCartId) return null;

      if (refreshInProgressRef.current) return null;
      refreshInProgressRef.current = true;

      setIsLoading(true);
      try {
        const response = await sdk.store.cart.retrieve(storedCartId, {
          fields: "customer_id,*items,items.metadata,items.unit_price,items.subtotal,items.total",
        });

        const cartData = response.cart || response;
        if (cartData && isMountedRef.current) {
          // Process pricing metadata (omitted for brevity, but should remain)
          // ... existing processing code ...
          updateCartState(cartData);
          return cartData;
        }
        return null;
      } catch (error) {
        console.error("Error refreshing cart:", error);
        return null;
      } finally {
        if (isMountedRef.current) setIsLoading(false);
        refreshInProgressRef.current = false;
      }
    },
    [updateCartState]
  );

  /**
   * Create a new cart.
   */
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
          pricing_strategy: priceListId ? "price_list" : customerGroupId ? "customer_group" : "default",
        },
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

  /**
   * ADD TO CART – FIXED: Always check for existing line item and update quantity.
   */
  const addToCart = useCallback(
    async (params: any) => {
      let storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;

      if (!storedCartId) {
        const newCart = await createCart();
        storedCartId = newCart?.id;
        if (!storedCartId) return;
      }

      // Determine final price & metadata (as before)
      let finalUnitPrice = params.unitPrice || 0;
      let finalOriginalPrice = params.originalPrice || finalUnitPrice;
      let effectiveStrategy = params.pricingStrategy || "default";

      if (params.priceListId && params.priceListPrice) {
        finalUnitPrice = params.priceListPrice;
        finalOriginalPrice = params.originalPrice || finalUnitPrice;
        effectiveStrategy = "price_list";
      }

      if (params.isCustomPriced && params.customPrice) {
        finalUnitPrice = params.customPrice;
        finalOriginalPrice = params.originalPrice || finalUnitPrice;
        effectiveStrategy = "custom";
      }

      const priceMetadata: Record<string, any> = {
        variant_title: params.variantTitle,
        product_title: params.productTitle,
        added_at: new Date().toISOString(), // keep for tracking, but not used for uniqueness
        pricing_strategy: effectiveStrategy,
        original_price: finalOriginalPrice,
      };

      if (effectiveStrategy === "price_list") {
        priceMetadata.price_list_id = params.priceListId;
        priceMetadata.price_list_price = finalUnitPrice;
        priceMetadata.discount_amount = finalOriginalPrice - finalUnitPrice;
        priceMetadata.discount_percentage =
          finalOriginalPrice > 0 ? ((finalOriginalPrice - finalUnitPrice) / finalOriginalPrice) * 100 : 0;
      }

      if (effectiveStrategy === "custom") {
        priceMetadata.is_custom_priced = true;
        priceMetadata.custom_price = finalUnitPrice;
        priceMetadata.custom_price_reason = params.customPriceReason;
        priceMetadata.custom_price_applied_by = params.customPriceAppliedBy;
      }

      // ---------- CHECK FOR EXISTING LINE ITEM ----------
      const existingItem = cartItemsRef.current.find(
        (item) => item.variant_id === params.variantId
      );

      if (existingItem) {
        // Update existing line item quantity optimistically
        const newQuantity = existingItem.quantity + params.quantity;
        setPendingLineUpdates((prev) => ({ ...prev, [existingItem.id]: true }));

        // Optimistic local update
        const updatedItems = cartItemsRef.current.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: getFinalPrice(item.unit_price) * newQuantity,
                total: getFinalPrice(item.unit_price) * newQuantity,
                metadata: {
                  ...item.metadata,
                  ...priceMetadata,
                  added_at: new Date().toISOString(),
                },
              }
            : item
        );
        applyLocalItems(updatedItems);

        try {
          await sdk.store.cart.updateLineItem(storedCartId, existingItem.id, {
            quantity: newQuantity,
            metadata: {
              ...existingItem.metadata,
              ...priceMetadata,
            },
          });

          toast({ title: "Added to Cart", description: `${params.quantity}x ${params.productTitle} added` });
        } catch (error) {
          // Rollback
          applyLocalItems(cartItemsRef.current);
          console.error("Error updating quantity:", error);
          toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
        } finally {
          setPendingLineUpdates((prev) => ({ ...prev, [existingItem.id]: false }));
        }
        return;
      }

      // ---------- NEW LINE ITEM ----------
      // Create temp line item for optimistic UI
      const tempLineId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticItem: MedusaCartItem = {
        id: tempLineId,
        product_id: params.productId || "",
        variant_id: params.variantId,
        title: params.productTitle,
        thumbnail: params.thumbnail || "",
        quantity: params.quantity,
        unit_price: finalUnitPrice,
        original_unit_price: finalOriginalPrice,
        subtotal: finalUnitPrice * params.quantity,
        total: finalUnitPrice * params.quantity,
        tax_total: 0,
        metadata: priceMetadata,
      };

      applyLocalItems([...cartItemsRef.current, optimisticItem]);

      try {
        const result = await sdk.store.cart.createLineItem(storedCartId, {
          variant_id: params.variantId,
          quantity: params.quantity,
          metadata: priceMetadata,
        });

        const serverCart = result.cart || result;
        if (serverCart && serverCart.items) {
          // Replace temp item with server item
          const serverItem = serverCart.items.find(
            (i: any) => i.variant_id === params.variantId && i.metadata?.added_at === priceMetadata.added_at
          );
          if (serverItem) {
            const transformedItem: MedusaCartItem = {
              id: serverItem.id,
              product_id: serverItem.product_id,
              variant_id: serverItem.variant_id,
              title: serverItem.title,
              thumbnail: serverItem.thumbnail,
              quantity: serverItem.quantity,
              unit_price: getFinalPrice(serverItem.unit_price),
              original_unit_price: serverItem.original_unit_price || getFinalPrice(serverItem.unit_price),
              subtotal: serverItem.subtotal || getFinalPrice(serverItem.unit_price) * serverItem.quantity,
              tax_total: serverItem.tax_total,
              total: serverItem.total,
              metadata: serverItem.metadata || {},
            };
            const itemsWithoutTemp = cartItemsRef.current.filter((i) => i.id !== tempLineId);
            applyLocalItems([...itemsWithoutTemp, transformedItem]);
          } else {
            // Fallback: full refresh
            await refreshCart(storedCartId);
          }
        } else {
          await refreshCart(storedCartId);
        }

        toast({ title: "Added to Cart", description: `${params.quantity}x ${params.productTitle} added` });
      } catch (error) {
        applyLocalItems(cartItemsRef.current.filter((i) => i.id !== tempLineId));
        console.error("Error adding to cart:", error);
        toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
      }
    },
    [cartItemsRef, applyLocalItems, createCart, refreshCart, toast]
  );

    /**
   * REMOVE FROM CART – optimistic, per-line pending.
   */
  const removeFromCart = useCallback(
    async (lineId: string) => {
      const storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;
      if (!storedCartId) return;

      const currentItems = cartItemsRef.current;
      const removedItem = currentItems.find((i) => i.id === lineId);
      if (!removedItem) return;

      const updatedItems = currentItems.filter((i) => i.id !== lineId);
      applyLocalItems(updatedItems);
      setPendingLineUpdates((prev) => ({ ...prev, [lineId]: true }));

      try {
        await sdk.store.cart.deleteLineItem(storedCartId, lineId);
        toast({ title: "Removed", description: "Item removed from cart" });
      } catch (error) {
        applyLocalItems([...cartItemsRef.current, removedItem]);
        console.error("Error removing item:", error);
        toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
      } finally {
        setPendingLineUpdates((prev) => ({ ...prev, [lineId]: false }));
      }
    },
    [cartItemsRef, applyLocalItems, toast]
  );

  /**
   * UPDATE QUANTITY – optimistic, per-line pending.
   */
  const updateQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      const storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;
      if (!storedCartId) return;

      if (quantity <= 0) {
        await removeFromCart(lineId);
        return;
      }

      setPendingLineUpdates((prev) => ({ ...prev, [lineId]: true }));

      const currentItems = cartItemsRef.current;
      const updatedItems = currentItems.map((item) =>
        item.id === lineId
          ? {
              ...item,
              quantity,
              subtotal: getFinalPrice(item.unit_price) * quantity,
              total: getFinalPrice(item.unit_price) * quantity,
            }
          : item
      );
      applyLocalItems(updatedItems);

      try {
        await sdk.store.cart.updateLineItem(storedCartId, lineId, { quantity });
      } catch (error) {
        applyLocalItems(currentItems);
        console.error("Error updating quantity:", error);
        toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" });
      } finally {
        setPendingLineUpdates((prev) => ({ ...prev, [lineId]: false }));
      }
    },
    [cartItemsRef, applyLocalItems, removeFromCart, toast]
  );



  /**
   * CLEAR CART – optimistic local clear.
   */
  const clearCart = useCallback(async () => {
    const storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;
    if (!storedCartId) return;

    const previousItems = cartItemsRef.current;
    applyLocalItems([]);
    localStorage.removeItem("pos_cart_id");

    try {
      await Promise.all(
        previousItems.map((item) =>
          sdk.store.cart.deleteLineItem(storedCartId, item.id).catch((err) => {
            console.error(`Failed to delete item ${item.id}`, err);
          })
        )
      );
      toast({ title: "Cleared", description: "Cart has been cleared" });
    } catch (error) {
      applyLocalItems(previousItems);
      localStorage.setItem("pos_cart_id", storedCartId);
      console.error("Error clearing cart:", error);
      toast({ title: "Error", description: "Failed to clear cart", variant: "destructive" });
    }
  }, [cartItemsRef, applyLocalItems, toast]);

  /**
   * APPLY CUSTOM PRICE – per-line pending.
   */
  const applyCustomPrice = useCallback(
    async (lineId: string, variantId: string, newPrice: number, metadata?: CustomPriceMetadata) => {
      const storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;
      if (!storedCartId) return;

      const existingItem = cartItemsRef.current.find((item) => item.id === lineId);
      if (!existingItem) throw new Error("Item not found");

      setPendingLineUpdates((prev) => ({ ...prev, [lineId]: true }));

      try {
        await sdk.store.cart.updateLineItem(storedCartId, lineId, {
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
            pricing_strategy: "custom",
            previous_pricing_strategy: existingItem.metadata?.pricing_strategy,
          },
        });

        const updatedItems = cartItemsRef.current.map((item) =>
          item.id === lineId
            ? {
                ...item,
                unit_price: getFinalPrice(newPrice),
                original_unit_price: item.metadata?.original_price || item.unit_price,
                subtotal: getFinalPrice(newPrice) * item.quantity,
                total: getFinalPrice(newPrice) * item.quantity,
                metadata: {
                  ...item.metadata,
                  is_custom_priced: true,
                  custom_price: newPrice,
                  pricing_strategy: "custom",
                },
              }
            : item
        );
        applyLocalItems(updatedItems);

        toast({ title: "Price Updated", description: "Custom price applied successfully" });
      } catch (error) {
        console.error("Error applying custom price:", error);
        toast({ title: "Error", description: "Failed to apply custom price", variant: "destructive" });
        throw error;
      } finally {
        setPendingLineUpdates((prev) => ({ ...prev, [lineId]: false }));
      }
    },
    [cartItemsRef, applyLocalItems, userId, toast]
  );

  /**
   * REMOVE CUSTOM PRICE – per-line pending.
   */
  const removeCustomPrice = useCallback(
    async (lineId: string, variantId: string) => {
      const storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;
      if (!storedCartId) return;

      const existingItem = cartItemsRef.current.find((item) => item.id === lineId);
      if (!existingItem) throw new Error("Item not found");

      setPendingLineUpdates((prev) => ({ ...prev, [lineId]: true }));

      const originalPrice = existingItem.metadata?.original_price || existingItem.unit_price;
      const originalStrategy = existingItem.metadata?.previous_pricing_strategy || "default";

      try {
        await sdk.store.cart.updateLineItem(storedCartId, lineId, {
          quantity: existingItem.quantity,
          metadata: {
            ...existingItem.metadata,
            unit_price: originalPrice,
            is_custom_priced: false,
            custom_price_removed_at: new Date().toISOString(),
            pricing_strategy: originalStrategy,
            custom_price: undefined,
            custom_price_applied_by: undefined,
            custom_price_reason: undefined,
          },
        });

        const updatedItems = cartItemsRef.current.map((item) =>
          item.id === lineId
            ? {
                ...item,
                unit_price: getFinalPrice(originalPrice),
                original_unit_price: originalPrice,
                subtotal: getFinalPrice(originalPrice) * item.quantity,
                total: getFinalPrice(originalPrice) * item.quantity,
                metadata: {
                  ...item.metadata,
                  is_custom_priced: false,
                  pricing_strategy: originalStrategy,
                  custom_price: undefined,
                },
              }
            : item
        );
        applyLocalItems(updatedItems);

        toast({ title: "Price Updated", description: "Original price restored" });
      } catch (error) {
        console.error("Error removing custom price:", error);
        toast({ title: "Error", description: "Failed to remove custom price", variant: "destructive" });
        throw error;
      } finally {
        setPendingLineUpdates((prev) => ({ ...prev, [lineId]: false }));
      }
    },
    [cartItemsRef, applyLocalItems, toast]
  );

  /**
   * ATTACH CUSTOMER – full refresh.
   */
  const attachCustomer = useCallback(
    async (customer: Customer | null) => {
      const storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;
      if (!storedCartId) return;

      try {
        if (customer) {
          await assignCart(storedCartId, customer.id);
        } else {
          await removeCart(storedCartId);
        }
        await refreshCart(storedCartId);
      } catch (error) {
        console.error("Error updating customer:", error);
        toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
      }
    },
    [cartRef, refreshCart, toast]
  );

  /**
   * UPDATE METADATA – full refresh.
   */
  const updateMetadata = useCallback(
    async (metadata: Record<string, any>) => {
      const storedCartId = localStorage.getItem("pos_cart_id") || cartRef.current?.id;
      if (!storedCartId) return;

      try {
        await sdk.store.cart.update(storedCartId, {
          metadata: { ...cartRef.current?.metadata, ...metadata },
        });
        await refreshCart(storedCartId);
      } catch (error) {
        console.error("Error updating metadata:", error);
      }
    },
    [cartRef, refreshCart]
  );

  /**
   * PREPARE CART FOR CHECKOUT.
   */
  const prepareCartForCheckout = useCallback(async () => {
    if (!cartRef.current?.id) return;

    setIsLoading(true);
    try {
      for (const item of cartItemsRef.current) {
        const pricingMetadata = {
          original_unit_price: item.original_unit_price || item.unit_price,
          applied_unit_price: item.unit_price,
          pricing_strategy: item.metadata?.pricing_strategy || "default",
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

        await sdk.store.cart.updateLineItem(cartRef.current!.id, item.id, {
          quantity: item.quantity,
          metadata: {
            ...item.metadata,
            ...pricingMetadata,
          },
        });
      }

      await sdk.store.cart.update(cartRef.current.id, {
        metadata: {
          ...cartRef.current.metadata,
          checkout_pricing_summary: {
            total_items: cartItemsRef.current.length,
            custom_priced_items: cartItemsRef.current.filter((i) => i.metadata?.is_custom_priced).length,
            price_list_items: cartItemsRef.current.filter((i) => i.metadata?.price_list_id).length,
            total_discount: cartItemsRef.current.reduce((sum, i) => {
              const discount = (i.original_unit_price || i.unit_price) - i.unit_price;
              return sum + (discount > 0 ? discount * i.quantity : 0);
            }, 0),
            prepared_at: new Date().toISOString(),
          },
          created_by: userId,
        },
      });

      return true;
    } catch (error) {
      console.error("Error preparing cart for checkout:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cartRef, cartItemsRef, userId]);

  return {
    cart,
    cartItems,
    cartTotal,
    isLoading,
    pendingLineUpdates,
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
    updateCartState,
  };
}