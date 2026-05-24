// components/product-list.tsx
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  Eye, 
  Star, 
  ChevronRight, 
  Loader2,
  Package,
  Truck,
  ShieldCheck,
  Users,
  Zap,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProducts } from '@/lib/medusa/client';
import { ProductPrice, CompactProductPrice } from "@/components/product-price";
import { ProductCard } from "./product-card";

// Types
interface VariantPrice {
  id: string;
  title: string;
  calculated_price: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
    is_calculated_price_price_list: boolean;
  };
  prices: Array<{
    amount: number;
    currency_code: string;
    min_quantity?: number | null;
    max_quantity?: number | null;
  }>;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  images?: Array<{ url: string; id: string }>;
  variants: VariantPrice[];
  rating?: number;
  reviews?: number;
  isNew?: boolean;
  tags?: string[];
  unit?: string;
  unitValue?: number;
  minOrderQty?: number;
}

interface ProductCardProps {
  product: Product;
  index: number;
  priority?: boolean;
  viewMode?: "grid" | "list";
}

// Helper function to get sorting parameters
function getSortingParams(sort: string | null) {
  switch (sort) {
    case 'newest':
      return { order: 'DESC', orderBy: 'created_at' }
    case 'oldest':
      return { order: 'ASC', orderBy: 'created_at' }
    case 'price-asc':
      return { order: 'ASC', orderBy: 'price' }
    case 'price-desc':
      return { order: 'DESC', orderBy: 'price' }
    case 'title-asc':
      return { order: 'ASC', orderBy: 'title' }
    case 'title-desc':
      return { order: 'DESC', orderBy: 'title' }
    default:
      return { order: 'DESC', orderBy: 'created_at' }
  }
}

// Helper to get product image
const getProductImage = (product: Product | any): string => {
  if (product.thumbnail) return product.thumbnail;
  if (product.images && product.images.length > 0) return product.images[0].url;
  return "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop";
};

// Helper to check if product is on sale
const isProductOnSale = (product: Product): boolean => {
  return product.variants?.some(
    (v) => v.calculated_price?.calculated_amount < v.calculated_price?.original_amount
  ) || false;
};

// Product Card Component
// function ProductCard({ product, index, priority = false, viewMode = "grid" }: ProductCardProps) {
//   const [isHovered, setIsHovered] = useState(false);
//   const [imageLoaded, setImageLoaded] = useState(false);
//   const [quantity, setQuantity] = useState(product.minOrderQty || 1);
//   const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(product.variants[0]?.id);
  
//   const productImage = getProductImage(product);
//   const isOnSale = isProductOnSale(product);
//   const hasVariants = product.variants.length > 1;
//   const displayUnit = product.unitValue 
//     ? `${product.unitValue}${product.unit}` 
//     : product.unit;

//   // Get the lowest price variant for badge display
//   const lowestPriceVariant = product.variants.reduce((lowest, current) => {
//     const currentAmount = current.calculated_price?.calculated_amount;
//     const lowestAmount = lowest.calculated_price?.calculated_amount;
//     return currentAmount < lowestAmount ? current : lowest;
//   }, product.variants[0]);

//   const handleQuickAdd = (e: React.MouseEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     console.log("Quick add:", product.id, selectedVariantId);
//   };

//   const handleQuickView = (e: React.MouseEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//     console.log("Quick view:", product.id);
//   };

//   // List View
//   if (viewMode === "list") {
//     return (
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.5) }}
//         className="group bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden"
//       >
//         <div className="flex flex-col sm:flex-row gap-4 p-4">
//           {/* Image */}
//           <Link href={`/product/${product.handle}`} className="relative w-full sm:w-32 h-32 flex-shrink-0">
//             <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-100">
//               <Image
//                 src={productImage}
//                 alt={product.title}
//                 fill
//                 className="object-cover"
//                 sizes="128px"
//               />
//               {isOnSale && (
//                 <div className="absolute top-1 left-1 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
//                   Sale
//                 </div>
//               )}
//             </div>
//           </Link>

//           {/* Info */}
//           <div className="flex-1">
//             <div className="flex flex-wrap items-start justify-between gap-2">
//               <Link href={`/product/${product.handle}`} className="flex-1">
//                 <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
//                   {product.title}
//                 </h3>
//                 {displayUnit && (
//                   <p className="text-xs text-gray-500 mt-1">Per {displayUnit}</p>
//                 )}
//                 {product.rating && (
//                   <div className="flex items-center gap-1 mt-1">
//                     <div className="flex">
//                       {[...Array(5)].map((_, i) => (
//                         <Star
//                           key={i}
//                           className={cn(
//                             "w-3 h-3 fill-current",
//                             i < Math.floor(product.rating!)
//                               ? "text-yellow-400"
//                               : "text-gray-300"
//                           )}
//                         />
//                       ))}
//                     </div>
//                     <span className="text-xs text-gray-500">
//                       ({product.reviews})
//                     </span>
//                   </div>
//                 )}
//               </Link>

