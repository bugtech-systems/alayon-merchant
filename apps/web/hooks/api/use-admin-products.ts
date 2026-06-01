// hooks/api/use-admin-products.ts
import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/config";

interface UseAdminProductsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  collection_id?: string;
  category_id?: string;
}

export const useAdminProducts = (options?: UseAdminProductsOptions) => {
  const { limit = 50, offset = 0, search, collection_id, category_id } = options || {};
  
  return useQuery({
    queryKey: ["admin_products", { limit, offset, search, collection_id, category_id }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(search && { q: search }),
        ...(collection_id && { collection_id }),
        ...(category_id && { category_id }),
      });
      
      const response = await sdk.client.fetch<{ products: any[] }>(
        `/store/products?${params.toString()}`
      );
      return response.products;
    },
  });
};

// hooks/api/use-admin-product-variants.ts
export const useAdminProductVariants = (productId: string) => {
  return useQuery({
    queryKey: ["admin_product_variants", productId],
    queryFn: async () => {
      const response = await sdk.client.fetch<{ variants: any[] }>(
        `/store/products/${productId}/variants`
      );
      return response.variants;
    },
    enabled: !!productId,
  });
};

// hooks/api/use-admin-collections.ts
export const useAdminCollections = (options?: { limit?: number }) => {
  const { limit = 100 } = options || {};
  
  return useQuery({
    queryKey: ["admin_collections", { limit }],
    queryFn: async () => {
      const response = await sdk.client.fetch<{ collections: any[] }>(
        `/store/collections?limit=${limit}`
      );
      return response.collections;
    },
  });
};

// hooks/api/use-admin-categories.ts
export const useAdminCategories = (options?: { limit?: number }) => {
  const { limit = 100 } = options || {};
  
  return useQuery({
    queryKey: ["admin_categories", { limit }],
    queryFn: async () => {
      const response = await sdk.client.fetch<{ product_categories: any[] }>(
        `/store/product-categories?limit=${limit}`
      );
      return response.product_categories;
    },
  });
};