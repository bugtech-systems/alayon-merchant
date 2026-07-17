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
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import { ORDER_STATUS_CONFIG, OrderStatusBadge } from "./OrderStatusBadge";
import { OrderDetailsView } from "./OrderDetailsView";
import { TimeFromNow } from "./time-from-now";
import { StatusDropdown } from "./StatusDropdown";

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
}

// ==================== Status Tab Configuration ====================

// ✅ Define icon mapping separately to avoid undefined issues
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

// ✅ Define tabs with safe icon references
const STATUS_TABS: Array<{
  value: OrderStatus | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "all", label: "All Orders", icon: Package },
  { value: "pending", label: "Pending", icon: Clock },
  // { value: "preparing", label: "Preparing", icon: PackageCheck },
  // { value: "ready_for_pickup", label: "Ready", icon: Package },
  // { value: "in_transit", label: "In Transit", icon: Truck },
  // { value: "delivered", label: "Delivered", icon: CheckCircle },
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
  onAssignDriver,
  onPrint,
  onRowClick,
  companyId,
  onStatusChange,
  isMobile = false,
}: {
  onAssignDriver?: (orderId: string, driverId: string | null, driverName: string | null) => void;
  onRowClick?: (order: Order) => void;
  companyId: string;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
  onError?: (error: Error) => void;
  isMobile?: boolean;
  onPrint?: (order: Order) => void;
}) {
  // Mobile columns - compact card layout
  if (isMobile) {
    return [
      {
        id: "mobile_card",
        header: () => null,
        cell: ({ row }: { row: any }) => {
          const order = row.original as Order;
          const config = ORDER_STATUS_CONFIG[order.status];

          return (
            <div className="flex flex-col gap-2 p-3 w-full">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <OrderDetailsView order={order} />
                <OrderStatusBadge status={order.status} />
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
                <Badge variant="outline" className="px-1.5 text-muted-foreground">
                        {(row.original.status == "completed" || row.original.status == 'delivered') ? (
                          <CircleCheckIcon className="fill-green-500 stroke-primary-foreground dark:fill-green-600" />
                        ) : (
                          <LoaderIcon />
                        )}
                        {row.original.status}
                        {console.log(row.original.status, 'stattsss')}
                      </Badge>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => onPrint?.(order)}>
                    <Printer className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => onRowClick?.(order)}>
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
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
      cell: ({ row }: { row: any }) => (
              <Badge variant="outline" className="px-1.5 text-muted-foreground">
         {(row.original.status == "completed" || row.original.status == 'delivered') ? (
                          <CircleCheckIcon className="fill-green-500 stroke-primary-foreground dark:fill-green-600" />
                        ) : (
                          <LoaderIcon />
                        )}
        {row.original.status}
      </Badge>
        // <StatusDropdown
        //   currentStatus={row.original.status}
        //   onStatusChange={(status) => onStatusChange?.(row.original.id, status)}
        //   paymentStatus={row.original.paymentStatus}
        //   canCapturePayment={row.original.canCapturePayment}
        // />
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }: { row: any }) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(e) => {
            e.stopPropagation();
            onPrint?.(row.original);
          }}
        >
          <Printer className="size-4" />
          <span className="sr-only">Print</span>
        </Button>
      ),
      enableSorting: false,
      size: 50,
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
        onAssignDriver,
        onRowClick,
        companyId,
        onStatusChange,
        isMobile,
        onPrint,
      }),
    [onAssignDriver, onRowClick, companyId, onStatusChange, isMobile, onPrint]
  );

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
            const Icon = tab.icon; // ✅ Icon is always defined
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
                {/* ✅ Icon is guaranteed to exist */}
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