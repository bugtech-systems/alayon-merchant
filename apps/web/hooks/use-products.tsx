// hooks/use-products.ts
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getMedusaServerClient } from "@/lib/config";
import { toast } from "sonner";
import { useEffect, useState } from "react";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface ProductsResponse {
  products: any[];
  count: number;
  limit: number;
  offset: number;
}

export interface VariantPrice {
  id?: string;
  variant_id: string;
  amount: number;
  currency_code: string;
  price_list_id?: string;
  min_quantity?: number;
  max_quantity?: number;
}

export interface BatchPriceUpdatePayload {
  create?: VariantPrice[];
  update?: VariantPrice[];
  delete?: string[];
}

interface UseProductsParams {
  search?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
  fields?: string; // V2 uses fields, not expand
}

// ============================================================================
// Error Handler Utility
// ============================================================================

const handleApiError = (error: any, context: string): ApiError => {
  console.error(`Error in ${context}:`, error);
  
  // Handle Medusa V2 specific errors
  if (error.response?.data) {
    const medusaError = error.response.data;
    return {
      message: medusaError.message || `Failed to ${context.toLowerCase()}`,
      code: medusaError.code || medusaError.type,
      status: error.response.status,
      details: medusaError.details || medusaError.errors,
    };
  }
  
  // Handle Medusa V2 module errors
  if (error.message?.includes("MedusaError")) {
    try {
      const parsed = JSON.parse(error.message);
      return {
        message: parsed.message || "Medusa error occurred",
        code: parsed.code,
        details: parsed.details,
      };
    } catch (e) {
      // Continue with default handling
    }
  }
  
  // Handle network errors
  if (error.message === "Failed to fetch" || error.code === "ECONNREFUSED") {
    return {
      message: "Unable to connect to the server. Please check your connection.",
      code: "NETWORK_ERROR",
    };
  }
  
  // Handle timeout errors
  if (error.name === "TimeoutError" || error.message?.includes("timeout")) {
    return {
      message: "Request timed out. Please try again.",
      code: "TIMEOUT_ERROR",
    };
  }
  
  // Default error
  return {
    message: error.message || `An unexpected error occurred in ${context}`,
    code: error.code || "UNKNOWN_ERROR",
    status: error.status,
  };
};


// ============================================================================
// Types
// ============================================================================

interface PriceListPrice {
  id: string;
  amount: number;
  currency_code: string;
  variant_id: string;
  min_quantity?: number;
  max_quantity?: number;
  variant?: any;
}

interface PriceList {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  starts_at?: string;
  ends_at?: string;
  prices: PriceListPrice[];
}

interface PriceListProduct {
  product: any;
  priceListPrices: PriceListPrice[]; // prices from this price list for the product's variants
}

interface UsePriceListProductsResult {
  products: PriceListProduct[];
  count: number;
  priceList: PriceList | null;
  isLoading: boolean;
  error: any;
}

// ============================================================================
// Hook: usePriceListProducts
// ============================================================================

/**
 * Fetch all products that have at least one variant price belonging to a specific price list.
 * Returns deduplicated products with their price list prices attached.
 *
 * @param priceListId - The ID of the price list
 * @param options - Pagination and filtering options
 * @returns Products with their price list prices
 */
/**
 * Fetch all products that have at least one price in the given price list.
 * Uses Medusa's native `price_list_id` filter on the admin product endpoint.
 */
