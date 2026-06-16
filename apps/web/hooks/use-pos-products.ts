// hooks/use-pos-products.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getProductPrice, listPriceListProducts } from "@/lib/data/products";
import { MedusaProduct } from "../types";

interface UsePosProductsProps {
  countryCode?: string;
  priceListId?: string;
  customerGroupId?: string;
  customerId?: string;
  regionId?: string;
}

export function usePosProducts({ 
  countryCode = "ph", 
  priceListId, 
  customerGroupId,
  customerId,
  regionId
}: UsePosProductsProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<MedusaProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productVariants, setProductVariants] = useState<Record<string, string>>({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listPriceListProducts({ 
        countryCode, 
        priceListId, 
        customerGroupId,
        customerId 
      }) as any;
      

      if (isMountedRef.current) {
        setProducts(response.products || []);
        
        const initialVariants: Record<string, string> = {};
        (response.products || []).forEach((product: MedusaProduct) => {
          if (product.variants?.[0]) {
            initialVariants[product.id] = product.variants[0].id;
          }
        });
        setProductVariants(initialVariants);
        
        // Log pricing summary
        const productsWithPrices = response.products?.filter((p: any) => 
          p.variants?.some((v: any) => v.has_price_list_price || v.has_customer_group_price || v.has_customer_price)
        );
        console.log(`Loaded ${response.products?.length || 0} products, ${productsWithPrices?.length || 0} have special pricing`);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      if (isMountedRef.current) {
        toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [priceListId, customerGroupId, customerId, countryCode, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const getVariantPrice = useCallback((variant: any) => {
    return getProductPrice(variant, { priceListId, customerGroupId, customerId });
  }, [priceListId, customerGroupId, customerId]);

  const handleVariantChange = useCallback((productId: string, variantId: string) => {
    setProductVariants(prev => ({ ...prev, [productId]: variantId }));
  }, []);

  return {
    categories,
    products,
    isLoading,
    productVariants,
    refreshProducts: fetchProducts,
    handleVariantChange,
    getVariantPrice,
  };
}