//               {/* Variant selector if few variants */}
//               {hasVariants && product.variants.length <= 3 && (
//                 <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
//                   {product.variants.slice(0, 3).map((variant) => (
//                     <button
//                       key={variant.id}
//                       onClick={(e) => {
//                         e.preventDefault();
//                         setSelectedVariantId(variant.id);
//                       }}
//                       className={cn(
//                         "px-3 py-1 text-xs rounded-full transition-all",
//                         selectedVariantId === variant.id 
//                           ? "bg-white text-gray-900 shadow-sm" 
//                           : "text-gray-500 hover:text-gray-700"
//                       )}
//                     >
//                       {variant.title}
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </div>

//             <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
//               {/* Price - Using ProductPrice component */}
//               <div>
//                 <ProductPrice 
//                   product={product}
//                   variantId={selectedVariantId}
//                   size="md"
//                   showOriginal={true}
//                   showLowestPrice={!hasVariants}
//                 />
//                 {product.minOrderQty && (
//                   <p className="text-xs text-green-600 mt-1">
//                     Min. Order: {product.minOrderQty} {product.unit || "pcs"}
//                   </p>
//                 )}
//               </div>

//               <div className="flex gap-2">
//                 <div className="flex items-center border rounded-lg">
//                   <button
//                     onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                     className="px-2 py-1 text-gray-600 hover:bg-gray-50"
//                   >
//                     -
//                   </button>
//                   <span className="w-10 text-center text-sm">{quantity}</span>
//                   <button
//                     onClick={() => setQuantity(quantity + 1)}
//                     className="px-2 py-1 text-gray-600 hover:bg-gray-50"
//                   >
//                     +
//                   </button>
//                 </div>
//                 <Button onClick={handleQuickAdd} size="sm" className="rounded-full gap-1">
//                   <ShoppingBag className="w-4 h-4" />
//                   Add
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </motion.div>
//     );
//   }

//   // Grid View
//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.5) }}
//       className="group relative"
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50">
//         <Link href={`/product/${product.handle}`} className="relative w-full h-full block">
//           <Image
//             src={productImage}
//             alt={product.title}
//             fill
//             priority={priority}
//             className={cn(
//               "object-cover transition-all duration-700 ease-out",
//               !imageLoaded && "blur-sm"
//             )}
//             onLoad={() => setImageLoaded(true)}
//             sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
//           />
//         </Link>

//         {/* Badges */}
//         <div className="absolute top-3 left-3 flex flex-col gap-2">
//           {isOnSale && (
//             <div className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
//               Sale
//             </div>
//           )}
//           {product.isNew && (
//             <div className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
//               New
//             </div>
//           )}
//           {product.minOrderQty && (
//             <div className="bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
//               Wholesale Available
//             </div>
//           )}
//         </div>

//         {/* Unit Badge */}
//         {displayUnit && (
//           <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
//             Per {displayUnit}
//           </div>
//         )}

//         {/* Quick Actions */}
//         <div className={cn(
//           "absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent transition-all duration-300",
//           isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
//         )}>
//           <div className="flex gap-2">
//             <Button 
//               onClick={handleQuickAdd}
//               className="flex-1 bg-white hover:bg-gray-100 text-gray-900 rounded-full text-sm font-medium"
//               size="sm"
//             >
//               <ShoppingBag className="w-4 h-4 mr-2" />
//               Quick Add
//             </Button>
//             {/* <Button 
//               onClick={handleQuickView}
//               variant="outline" 
//               size="icon"
//               className="bg-white/90 hover:bg-white border-none rounded-full w-9 h-9"
//             >
//               <Eye className="w-4 h-4" />
//             </Button> */}
//           </div>
//         </div>

//         {!imageLoaded && (
//           <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
//         )}
//       </div>

//       <Link href={`/product/${product.handle}`}>
//         <div className="mt-4 space-y-2">
//           {/* Rating */}
//           {product.rating && (
//             <div className="flex items-center gap-1">
//               <div className="flex">
//                 {[...Array(5)].map((_, i) => (
//                   <Star
//                     key={i}
//                     className={cn(
//                       "w-3.5 h-3.5 fill-current",
//                       i < Math.floor(product.rating!)
//                         ? "text-yellow-400"
//                         : "text-gray-300"
//                     )}
//                   />
//                 ))}
//               </div>
//               <span className="text-xs text-gray-500">
//                 ({product.reviews})
//               </span>
//             </div>
//           )}

//           {/* Title */}
//           <h3 className="font-medium text-gray-900 line-clamp-2 text-sm sm:text-base hover:text-blue-600 transition-colors">
//             {product.title}
//           </h3>

//           {/* Price - Using ProductPrice component */}
//           <ProductPrice 
//             product={product}
//             variantId={selectedVariantId}
//             size="md"
//             showOriginal={true}
//             showLowestPrice={!hasVariants}
//           />

//           {/* Min Order Quantity */}
//           {product.minOrderQty && (
//             <div className="flex items-center gap-2">
//               <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
//                 Min Order: {product.minOrderQty}
//               </span>
//             </div>
//           )}