export const usePriceListProducts = (
  priceListId: string | undefined,
  options: any = {}
) => {
  const { limit = 10, offset = 0, search = "", enabled = true } = options;

  return useQuery({
    queryKey: ["price-list-products", priceListId, { limit, offset, search }],
    queryFn: async (): Promise<any> => {
      if (!priceListId) {
        return { products: [], count: 0 };
      }

      const client = getMedusaServerClient();
      if (!client) throw new Error("Medusa client not initialized");

      // Build query parameters – the SDK will transform price_list_id array to URL format
      const params: any = {
        limit,
        offset,
        // Select only the fields you need
        fields: "id,title,thumbnail,status,handle,*variants,*variants.prices,*images,*categories",
        // 🔑 The magic filter: only products that have a price in this price list
        price_list_id: [priceListId],
      };

      if (search) {
        params.q = search; // full‑text search on title, description, etc.
      }

      const response = await client.admin.product.list(params);
      const products = response.products || response.data || [];
      const count = response.count || products.length;

      // Each product already contains its `variants.prices`, including the prices from this price list.
      // We keep the structure consistent with the earlier approach.
      const mapped: PriceListProduct[] = products.map((product: any) => ({
        product,
        priceListPrices: product.variants?.flatMap((v: any) => v.prices || []) || [],
      }));

      return { products: mapped, count };
    },
    enabled: enabled && !!priceListId && !!getMedusaServerClient(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// hooks/use-products.ts (add this)
export const useProductWithPriceList = (
  productId: string,
  priceListId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["product", productId, "price-list", priceListId],
    queryFn: async () => {
      if (!productId || !priceListId) throw new Error("Product ID and Price List ID required");

      const client = getMedusaServerClient();
      const response = await client.admin.product.list({
        id: [productId],
        price_list_id: [priceListId],
        limit: 1,
        fields: "title,thumbnail,*variants,*variants.prices",
      });

      const products = response.products || response.data || [];
      if (products.length === 0) throw new Error("Product not found");
      return products[0];
    },
    enabled: options?.enabled !== false && !!productId && !!priceListId,
  });
};

// ============================================================================
// Products List Hook (V2 using fields)
// ============================================================================

export const useProducts = ({ 
  search, 
  limit = 10, 
  offset = 0,
  enabled = true,
  fields = "id,title,subtitle,description,status,thumbnail,*variants,*variants.prices,*images,*categories"
}: UseProductsParams) => {
  return useQuery({
    queryKey: ["products", { search, limit, offset, fields }],
    queryFn: async (): Promise<ProductsResponse> => {
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        const response = await client.admin.product.list({
          q: search,
          limit,
          offset,
          fields, // V2 uses fields
        });
        
        const products = response.products || [];
        const count = response.count || 0;
        
        return {
          products,
          count,
          limit: response.limit || limit,
          offset: response.offset || offset,
        };
      } catch (error) {
        const apiError = handleApiError(error, "fetching products");
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: enabled && !!getMedusaServerClient(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Single Product Hook (V2)
// ============================================================================

export const useProduct = (id: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) throw new Error("Product ID is required");
      
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        // Fields to include all necessary relations
        const fields = "id,title,subtitle,description,status,thumbnail,handle,*variants,*variants.prices,*images,*categories,*options,*options.values,*tags,*collection,*type,*sales_channels";
        
        const response = await client.admin.product.retrieve(id, { fields });
        const product = response.product || response;
        console.log(response, 'RESPPONSE')
        if (!product) throw new Error(`Product with ID ${id} not found`);
        return product;
      } catch (error) {
        const apiError = handleApiError(error, `fetching product ${id}`);
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: !!id && enabled !== false && !!getMedusaServerClient(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ============================================================================
// Products by Collection Hook (V2)
// ============================================================================

export const useProductsByCollection = (
  collectionId: string,
  options?: Omit<UseProductsParams, 'search'>
) => {
  return useQuery({
    queryKey: ["products", "collection", collectionId, options],
    queryFn: async () => {
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        const response = await client.admin.product.list({
          collection_id: [collectionId],
          limit: options?.limit || 10,
          offset: options?.offset || 0,
          fields: options?.fields || "id,title,status,*variants,*variants.prices,*images",
        });
        
        return {
          products: response.products || [],
          count: response.count || 0,
        };
      } catch (error) {
        const apiError = handleApiError(error, "fetching products by collection");
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: !!collectionId && !!getMedusaServerClient(),
  });
};

// ============================================================================
// Products by Category Hook (V2)
// ============================================================================

export const useProductsByCategory = (
  categoryId: string,
  options?: Omit<UseProductsParams, 'search'>
) => {
  return useQuery({
    queryKey: ["products", "category", categoryId, options],
    queryFn: async () => {
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        const response = await client.admin.product.list({
          category_id: [categoryId],
          limit: options?.limit || 10,
          offset: options?.offset || 0,
          fields: options?.fields || "id,title,status,*variants,*variants.prices,*images",
        });
        
        return {
          products: response.products || [],
          count: response.count || 0,
        };
      } catch (error) {
        const apiError = handleApiError(error, "fetching products by category");
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: !!categoryId && !!getMedusaServerClient(),
  });
};

// ============================================================================
// Price Lists Hook (V2)
// ============================================================================

export const usePriceLists = (options?: { enabled?: boolean; limit?: number }) => {
  return useQuery({
    queryKey: ["price-lists", options?.limit],
    queryFn: async () => {
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        const response = await client.admin.priceList.list({
          limit: options?.limit || 100,
          fields: "id,name,description,type,status,starts_at,ends_at,*prices",
        });
        
        const priceLists = response.price_lists || response.data || [];
        if (!priceLists) throw new Error("No price lists received");
        
        return priceLists;
      } catch (error) {
        const apiError = handleApiError(error, "fetching price lists");
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: options?.enabled !== false && !!getMedusaServerClient(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// ============================================================================
// Single Price List Hook (V2)
// ============================================================================

export const usePriceList = (id: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ["price-list", id],
    queryFn: async () => {
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        const response = await client.admin.priceList.retrieve(id, {
          fields: "id,name,description,type,status,starts_at,ends_at,*prices,*prices.variant,*prices.variant.product",
        });
        
        return response.price_list || response;
      } catch (error) {
        const apiError = handleApiError(error, `fetching price list ${id}`);
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: !!id && enabled !== false && !!getMedusaServerClient(),
  });
};

// ============================================================================
// Update Variant Price List Price (V2)
// ============================================================================

// hooks/use-products.ts
export const useUpdateVariantPriceListPrice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ priceListId, variantId, price, currencyCode }: any) => {
      const client = getMedusaServerClient();
      await client.admin.priceList.batchPrices(priceListId, {
        create: [{ variant_id: variantId, amount: price, currency_code: currencyCode }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["price-list-products"] });
    },
  });
};

// ============================================================================
// Batch Update Variant Prices (V2)
// ============================================================================

export const useBatchUpdateVariantPrices = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      priceListId,
      updates,
      currencyCode = "usd",
    }: {
      priceListId: string;
      updates: Array<{ variantId: string; price: number; minQuantity?: number; maxQuantity?: number }>;
      currencyCode?: string;
    }) => {
      if (!priceListId) throw new Error("Price list ID is required");
      if (!updates.length) throw new Error("No updates provided");
      
      const client = getMedusaServerClient();
      if (!client) throw new Error("Medusa client not initialized");
      
      const create: VariantPrice[] = [];
      const update: VariantPrice[] = [];
      const errors: Array<{ variantId: string; error: ApiError }> = [];
      
      for (const updateData of updates) {
        try {
          const variantResponse = await client.admin.productVariant.list({
            id: [updateData.variantId],
            fields: "id,*prices",
          });
          const variant = (variantResponse.variants || [])[0];
          if (!variant) throw new Error(`Variant ${updateData.variantId} not found`);
          
          const existingPrice = variant.prices?.find(
            (p: any) => p.price_list_id === priceListId && p.currency_code === currencyCode
          );
          
          const amount = Math.round(updateData.price * 100);
          
          if (existingPrice) {
            update.push({
              id: existingPrice.id,
              variant_id: updateData.variantId,
              amount,
              currency_code: currencyCode,
              ...(updateData.minQuantity && { min_quantity: updateData.minQuantity }),
              ...(updateData.maxQuantity && { max_quantity: updateData.maxQuantity }),
            });
          } else {
            create.push({
              variant_id: updateData.variantId,
              amount,
              currency_code: currencyCode,
              ...(updateData.minQuantity && { min_quantity: updateData.minQuantity }),
              ...(updateData.maxQuantity && { max_quantity: updateData.maxQuantity }),
            });
          }
        } catch (error) {
          errors.push({ variantId: updateData.variantId, error: handleApiError(error, "batch update") });
        }
      }
      
      if (create.length || update.length) {
        await client.admin.priceList.batchPrices(priceListId, {
          ...(create.length && { create }),
          ...(update.length && { update }),
        });
      }
      
      return {
        results: [
          ...create.map(c => ({ variantId: c.variant_id, status: "created" })),
          ...update.map(u => ({ variantId: u.variant_id, status: "updated" }))
        ],
        errors,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["price-lists"] });
      
      const successCount = data.results.length;
      const errorCount = data.errors.length;
      if (errorCount === 0) toast.success(`Successfully updated ${successCount} variant(s)`);
      else toast.warning(`Updated ${successCount} variant(s), ${errorCount} failed`);
    },
    onError: (error: ApiError) => {
      toast.error(`Batch update failed: ${error.message}`);
    },
  });
};

// ============================================================================
// Delete Price List Price (V2)
// ============================================================================

export const useDeletePriceListPrice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ priceListId, priceId }: { priceListId: string; priceId: string }) => {
      if (!priceListId || !priceId) throw new Error("Missing required IDs");
      const client = getMedusaServerClient();
      if (!client) throw new Error("Medusa client not initialized");
      
      await client.admin.priceList.batchPrices(priceListId, { delete: [priceId] });
      return { priceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["price-lists"] });
      toast.success("Price removed successfully");
    },
    onError: (error: ApiError) => {
      toast.error(`Failed to remove price: ${error.message}`);
    },
  });
};

