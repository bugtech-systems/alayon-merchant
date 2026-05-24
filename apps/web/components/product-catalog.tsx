// components/product-catalog.tsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  Filter, 
  X, 
  ShoppingBag,
  Grid3x3,
  List,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/medusa/client";

// Types
interface Category {
  id: string;
  name: string;
  handle: string;
}

interface PriceRange {
  min: number;
  max: number;
}

// Sort options
const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

// Categories (these should ideally come from your Medusa API)
const categories: Category[] = [
  { id: "1", name: "Fresh Produce", handle: "fresh-produce" },
  { id: "2", name: "Dairy & Eggs", handle: "dairy-eggs" },
  { id: "3", name: "Meat & Seafood", handle: "meat-seafood" },
  { id: "4", name: "Pantry Staples", handle: "pantry" },
  { id: "5", name: "Beverages", handle: "beverages" },
  { id: "6", name: "Snacks", handle: "snacks" },
  { id: "7", name: "Frozen Foods", handle: "frozen" },
  { id: "8", name: "Household", handle: "household" },
];

// Helper to safely parse URL params
const safeParseInt = (value: string | null, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

export function ProductCatalog({regionId}: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // State
  const [products, setProducts] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states - initialized from URL on mount only
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange | any>({ min: 0, max: 5000 });
  const [sortBy, setSortBy] = useState("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 12;
  
  // Refs to prevent infinite loops
  const isUpdatingFromURL = useRef(false);
  const initialLoadDone = useRef(false);
  const fetchAbortController = useRef<AbortController | null>(null);

  // Initialize filters from URL (runs once on mount)
  useEffect(() => {
    if (initialLoadDone.current) return;
    
    const categoriesParam = searchParams.get("categories");
    if (categoriesParam) {
      setSelectedCategories(categoriesParam.split(","));
    }
    
    const sortParam = searchParams.get("sort");
    if (sortParam && sortOptions.some(opt => opt.value === sortParam)) {
      setSortBy(sortParam);
    }
    
    const inStockParam = searchParams.get("inStock");
    if (inStockParam === "true") setInStockOnly(true);
    
    const onSaleParam = searchParams.get("onSale");
    if (onSaleParam === "true") setOnSaleOnly(true);
    
    const minPrice = safeParseInt(searchParams.get("minPrice"), 0);
    const maxPrice = safeParseInt(searchParams.get("maxPrice"), 5000);
    setPriceRange({ min: minPrice, max: maxPrice });
    
    const page = safeParseInt(searchParams.get("page"), 1);
    setCurrentPage(page);
    
    initialLoadDone.current = true;
  }, [searchParams]);

  // Update URL when filters change (debounced)
  useEffect(() => {
    if (!initialLoadDone.current || isUpdatingFromURL.current) return;
    
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      
      if (currentPage > 1) params.set("page", currentPage.toString());
      if (sortBy !== "newest") params.set("sort", sortBy);
      if (selectedCategories.length > 0) params.set("categories", selectedCategories.join(","));
      if (inStockOnly) params.set("inStock", "true");
      if (onSaleOnly) params.set("onSale", "true");
      if (priceRange.min > 0) params.set("minPrice", priceRange.min.toString());
      if (priceRange.max < 5000) params.set("maxPrice", priceRange.max.toString());
      
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      
      router.replace(url, { scroll: false });
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [currentPage, sortBy, selectedCategories, inStockOnly, onSaleOnly, priceRange, router, pathname]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    // Cancel previous request
    if (fetchAbortController.current) {
      fetchAbortController.current.abort();
    }
    
    fetchAbortController.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    const offset = (currentPage - 1) * limit;
    const params: any = {
      limit,
      offset,
      fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.allow_backorder",
    };

    // Add sorting
    switch (sortBy) {
      case "price-asc":
        params.order = "variants.calculated_price.calculated_amount ASC";
        break;
      case "price-desc":
        params.order = "variants.calculated_price.calculated_amount DESC";
        break;
      case "name-asc":
        params.order = "title ASC";
        break;
      case "name-desc":
        params.order = "title DESC";
        break;
      case "newest":
        params.order = "created_at DESC";
        break;
      default:
        params.order = "created_at DESC";
    }

    // Add category filter if we have category IDs from Medusa
    if (selectedCategories.length > 0) {
      params.category_id = selectedCategories;
    }


    try {
      const { products: fetchedProducts, count } = await getProducts(params);
      
      // Process products - only use data from Medusa, no mock badges
      const processedProducts = fetchedProducts.map((product: any) => {
        // Calculate if product has any variant on sale
        const hasSaleVariant = product.variants?.some((variant: any) => 
          variant.calculated_price?.calculated_amount < variant.calculated_price?.original_amount
        );
        
        // Calculate if product is in stock
        const isInStock = product.variants?.some((variant: any) => 
          (variant.inventory_quantity && variant.inventory_quantity > 0) || 
          variant.allow_backorder || 
          !variant.manage_inventory
        );
        
        return {
          ...product,
          hasSale: hasSaleVariant,
          inStock: isInStock,
        };
      });
      
      // Apply client-side filters
      let filtered = [...processedProducts];
      
      if (inStockOnly) {
        filtered = filtered.filter((product: any) => product.inStock);
      }
      
      if (onSaleOnly) {
        filtered = filtered.filter((product: any) => product.hasSale);
      }
      
      if (priceRange.min > 0 || priceRange.max < 5000) {
        filtered = filtered.filter((product: any) => {
          // Get lowest variant price
          let lowestPrice = Infinity;
          product.variants?.forEach((variant: any) => {
            const price = variant.calculated_price?.calculated_amount || 0;
            if (price < lowestPrice) lowestPrice = price;
          });
          return lowestPrice >= priceRange.min && lowestPrice <= priceRange.max;
        });
      }
      
      setProducts(filtered);
      setTotalCount(filtered.length);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error fetching products:", err);
        setError("Failed to load products. Please try again.");
        setProducts([]);
        setTotalCount(0);
      }
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, limit, sortBy, selectedCategories, inStockOnly, onSaleOnly, priceRange]);

  // Fetch products when dependencies change
  useEffect(() => {
    if (!initialLoadDone.current) return;
    fetchProducts();
    
    return () => {
      if (fetchAbortController.current) {
        fetchAbortController.current.abort();
      }
    };
  }, [fetchProducts]);

  // Reset page when filters change
  useEffect(() => {
    if (!initialLoadDone.current || isUpdatingFromURL.current) return;
    setCurrentPage(1);
  }, [sortBy, selectedCategories, inStockOnly, onSaleOnly, priceRange.min, priceRange.max]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 5000 });
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSortBy("newest");
    setCurrentPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (inStockOnly) count++;
    if (onSaleOnly) count++;
    if (priceRange.min > 0 || priceRange.max < 5000) count++;
    return count;
  }, [selectedCategories.length, inStockOnly, onSaleOnly, priceRange.min, priceRange.max]);

  // Filter Sidebar Component
  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedCategories([...selectedCategories, category.id]);
                  } else {
                    setSelectedCategories(selectedCategories.filter((c) => c !== category.id));
                  }
                }}
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                {category.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Price Range (₱)</h3>
        <div className="space-y-4">
          <Slider
            value={[priceRange.min, priceRange.max]}
            min={0}
            max={5000}
            step={50}
            onValueChange={(value) => setPriceRange({ min: value[0] as any, max: value[1]  as any})}
            className="w-full"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-1">
              <span className="text-sm text-gray-500">₱</span>
              <input
                type="number"
                value={priceRange.min}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setPriceRange({ ...priceRange, min: Math.min(val, priceRange.max) });
                }}
                className="w-full px-2 py-1 text-sm border rounded-md"
                min={0}
                max={priceRange.max}
              />
            </div>
            <span className="text-gray-400">to</span>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-sm text-gray-500">₱</span>
              <input
                type="number"
                value={priceRange.max}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 5000;
                  setPriceRange({ ...priceRange, max: Math.max(val, priceRange.min) });
                }}
                className="w-full px-2 py-1 text-sm border rounded-md"
                min={priceRange.min}
                max={5000}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Availability</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={inStockOnly} 
              onCheckedChange={(checked) => setInStockOnly(checked === true)} 
            />
            <span className="text-sm text-gray-600">In Stock Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={onSaleOnly} 
              onCheckedChange={(checked) => setOnSaleOnly(checked === true)} 
            />
            <span className="text-sm text-gray-600">On Sale</span>
          </label>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="pt-4 border-t">
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all filters ({activeFilterCount})
          </button>
        </div>
      )}
    </div>
  );

  // Loading skeleton
  if (isInitialLoad && isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="hidden lg:block w-64 shrink-0">
          <div className="space-y-6">
            <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-10 w-40 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg" />
                <div className="h-4 bg-gray-200 rounded mt-2 w-3/4" />
                <div className="h-4 bg-gray-200 rounded mt-1 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24">
          <FilterSidebar />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 pb-20">
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>

            {/* Results count */}
            <div className="text-sm text-gray-500">
              Showing {products.length} of {totalCount} products
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "grid" ? "bg-primary text-white" : "hover:bg-gray-100"
                )}
                aria-label="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "list" ? "bg-primary text-white" : "hover:bg-gray-100"
                )}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategories.map((catId) => {
              const category = categories.find((c) => c.id === catId);
              return (
                <span key={catId} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full">
                  {category?.name}
                  <button
                    onClick={() => setSelectedCategories(selectedCategories.filter((c) => c !== catId))}
                    className="hover:text-red-500"
                    aria-label={`Remove ${category?.name} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full">
                In Stock
                <button onClick={() => setInStockOnly(false)} className="hover:text-red-500" aria-label="Remove in stock filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {onSaleOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full">
                On Sale
                <button onClick={() => setOnSaleOnly(false)} className="hover:text-red-500" aria-label="Remove on sale filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(priceRange.min > 0 || priceRange.max < 5000) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 rounded-full">
                ₱{priceRange.min} - ₱{priceRange.max}
                <button onClick={() => setPriceRange({ min: 0, max: 5000 })} className="hover:text-red-500" aria-label="Clear price filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 bg-red-50 rounded-lg">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchProducts()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !isInitialLoad && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && !error && (
          <>
            <div className={cn(
              viewMode === "grid" 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
                : "space-y-4"
            )}>
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} regionId={regionId} />
              ))}
            </div>

            {/* Empty State */}
            {products.length === 0 && (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your filters or search criteria</p>
                <button onClick={clearAllFilters} className="mt-4 text-primary hover:underline">
                  Clear all filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && products.length > 0 && (
              <div className="flex justify-center gap-2 mt-8 flex-wrap">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        "px-3 py-1 text-sm border rounded-md hover:bg-gray-50 transition-colors",
                        currentPage === pageNum && "bg-primary text-white border-primary hover:bg-primary/90"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="px-2 py-1 text-sm">...</span>
                )}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}