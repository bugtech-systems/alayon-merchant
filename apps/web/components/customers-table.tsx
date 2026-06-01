// components/dashboard/customers-table.tsx
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
import { customerTableConfig } from "@/config/customers-table.config";
import { useMedusaCustomers } from "@/hooks/useMedusaCustomers";

export function CustomersTable() {
  const { filters, setFilters } = useURLFilters({ 
    defaultPage: 1, 
    defaultLimit: customerTableConfig.defaultPageSize || 10 
  });
  
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  
  const isInitialMount = React.useRef(true);
  
  const page = filters.page || 1;
  const limit = filters.limit || customerTableConfig.defaultPageSize || 10;
  
  const [sorting, setSorting] = React.useState<SortingState>(() => {
    if (filters.sort_by) {
      return [{ id: filters.sort_by, desc: filters.sort_order === "desc" }];
    }
    return customerTableConfig.defaultSort ? 
      [{ id: customerTableConfig.defaultSort.field, desc: customerTableConfig.defaultSort.direction === "desc" }] : 
      [];
  });

  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [tempSearch, setTempSearch] = React.useState(filters.search || "");
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({});

  const queryParams = React.useMemo(() => {
    const params: any = {
      limit,
      offset: (page - 1) * limit,
    };

    if (filters.search) {
      params.q = filters.search;
    }

    if (sorting.length > 0) {
      const sortField = sorting[0].id;
      const sortOrder = sorting[0].desc ? "DESC" : "ASC";
      const fieldMap: Record<string, string> = {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
        created_at: "created_at",
      };
      if (fieldMap[sortField]) {
        params.order = `${fieldMap[sortField]}:${sortOrder.toLowerCase()}`;
      }
    }

    if (filters.has_account && filters.has_account !== "all") {
      // Medusa customers always have accounts, so we filter by group or metadata
      params.has_account = filters.has_account === "true";
    }

    if (filters.date_from && filters.date_to) {
      params.created_at = {
        gte: filters.date_from,
        lte: filters.date_to,
      };
    }

    return params;
  }, [filters, page, limit, sorting]);

  const { data, isLoading, isFetching, error } = useMedusaCustomers(queryParams);
  console.log(data, 'DAATTTAA')
  const tableData = data?.customers || [];
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

  const columns: ColumnDef<any>[] = React.useMemo(() => {
    const visibleColumns = customerTableConfig.columns.filter(col => columnVisibility[col.id] !== false);
    
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
          case "badge": {
            const badgeStyle = col.badgeStyles?.[String(value)] || "default";
            return <Badge variant={badgeStyle as any} className="text-xs">{value ? "Yes" : "No"}</Badge>;
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
  }, [customerTableConfig.columns, isMobile, columnVisibility]);

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
    
    const visibleColumns = customerTableConfig.columns.filter(col => columnVisibility[col.id] !== false);
    const headers = visibleColumns.map((col) => col.header);
    const csv = [
      headers.join(","),
      ...tableData.map((row: any) =>
        visibleColumns
          .map((col) => {
            let value = row[col.accessorKey];
            if (col.type === "date") value = value ? new Date(value).toLocaleDateString() : "";
            if (col.type === "badge") value = value ? "Yes" : "No";
            return `"${value ?? ""}"`;
          })
          .join(",")
      ),
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customerTableConfig.id}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tableData, customerTableConfig.columns, customerTableConfig.id, columnVisibility]);

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
              <SheetTitle>Search Customers</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email..."
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
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
            {customerTableConfig.columns.map((column) => (
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
            {(customerTableConfig.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {customerTableConfig.exportable !== false && (
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={exportCSV} disabled={!tableData.length}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const DesktopActionBar = () => (
    <div className="items-center gap-2 hidden md:flex">
      {customerTableConfig.searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
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
          {customerTableConfig.columns.map((column) => (
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
            {(customerTableConfig.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
              <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      {customerTableConfig.exportable !== false && (
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
        <p className="text-destructive">Error loading customers: {error.message}</p>
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
          console.log("Customer clicked:", row.original);
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
        No customers found
      </TableCell>
    </TableRow>
  )}
</TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
            Showing {startItem} - {endItem} of {total} customers
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
                    {(customerTableConfig.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
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