// ============================================================================
// Admin Client Status Hook
// ============================================================================

export const useAdminClientStatus = () => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  
  useEffect(() => {
    const checkClient = async () => {
      setIsLoading(true);
      try {
        const client = getMedusaServerClient();
        if (client) {
          await client.admin.product.list({ limit: 1 });
          setIsReady(true);
          setError(null);
        } else {
          setError({ message: "Client not initialized", code: "CLIENT_ERROR" });
          setIsReady(false);
        }
      } catch (err) {
        setError(handleApiError(err, "checking admin client"));
        setIsReady(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkClient();
  }, []);
  
  return { isReady, isLoading, error };
};

// ============================================================================
// Product Options Hook (V2)
// ============================================================================

export const useProductOptions = (productId: string) => {
  return useQuery({
    queryKey: ["product-options", productId],
    queryFn: async () => {
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        const response = await client.admin.product.listOptions(productId, {
          fields: "id,title,*values",
        });
        
        return response.product_options || [];
      } catch (error) {
        const apiError = handleApiError(error, "fetching product options");
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: !!productId && !!getMedusaServerClient(),
  });
};

// ============================================================================
// Product Sales Channels Hook (V2)
// ============================================================================

export const useProductSalesChannels = (productId: string) => {
  return useQuery({
    queryKey: ["product-sales-channels", productId],
    queryFn: async () => {
      try {
        const client = getMedusaServerClient();
        if (!client) throw new Error("Medusa client not initialized");
        
        // Retrieve product with sales_channels included via fields
        const response = await client.admin.product.retrieve(productId, {
          fields: "sales_channels.id,sales_channels.name,sales_channels.description",
        });
        const product = response.product || response;
        return product.sales_channels || [];
      } catch (error) {
        const apiError = handleApiError(error, "fetching product sales channels");
        toast.error(apiError.message);
        throw apiError;
      }
    },
    enabled: !!productId && !!getMedusaServerClient(),
  });
};