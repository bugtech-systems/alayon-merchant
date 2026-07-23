"use client";
"use no memo";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

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
  UsersIcon,
  FilterIcon,
  XIcon,
  CalendarIcon,
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


import { DraggableCustomerRow, customerColumns } from "./columns";
import type { CustomerRow, CustomerStatus } from "./schema";
import { getCustomers } from "@/lib/actions/customer";
import { getCompanyCustomers } from "@/lib/actions";

const VIEW_OPTIONS = [
  { value: "all-customers", label: "All Customers", paramValue: "all", defaultFilters: {} },
  { value: "active", label: "Active", paramValue: "active", defaultFilters: { status: "active" } },
  { value: "vip", label: "VIP", paramValue: "vip", defaultFilters: { tags: ["vip"] } },
  { value: "inactive", label: "Inactive", paramValue: "inactive", defaultFilters: { status: "inactive" } },
  { value: "new", label: "New (30 days)", paramValue: "new", defaultFilters: { daysSinceJoin: 30 } },
  { value: "at-risk", label: "At Risk", paramValue: "at_risk", defaultFilters: { status: "at_risk" } },
] as const;

type ViewOption = (typeof VIEW_OPTIONS)[number]["value"];

export interface CustomerFilters {
  search?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minSpent?: number;
  maxSpent?: number;
  minOrders?: number;
  maxOrders?: number;
  city?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  companyId?: string;
}

interface CustomerTableProps {
  onEditCustomer?: (customerId: string) => void;
  onAddCustomer?: () => void;
  onSendEmail?: (customerId: string, email: string) => void;
  onViewOrders?: (customerId: string) => void;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
  defaultPageSize?: number;
  companyId?: string;
  enableRealtime?: boolean;
  staleTime?: number;
  user?: any;
}

