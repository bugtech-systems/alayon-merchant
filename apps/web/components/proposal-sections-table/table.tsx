"use client";
"use no memo";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Settings2,
  TruckIcon,
  FilterIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { DraggableWaterOrderRow, waterOrdersColumns } from "./columns";
import type { WaterOrderRow } from "./schema";

const VIEW_OPTIONS = [
  { value: "all-orders", label: "All Orders", paramValue: "all" },
  { value: "pending", label: "Pending", paramValue: "pending" },
  { value: "preparing", label: "Preparing", paramValue: "preparing" },
  { value: "in-transit", label: "In Transit", paramValue: "in_transit" },
  { value: "delivered", label: "Delivered", paramValue: "delivered" },
  { value: "declined", label: "Declined", paramValue: "declined" },
] as const;

type ViewOption = (typeof VIEW_OPTIONS)[number]["value"];

interface FilterParams {
  status?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  driverId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

interface WaterDeliveryTableProps {
  webhookBaseUrl: string;
  companyId?: string;
  onAssignRider?: (orderId: string, riderName: string | null, riderId: string | null) => void;
  onUpdateStatus?: (orderId: string, status: WaterOrderRow["status"]) => void;
  onAddOrder?: () => void;
  onContactRider?: (riderPhone: string) => void;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
  defaultPageSize?: number;
}

export function WaterDeliveryTable({ 
  webhookBaseUrl,
  companyId,
  onAssignRider,
  onUpdateStatus,
  onAddOrder,
  onContactRider,
  refreshInterval,
  onError,
  onSuccess,
  defaultPageSize = 10
}: WaterDeliveryTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = React.useState<WaterOrderRow[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [activeView, setActiveView] = React.useState<ViewOption>("all-orders");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastFetched, setLastFetched] = React.useState<Date | null>(null);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  
  // Filter state
  const [filters, setFilters] = React.useState<FilterParams>({
    search: searchParams.get("search") || "",
    dateFrom: searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined,
    dateTo: searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined,
    minAmount: searchParams.get("minAmount") ? Number(searchParams.get("minAmount")) : undefined,
    maxAmount: searchParams.get("maxAmount") ? Number(searchParams.get("maxAmount")) : undefined,
    driverId: searchParams.get("driverId") || undefined,
    sortBy: searchParams.get("sortBy") || "created_at",
    sortOrder: (searchParams.get("sortOrder") as "ASC" | "DESC") || "DESC",
  });
  
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  // Update URL with filters
  const updateUrlParams = React.useCallback((newFilters: FilterParams) => {
    const params = new URLSearchParams();
    
    if (newFilters.search) params.set("search", newFilters.search);
    if (newFilters.dateFrom) params.set("dateFrom", newFilters.dateFrom.toISOString());
    if (newFilters.dateTo) params.set("dateTo", newFilters.dateTo.toISOString());
    if (newFilters.minAmount) params.set("minAmount", newFilters.minAmount.toString());
    if (newFilters.maxAmount) params.set("maxAmount", newFilters.maxAmount.toString());
    if (newFilters.driverId) params.set("driverId", newFilters.driverId);
    if (newFilters.sortBy) params.set("sortBy", newFilters.sortBy);
    if (newFilters.sortOrder) params.set("sortOrder", newFilters.sortOrder);
    if (pagination.pageIndex > 0) params.set("page", pagination.pageIndex.toString());
    if (pagination.pageSize !== defaultPageSize) params.set("limit", pagination.pageSize.toString());
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, pagination.pageIndex, pagination.pageSize, defaultPageSize]);

  // Clear error after 3 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Build query parameters for API call
  const buildQueryParams = React.useCallback((view: ViewOption, page: number, pageSize: number, currentFilters: FilterParams) => {
    const params = new URLSearchParams();
    
    // Status from view
    const viewConfig = VIEW_OPTIONS.find(v => v.value === view);
    if (viewConfig && view !== "all-orders") {
      params.set("status", viewConfig.paramValue);
    }
    
    // Add current filters
    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.dateFrom) params.set("date_from", currentFilters.dateFrom.toISOString().split('T')[0]);
    if (currentFilters.dateTo) params.set("date_to", currentFilters.dateTo.toISOString().split('T')[0]);
    if (currentFilters.minAmount) params.set("min_amount", currentFilters.minAmount.toString());
    if (currentFilters.maxAmount) params.set("max_amount", currentFilters.maxAmount.toString());
    if (currentFilters.driverId) params.set("driver_id", currentFilters.driverId);
    if (currentFilters.sortBy) params.set("sort_by", currentFilters.sortBy);
    if (currentFilters.sortOrder) params.set("sort_order", currentFilters.sortOrder);
    
    // Pagination
    params.set("page", (page + 1).toString());
    params.set("limit", pageSize.toString());
    
    // Company ID if provided
    if (companyId) params.set("company_id", companyId);
    
    // Include cart and driver data
    params.set("include_carts", "true");
    params.set("include_driver", "true");
    
    return params;
  }, [companyId]);

