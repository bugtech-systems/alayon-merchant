"use client";
"use no memo";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Loader2Icon,
  RefreshCwIcon,
  Settings2,
  TruckIcon,
  FilterIcon,
  XIcon,
  DownloadIcon,
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

import { 
  listOrders, 
  type OrderFilters, 
  type OrderSortOptions,
  type PaginatedOrderResponse,
  type DashboardOrder 
} from "@/lib/data/orders";
import { DraggableWaterOrderRow, waterOrdersColumns } from "./columns";
import type { WaterOrderRow } from "./schema";

// Dynamic configuration types
export interface TableColumnConfig<T = any> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (props: { row: T; value: any }) => React.ReactNode;
  enableSorting?: boolean;
  enableHiding?: boolean;
  enableFiltering?: boolean;
  meta?: Record<string, any>;
}

export interface TableFilterConfig {
  id: keyof OrderFilters;
  label: string;
  type: "text" | "select" | "date" | "dateRange" | "number" | "numberRange" | "multiselect";
  options?: Array<{ label: string; value: string }>;
  field: string;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in";
}

export interface TableViewConfig {
  id: string;
  label: string;
  paramValue?: string | string[];
  filters?: Partial<OrderFilters>;
  sort?: OrderSortOptions;
}

export interface DynamicOrdersTableConfig {
  // Core configuration
  columns?: ColumnDef<WaterOrderRow>[];
  views?: TableViewConfig[];
  filters?: TableFilterConfig[];
  
  // Query configuration
  defaultLimit?: number;
  defaultSort?: OrderSortOptions;
  defaultView?: string;
  
  // Feature flags
  enableDragDrop?: boolean;
  enableColumnVisibility?: boolean;
  enableFilters?: boolean;
  enableRefresh?: boolean;
  enableRowSelection?: boolean;
  enablePagination?: boolean;
  enableExport?: boolean;
  enableBulkActions?: boolean;
  
  // Custom handlers
  onRowClick?: (row: WaterOrderRow) => void;
  onRowAction?: (action: string, row: WaterOrderRow) => void;
  onBulkAction?: (action: string, selectedRows: WaterOrderRow[]) => void;
  onAssignRider?: (orderId: string, riderName: string | null, riderId: string | null) => void;
  onUpdateStatus?: (orderId: string, status: WaterOrderRow["status"]) => void;
  onContactRider?: (riderPhone: string) => void;
  customActions?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: (row: WaterOrderRow) => void;
  }>;
  
  // Callbacks
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
  onExport?: (data: WaterOrderRow[]) => void;
}

interface DynamicOrdersTableProps extends DynamicOrdersTableConfig {
  refreshInterval?: number;
  initialSearchParams?: URLSearchParams;
}

// Transform DashboardOrder to WaterOrderRow
function transformToWaterOrderRow(order: DashboardOrder): WaterOrderRow {
  // Calculate remaining stock (mock logic - replace with actual business logic)
  const remainingStock = 1000; // This should come from your inventory system
  console.log(order, 'ORRDD')
  return {
    id: order.id,
    orderNumber: String(order?.metadata?.delivery_id).slice(-4) || String(order.display_id),
    customer: order.customer?.first_name && order.customer?.last_name 
      ? `${order.customer.first_name} ${order.customer.last_name}`
      : order.email || "Guest",
    customerPhone: order.customer?.phone || "N/A",
    location: order.shipping_address?.city || "N/A",
    address: order.shipping_address?.address_1 || "N/A",
    quantity: order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
    total: order.total || 0,
    status: mapOrderStatus(order.status),
    orderDate: new Date(order.created_at).toLocaleDateString(),
    assignedDriver: order.metadata?.assigned_driver as string || null,
    assignedDriverId: order.metadata?.assigned_driver_id as string || null,
    remainingStock: remainingStock,
    previousOrderQty: 0, // This should come from historical data
  };
}

