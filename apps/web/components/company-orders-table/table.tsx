"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Settings2,
  Package,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  ShoppingBag,
  PackageCheck,
  Hourglass,
  Ban,
  CircleCheckIcon,
  LoaderIcon,
  LoaderCircle,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "@/lib/utils";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderDetailsView } from "./OrderDetailsView";
import { TimeFromNow } from "./time-from-now";

// ==================== Types ====================

export type OrderStatus = 
  | "pending"
  | "company_accepted"
  | "driver_accepted"
  | "preparing"
  | "ready_for_pickup"
  | "in_transit"
  | "delivered"
  | "completed"
  | "declined";

export interface Order {
  id: string;
  display_id: string;
  orderNumber: string;
  customer: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
  };
  address: {
    street: string;
    city: string;
    barangay?: string;
  };
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  quantity: number;
  totalQuantity?: number;
  total: number;
  status: OrderStatus;
  orderDate: string;
  assignedDriver: string | null;
  assignedDriverId: string | null;
  notes?: string;
  paymentStatus?: string;
  canCapturePayment?: boolean;
  delivery?: {
    eta?: string;
  };
  metadata?: Record<string, any>;
  fulfillment_status?: string; // "fulfilled" or "not_fulfilled"
}

// ==================== Status Tab Configuration ====================

const STATUS_ICONS: Record<OrderStatus | "all", React.ComponentType<{ className?: string }>> = {
  all: Package,
  pending: Clock,
  company_accepted: CheckCircle,
  driver_accepted: Truck,
  preparing: PackageCheck,
  ready_for_pickup: Package,
  in_transit: Truck,
  delivered: CheckCircle,
  completed: CheckCircle,
  declined: XCircle,
};

const STATUS_TABS: Array<{
  value: OrderStatus | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "all", label: "All Orders", icon: Package },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "completed", label: "Completed", icon: CheckCircle },
  { value: "declined", label: "Declined", icon: XCircle },
] as const;

type StatusTabValue = (typeof STATUS_TABS)[number]["value"];

// ==================== Drag Handle ====================

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 cursor-grab text-muted-foreground hover:bg-transparent active:cursor-grabbing"
    >
      <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="3" r="1.5" />
        <circle cx="11" cy="3" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="11" cy="8" r="1.5" />
        <circle cx="5" cy="13" r="1.5" />
        <circle cx="11" cy="13" r="1.5" />
      </svg>
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

// ==================== Customer View ====================

function CustomerView({ customer }: { customer: Order["customer"] }) {
  if (!customer) return <span className="text-muted-foreground">Guest</span>;

  return (
    <Button variant="link" className="w-fit px-0 text-left font-medium h-auto p-0">
      {customer.first_name} {customer.last_name}
    </Button>
  );
}

// ==================== Columns Definition ====================

