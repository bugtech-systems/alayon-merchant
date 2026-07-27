// app/products/products-layout-client.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Package,
  Tag,
  DollarSign,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/hooks/use-categories";
import { usePriceLists } from "@/hooks/use-products";
import { cn } from "@/lib/utils";

// Types for region and user
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
  // add other user fields as needed
}

interface ProductsLayoutClientProps {
  children: React.ReactNode;
  region: any;
  user: User;
}

export function ProductsLayoutClient({ children, region, user }: ProductsLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchParams.get("status") || "all"
  );
  const [selectedPriceList, setSelectedPriceList] = useState<string>(
    searchParams.get("priceList") || ""
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const { data: categories } = useCategories({ limit: 100 });
  const { data: priceLists } = usePriceLists();

  // Region and user are now available for any region‑specific filtering
  // e.g., show only products available in this region, or user‑specific price lists
  useEffect(() => {
    // You could log or use region/user for something like:
    console.log(`Products layout initialized for region ${region.name}, user ${user.email}`);
  }, [region, user]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedCategories.length) params.set("categories", selectedCategories.join(","));
    if (selectedStatus !== "all") params.set("status", selectedStatus);
    if (selectedPriceList) params.set("priceList", selectedPriceList);
    
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [search, selectedCategories, selectedStatus, selectedPriceList, pathname, router]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setSelectedStatus("all");
    setSelectedPriceList("");
  };

  const hasActiveFilters = search || selectedCategories.length > 0 || selectedStatus !== "all" || selectedPriceList;

  // Filter content component (shared between desktop and mobile)
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Status Filter */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Status</h3>
        <div className="space-y-1">
          {["all", "published", "draft"].map((status) => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${status}`}
                checked={selectedStatus === status}
                onCheckedChange={() => setSelectedStatus(status)}
              />
              <Label
                htmlFor={`status-${status}`}
                className="text-sm capitalize cursor-pointer"
              >
                {status}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Categories Filter */}
      <Accordion type="single" collapsible defaultValue="categories">
        <AccordionItem value="categories">
          <AccordionTrigger className="text-sm font-medium">
            Categories
          </AccordionTrigger>
          <AccordionContent>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-2">
                {categories?.map((category: any) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories([...selectedCategories, category.id]);
                        } else {
                          setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`cat-${category.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {category.name}
                      {category.parent_category && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (sub of {category.parent_category.name})
                        </span>
                      )}
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      {category.products_count || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      {/* Price Lists Filter */}
      <Accordion type="single" collapsible defaultValue="priceLists">
        <AccordionItem value="priceLists">
          <AccordionTrigger className="text-sm font-medium">
            Price Lists
          </AccordionTrigger>
          <AccordionContent>
            <ScrollArea className="h-48 pr-4">
              <div className="space-y-2">
                {priceLists?.map((list: any) => (
                  <div key={list.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pl-${list.id}`}
                      checked={selectedPriceList === list.id}
                      onCheckedChange={(checked) => {
                        setSelectedPriceList(checked ? list.id : "");
                      }}
                    />
                    <Label
                      htmlFor={`pl-${list.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {list.name}
                    </Label>
                    <Badge variant={list.type === "sale" ? "destructive" : "outline"}>
                      {list.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-muted/30 lg:block">
        <div className="sticky top-0 p-4">
          <div className="flex items-center gap-2 mb-6">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Filters</h2>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-xs"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            )}
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header with search, filter buttons, and region/user info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Products</h1>
              <p className="text-muted-foreground">
                Manage your product catalog, inventory, and pricing.
                {region && (
                  <span className="ml-2 text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                    Region: {region.name} ({region.currency_code})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile filter sheet */}
              <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1">
                        {selectedCategories.length + (selectedStatus !== "all" ? 1 : 0) + (selectedPriceList ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">Filters</h2>
                      <Button variant="ghost" size="sm" onClick={() => setIsMobileFiltersOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[calc(100vh-60px)] p-4">
                    <FilterContent />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products by name, description, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {search}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setSearch("")}
                  />
                </Badge>
              )}
              {selectedStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {selectedStatus}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedStatus("all")}
                  />
                </Badge>
              )}
              {selectedCategories.map((catId) => {
                const cat = categories?.find((c: any) => c.id === catId);
                return (
                  <Badge key={catId} variant="secondary" className="gap-1">
                    Category: {cat?.name || catId}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setSelectedCategories(selectedCategories.filter((id) => id !== catId))
                      }
                    />
                  </Badge>
                );
              })}
              {selectedPriceList && (
                <Badge variant="secondary" className="gap-1">
                  Price List: {priceLists?.find((l: any) => l.id === selectedPriceList)?.name}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedPriceList("")}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Dynamic product content (table, pagination, etc.) */}
          {children}
        </div>
      </main>
    </div>
  );
}