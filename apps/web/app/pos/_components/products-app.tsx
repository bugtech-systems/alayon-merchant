// app/products/_components/products-app.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePriceListProducts } from "@/hooks/use-price-list-products";
import { ProductsTable } from "@/components/products-table";
import { PriceListEditor } from "@/components/price-list-editor";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  metadata?: { role?: string };
  employee?: { company?: { price_list_id?: string } };
  driver?: { price_list_id?: string };
}

interface ProductsAppProps {
  region: any;
  user: User;
}

export function ProductsApp({ region, user }: ProductsAppProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine the price list ID from user metadata (company or driver)
  const userPriceListId =
    user?.metadata?.role === "company"
      ? user.employee?.company?.price_list_id
      : user?.driver?.price_list_id;

  // URL state
  const urlSearch = searchParams.get("q") || "";
  const urlPage = parseInt(searchParams.get("page") || "1");

  // Local search state with debounce
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const limit = 10;
  const offset = (urlPage - 1) * limit;

  // Fetch products from the price list
  const { data, isLoading, error } = usePriceListProducts(userPriceListId, {
    limit,
    offset,
    search: debouncedSearch || undefined,
    user
  });

  const products = data?.products || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);
  // Update URL when search or page changes
  const updateUrl = useCallback(
    (newSearch: string, newPage: number) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("q", newSearch);
      if (newPage > 1) params.set("page", newPage.toString());
      // const newUrl = `/products${params.toString() ? `?${params.toString()}` : ""}`;
      // router.push(newUrl, { scroll: false });
    },
    [router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearchInput(newSearch);
    // updateUrl(newSearch, 1);
  };

  const handlePageChange = (newPage: number) => {
    updateUrl(debouncedSearch, newPage);
  };

  // Price list editor modal
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [priceListEditorOpen, setPriceListEditorOpen] = useState(false);

  const handleEditPricing = (product: any) => {
    setSelectedProduct(product);
    setPriceListEditorOpen(true);
  };


  if (error) {
    return (
      <Card className="p-6">
        <CardContent className="text-center text-destructive">
          Error loading products: {error.message}
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          {/* <p className="text-sm text-muted-foreground">
            Manage products for region: {region.name} ({currencySymbol})
            {userPriceListId && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                Price list applied
              </span>
            )}
          </p> */}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products by name, description, or SKU..."
          value={searchInput}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      {/* Products Table */}
      <ProductsTable
        products={products}
        isLoading={isLoading}
        onEditPricing={handleEditPricing}
      />

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={urlPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {debouncedSearch
            ? "No products match your search. Try adjusting your query."
            : "No products found in this price list."}
        </div>
      )}

      {/* Price List Editor Modal */}
      <PriceListEditor
      open={priceListEditorOpen}
      onOpenChange={setPriceListEditorOpen}
      productId={selectedProduct?.id}
      priceListId={userPriceListId}
      region={region}
      onSuccess={() => {
        // Refetch product data or handle success
      }}
      />
    </div>
  );
}