// Map Medusa order status to WaterOrderRow status
function mapOrderStatus(status: string): WaterOrderRow["status"] {
  const statusMap: Record<string, WaterOrderRow["status"]> = {
    "pending": "pending",
    "processing": "company_accepted",
    "completed": "delivered",
    "cancelled": "company_declined",
    "requires_action": "company_preparing",
  };
  return statusMap[status] || "pending";
}

export function DynamicOrdersTable({
  columns = waterOrdersColumns,
  views = [],
  filters: filterConfigs = [],
  defaultLimit = 10,
  defaultSort = { field: "created_at", order: "DESC" },
  defaultView,
  enableDragDrop = true,
  enableColumnVisibility = true,
  enableFilters = true,
  enableRefresh = true,
  enableRowSelection = true,
  enablePagination = true,
  enableExport = false,
  enableBulkActions = false,
  onRowClick,
  onRowAction,
  onBulkAction,
  onAssignRider,
  onUpdateStatus,
  onContactRider,
  customActions = [],
  onError,
  onSuccess,
  onExport,
  refreshInterval,
  initialSearchParams,
}: DynamicOrdersTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  
  const [data, setData] = React.useState<WaterOrderRow[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [activeView, setActiveView] = React.useState<string>(defaultView || views[0]?.id || "all");
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: defaultLimit,
  });
  
  // Use ref to track if we're updating from URL to prevent loops
  const isUpdatingFromURL = React.useRef(false);
  const previousFiltersRef = React.useRef<string>("");
  
  // Dynamic filter state
  const [dynamicFilters, setDynamicFilters] = React.useState<Partial<OrderFilters>>(() => {
    const initialFilters: Partial<OrderFilters> = {};
    
    filterConfigs.forEach(filter => {
      const urlValue = searchParams.get(filter.id as string);
      if (urlValue) {
        if (filter.type === "date") {
          initialFilters[filter.id] = new Date(urlValue);
        } else if (filter.type === "dateRange") {
          const [from, to] = urlValue.split(",");
          initialFilters[filter.id] = {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
          } as any;
        } else if (filter.type === "number") {
          initialFilters[filter.id] = Number(urlValue);
        } else if (filter.type === "numberRange") {
          const [min, max] = urlValue.split(",");
          initialFilters[filter.id] = {
            min: min ? Number(min) : undefined,
            max: max ? Number(max) : undefined,
          } as any;
        } else if (filter.type === "multiselect") {
          initialFilters[filter.id] = urlValue.split(",");
        } else {
          initialFilters[filter.id] = urlValue;
        }
      }
    });
    
    return initialFilters;
  });
  
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  // Listen for driver change events from the DriverAssignment component
  React.useEffect(() => {
    const handleDriverChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { orderId, driverName, driverId } = customEvent.detail;
      onAssignRider?.(orderId, driverName, driverId);
      
      // Update local data
      setData(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, assignedDriver: driverName, assignedDriverId: driverId }
          : order
      ));
    };
    
    window.addEventListener('driverChange', handleDriverChange as EventListener);
    return () => window.removeEventListener('driverChange', handleDriverChange as EventListener);
  }, [onAssignRider]);

  // Build query filters from current state - memoized
  const buildQueryFilters = React.useCallback((): {
    filters: OrderFilters;
    sort: OrderSortOptions;
  } => {
    let filters: OrderFilters = { ...dynamicFilters };
    const sort: OrderSortOptions = { ...defaultSort };
    
    // Apply view configuration
    const currentView = views.find(v => v.id === activeView);
    if (currentView) {
      if (currentView.paramValue) {
        filters.status = Array.isArray(currentView.paramValue) 
          ? currentView.paramValue 
          : [currentView.paramValue];
      }
      if (currentView.filters) {
        filters = { ...filters, ...currentView.filters };
      }
      if (currentView.sort) {
        sort.field = currentView.sort.field;
        sort.order = currentView.sort.order;
      }
    }
    
    // Apply sorting from table state
    if (sorting.length > 0) {
      const sortState = sorting[0];
      const fieldMap: Record<string, keyof DashboardOrder> = {
        orderNumber: "display_id",
        customer: "email",
        quantity: "item_count",
        total: "total",
        status: "status",
        created_at: "created_at",
      };
      const mappedField = fieldMap[sortState.id] || sortState.id as keyof DashboardOrder;
      sort.field = mappedField;
      sort.order = sortState.desc ? "DESC" : "ASC";
    }
    
    // Add search from URL
    const search = searchParams.get("search");
    if (search) {
      filters.search = search;
      filters.q = search;
    }
    
    return { filters, sort };
  }, [dynamicFilters, activeView, views, sorting, searchParams, defaultSort]);

  // Create a stable query key
  const queryKey = React.useMemo(() => {
    const { filters, sort } = buildQueryFilters();
    return [
      "orders",
      pagination.pageIndex,
      pagination.pageSize,
      JSON.stringify(filters),
      JSON.stringify(sort),
      searchParams.get("search"),
    ];
  }, [pagination.pageIndex, pagination.pageSize, buildQueryFilters, searchParams]);

  // Fetch data using server action
  const { 
    data: queryData, 
    isLoading, 
    error: queryError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const { filters, sort } = buildQueryFilters();
      const offset = pagination.pageIndex * pagination.pageSize;
      
      const result = await listOrders(
        pagination.pageSize,
        offset,
        filters,
        sort
      );
      
      return result;
    },
    staleTime: 30000,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Update state when query data changes - with proper dependency checking
  React.useEffect(() => {
    if (queryData && !isFetching) {
      const transformedData = queryData.orders.map(transformToWaterOrderRow);
      
      // Only update if data has changed
      if (JSON.stringify(data) !== JSON.stringify(transformedData)) {
        setData(transformedData);
      }
      if (totalCount !== queryData.count) {
        setTotalCount(queryData.count);
      }
      if (totalPages !== queryData.totalPages) {
        setTotalPages(queryData.totalPages);
        
        // Reset pagination if current page is beyond total pages
        if (pagination.pageIndex >= queryData.totalPages && queryData.totalPages > 0) {
          setPagination(prev => ({ ...prev, pageIndex: queryData.totalPages - 1 }));
        }
      }
      
      if (transformedData.length > 0 && onSuccess) {
        onSuccess(`Loaded ${transformedData.length} of ${queryData.count} orders`);
      }
    }
  }, [queryData, isFetching, pagination.pageIndex, totalCount, totalPages, data, onSuccess]);

  // Handle errors
  React.useEffect(() => {
    if (queryError) {
      onError?.(queryError);
    }
  }, [queryError, onError]);

  // Update URL with filters - debounced to prevent loops
  React.useEffect(() => {
    if (isUpdatingFromURL.current) return;
    
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      
      // Only update if filters have changed
      const filtersKey = JSON.stringify(dynamicFilters);
      if (previousFiltersRef.current === filtersKey && 
          params.get("page") === pagination.pageIndex.toString() &&
          params.get("limit") === pagination.pageSize.toString()) {
        return;
      }
      
      previousFiltersRef.current = filtersKey;
      
      // Clear existing filter params
      filterConfigs.forEach(filter => {
        params.delete(filter.id as string);
      });
      
      // Set new filter params
      Object.entries(dynamicFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (value instanceof Date) {
            params.set(key, value.toISOString());
          } else if (Array.isArray(value) && value.length > 0) {
            params.set(key, value.join(","));
          } else if (typeof value === "object" && (value.from || value.to)) {
            const rangeValue = `${value.from?.toISOString() || ""},${value.to?.toISOString() || ""}`;
            if (rangeValue !== ",") {
              params.set(key, rangeValue);
            }
          } else if (typeof value === "object" && (value.min !== undefined || value.max !== undefined)) {
            const rangeValue = `${value.min || ""},${value.max || ""}`;
            if (rangeValue !== ",") {
              params.set(key, rangeValue);
            }
          } else if (typeof value === "string" || typeof value === "number") {
            params.set(key, String(value));
          }
        }
      });
      
      // Update pagination params
      if (pagination.pageIndex > 0) {
        params.set("page", pagination.pageIndex.toString());
      } else {
        params.delete("page");
      }
      
      if (pagination.pageSize !== defaultLimit) {
        params.set("limit", pagination.pageSize.toString());
      } else {
        params.delete("limit");
      }
      
      // Update sorting params
      if (sorting.length > 0) {
        const sort = sorting[0];
        params.set("sort_field", sort.id);
        params.set("sort_order", sort.desc ? "DESC" : "ASC");
      } else {
        params.delete("sort_field");
        params.delete("sort_order");
      }
      
      const newUrl = `${pathname}?${params.toString()}`;
      const currentUrl = `${pathname}?${searchParams.toString()}`;
      
      if (newUrl !== currentUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // Debounce URL updates
    
    return () => clearTimeout(timeoutId);
  }, [dynamicFilters, pagination, sorting, pathname, router, searchParams, defaultLimit, filterConfigs]);

  // Sync URL params to state when URL changes (back/forward navigation)
  React.useEffect(() => {
    isUpdatingFromURL.current = true;
    
    // Sync pagination from URL
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const pageIndex = parseInt(pageParam);
      if (!isNaN(pageIndex) && pageIndex !== pagination.pageIndex) {
        setPagination(prev => ({ ...prev, pageIndex: pageIndex }));
      }
    }
    
    // Sync limit from URL
    const limitParam = searchParams.get("limit");
    if (limitParam) {
      const limit = parseInt(limitParam);
      if (!isNaN(limit) && limit !== pagination.pageSize) {
        setPagination(prev => ({ ...prev, pageSize: limit }));
      }
    }
    
    // Sync sorting from URL
    const sortField = searchParams.get("sort_field");
    const sortOrder = searchParams.get("sort_order");
    if (sortField && sortOrder) {
      const newSorting: SortingState = [{ 
        id: sortField, 
        desc: sortOrder === "DESC" 
      }];
      if (JSON.stringify(sorting) !== JSON.stringify(newSorting)) {
        setSorting(newSorting);
      }
    }
    
    // Sync filters from URL
    const newFilters: Partial<OrderFilters> = {};
    filterConfigs.forEach(filter => {
      const urlValue = searchParams.get(filter.id as string);
      if (urlValue) {
        if (filter.type === "date") {
          newFilters[filter.id] = new Date(urlValue);
        } else if (filter.type === "dateRange") {
          const [from, to] = urlValue.split(",");
          newFilters[filter.id] = {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
          } as any;
        } else if (filter.type === "number") {
          newFilters[filter.id] = Number(urlValue);
        } else if (filter.type === "numberRange") {
          const [min, max] = urlValue.split(",");
          newFilters[filter.id] = {
            min: min ? Number(min) : undefined,
            max: max ? Number(max) : undefined,
          } as any;
        } else if (filter.type === "multiselect") {
          newFilters[filter.id] = urlValue.split(",");
        } else {
          newFilters[filter.id] = urlValue;
        }
      }
    });
    
    if (JSON.stringify(dynamicFilters) !== JSON.stringify(newFilters)) {
      setDynamicFilters(newFilters);
    }
    
    // Reset the flag after a short delay
    setTimeout(() => {
      isUpdatingFromURL.current = false;
    }, 100);
  }, [searchParams]); // Only run when searchParams changes

  // Create table meta for callbacks
  const tableMeta = React.useMemo(() => ({
    onAssignRider: (orderId: string, riderName: string | null, riderId: string | null) => {
      onAssignRider?.(orderId, riderName, riderId);
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
    onContactRider: (riderPhone: string) => {
      onContactRider?.(riderPhone);
    },
  }), [onAssignRider, onUpdateStatus, onContactRider]);

  const table = useReactTable({
    data: data,
    columns: columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: enablePagination ? pagination : undefined,
    },
    getRowId: (row) => row.id,
    enableRowSelection,
    manualPagination: enablePagination,
    pageCount: totalPages,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    onPaginationChange: enablePagination ? setPagination : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: tableMeta,
  });

  function handleDragEnd(event: DragEndEvent) {
    if (!enableDragDrop) return;
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = currentData.findIndex(item => item.id === active.id);
        const newIndex = currentData.findIndex(item => item.id === over.id);
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  }

  // Handle export
  const handleExport = React.useCallback(async () => {
    if (!enableExport) return;
    
    setIsExporting(true);
    try {
      const { filters, sort } = buildQueryFilters();
      const result = await listOrders(999999, 0, filters, sort);
      const transformedData = result.orders.map(transformToWaterOrderRow);
      
      if (onExport) {
        onExport(transformedData);
      } else {
        // Default CSV export
        const csvContent = convertToCSV(transformedData);
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orders-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      onSuccess?.(`Exported ${transformedData.length} orders`);
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  }, [enableExport, buildQueryFilters, onExport, onSuccess, onError]);

  // Convert to CSV helper
  const convertToCSV = React.useCallback((orders: WaterOrderRow[]) => {
    const headers = ["Order #", "Customer", "Quantity", "Total", "Status", "Assigned Driver", "Order Date"];
    const rows = orders.map(order => [
      order.orderNumber,
      order.customer,
      order.quantity,
      order.total,
      order.status,
      order.assignedDriver || "Unassigned",
      order.orderDate,
    ]);
    return [headers, ...rows].map(row => row.join(",")).join("\n");
  }, []);

  // Handle bulk action
  const handleBulkAction = React.useCallback((action: string) => {
    if (!enableBulkActions || !onBulkAction) return;
    
    const selectedRows = Object.keys(rowSelection)
      .map(key => data[parseInt(key)])
      .filter(Boolean);
    
    onBulkAction(action, selectedRows);
  }, [enableBulkActions, onBulkAction, rowSelection, data]);

  const renderFilterInput = (filter: TableFilterConfig) => {
    const value = dynamicFilters[filter.id];
    
    switch (filter.type) {
      case "text":
        return (
          <Input
            value={value as string || ""}
            onChange={(e) => setDynamicFilters(prev => ({ ...prev, [filter.id]: e.target.value }))}
            placeholder={`Search ${filter.label.toLowerCase()}...`}
          />
        );
      
      case "select":
        return (
          <Select
            value={value as string || ""}
            onValueChange={(val) => setDynamicFilters(prev => ({ ...prev, [filter.id]: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {filter.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "multiselect":
        return (
          <Select
            value={(value as string[])?.join(",") || ""}
            onValueChange={(val) => {
              const selected = val ? val.split(",") : [];
              setDynamicFilters(prev => ({ ...prev, [filter.id]: selected }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 size-4" />
                {value ? format(value as Date, "PPP") : `Select ${filter.label.toLowerCase()}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value as Date}
                onSelect={(date) => setDynamicFilters(prev => ({ ...prev, [filter.id]: date }))}
              />
            </PopoverContent>
          </Popover>
        );
      
      case "dateRange":
        const rangeValue = value as { from?: Date; to?: Date } || {};
        return (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  <CalendarIcon className="mr-2 size-4" />
                  {rangeValue.from ? format(rangeValue.from, "PPP") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={rangeValue.from}
                  onSelect={(date) => setDynamicFilters(prev => ({ 
                    ...prev, 
                    [filter.id]: { ...rangeValue, from: date } 
                  }))}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  <CalendarIcon className="mr-2 size-4" />
                  {rangeValue.to ? format(rangeValue.to, "PPP") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={rangeValue.to}
                  onSelect={(date) => setDynamicFilters(prev => ({ 
                    ...prev, 
                    [filter.id]: { ...rangeValue, to: date } 
                  }))}
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      
      case "number":
        return (
          <Input
            type="number"
            value={value as number || ""}
            onChange={(e) => setDynamicFilters(prev => ({ 
              ...prev, 
              [filter.id]: e.target.value ? Number(e.target.value) : undefined 
            }))}
            placeholder={filter.label}
          />
        );
      
      case "numberRange":
        const numberRange = value as { min?: number; max?: number } || {};
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={numberRange.min || ""}
              onChange={(e) => setDynamicFilters(prev => ({ 
                ...prev, 
                [filter.id]: { ...numberRange, min: e.target.value ? Number(e.target.value) : undefined } 
              }))}
            />
            <Input
              type="number"
              placeholder="Max"
              value={numberRange.max || ""}
              onChange={(e) => setDynamicFilters(prev => ({ 
                ...prev, 
                [filter.id]: { ...numberRange, max: e.target.value ? Number(e.target.value) : undefined } 
              }))}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  const activeFilterCount = React.useMemo(() => {
    return Object.values(dynamicFilters).filter(v => 
      v !== undefined && v !== null && v !== "" && 
      !(Array.isArray(v) && v.length === 0) &&
      !(typeof v === "object" && Object.keys(v).length === 0)
    ).length;
  }, [dynamicFilters]);

  const selectedRowCount = Object.keys(rowSelection).length;
  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search by order #, customer name, or email..."
              defaultValue={searchParams.get("search") || ""}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value) {
                  params.set("search", e.target.value);
                } else {
                  params.delete("search");
                }
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
              }}
              className="pr-8"
            />
            {searchParams.get("search") && (
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("search");
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
          
          {enableFilters && filterConfigs.length > 0 && (
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <FilterIcon className="size-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter Orders</SheetTitle>
                  <SheetDescription>
                    Apply filters to narrow down order results
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 py-4 space-y-4">
                  {filterConfigs.map(filter => (
                    <div key={filter.id as string} className="space-y-2">
                      <Label>{filter.label}</Label>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>
                <SheetFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDynamicFilters({});
                      setIsFilterOpen(false);
                    }}
                  >
                    Clear All
                  </Button>
                  <SheetClose asChild>
                    <Button>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {enableExport && (
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
              <span className="hidden lg:inline ml-2">Export</span>
            </Button>
          )}
          
          {enableRefresh && (
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              <span className="hidden lg:inline ml-2">Refresh</span>
            </Button>
          )}
          
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="size-4" />
                  <span className="hidden lg:inline ml-2">View</span>
                  <ChevronDownIcon className="size-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter(col => col.getCanHide())
                  .map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {enableBulkActions && selectedRowCount > 0 && (
        <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
          <span className="text-sm">
            {selectedRowCount} order(s) selected
          </span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction("export")}
            >
              Export Selected
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction("update-status")}
            >
              Update Status
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
      
      {/* Views Tabs */}
      {views.length > 0 && (
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList className="flex-wrap h-auto">
            {views.map(view => (
              <TabsTrigger key={view.id} value={view.id}>
                {view.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      
      {/* Table Content */}
      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <div className="relative">
            {(isLoading || isFetching) && data.length === 0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted">
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    enableDragDrop ? (
                      <SortableContext items={data.map(d => d.id)} strategy={verticalListSortingStrategy}>
                        {table.getRowModel().rows.map((row) => (
                          <DraggableWaterOrderRow 
                            key={row.id} 
                            row={row as Row<WaterOrderRow>}
                          />
                        ))}
                      </SortableContext>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <TableRow 
                          key={row.id} 
                          onClick={() => onRowClick?.(row.original)}
                          className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <TruckIcon className="size-8 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No orders found</p>
                          {(activeFilterCount > 0 || searchParams.get("search")) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setDynamicFilters({});
                                const params = new URLSearchParams(searchParams);
                                params.delete("search");
                                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                              }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DndContext>
      </div>
      
      {/* Pagination */}
      {enablePagination && totalPages > 0 && (
        <div className="flex items-center justify-between px-4 flex-wrap gap-4">
          <div className="text-muted-foreground text-sm">
            Showing {table.getRowModel().rows.length} of {totalCount} order(s)
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Rows per page</Label>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(value) => setPagination(prev => ({ ...prev, pageSize: Number(value), pageIndex: 0 }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 50, 100].map(size => (
                    <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm whitespace-nowrap">
              Page {pagination.pageIndex + 1} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronsLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
                disabled={pagination.pageIndex === 0}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                disabled={pagination.pageIndex >= totalPages - 1}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPagination(prev => ({ ...prev, pageIndex: totalPages - 1 }))}
                disabled={pagination.pageIndex >= totalPages - 1}
              >
                <ChevronsRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}