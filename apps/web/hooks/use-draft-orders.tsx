// hooks/use-draft-orders.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch, adminClient } from "@/lib/apiClient";
import { DraftOrder, Region, ProductVariant, Customer } from "@/types";

// Fetch all draft orders
export const useDraftOrders = () => {
  return useQuery({
    queryKey: ["draft-orders"],
    queryFn: async () => {
      const data = await adminFetch("/admin/draft-orders");
      return data.draft_orders as DraftOrder[];
    },
  });
};

// Fetch single draft order
export const useDraftOrder = (id: string) => {
  return useQuery({
    queryKey: ["draft-orders", id],
    queryFn: async () => {
      const data = await adminFetch(`/admin/draft-orders/${id}`);
      return data.draft_order as DraftOrder;
    },
    enabled: !!id,
  });
};

// Create draft order
export const useCreateDraftOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (draftOrderData: Partial<DraftOrder>) => {
      const response = await adminClient.admin.draftOrders.create(draftOrderData);
      return response.draft_order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
    },
  });
};

// Update draft order
export const useUpdateDraftOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DraftOrder> & { id: string }) => {
      const response = await adminClient.admin.draftOrders.update(id, data);
      return response.draft_order;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
      queryClient.invalidateQueries({ queryKey: ["draft-orders", variables.id] });
    },
  });
};

// Convert draft order to order
export const useConvertDraftOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (draftOrderId: string) => {
      const response = await adminFetch(`/admin/draft-orders/${draftOrderId}/confirm`, {
        method: "POST",
      });
      return response.order;
    },
    onSuccess: (_, draftOrderId) => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
      queryClient.invalidateQueries({ queryKey: ["draft-orders", draftOrderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

// Delete draft order
export const useDeleteDraftOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (draftOrderId: string) => {
      await adminClient.admin.draftOrders.delete(draftOrderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
    },
  });
};

// Add line item to draft order
export const useAddLineItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ draftOrderId, item }: { draftOrderId: string; item: any }) => {
      const response = await adminClient.admin.draftOrders.addLineItem(draftOrderId, item);
      return response.draft_order;
    },
    onSuccess: (_, { draftOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders", draftOrderId] });
    },
  });
};

// Remove line item from draft order
export const useRemoveLineItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ draftOrderId, lineItemId }: { draftOrderId: string; lineItemId: string }) => {
      const response = await adminClient.admin.draftOrders.removeLineItem(draftOrderId, lineItemId);
      return response.draft_order;
    },
    onSuccess: (_, { draftOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders", draftOrderId] });
    },
  });
};

// Update line item quantity
export const useUpdateLineItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ draftOrderId, lineItemId, quantity }: { draftOrderId: string; lineItemId: string; quantity: number }) => {
      const response = await adminClient.admin.draftOrders.updateLineItem(draftOrderId, lineItemId, { quantity });
      return response.draft_order;
    },
    onSuccess: (_, { draftOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders", draftOrderId] });
    },
  });
};

// Customer search (using storefront client for public access)
export const useSearchCustomers = (searchTerm: string) => {
  return useQuery({
    queryKey: ["customers", "search", searchTerm],
    queryFn: async () => {
      const { customers } = await adminFetch(`/admin/customers?q=${searchTerm}`);
      return customers as Customer[];
    },
    enabled: searchTerm.length > 2,
  });
};

// Product variants search (using storefront client)
export const useSearchProducts = (searchTerm: string) => {
  return useQuery({
    queryKey: ["products", "search", searchTerm],
    queryFn: async () => {
      const { products } = await storefrontClient.store.product.list({
        q: searchTerm,
        limit: 20,
      });
      // Flatten variants from products
      const variants: ProductVariant[] = [];
      products.forEach((product: any) => {
        product.variants.forEach((variant: any) => {
          variants.push({
            ...variant,
            product: {
              id: product.id,
              title: product.title,
              thumbnail: product.thumbnail,
            },
          });
        });
      });
      return variants;
    },
    enabled: searchTerm.length > 2,
  });
};

// Fetch regions (for storefront - public)
export const useRegions = () => {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { regions } = await storefrontClient.store.region.list();
      return regions as Region[];
    },
  });
};

// Fetch shipping options for a region
export const useShippingOptions = (regionId: string) => {
  return useQuery({
    queryKey: ["shipping-options", regionId],
    queryFn: async () => {
      const { shipping_options } = await storefrontClient.store.shippingOption.list({
        region_id: regionId,
      });
      return shipping_options;
    },
    enabled: !!regionId,
  });
};