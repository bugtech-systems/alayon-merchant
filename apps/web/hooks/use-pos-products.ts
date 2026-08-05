// hooks/use-pos-products.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getProductPrice, listPriceListProducts } from "@/lib/data/products";
import { listCategories } from "@/lib/data/categories";
import { MedusaProduct } from "../types";

interface UsePosProductsProps {
  countryCode?: string;
  priceListId?: string;
  customerGroupId?: string;
  customerId?: string;
  regionId?: string;
  includeCategoryTree?: boolean;
  categoryId?: string;
  companyId?: string;
}

interface UsePosProductsReturn {
  categories: any[];
  products: MedusaProduct[];
  isLoading: boolean;
  isCategoriesLoading: boolean;
  isProductsLoading: boolean;
  productVariants: Record<string, string>;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshAll: () => Promise<void>;
  handleVariantChange: (productId: string, variantId: string) => void;
  getVariantPrice: (variant: any) => number;
  getProductsByCategory: (categoryId: string) => MedusaProduct[];
  getCategoryTree: () => any[];
}

export function usePosProducts({ 
  countryCode = "ph", 
  priceListId, 
  customerGroupId,
  customerId,
  includeCategoryTree = true,
  categoryId,
  companyId
}: UsePosProductsProps): UsePosProductsReturn {
  const { toast } = useToast();
  
  // State
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<MedusaProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [productVariants, setProductVariants] = useState<Record<string, string>>({});
  
  // Refs
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    
    try {
      const response = await listCategories({
        include_tree: includeCategoryTree,
        parent_category_id: categoryId,
        company_id: companyId
      });

      if (isMountedRef.current) {
        // Handle different response structures
        const categoriesData = response.categories || response || [];
         categoriesData.sort((a, b) => a.rank - b.rank);
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      if (isMountedRef.current) {
        toast({ 
          title: "Error", 
          description: "Failed to load categories", 
          variant: "destructive" 
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsCategoriesLoading(false);
      }
    }
  }, [includeCategoryTree, categoryId, toast]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsProductsLoading(true);
    
    try {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await listPriceListProducts({ 
        countryCode, 
        priceListId, 
        customerGroupId,
        customerId,
        categoryId,
        signal: abortControllerRef.current.signal,
      }) as any;

      if (isMountedRef.current) {
        const productsData = response.products || [];
        setProducts(productsData);
        
        // Initialize variant selection
        const initialVariants: Record<string, string> = {};
        productsData.forEach((product: MedusaProduct) => {
          if (product.variants?.[0]) {
            initialVariants[product.id] = product.variants[0].id;
          }
        });
        setProductVariants(initialVariants);
        
        // Log pricing summary
        const productsWithPrices = productsData.filter((p: any) => 
          p.variants?.some((v: any) => 
            v.has_price_list_price || 
            v.has_customer_group_price || 
            v.has_customer_price
          )
        );
        
        console.log(
          `Loaded ${productsData.length} products, ` +
          `${productsWithPrices.length} have special pricing`
        );
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('Product fetch aborted');
        return;
      }
      
      console.error("Error fetching products:", error);
      if (isMountedRef.current) {
        toast({ 
          title: "Error", 
          description: "Failed to load products", 
          variant: "destructive" 
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsProductsLoading(false);
      }
    }
  }, [priceListId, customerGroupId, customerId, countryCode, categoryId, toast]);

  // Fetch both products and categories
  const fetchAll = useCallback(async () => {
    // Reset states
    setProducts([]);
    setCategories([]);
    
    // Fetch in parallel
    await Promise.all([
      fetchProducts(),
      fetchCategories(),
    ]);
  }, [fetchProducts, fetchCategories]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refresh functions
  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  const refreshCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  const refreshAll = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // Get variant price
  const getVariantPrice = useCallback((variant: any) => {
    return getProductPrice(variant, { 
      priceListId, 
      customerGroupId, 
      customerId 
    });
  }, [priceListId, customerGroupId, customerId]);

  // Handle variant change
  const handleVariantChange = useCallback((productId: string, variantId: string) => {
    setProductVariants(prev => ({ ...prev, [productId]: variantId }));
  }, []);

  // Filter products by category
  const getProductsByCategory = useCallback((categoryId: string) => {
    return products.filter(product => 
      product.categories?.some(cat => cat.id === categoryId)
    );
  }, [products]);

  // Get category tree
  const getCategoryTree = useCallback(() => {
    if (!includeCategoryTree) return categories;
    
    // Build tree structure
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parent_category_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };
    
    return buildTree(categories, null);
  }, [categories, includeCategoryTree]);

  return {
    categories,
    products,
    isLoading: isProductsLoading || isCategoriesLoading,
    isCategoriesLoading,
    isProductsLoading,
    productVariants,
    refreshProducts,
    refreshCategories,
    refreshAll,
    handleVariantChange,
    getVariantPrice,
    getProductsByCategory,
    getCategoryTree,
  };
}