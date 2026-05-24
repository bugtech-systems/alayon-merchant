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
  X,
  Settings2,
  ChevronDownIcon,
} from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useN8nQuery } from "@/hooks/useN8nQuery";
import { useURLFilters } from "@/hooks/useUrlFilters";
import { DynamicFilters } from "@/components/DynamicFilters";
import { DataTableConfig, ColumnConfig } from "@/types/dynamic-datatable-types";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TabsList, Tabs, TabsTrigger } from "@workspace/ui/components/tabs";

interface DynamicDataTableProps {
  config: DataTableConfig;
  widgetConfig: any;
  onRowClick?: (row: any) => void;
  tabsConfig?: any;
}

export function ProposalSectionsTable({
  config,
  widgetConfig,
  onRowClick,
  tabsConfig
}: DynamicDataTableProps) {
  const { filters, setFilters } = useURLFilters({ defaultPage: 1, defaultLimit: config.defaultPageSize || 10 });
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  
  const isInitialMount = React.useRef(true);
  
  const page = filters.page || 1;
  const limit = filters.limit || config.defaultPageSize || 10;
  
  const [sorting, setSorting] = React.useState<SortingState | any>(() => {
    if (filters.sort_by) {
      return [{ id: filters.sort_by, desc: filters.sort_order === "desc" }];
    }
    return [];
  });

  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [tempSearch, setTempSearch] = React.useState(filters.search || "");
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});

  const queryFilters = React.useMemo(() => {
    const baseFilters: any = { page, limit, tab: 'transactions' };
    
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

  const { data, isLoading, isFetching } = useN8nQuery({
    widget: widgetConfig,
    filters: queryFilters,
    enabled: true
  });

  const tableData = (data && data[0]?.data) || [];
  const total = (data && data[0]?.total) || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Handle tab change
  const handleTabChange = React.useCallback((value: string) => {
    setFilters({  tab: value, page: 1 });
  }, [setFilters]);


  const handlePageChange = React.useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilters({ page: newPage });
  }, [setFilters, totalPages]);

  const handleLimitChange = React.useCallback((newLimit: number) => {
    setFilters({ limit: newLimit, page: 1 });
  }, [setFilters]);

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

  const handleSearch = React.useCallback((term: string) => {
    setFilters({ search: term || undefined, page: 1 });
    setMobileSearchOpen(false);
  }, [setFilters]);

  const columns: ColumnDef<any>[] = React.useMemo(() => {
    // Filter visible columns based on columnVisibility state
    const visibleColumns = config.columns.filter(col => columnVisibility[col.id] !== false);
    
    return visibleColumns.map((col: ColumnConfig) => ({
      id: col.id,
      accessorKey: col.accessorKey,
      header: ({ column }) => {
        if (col.sortable !== false && !isMobile) {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 hover:bg-transparent h-8 font-medium"
            >
              {col.header}
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
          );
        }
        return <span className="text-sm font-medium">{col.header}</span>;
      },
      cell: ({ getValue, row }) => {
        const value = getValue() as any;
        const originalRow = row.original;
        
        if (col.cellRenderer) {
          return col.cellRenderer(value, originalRow);
        }

        
        switch (col.type) {
          case "currency":
            return (
              <span className="font-medium">
                {col.currency || "₱"}
                {(value || 0).toLocaleString()}
              </span>
            );
          case "badge": {
            const badgeStyle = col.badgeStyles?.[value] || "default";
            return <Badge variant={badgeStyle as any} className="text-xs">{value || "N/A"}</Badge>;
          }
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
  }, [config.columns, isMobile, columnVisibility]);

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

  const exportCSV = React.useCallback(() => {
    if (!tableData.length) return;
    
    const visibleColumns = config.columns.filter(col => columnVisibility[col.id] !== false);
    const headers = visibleColumns.map((col) => col.header);
    const csv = [
      headers.join(","),
      ...tableData.map((row: any) =>
        visibleColumns
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
  }, [tableData, config.columns, config.id, columnVisibility]);

  React.useEffect(() => {
    isInitialMount.current = false;
  }, []);

  const showLoading = isLoading && (isInitialMount.current || !tableData.length);
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  // Mobile Action Bar
  const MobileActionBar = () => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
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
                <Button variant="outline" className="flex-1" onClick={() => { setTempSearch(""); handleSearch(""); }}>
                  Clear
                </Button>
                <Button className="flex-1" onClick={() => handleSearch(tempSearch)}>Apply</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        {config.filters && config.filters.length > 0 && (
          <DynamicFilters
            tableConfig={config}
            initialFilters={filters}
            onFilterChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
            debounceDelay={500}
          />
        )}
      </div>
      <div className="flex items-center gap-2">
           <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" />
            View
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-35">
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {config.columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={columnVisibility[column.id] !== false}
              onCheckedChange={(value) => setColumnVisibility(prev => ({ ...prev, [column.id]: value }))}
            >
              {column.header}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
        <Select value={String(limit)} onValueChange={(val) => handleLimitChange(Number(val))}>
          <SelectTrigger className="w-20 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(config.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {config.exportable !== false && (
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={exportCSV} disabled={!tableData.length}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // Desktop Action Bar
  const DesktopActionBar = () => (
    <div className="items-center gap-2  hidden md:flex">
      {config.searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className={cn("pl-9", isTablet ? "w-[150px]" : "w-[200px]")}
            value={filters.search || ""}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {filters.search && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => handleSearch("")}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      {config.filters && config.filters.length > 0 && (
        <DynamicFilters
          tableConfig={config}
          initialFilters={filters}
          onFilterChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
          debounceDelay={500}
        />
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" />
            View
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-35">
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {config.columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={columnVisibility[column.id] !== false}
              onCheckedChange={(value) => setColumnVisibility(prev => ({ ...prev, [column.id]: value }))}
            >
              {column.header}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Select value={String(limit)} onValueChange={(val) => handleLimitChange(Number(val))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {(config.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
              <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
            ))}
          </SelectGroup>
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
    <div className="w-full space-y-4">
      {/* Header with Actions */}
      <div className="items-center justify-between gap-4 flex-wrap hidden md:flex">
          {/* Tabs - Left side */}
          {tabsConfig && tabsConfig.length > 0 && (
            <Tabs value={filters.tab || tabsConfig[0]?.value} onValueChange={handleTabChange}>
              <TabsList>
                {tabsConfig.map((tab: any) => (
                  <TabsTrigger key={tab.id} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        <div className="flex-1" /> {/* Spacer */}
        <DesktopActionBar />
      </div>

      {/* Mobile Action Bar */}
      <div className="block md:hidden">
                {tabsConfig && tabsConfig.length > 0 && (
                  <div className="mb-3">
                    <Tabs value={filters.tab || tabsConfig[0]?.value} onValueChange={handleTabChange}>
                      <TabsList className="w-full">
                        {tabsConfig.map((tab: any) => (
                          <TabsTrigger key={tab.id} value={tab.value} className="flex-1">
                            {tab.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                )}
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
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : tableData.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2 md:py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
            Showing {startItem} - {endItem} of {total} results
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="font-medium text-sm">
                Rows per page
              </Label>
              <Select value={String(limit)} onValueChange={(val) => handleLimitChange(Number(val))}>
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {(config.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center font-medium text-sm">
              Page {page} of {totalPages}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => handlePageChange(1)}
                disabled={page === 1 || isLoading}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || isLoading}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={page >= totalPages || isLoading}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}