function getOrderColumns({
  isLoading,
  onAcceptOrder,
  onCompleteOrder,
  onPrint,
  onRowClick,
  companyId,
  onStatusChange,
  onError,
  isMobile = false,
  processingOrderIds = new Set<string>(),
  getStockLocationId = (order: Order) => order.metadata?.stock_location_id,
  defaultStockLocationId,
}: {
  onCompleteOrder?: any;
  onAcceptOrder?: (orderId: string, stockLocationId: string) => Promise<void>;
  onPrint?: (order: Order) => void;
  onRowClick?: (order: Order) => void;
  companyId: string;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
  onError?: (error: Error) => void;
  isMobile?: boolean;
  processingOrderIds?: Set<string>;
  getStockLocationId?: (order: Order) => string | undefined;
  defaultStockLocationId?: string;
  isLoading?: any;
}) {
  // Helper to render Accept/Print cell for both views
  const renderAcceptPrintCell = (order: any) => {
    const isFulfilled = order.fulfillment_status === "fulfilled" || order?.delivery_status === "delivered";
    const isProcessing = order?.delivery_status == "company_preparing";
    const stockLocationId = getStockLocationId(order) || defaultStockLocationId;
    
    if (isProcessing || isFulfilled) {
      // Already accepted: show Print icon
      return (
        < >
         {!isFulfilled &&
                <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1"
          onClick={(e) => {
            onCompleteOrder?.(order, stockLocationId);
          }}
        >

          <span>Complete</span>
        </Button>
        }
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(e) => {
            e.stopPropagation();
            onPrint?.(order);
          }}
        >
          <Printer className="size-4" />
          <span className="sr-only">Print</span>
        </Button>

       
        </>
        
      );
    }

    // Not fulfilled: show Accept button or spinner
    const handleAccept = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onAcceptOrder) return;
      if (!stockLocationId) {
        onError?.(new Error("No stock location available for this order"));
        return;
      }
      try {
        await onAcceptOrder(order.id, stockLocationId);
      } catch (err) {
        onError?.(err as Error);
      }
    };

    return (
      <>  
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        onClick={handleAccept}
        disabled={isProcessing || !stockLocationId}
      >
        {isProcessing ? (
          <>
            <LoaderCircle className="size-3 animate-spin" />
            <span className="sr-only">Processing</span>
          </>
        ) : (
          <>
            <span>Accept</span>
          </>
        )}
      </Button>
      
              <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(e) => {
            e.stopPropagation();
            onPrint?.(order);
          }}
        >
          <Printer className="size-4" />
          <span className="sr-only">Print</span>
        </Button>
      </>
    
    );
  };

  // Mobile columns – compact card layout
  if (isMobile) {
    return [
      {
        id: "mobile_card",
        header: () => null,
        cell: ({ row }: { row: any }) => {
          const order = row.original as any;
          const isFulfilled = order.fulfillment_status === "fulfilled" || order?.delivery_status === "delivered";
          const isProcessing = order?.delivery_status == "company_preparing";

          return (
            <div className="flex flex-col gap-2 p-3 w-full">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <OrderDetailsView order={order} />
                {/* <OrderStatusBadge status={order.status} /> */}
                            <Badge variant="outline" className="px-1.5 text-muted-foreground">
                  {isFulfilled ? (
                    <CheckCircle className="fill-green-500 stroke-primary-foreground dark:fill-green-600" />
                  ) : isProcessing ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <span>Pending</span>
                  )}
                  {isFulfilled ? " Completed" : isProcessing ? " Processing" : ""}
                </Badge>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Customer</span>
                  <p className="font-medium truncate">
                    {order.customer?.first_name} {order.customer?.last_name}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Total</span>
                  <p className="font-medium">₱{order.total.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">ETA</span>
                  <TimeFromNow date={order.delivery?.eta} />
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Type</span>
                  <p className="text-primary text-xs">
                    {order.metadata?.isTakeOut ? "Takeout" : "Dine-in"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t">
                  {renderAcceptPrintCell(order)}


              </div>
              {order?.metadata?.notes && 
            <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground text-xs">NOTES:</span>
                    <span className="text-muted-foreground text-xs">{order?.metadata?.notes}</span>
                </div> 
                }
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }

  // Desktop columns
  return [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }: { row: any }) => <DragHandle id={row.original.id} />,
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "select",
      header: ({ table }: { table: any }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: { row: any }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }: { row: any }) => <OrderDetailsView order={row.original} />,
      enableHiding: false,
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }: { row: any }) => <CustomerView customer={row.original.customer} />,
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }: { row: any }) => (
        <span>{row.original.totalQuantity || row.original.quantity}</span>
      ),
      size: 60,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }: { row: any }) => (
        <span className="font-medium">₱{row.original.total.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: "eta",
      header: "ETA",
      cell: ({ row }: { row: any }) => (
        <div>
          <TimeFromNow date={row.original.delivery?.eta} />
          {row.original.metadata?.isTakeOut && (
            <span className="text-primary text-xs block">Takeout</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: any }) => {
        const order = row.original;
          const isFulfilled = order.fulfillment_status === "fulfilled" || order.delivery_status === "delivered";
          const isProcessing = order?.delivery_status == "company_preparing";

          console.log(isFulfilled, order, 'orddss')
        return (
          <Badge variant="outline" className="px-1.5 text-muted-foreground">
            {isFulfilled ? (
              <CheckCircle className="fill-green-500 stroke-primary-foreground dark:fill-green-600" />
            ) : isProcessing ? (
              <LoaderCircle className="size-3 animate-spin" />
            ) : (
              <span>Pending</span>
            )}
            {isFulfilled ? " Completed" : isProcessing ? " Processing" : ""}
          </Badge>
        );
      },
    },
    {
      id: "accept_actions",
      header: "Accept / Print",
      cell: ({ row }: { row: any }) => isLoading ? (
              <LoaderCircle className="size-3 animate-spin" />
            ) : renderAcceptPrintCell(row.original),
      enableSorting: false,
      size: 120,
    },
  ];
}

// ==================== Main Orders Table Component ====================

interface OrdersTableProps {
  data: Order[];
  totalCount: number;
  isLoading?: boolean;
  onAssignDriver?: (orderId: string, driverId: string | null, driverName: string | null) => void;
  onRefresh?: () => void;
  onRowClick?: (order: Order) => void;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
  companyId?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onPrint?: (order: Order) => void;
  // New props for Accept/Print
  onAcceptOrder?: (orderId: string, stockLocationId: string) => Promise<any>;
  onCompleteOrder?: any;
  processingOrderIds?: Set<string>;
  defaultStockLocationId?: string;
  getStockLocationId?: (order: Order) => string | undefined;
  onError?: (error: Error) => void;
}