  // Fetch data from n8n webhook with query parameters
  const fetchData = React.useCallback(async (
    view: ViewOption, 
    page: number, 
    pageSize: number, 
    currentFilters: FilterParams,
    silent: boolean = false
  ) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    
    try {
      const queryParams = buildQueryParams(view, page, pageSize, currentFilters);
      const url = `${webhookBaseUrl}/get-company-deliveries-with-rider?${queryParams.toString()}&_t=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Handle paginated response from n8n
      let orders: WaterOrderRow[] = [];
      let total = 0;
      let pages = 0;
      
      if (result.data && Array.isArray(result.data)) {
        orders = result.data;
        total = result.total || result.data.length;
        pages = result.totalPages || Math.ceil(total / pageSize);
      } else if (Array.isArray(result)) {
        orders = result;
        total = result.length;
        pages = Math.ceil(total / pageSize);
      } else if (result.orders && Array.isArray(result.orders)) {
        orders = result.orders;
        total = result.total || result.orders.length;
        pages = result.totalPages || Math.ceil(total / pageSize);
      } else {
        console.warn("Unexpected response format from n8n:", result);
        orders = [];
        total = 0;
        pages = 0;
      }
      
      setData(orders);
      setTotalCount(total);
      setTotalPages(pages);
      setLastFetched(new Date());
      
      if (!silent && onSuccess) {
        onSuccess(`Loaded ${orders.length} of ${total} orders`);
      }
    } catch (err) {
      console.error("Error fetching data from n8n:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load orders";
      setError(errorMessage);
      
      if (!silent) {
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [webhookBaseUrl, buildQueryParams, onSuccess, onError]);

  // Fetch data when dependencies change
  React.useEffect(() => {
    fetchData(activeView, pagination.pageIndex, pagination.pageSize, filters, false);
  }, [activeView, pagination.pageIndex, pagination.pageSize, filters, fetchData]);

  // Update URL when filters change
  React.useEffect(() => {
    updateUrlParams(filters);
  }, [filters, updateUrlParams]);

  // Optional: Set up auto-refresh interval
  React.useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      fetchData(activeView, pagination.pageIndex, pagination.pageSize, filters, true);
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval, activeView, pagination.pageIndex, pagination.pageSize, filters, fetchData]);

  // Manual refresh handler
  const handleManualRefresh = React.useCallback(() => {
    fetchData(activeView, pagination.pageIndex, pagination.pageSize, filters, false);
  }, [activeView, pagination.pageIndex, pagination.pageSize, filters, fetchData]);

  // Clear all filters
  const clearFilters = React.useCallback(() => {
    setFilters({
      search: "",
      dateFrom: undefined,
      dateTo: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      driverId: undefined,
      sortBy: "created_at",
      sortOrder: "DESC",
    });
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setIsFilterOpen(false);
  }, []);

  // Apply filters
  const applyFilters = React.useCallback((newFilters: Partial<FilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setIsFilterOpen(false);
  }, []);

  // Handle search input
  const handleSearch = React.useCallback((value: string) => {
    applyFilters({ search: value });
  }, [applyFilters]);

  // Get active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.minAmount) count++;
    if (filters.maxAmount) count++;
    if (filters.driverId) count++;
    return count;
  }, [filters]);

  const table = useReactTable({
    data: data,
    columns: waterOrdersColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    manualPagination: true,
    pageCount: totalPages,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      onAssignRider: (orderId: string, riderName: string | null, riderId: string | null) => {
        onAssignRider?.(orderId, riderName, riderId);
        // Update local data optimistically
        setData(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, assignedDriver: riderName, assignedDriverId: riderId }
            : order
        ));
      },
      onUpdateStatus: (orderId: string, status: WaterOrderRow["status"]) => {
        onUpdateStatus?.(orderId, status);
        setData(prev => prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
      },
      onContactRider,
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = currentData.findIndex(item => item.id === active.id);
        const newIndex = currentData.findIndex(item => item.id === over.id);
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  }

  // Get badge count for view (from total count)
  const getViewBadgeCount = (viewValue: ViewOption) => {
    if (viewValue === activeView) {
      return totalCount;
    }
    // For other tabs, we don't have counts without fetching
    return 0;
  };

  return (
    <div className="w-full space-y-4">
      {/* Error Toast Notification */}
      {error && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in-0 duration-300">
          <div className="rounded-lg bg-destructive px-4 py-3 text-destructive-foreground shadow-lg">
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}
      
      <Tabs
        value={activeView}
        onValueChange={(value) => {
          setActiveView(value as ViewOption);
          setPagination(prev => ({ ...prev, pageIndex: 0 }));
        }}
        className="w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search by order #, customer name, or phone..."
                value={filters.search || ""}
                onChange={(e) => handleSearch(e.target.value)}
                className="pr-8"
              />
              {filters.search && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
            
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <FilterIcon className="size-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Deliveries</SheetTitle>
                  <SheetDescription>
                    Apply filters to narrow down delivery orders
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start">
                            <CalendarIcon className="mr-2 size-4" />
                            {filters.dateFrom ? format(filters.dateFrom, "PPP") : "From"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateFrom}
                            onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start">
                            <CalendarIcon className="mr-2 size-4" />
                            {filters.dateTo ? format(filters.dateTo, "PPP") : "To"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.dateTo}
                            onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Amount Range (₱)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minAmount || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxAmount || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="delivery_date">Delivery Date</SelectItem>
                        <SelectItem value="total_amount">Total Amount</SelectItem>
                        <SelectItem value="order_number">Order Number</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Select
                      value={filters.sortOrder}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, sortOrder: value as "ASC" | "DESC" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DESC">Descending</SelectItem>
                        <SelectItem value="ASC">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <SheetClose asChild>
                    <Button onClick={() => applyFilters({})}>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          
          <div className="flex items-center gap-2">
            {lastFetched && (
              <span className="text-muted-foreground text-xs hidden lg:inline">
                Last updated: {lastFetched.toLocaleTimeString()}
              </span>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              <span className="hidden lg:inline ml-2">Refresh</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="size-4" />
                  <span className="hidden lg:inline ml-2">View</span>
                  <ChevronDownIcon className="size-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-35">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === "assignedDriver" ? "Assigned Driver" : 
                       column.id === "orderNumber" ? "Order #" :
                       column.id === "total" ? "Total (₱)" :
                       column.id === "quantity" ? "Quantity" :
                       column.id === "customer" ? "Customer" :
                       column.id === "status" ? "Status" :
                       column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" size="sm" onClick={onAddOrder}>
              <PlusIcon className="size-4" />
              <span className="hidden lg:inline ml-2">New Order</span>
            </Button>
          </div>
        </div>
        
        <TabsList className="@4xl/main:flex hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
          {VIEW_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
              <Badge variant="secondary" className="ml-2">
                {getViewBadgeCount(option.value)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {VIEW_OPTIONS.map((option) => (
          <TabsContent key={option.value} value={option.value} className="relative flex flex-col gap-4 overflow-auto">
            {isLoading && activeView === option.value && data.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading orders...</span>
              </div>
            ) : (
              <WaterDeliveryTableContent 
                table={table} 
                data={data}
                dataIds={data.map(d => d.id)}
                handleDragEnd={handleDragEnd}
                sensors={sensors}
                sortableId={sortableId}
                onAssignRider={onAssignRider}
                onUpdateStatus={onUpdateStatus}
                onContactRider={onContactRider}
                isLoading={isLoading && activeView === option.value}
                totalCount={totalCount}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// Separate component for table content
function WaterDeliveryTableContent({ 
  table, 
  data,
  dataIds, 
  handleDragEnd, 
  sensors, 
  sortableId,
  onAssignRider,
  onUpdateStatus,
  onContactRider,
  isLoading,
  totalCount
}: { 
  table: any;
  data: WaterOrderRow[];
  dataIds: UniqueIdentifier[];
  handleDragEnd: (event: DragEndEvent) => void;
  sensors: any;
  sortableId: string;
  onAssignRider?: (orderId: string, riderName: string | null, riderId: string | null) => void;
  onUpdateStatus?: (orderId: string, status: WaterOrderRow["status"]) => void;
  onContactRider?: (riderPhone: string) => void;
  isLoading?: boolean;
  totalCount: number;
}) {
  const rowMap = React.useMemo(() => {
    const map = new Map();
    data.forEach(order => {
      map.set(order.id, order);
    });
    return map;
  }, [data]);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows.length ? (
                  <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row: any) => {
                      const latestOrder = rowMap.get(row.original.id) || row.original;
                      const updatedRow = { ...row, original: latestOrder };
                      return (
                        <DraggableWaterOrderRow 
                          key={row.id} 
                          row={updatedRow}
                          onAssignRider={onAssignRider}
                          onUpdateStatus={onUpdateStatus}
                          onContactRider={onContactRider}
                        />
                      );
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <TruckIcon className="size-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No orders found</p>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                          Refresh
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DndContext>
      </div>
      
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
          Showing {table.getRowModel().rows.length} of {totalCount} order(s)
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="font-medium text-sm">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center font-medium text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}