//           {/* Variant pills */}
//           {hasVariants && product.variants.length <= 3 && (
//             <div className="flex gap-1 pt-1">
//               {product.variants.slice(0, 3).map((variant) => (
//                 <button
//                   key={variant.id}
//                   onClick={(e) => {
//                     e.preventDefault();
//                     e.stopPropagation();
//                     setSelectedVariantId(variant.id);
//                   }}
//                   className={cn(
//                     "px-2 py-0.5 text-xs rounded-full border transition-all",
//                     selectedVariantId === variant.id
//                       ? "border-blue-600 bg-blue-50 text-blue-700"
//                       : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
//                   )}
//                 >
//                   {variant.title}
//                 </button>
//               ))}
//               {product.variants.length > 3 && (
//                 <span className="px-2 py-0.5 text-xs text-gray-500">
//                   +{product.variants.length - 3} more
//                 </span>
//               )}
//             </div>
//           )}
//         </div>
//       </Link>
//     </motion.div>
//   );
// }

// Loading Skeleton Component
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] bg-gray-200 rounded-2xl" />
          <div className="mt-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Product List Component
export function ProductList({region}: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceType, setPriceType] = useState<"all" | "retail" | "wholesale">("all");

  const currentPage = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort');
  const category = searchParams.get('category');
  const limit = 12;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const offset = (currentPage - 1) * limit;
    const params: any = { limit, offset };

    const { order, orderBy } = getSortingParams(sort);
    if (order && orderBy) params.order = `${orderBy} ${order}`;
    if (category) params.category_id = [category];

    try {
      const { products: fetchedProducts, count } = await getProducts(params);
      
      // Transform products to match our interface
      const transformedProducts = fetchedProducts.map((p: any, idx: number) => ({
        ...p,
        rating: 4 + (idx % 5) * 0.2,
        reviews: Math.floor(Math.random() * 500) + 10,
        isNew: idx < 2,
        unit: ["kg", "L", "pcs", "pack"][idx % 4],
        unitValue: [1, 5, 24, 12][idx % 4],
        minOrderQty: idx % 2 === 0 ? 10 : undefined,
        variants: p.variants || [],
        images: p.images || [],
        thumbnail: p.thumbnail,
      }));
      
      let filtered = [...transformedProducts];
      
      if (filter === "sale") {
        filtered = filtered.filter(p => 
          p.variants?.some((v: any) => v.calculated_price?.calculated_amount < v.calculated_price?.original_amount)
        );
      }
      if (filter === "new") filtered = filtered.filter(p => p.isNew);
      if (priceType === "wholesale") filtered = filtered.filter(p => p.minOrderQty);
      
      setProducts(filtered);
      setTotalCount(filtered.length);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, sort, category, limit, filter, priceType]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const hasMore = currentPage < totalPages;

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pages: number[] = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else if (currentPage <= 3) {
        for (let i = 1; i <= maxVisible; i++) pages.push(i);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
      }
      return pages;
    };

    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
          className="rounded-full"
        >
          Previous
        </Button>
        
        {getPageNumbers().map(page => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
            disabled={isPending}
            className={cn(
              "rounded-full min-w-[40px]",
              page === currentPage && "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {page}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
          className="rounded-full"
        >
          Next
        </Button>
      </div>
    );
  };

  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-blue-600 to-transparent" />
              <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                Shop Our Collection
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Products
            </h2>
            <p className="text-gray-500 mt-2 max-w-md">
              Quality essentials for your home and business
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Price Type Filter */}
            {/* <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm">
              {["all", "retail", "wholesale"].map((type) => (
                <button
                  key={type}
                  onClick={() => setPriceType(type as any)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full transition-all capitalize",
                    priceType === type
                      ? type === "wholesale" 
                        ? "bg-green-500 text-white" 
                        : "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {type === "all" ? "All" : type}
                </button>
              ))}
            </div> */}

            {/* Filter Tabs */}
            <div className="flex gap-2">
              {["all", "sale", "new"].map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                    filter === f
                      ? "bg-gray-900 text-white shadow-md"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {f === "all" && "All Products"}
                  {f === "sale" && "On Sale"}
                  {f === "new" && "New Arrivals"}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "grid" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{products.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{totalCount}</span> products
            </span>
            {priceType === "wholesale" && (
              <span className="flex items-center gap-1 text-green-600">
                <Package className="w-3.5 h-3.5" />
                Wholesale prices shown
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Same-day delivery in Tacloban
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              Free shipping on bulk orders
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Quality guaranteed
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <ProductGridSkeleton />}

        {/* Error State */}
        {error && (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchProducts()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Product Grid/List */}
        {!isLoading && !error && (
          <>
            <div className={cn(
              viewMode === "grid" 
                ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6" 
                : "space-y-3"
            )}>
              {products.map((product, index) => (
                <ProductCard
                  key={product.id} 
                  product={product} 
                  index={index}
                  priority={index < 4}
                  regionId={region?.id}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* No Results */}
            {products.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            )}

            {/* Load More */}
            {hasMore && products.length > 0 && (
              <div className="text-center mt-12">
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={isPending}
                  variant="outline"
                  className="rounded-full px-8 group"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Pagination */}
            <PaginationControls />
          </>
        )}

        {/* Loading More Indicator */}
        {isPending && !isLoading && (
          <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>
    </section>
  );
}