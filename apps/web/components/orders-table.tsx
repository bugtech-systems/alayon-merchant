// components/dashboard/orders-table.tsx
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
import { useURLFilters } from "@/hooks/useUrlFilters";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ordersTableConfig } from "@/config/orders-table.config";
import { useMedusaOrders } from "@/hooks/useMedusaOrders";

export function OrdersTable() {
  const { filters, setFilters } = useURLFilters({ 
    defaultPage: 1, 
    defaultLimit: ordersTableConfig.defaultPageSize || 10 
  });
  
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  
  const isInitialMount = React.useRef(true);
  
  const page = filters.page || 1;
  const limit = filters.limit || ordersTableConfig.defaultPageSize || 10;
  
  const [sorting, setSorting] = React.useState<SortingState>(() => {
    if (filters.sort_by) {
      return [{ id: filters.sort_by, desc: filters.sort_order === "desc" }];
    }
    return ordersTableConfig.defaultSort ? 
      [{ id: ordersTableConfig.defaultSort.field, desc: ordersTableConfig.defaultSort.direction === "desc" }] : 
      [];
  });

  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [tempSearch, setTempSearch] = React.useState(filters.search || "");
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});

  // Build query parameters for Medusa API
  const queryParams = React.useMemo(() => {
    const params: any = {
      limit,
      offset: (page - 1) * limit,
    };

    // Add search
    if (filters.search) {
      params.q = filters.search;
    }

    // Add sorting
    if (sorting.length > 0) {
      const sortField = sorting[0].id;
      const sortOrder = sorting[0].desc ? "DESC" : "ASC";
      // Map column IDs to Medusa field names
      const fieldMap: Record<string, string> = {
        display_id: "display_id",
        created_at: "created_at",
        updated_at: "updated_at",
        total: "total",
        status: "status",
        email: "email",
      };
      if (fieldMap[sortField]) {
        params.order = `${fieldMap[sortField]}:${sortOrder.toLowerCase()}`;
      }
    }

    // Add status filter
    if (filters.status && filters.status !== "all") {
      params.status = [filters.status];
    }

    // // Add date range filter
    // if (filters.date_from && filters.date_to) {
    //   params.created_at = {
    //     gte: filters.date_from,
    //     lte: filters.date_to,
    //   };
    // }

    // Add email filter
    if (filters.email) {
      params.email = filters.email;
    }

    return params;
  }, [filters, page, limit, sorting]);

  const { data, isLoading, isFetching, error } = useMedusaOrders(queryParams);
console.log(data, 'wewew')
  const tableData = data?.orders || [];
  const total = data?.count || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handlePageChange = React.useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilters({ page: newPage });
  }, [setFilters, totalPages]);

  const handleLimitChange = React.useCallback((newLimit: number) => {
    setFilters({ limit: newLimit, page: 1 });
  }, [setFilters]);

  const handleSortingChange = React.useCallback((updater: any) => {
    setSorting((prev) => {
      const newSorting = typeof updater === "function" ? updater(prev) : updater;
      if (newSorting.length > 0) {
        setFilters({ 
          sort_by: newSorting[0].id, 
          sort_order: newSorting[0].desc ? "desc" : "asc", 
          page: 1 
        });
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

  const handleStatusFilter = React.useCallback((status: string) => {
    setFilters({ status: status === "all" ? undefined : status, page: 1 });
  }, [setFilters]);

  const columns: ColumnDef<any>[] = React.useMemo(() => {
    const visibleColumns = ordersTableConfig.columns.filter(col => columnVisibility[col.id] !== false);
    
    return visibleColumns.map((col) => ({
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
        
        switch (col.type) {
          case "currency":
            return (
              <span className="font-medium">
                {col.currency || "$"}
                {(value || 0).toLocaleString()}
              </span>
            );
          case "badge": {
            const badgeStyle = col.badgeStyles?.[value] || "default";
            return <Badge variant={badgeStyle as any} className="text-xs">{value || "N/A"}</Badge>;
          }
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
  }, [ordersTableConfig.columns, isMobile, columnVisibility]);

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
    
    const visibleColumns = ordersTableConfig.columns.filter(col => columnVisibility[col.id] !== false);
    const headers = visibleColumns.map((col) => col.header);
    const csv = [
      headers.join(","),
      ...tableData.map((row: any) =>
        visibleColumns
          .map((col) => {
            let value = row[col.accessorKey];
            if (col.type === "currency") value = `${col.currency || "$"}${(value || 0).toLocaleString()}`;
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
    a.download = `${ordersTableConfig.id}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tableData, ordersTableConfig.columns, ordersTableConfig.id, columnVisibility]);

  React.useEffect(() => {
    isInitialMount.current = false;
  }, []);

  const showLoading = isLoading && (isInitialMount.current || !tableData.length);
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

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
              <SheetTitle>Search Orders</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, email..."
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="requires_action">Requires Action</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setTempSearch(""); handleSearch(""); }}>
                  Clear
                </Button>
                <Button className="flex-1" onClick={() => handleSearch(tempSearch)}>Apply</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
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
            {ordersTableConfig.columns.map((column) => (
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
            {(ordersTableConfig.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {ordersTableConfig.exportable !== false && (
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={exportCSV} disabled={!tableData.length}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const DesktopActionBar = () => (
    <div className="items-center gap-2 hidden md:flex">
      {ordersTableConfig.searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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
      
      <Select value={filters.status || "all"} onValueChange={handleStatusFilter}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="canceled">Canceled</SelectItem>
          <SelectItem value="requires_action">Requires Action</SelectItem>
        </SelectContent>
      </Select>
      
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
          {ordersTableConfig.columns.map((column) => (
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
            {(ordersTableConfig.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
              <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      {ordersTableConfig.exportable !== false && (
        <Button variant="outline" onClick={exportCSV} disabled={!tableData.length}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-8 text-center">
        <p className="text-destructive">Error loading orders: {error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="items-center justify-between gap-4 flex-wrap hidden md:flex">
        <div className="flex-1" />
        <DesktopActionBar />
      </div>

      <div className="block md:hidden">
        <MobileActionBar />
      </div>

      {(showLoading || isFetching) && !isInitialMount.current && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 md:px-4 md:py-2 shadow-lg flex items-center gap-2">
            <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
            <span className="text-xs md:text-sm">Loading...</span>
          </div>
        </div>
      )}

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
  ) : tableData.length ? (  // Changed from "data.length" to "tableData.length"
    table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => {
          console.log("Order clicked:", row.original);
        }}
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
        No orders found
      </TableCell>
    </TableRow>
  )}
</TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
            Showing {startItem} - {endItem} of {total} orders
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
                    {(ordersTableConfig.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
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