export function CompanyOrdersTable({
  companyId = "",
  data,
  totalCount,
  isLoading = false,
  onAssignDriver,
  onRefresh,
  onRowClick,
  onStatusChange,
  searchQuery = "",
  onSearchChange,
  onPrint,
  onAcceptOrder,
  onCompleteOrder,
  processingOrderIds = new Set<string>(),
  defaultStockLocationId,
  getStockLocationId,
  onError,
}: OrdersTableProps) {
  const [activeTab, setActiveTab] = React.useState<StatusTabValue>("all");
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile viewport
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  // Filter data by active tab
  const filteredByTab = React.useMemo(() => {
    if (activeTab === "all") return data;
    return data.filter((order) => order.status === activeTab);
  }, [data, activeTab]);

  // Count orders per status
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: data.length };
    data.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [data]);

  const columns = React.useMemo(
    () =>
      getOrderColumns({
        isLoading,
        onAcceptOrder,
        onCompleteOrder,
        onPrint,
        onRowClick,
        companyId,
        onStatusChange,
        onError,
        isMobile,
        processingOrderIds,
        getStockLocationId,
        defaultStockLocationId,
      }),
    [
      onAcceptOrder,
      onCompleteOrder,
      onPrint,
      onRowClick,
      companyId,
      onStatusChange,
      onError,
      isMobile,
      processingOrderIds,
      getStockLocationId,
      defaultStockLocationId,
    ]
  );

console.log(defaultStockLocationId, "STOCK LOC")

  const table = useReactTable({
    data: filteredByTab,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      // Handle reorder logic here if needed
    }
  }

  const selectedCount = Object.keys(rowSelection).length;

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        onSearchChange?.(localSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, searchQuery, onSearchChange]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value as StatusTabValue);
        setPagination({ pageIndex: 0, pageSize: pagination.pageSize });
        setRowSelection({});
      }}
      className="w-full flex-col justify-start gap-6"
    >
      {/* Header with tab selector and toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Mobile tab selector */}
        <Select value={activeTab} onValueChange={(value) => setActiveTab(value as StatusTabValue)}>
          <SelectTrigger className="flex @4xl/main:hidden w-fit" size="sm" id="status-selector">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_TABS.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {statusCounts[tab.value] > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {statusCounts[tab.value]}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Desktop tab list */}
        <TabsList className="@4xl/main:flex hidden flex-wrap h-auto gap-1 bg-transparent p-0">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = statusCounts[tab.value] || 0;
            const isActive = activeTab === tab.value;

            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2",
                  "border border-transparent data-[state=active]:border-border",
                  "rounded-md px-3 py-1.5"
                )}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 min-w-[20px] px-1 text-xs",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Toolbar actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-8 w-[200px] h-9"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
            />
            {localSearchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => setLocalSearchQuery("")}
              >
                <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </Button>
            )}
          </div>

          {/* Refresh */}
          {onRefresh && (
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="sr-only">Refresh</span>
            </Button>
          )}

          {/* Column visibility */}
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Settings2 className="size-4" />
                  <span className="sr-only">View options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tab content */}
      <TabsContent value={activeTab} className="relative flex flex-col gap-4 overflow-auto mt-0">
        {/* Selected count bar */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
            <span className="text-sm text-muted-foreground">
              {selectedCount} order(s) selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
              Clear selection
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <div className="relative">
              {/* Loading overlay */}
              {isLoading && filteredByTab.length === 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className={cn("sticky top-0 z-10 bg-muted", isMobile && "hidden")}>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      <SortableContext
                        items={filteredByTab.map((d) => d.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className={cn(
                              "cursor-pointer hover:bg-muted/50",
                              !isMobile && "**:data-[slot=table-cell]:first:w-8"
                            )}
                            onClick={() => onRowClick?.(row.original)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className={isMobile ? "p-0" : ""}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </SortableContext>
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={table.getVisibleLeafColumns().length}
                          className="h-24 text-center"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Package className="size-8 text-muted-foreground/50" />
                            <p className="text-muted-foreground">
                              {isLoading ? "Loading orders..." : "No orders found"}
                            </p>
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
        <div className="flex items-center justify-between px-2 flex-wrap gap-4">
          <div className="text-muted-foreground text-sm hidden sm:block">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {filteredByTab.length} row(s) selected
          </div>
          <div className="flex w-full items-center gap-4 sm:w-fit">
            {/* Rows per page */}
            <div className="hidden items-center gap-2 sm:flex">
              <Label htmlFor="rows-per-page" className="font-medium text-sm">
                Rows
              </Label>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(value) => {
                  setPagination({ pageIndex: 0, pageSize: Number(value) });
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Page indicator */}
            <div className="flex items-center justify-center font-medium text-sm">
              Page {pagination.pageIndex + 1} of {Math.max(1, Math.ceil(filteredByTab.length / pagination.pageSize))}
            </div>

            {/* Pagination buttons */}
            <div className="ml-auto flex items-center gap-1 sm:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 sm:flex"
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: 0 }))}
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">First page</span>
                <ChevronsLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))
                }
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">Previous page</span>
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))
                }
                disabled={
                  pagination.pageIndex >=
                  Math.ceil(filteredByTab.length / pagination.pageSize) - 1
                }
              >
                <span className="sr-only">Next page</span>
                <ChevronRightIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 sm:flex"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: Math.ceil(filteredByTab.length / pagination.pageSize) - 1,
                  }))
                }
                disabled={
                  pagination.pageIndex >=
                  Math.ceil(filteredByTab.length / pagination.pageSize) - 1
                }
              >
                <span className="sr-only">Last page</span>
                <ChevronsRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}