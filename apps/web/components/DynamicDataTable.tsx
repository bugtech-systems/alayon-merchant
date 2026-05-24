// components/DynamicDataTable.tsx

"use client";

import * as React from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { 
  ArrowUpDown, 
  Download, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronsLeftIcon, 
  ChevronsRightIcon, 
  Loader2,
  Search,
  X
} from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useN8nQuery } from "@/hooks/useN8nQuery";
import { useURLFilters } from "@/hooks/useUrlFilters";
import { DynamicFilters } from "./DynamicFilters";
import { DataTableConfig, ColumnConfig } from "@/types/dynamic-datatable-types";
import { cn } from "@workspace/ui/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@workspace/ui/components/sheet";

interface DynamicDataTableProps {
  config: DataTableConfig;
  widgetConfig: any;
  tabsConfig?: {
    id: string;
    label: string;
    value: string;
  }[];
  onRowClick?: (row: any) => void;
}

export function DynamicDataTable({
  config,
  widgetConfig,
  tabsConfig,
  onRowClick,
}: DynamicDataTableProps) {
  const { filters, setFilters } = useURLFilters({ defaultPage: 1, defaultLimit: config.defaultPageSize || 10 });
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  
  // Use ref to track initial load
  const isInitialMount = React.useRef(true);
  
  // Local pagination (synced with URL)
  const page = filters.page || 1;
  const limit = filters.limit || config.defaultPageSize || 10;
  
  // Sorting state
  const [sorting, setSorting] = React.useState<SortingState | any>(() => {
    if (filters.sort_by) {
      return [{ id: filters.sort_by, desc: filters.sort_order === "desc" }];
    }
    return [];
  });

  // Mobile filter sheet state
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [tempSearch, setTempSearch] = React.useState(filters.search || "");

  // Build query filters for API
  const queryFilters = React.useMemo(() => {
    const baseFilters: any = {
      page: page,
      limit: limit,
    };

    Object.keys(filters).forEach(key => {
      if (key !== "page" && key !== "limit" && filters[key] !== undefined && filters[key] !== "") {
        baseFilters[key] = filters[key];
      }
    });

    if (sorting.length > 0) {
      baseFilters.sort_by = sorting[0].id;
      baseFilters.sort_order = sorting[0].desc ? "desc" : "asc";
    }

    return baseFilters;
  }, [filters, page, limit, sorting]);

  // Use n8n query
  const { data, isLoading, isFetching } = useN8nQuery({
    widget: widgetConfig,
    filters: queryFilters,
    enabled: true,
  });


  const tableData = (data && data[0]?.data) || [];
  const total = (data && data[0]?.total) || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Handle page change
  const handlePageChange = React.useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilters({ page: newPage });
  }, [setFilters, totalPages]);

  // Handle limit change
  const handleLimitChange = React.useCallback((newLimit: number) => {
    setFilters({ limit: newLimit, page: 1 });
  }, [setFilters]);

  // Handle sorting change
  const handleSortingChange = React.useCallback((updater: any) => {
    setSorting((prev: any) => {
      const newSorting = typeof updater === "function" ? updater(prev) : updater;
      if (newSorting.length > 0) {
        setFilters({ sort_by: newSorting[0].id, sort_order: newSorting[0].desc ? "desc" : "asc", page: 1 });
      } else {
        setFilters({ sort_by: undefined, sort_order: undefined, page: 1 });
      }
      return newSorting;
    });
  }, [setFilters]);

  // Handle search
  const handleSearch = React.useCallback((term: string) => {
    setFilters({ search: term || undefined, page: 1 });
    setMobileSearchOpen(false);
  }, [setFilters]);

  // Handle tab change
  const handleTabChange = React.useCallback((value: string) => {
    setFilters({  tab: value,  page: 1 });
  }, [setFilters]);

  // Dynamically build columns
  const columns: ColumnDef<any>[] = React.useMemo(() => {
    return config.columns.map((col: ColumnConfig) => ({
      id: col.id,
      accessorKey: col.accessorKey,
      header: ({ column }) => {
        if (col.sortable !== false && !isMobile) {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent h-8"
            >
              {col.header}
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
          );
        }
        return <span className="text-sm">{col.header}</span>;
      },
      cell: ({ row, getValue }) => {
        const value = getValue() as any;
        const originalRow = row.original;

        if (col.cellRenderer) {
          return col.cellRenderer(value, originalRow);
        }
        switch (col.type) {
          case "currency":
            return (
              <span className="font-medium text-sm">
                {col.currency || "₱"}
                {(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            );
          case "badge":
            const badgeStyle = col.badgeStyles?.[value] || "default";
            return <Badge variant={badgeStyle as any} className="text-xs">{(value != false ? value : "false") || "N/A"}</Badge>;
          case "boolean":
            return value ? "✅" : "❌";
          case "date":
            if (!value) return "N/A";
            const date = new Date(value);
            return isMobile ? date.toLocaleDateString() : date.toLocaleString();
          case "number":
            return value?.toLocaleString() || value || 0;
          default:
            return value || "N/A";
        }
      },
    }));
  }, [config.columns, isMobile]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  // Pagination controls
  const paginationControls = React.useMemo(() => {
    const maxVisible = isMobile ? 3 : 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return { pages, startPage, endPage };
  }, [page, totalPages, isMobile]);

  // Export CSV
  const exportCSV = React.useCallback(() => {
    if (!tableData.length) return;

    const headers = config.columns.map((col) => col.header);
    const csv = [
      headers.join(","),
      ...tableData.map((row: any) =>
        config.columns
          .map((col) => {
            let value = row[col.accessorKey];
            if (col.type === "currency") value = `${col.currency || "₱"}${(value || 0).toLocaleString()}`;
            if (col.type === "date") value = value ? new Date(value).toLocaleDateString() : "";
            return `"${value ?? ""}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.id}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tableData, config.columns, config.id]);

  React.useEffect(() => {
    isInitialMount.current = false;
  }, []);

  const showLoading = isLoading && (isInitialMount.current || !tableData.length);
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);
  // Mobile Action Bar Component
  const MobileActionBar = () => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {/* Mobile Search Button */}
        <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Search</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setTempSearch("");
                    handleSearch("");
                  }}
                >
                  Clear
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handleSearch(tempSearch)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Filters Button */}
        {config.filters && config.filters.length > 0 && (
          <DynamicFilters
            tableConfig={config}
            initialFilters={filters}
            onFilterChange={(newFilters) => {
              setFilters({ ...newFilters, page: 1 });
            }}
            debounceDelay={500}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile Page Size Selector */}
        <Select value={String(limit)} onValueChange={(val) => handleLimitChange(Number(val))}>
          <SelectTrigger className="w-20 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(config.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mobile Export Button */}
        {config.exportable !== false && (
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9"
            onClick={exportCSV} 
            disabled={!tableData.length}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // Desktop Action Bar Component
  const DesktopActionBar = () => (
    <div className="flex items-center gap-2">
      {config.searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className={cn(
              "pl-9",
              isTablet ? "w-[150px]" : "w-[200px]"
            )}
            value={filters.search || ""}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => handleSearch("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {config.filters && config.filters.length > 0 && (
        <DynamicFilters
          tableConfig={config}
          initialFilters={filters}
          onFilterChange={(newFilters) => {
            setFilters({ ...newFilters, page: 1 });
          }}
          debounceDelay={500}
        />
      )}

      <Select value={String(limit)} onValueChange={(val) => handleLimitChange(Number(val))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(config.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size} / page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {config.exportable !== false && (
        <Button variant="outline" onClick={exportCSV} disabled={!tableData.length}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      )}
    </div>
  );
  return (
    <div className="w-full space-y-3 md:space-y-4">
      {/* Header with Tabs and Actions - Desktop/Tablet Layout */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Tabs - Left side */}
          {tabsConfig && tabsConfig.length > 0 && (
            <Tabs value={filters.tab || tabsConfig[0]?.value} onValueChange={handleTabChange}>
              <TabsList>
                {tabsConfig.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Actions - Right side */}
          <DesktopActionBar />
        </div>
      </div>

      {/* Mobile Layout - Tabs full width, Actions below */}
      <div className="block md:hidden">
        {/* Tabs - Full width on mobile */}
        {tabsConfig && tabsConfig.length > 0 && (
          <div className="mb-3">
            <Tabs value={filters.tab || tabsConfig[0]?.value} onValueChange={handleTabChange}>
              <TabsList className="w-full">
                {tabsConfig.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.value} className="flex-1">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Actions Bar - Below tabs on mobile */}
        <MobileActionBar />
      </div>

      {/* Loading Indicator */}
      {(showLoading || isFetching) && !isInitialMount.current && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 md:px-4 md:py-2 shadow-lg flex items-center gap-2">
            <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
            <span className="text-xs md:text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap text-xs md:text-sm">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {showLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : tableData.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    "text-sm md:text-base"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap py-2 md:py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs md:text-sm text-muted-foreground order-2 sm:order-1">
            Showing {startItem} - {endItem} of {total} results
          </div>

          <div className="flex items-center gap-1 md:gap-2 order-1 sm:order-2">
            {/* First Page */}
            <Button
              size={isMobile ? "sm" : "icon"}
              variant="outline"
              onClick={() => handlePageChange(1)}
              disabled={page === 1 || isLoading}
              className={isMobile ? "h-8 w-8" : "h-9 w-9"}
            >
              <ChevronsLeftIcon className="h-3 w-3 md:h-4 md:w-4" />
            </Button>

            {/* Previous Page */}
            <Button
              size={isMobile ? "sm" : "icon"}
              variant="outline"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || isLoading}
              className={isMobile ? "h-8 w-8" : "h-9 w-9"}
            >
              <ChevronLeftIcon className="h-3 w-3 md:h-4 md:w-4" />
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {paginationControls.pages.map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 w-7 md:h-8 md:w-8 text-xs",
                    p === page && "pointer-events-none"
                  )}
                  onClick={() => handlePageChange(p)}
                  disabled={isLoading}
                >
                  {p}
                </Button>
              ))}
            </div>

            {/* Next Page */}
            <Button
              size={isMobile ? "sm" : "icon"}
              variant="outline"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className={isMobile ? "h-8 w-8" : "h-9 w-9"}
            >
              <ChevronRightIcon className="h-3 w-3 md:h-4 md:w-4" />
            </Button>

            {/* Last Page */}
            <Button
              size={isMobile ? "sm" : "icon"}
              variant="outline"
              onClick={() => handlePageChange(totalPages)}
              disabled={page >= totalPages || isLoading}
              className={isMobile ? "h-8 w-8" : "h-9 w-9"}
            >
              <ChevronsRightIcon className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}