export function CustomerTable({ 
  user,
  onEditCustomer,
  onAddCustomer,
  onSendEmail,
  onViewOrders,
  refreshInterval,
  onError,
  onSuccess,
  defaultPageSize = 10000,
  companyId,
  enableRealtime = false,
  staleTime = 5 * 60 * 1000, // 5 minutes default
}: CustomerTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  
  const [activeView, setActiveView] = React.useState<ViewOption>("all-customers");
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  
  const [availableCities, setAvailableCities] = React.useState<string[]>([]);
  
  // Filter state
  const [filters, setFilters] = React.useState<any>({
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
  
  const pricingContext = React.useMemo(() => ({
    priceListId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.price_list_id 
      : user?.driver?.price_list_id,
    customerGroupId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.customer_group_id 
      : user?.driver?.customer_group_id,
    customerId: user?.id,
    stockLocationId: user?.metadata?.role == 'company' ? user.employee?.company?.stock_location_id : user?.driver?.stock_location_id,
    pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group'
  }), [user]);





  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}), 
    useSensor(TouchSensor, {}), 
    useSensor(KeyboardSensor, {})
  );

  // Build query parameters for API
  const buildQueryParams = React.useCallback((): any => {
    const viewConfig = VIEW_OPTIONS.find(v => v.value === activeView);
    
    return {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.search,
      status: filters.status || viewConfig?.paramValue,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      minSpent: filters.minSpent,
      maxSpent: filters.maxSpent,
      minOrders: filters.minOrders,
      maxOrders: filters.maxOrders,
      city: filters.city,
      tags: filters.tags,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      companyId: filters.companyId,
      customer_group_id: pricingContext.customerGroupId
    };
  }, [activeView, filters, pagination.pageIndex, pagination.pageSize, pricingContext]);

  // React Query hook for fetching customers
  const {
    data: queryData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
    dataUpdatedAt,
  } = useQuery<any>({
    queryKey: ["customers", buildQueryParams()],
    queryFn: async () => {
      const params = buildQueryParams();
      const result = await getCompanyCustomers(params);
      console.log(result, "RESSS")
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch customers");
      }
      
      return result.data!;
    },
    placeholderData: keepPreviousData,
    staleTime: staleTime,
    refetchInterval: refreshInterval || false,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Extract data from query result
  const data = React.useMemo(() => queryData?.customers || [], [queryData]);
  const totalCount = queryData?.total || 0;
  const totalPages = queryData?.totalPages || 0;

  // Extract unique cities from data
  React.useEffect(() => {
    if (data.length > 0) {
      const cities = [...new Set(data.map(c => c.city).filter(Boolean))];
      setAvailableCities(cities);
    }
  }, [data]);

  // Handle errors
  React.useEffect(() => {
    if (queryError) {
      const error = queryError instanceof Error ? queryError : new Error("Unknown error");
      onError?.(error);
    }
  }, [queryError, onError]);

  // Handle success
  React.useEffect(() => {
    if (data.length > 0 && !isLoading && !queryError) {
      onSuccess?.(`Loaded ${data.length} of ${totalCount} customers`);
    }
  }, [data.length, totalCount, isLoading, queryError, onSuccess]);

  // Update URL when filters change
  React.useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set("search", filters.search);
    if (filters.companyId) params.set("company_id", filters.companyId);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString());
    if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString());
    if (filters.minSpent) params.set("minSpent", filters.minSpent.toString());
    if (filters.maxSpent) params.set("maxSpent", filters.maxSpent.toString());
    if (filters.minOrders) params.set("minOrders", filters.minOrders.toString());
    if (filters.maxOrders) params.set("maxOrders", filters.maxOrders.toString());
    if (filters.city) params.set("city", filters.city);
    if (filters.tags) params.set("tags", filters.tags.join(","));
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
    if (pagination.pageIndex > 0) params.set("page", pagination.pageIndex.toString());
    if (pagination.pageSize !== defaultPageSize) params.set("limit", pagination.pageSize.toString());
    
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [filters, pagination.pageIndex, pagination.pageSize, router, pathname, defaultPageSize]);

  // Clear all filters
  const clearFilters = React.useCallback(() => {
    setFilters({
      search: "",
      dateFrom: undefined,
      dateTo: undefined,
      minSpent: undefined,
      maxSpent: undefined,
      minOrders: undefined,
      maxOrders: undefined,
      city: undefined,
      tags: undefined,
      companyId: companyId,
    });
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setIsFilterOpen(false);
  }, [companyId]);

  // Apply filters
  const applyFilters = React.useCallback((newFilters: Partial<CustomerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setIsFilterOpen(false);
  }, []);

  // Handle search input with debounce
  const [searchValue, setSearchValue] = React.useState(filters.search || "");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        applyFilters({ search: searchValue });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search, applyFilters]);

  // Get active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.minSpent) count++;
    if (filters.maxSpent) count++;
    if (filters.minOrders) count++;
    if (filters.maxOrders) count++;
    if (filters.city) count++;
    if (filters.tags?.length) count++;
    return count;
  }, [filters]);

  // Manual refresh handler
  const handleManualRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  // Prefetch next page
  React.useEffect(() => {
    if (pagination.pageIndex < totalPages - 1) {
      const nextParams = {
        ...buildQueryParams(),
        page: pagination.pageIndex + 2,
      };
      queryClient.prefetchQuery({
        queryKey: ["customers", nextParams],
        queryFn: () => getCustomers(nextParams),
      });
    }
  }, [pagination.pageIndex, totalPages, buildQueryParams, queryClient]);

  // Setup real-time updates if enabled
  React.useEffect(() => {
    if (!enableRealtime) return;
    
    let eventSource: EventSource | null = null;
    
    const setupRealtime = () => {
      eventSource = new EventSource('/api/customers/events');
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'CUSTOMER_UPDATED' || data.type === 'CUSTOMER_CREATED') {
          refetch();
        }
      };
      
      eventSource.onerror = () => {
        eventSource?.close();
        setTimeout(setupRealtime, 5000);
      };
    };
    
    setupRealtime();
    
    return () => {
      eventSource?.close();
    };
  }, [enableRealtime, refetch]);

  const table = useReactTable({
    data: data,
    columns: customerColumns,
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
      onEditCustomer: (customerId: string) => {
        onEditCustomer?.(customerId);
      },
      onSendEmail: (customerId: string, email: string) => {
        onSendEmail?.(customerId, email);
      },
      onViewOrders: (customerId: string) => {
        onViewOrders?.(customerId);
      },
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      // Note: This is client-side only. For persistence, you'd need to call an API
      const oldIndex = data.findIndex(item => item.id === active.id);
      const newIndex = data.findIndex(item => item.id === over.id);
      const reorderedData = arrayMove(data, oldIndex, newIndex);
      
      // Update local cache optimistically
      queryClient.setQueryData(["customers", buildQueryParams()], (oldData: any) => ({
        ...oldData,
        customers: reorderedData,
      }));
    }
  }

  // Get badge count for view
  const getViewBadgeCount = (viewValue: ViewOption) => {
    if (viewValue === activeView) {
      return totalCount;
    }
    return 0;
  };

  // Format last updated time
  const formatLastUpdated = (timestamp: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const isLoadingData = isLoading && data.length === 0;

  return (
    <div className="w-full space-y-4">
      {/* Error Toast Notification */}
      {queryError && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in-0 duration-300">
          <div className="rounded-lg bg-destructive px-4 py-3 text-destructive-foreground shadow-lg">
            <p className="text-sm font-medium">
              {queryError instanceof Error ? queryError.message : "Failed to load customers"}
            </p>
            <button 
              onClick={() => refetch()}
              className="text-xs underline mt-1 opacity-80 hover:opacity-100"
            >
              Retry
            </button>
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
                placeholder="Search by name, email, or phone..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pr-8"
              />
              {searchValue && (
                <button
                  onClick={() => {
                    setSearchValue("");
                    applyFilters({ search: "" });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
            
            {/* <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
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
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Filter Customers</SheetTitle>
                  <SheetDescription>
                    Apply filters to narrow down customer list
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 py-4 space-y-4 overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Joined Date Range</Label>
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
                    <Label>Total Spent Range (₱)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minSpent || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, minSpent: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxSpent || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxSpent: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Order Count Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min orders"
                        value={filters.minOrders || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, minOrders: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                      <Input
                        type="number"
                        placeholder="Max orders"
                        value={filters.maxOrders || ""}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxOrders: e.target.value ? Number(e.target.value) : undefined }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Select
                      value={filters.city || "all"}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, city: value === "all" ? undefined : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cities</SelectItem>
                        {availableCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="joined_date">Joined Date</SelectItem>
                        <SelectItem value="total_spent">Total Spent</SelectItem>
                        <SelectItem value="total_orders">Total Orders</SelectItem>
                        <SelectItem value="customer_name">Customer Name</SelectItem>
                        <SelectItem value="last_order_date">Last Order Date</SelectItem>
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
            </Sheet> */}
          </div>
          
          <div className="flex items-center gap-2">
            {dataUpdatedAt && (
              <span className="text-muted-foreground text-xs hidden lg:inline">
                Last updated: {formatLastUpdated(dataUpdatedAt)}
              </span>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isFetching}
            >
              {isFetching ? (
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
                      {column.id === "customerName" ? "Customer Name" :
                       column.id === "totalSpent" ? "Total Spent" :
                       column.id === "totalOrders" ? "Total Orders" :
                       column.id === "joinedDate" ? "Joined Date" :
                       column.id === "lastOrderDate" ? "Last Order" :
                       column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* <Button variant="outline" size="sm" onClick={onAddCustomer}>
              <PlusIcon className="size-4" />
              <span className="hidden lg:inline ml-2">Add Customer</span>
            </Button> */}
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
            {isLoadingData && activeView === option.value ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading customers...</span>
              </div>
            ) : (
              <CustomerTableContent 
                table={table} 
                data={data}
                dataIds={data.map(d => d.id)}
                handleDragEnd={handleDragEnd}
                sensors={sensors}
                sortableId={sortableId}
                isFetching={isFetching && activeView === option.value}
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
function CustomerTableContent({ 
  table, 
  data,
  dataIds, 
  handleDragEnd, 
  sensors, 
  sortableId,
  isFetching,
  totalCount
}: { 
  table: any;
  data: CustomerRow[];
  dataIds: UniqueIdentifier[];
  handleDragEnd: (event: DragEndEvent) => void;
  sensors: any;
  sortableId: string;
  isFetching?: boolean;
  totalCount: number;
}) {
  const rowMap = React.useMemo(() => {
    const map = new Map();
    data.forEach(customer => {
      map.set(customer.id, customer);
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
            {isFetching && (
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
                      const latestCustomer = rowMap.get(row.original.id) || row.original;
                      const updatedRow = { ...row, original: latestCustomer };
                      return (
                        <DraggableCustomerRow 
                          key={row.id} 
                          row={updatedRow}
                        />
                      );
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <UsersIcon className="size-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No customers found</p>
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
          Showing {table.getRowModel().rows.length} of {totalCount} customer(s)
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