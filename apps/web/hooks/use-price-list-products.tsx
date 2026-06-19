// hooks/use-price-list-products-enhanced.ts
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/apiClient";
import { listPriceListProducts } from "@/lib/data/products";
import { retrieveUser } from "@/lib/data";

export interface PriceListProductFilters {
  search?: string;
  status?: string[];
  collection_id?: string[];
  category_id?: string[];
  type?: string[];
  tags?: string[];
  limit?: number;
  offset?: number;
  order?: string;
}

interface UsePriceListProductsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  filters?: PriceListProductFilters;
  enabled?: boolean;
  user?: any;
}

export const usePriceListProducts = (
  priceListId: string | undefined,
  options: UsePriceListProductsOptions = {}
) => {
  const { limit = 1000, offset = 0, search = "", filters = {}, enabled = true } = options;
  const buildQueryParams = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      fields: "id,title,thumbnail,status,handle,*variants,*variants.prices,*images,*categories,*collection",
    });

    // Add price list ID filter
    // if (priceListId) {
    //   params.append("price_list_id[]", priceListId);
    // }

    // Add search query
    if (search) {
      params.append("q", search);
    }

    // Add status filters
    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(status => params.append("status[]", status));
    }

    // Add collection filters
    if (filters.collection_id && filters.collection_id.length > 0) {
      filters.collection_id.forEach(id => params.append("collection_id[]", id));
    }

    // Add category filters
    if (filters.category_id && filters.category_id.length > 0) {
      filters.category_id.forEach(id => params.append("category_id[]", id));
    }

    // Add type filters
    if (filters.type && filters.type.length > 0) {
      filters.type.forEach(type => params.append("type[]", type));
    }

    // Add tag filters
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append("tags[]", tag));
    }

    // Add sorting
    if (filters.order) {
      params.append("order", filters.order);
    }

    return params;
  };

  return useQuery({
    queryKey: ["price-list-products", priceListId],
    queryFn: async () => {
        console.log(options, 'OPTTTS')
     

      if (!priceListId) {
        return { products: [], count: 0, hasMore: false };
      }

      try {
        const response = await listPriceListProducts({priceListId, countryCode: 'php'})
        
        const products = response.products || [];
        const count = response.count || products.length;

        // Enhance products with price list specific data
        // const enhancedProducts = products.map((product: any) => ({
        //   ...product,
        //   // Get variants with their prices
        //   variants: product.variants?.map((variant: any) => ({
        //     ...variant,
        //     // Mark which prices come from this price list
        //     price_list_prices: variant.prices?.filter((price: any) => 
        //       price.price_list_id === priceListId
        //     ) || [],
        //     // Get the specific price for this price list
        //     price_list_price: variant.prices?.find((price: any) => 
        //       price.price_list_id === priceListId
        //     ),
        //   })),
        //   // Calculate if product has any prices in this price list
        //   has_price_list_prices: product.variants?.some((variant: any) =>
        //     variant.prices?.some((price: any) => price.price_list_id === priceListId)
        //   ) || false,
        // }));
          console.log(products, 'PRODDS')
        return { 
          products: products, 
          original_products: products,
          count,
          hasMore: offset + limit < count 
        };
      } catch (error) {
        console.error("Error fetching price list products:", error);
        throw new Error("Failed to fetch products for price list");
      }
    },
    enabled: enabled && !!priceListId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for infinite scrolling (load more)
export const useInfinitePriceListProducts = (
  priceListId: string | undefined,
  options: Omit<UsePriceListProductsOptions, "offset"> = {}
) => {
  const { limit = 10, search = "", filters = {}, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ["price-list-products-infinite", priceListId, { limit, search, filters }],
    queryFn: async ({ pageParam = 0 }) => {
      if (!priceListId) {
        return { products: [], count: 0, nextOffset: null };
      }

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: pageParam.toString(),
        fields: "id,title,thumbnail,status,handle,*variants,*variants.prices,*images,*categories",
      });

      // Add price list ID filter
      params.append("price_list_id[]", priceListId);

      // Add search query
      if (search) {
        params.append("q", search);
      }

      // Add other filters
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(status => params.append("status[]", status));
      }

      try {
        const response = await adminFetch(`/admin/products?${params.toString()}`);
        
        const products = response.products || [];
        const count = response.count || products.length;

        const enhancedProducts = products.map((product: any) => ({
          ...product,
          variants: product.variants?.map((variant: any) => ({
            ...variant,
            price_list_prices: variant.prices?.filter((price: any) => 
              price.price_list_id === priceListId
            ) || [],
            price_list_price: variant.prices?.find((price: any) => 
              price.price_list_id === priceListId
            ),
          })),
        }));

        const nextOffset = pageParam + limit;
        const hasMore = nextOffset < count;

        return {
          products: enhancedProducts,
          count,
          nextOffset: hasMore ? nextOffset : null,
        };
      } catch (error) {
        console.error("Error fetching price list products:", error);
        throw new Error("Failed to fetch products");
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: enabled && !!priceListId,
    staleTime: 2 * 60 * 1000,
  });
};

// Hook to get a single product with price list
export const useProductWithPriceList = (
  productId: string,
  priceListId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["product", productId, "price-list", priceListId],
    queryFn: async () => {
      if (!productId || !priceListId) {
        throw new Error("Product ID and Price List ID are required");
      }

      const params = new URLSearchParams({
        limit: "1",
        fields: "id,title,thumbnail,status,handle,description,*variants,*variants.prices,*variants.options,*variants.inventory_quantity,*images,*categories,*collection,*tags,*options",
      });
      
      params.append("price_list_id[]", priceListId);

      try {
        const response = await adminFetch(`/admin/products?${params.toString()}`);
        
        const products = response.products || [];
        
        if (products.length === 0) {
          throw new Error(`Product ${productId} not found`);
        }

        const product = products[0];

        // Enhance product with price list specific data
        return {
          ...product,
          variants: product.variants?.map((variant: any) => ({
            ...variant,
            price_list_prices: variant.prices?.filter((price: any) => 
              price.price_list_id === priceListId
            ) || [],
            price_list_price: variant.prices?.find((price: any) => 
              price.price_list_id === priceListId
            ),
          })),
        };
      } catch (error) {
        console.error("Error fetching product with price list:", error);
        throw new Error("Failed to fetch product details");
      }
    },
    enabled: options?.enabled !== false && !!productId && !!priceListId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};