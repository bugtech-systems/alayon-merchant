"use client";
"use no memo";

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
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
  type VisibilityState,
  type Row,
} from "@tanstack/react-table";
import { ChevronDownIcon, ListFilter, XIcon, PackageIcon, TruckIcon, UserIcon, PhoneIcon, MapPinIcon, CalendarIcon, TrendingUpIcon } from "lucide-react";
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// Status configurations
const statusConfig = {
  pending: { label: "Pending", variant: "secondary" },
  company_declined: { label: "Company Declined", variant: "destructive" },
  company_accepted: { label: "Company Accepted", variant: "default" },
  pickup_claimed: { label: "Pickup Claimed", variant: "outline" },
  company_preparing: { label: "Company Preparing", variant: "outline" },
  ready_for_pickup: { label: "Ready for Pickup", variant: "default" },
  in_transit: { label: "In Transit", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
  completed: { label: "Completed", variant: "success" },
} as const;

// Stock health bar slots
const stockHealthSlots = Array.from({ length: 10 }, (_, index) => ({
  id: `stock-slot-${index + 1}`,
  threshold: index + 1,
}));

// Helper to convert remaining stock to health score (0-10)
function getStockHealthScore(remainingStock: number, previousOrderQty: number) {
  if (remainingStock <= 0) return 0;
  const percentage = (remainingStock / previousOrderQty) * 100;
  if (percentage >= 80) return 10;
  if (percentage >= 60) return 8;
  if (percentage >= 40) return 6;
  if (percentage >= 20) return 4;
  return 2;
}

// Get status color for badge
function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    company_declined: "bg-red-100 text-red-800 border-red-200",
    company_accepted: "bg-blue-100 text-blue-800 border-blue-200",
    pickup_claimed: "bg-purple-100 text-purple-800 border-purple-200",
    company_preparing: "bg-indigo-100 text-indigo-800 border-indigo-200",
    ready_for_pickup: "bg-cyan-100 text-cyan-800 border-cyan-200",
    in_transit: "bg-emerald-100 text-emerald-800 border-emerald-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-green-100 text-green-800 border-green-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

// Types
export interface WaterDeliveryOrder {
  id: string;
  orderNumber: string;
  customer: string;
  customerPhone: string;
  location: string;
  address: string;
  quantity: number;
  total: number;
  status: keyof typeof statusConfig;
  orderDate: string;
  assignedDriver: string | null;
  assignedDriverId: string | null;
  remainingStock: number;
  previousOrderQty: number;
}

// Get status label
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Pending",
    company_declined: "Declined",
    company_accepted: "Accepted",
    pickup_claimed: "Pickup Claimed",
    company_preparing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    in_transit: "In Transit",
    delivered: "Delivered",
    completed: "Delivered",
  };
  return labels[status] || status;
};

// Column Definitions
export const waterDeliveryColumns = [
  {
    id: "select",
    header: ({ table }: { table: any }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all orders"
        />
      </div>
    ),
    cell: ({ row }: { row: any }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select order ${row.original.orderNumber}`}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }: { row: any }) => {
    const fullNumber = row.original.latest_order?.delivery?.id || row.original.latest_order?.id;
    const last4 = fullNumber?.slice(-4) || row.original._display.last_order_number || 'N/A';
    
      return (
      <div className="flex items-center gap-2">
        <PackageIcon className="size-3.5 text-muted-foreground" />
        <span className="font-mono text-sm font-medium">
          #{last4}
        </span>
      </div>
    )
  },
    size: 120,
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }: { row: any }) => {
      console.log(row, 'ROWWW')
      const initials = row.original.customer.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials || <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{row.original.customer}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <PhoneIcon className="size-3" />
              {row.original.phone}
            </span>
          </div>
        </div>
      );
    },
    size: 200,
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }: { row: any }) => (
      <div className="flex items-center gap-2">
        <MapPinIcon className="size-3.5 text-muted-foreground" />
        <span className="text-sm">{row.original._display.shipping_city}</span>
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: any }) => {
      const status = row.original.status || row.original?._display?.latest_order_status;
      console.log(status, 'STATSS')
      return (
        <Badge className={`${getStatusColor(status)} border`}>
          {getStatusLabel(status)}
        </Badge>
      );
    },
    filterFn: "equalsString",
    size: 140,
  },
  {
    accessorKey: "stockHealth",
    header: "Stock Bar",
    cell: ({ row }: { row: any }) => {
      const { remainingStock, previousOrderQty } = row.original?.stock_health;
      console.log(remainingStock, previousOrderQty, 'ORGG')
      const healthScore = getStockHealthScore(previousOrderQty, previousOrderQty);
      const percentage = Math.round((previousOrderQty / previousOrderQty) * 100);
      
      return (
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-0.5" title={`${remainingStock} units remaining from previous order`}>
            <span className="sr-only">
              Stock health: {percentage}% remaining
            </span>
            {stockHealthSlots.map((slot) => (
              <div
                key={`${row.original.id}-${slot.id}`}
                className={cn(
                  "h-5 w-1.5 rounded-full transition-colors duration-300",
                  slot.threshold <= healthScore 
                    ? "bg-emerald-500" 
                    : healthScore <= 2 
                      ? "bg-red-500/20"
                      : "bg-emerald-500/20"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium tabular-nums">
            {percentage}%
          </span>
        </div>
      );
    },
    filterFn: (row: any, _: any, filterValue: string) => {
      const { remainingStock, previousOrderQty } = row.original;
      console.log(row.original, 'flterr')
      const percentage = (remainingStock / previousOrderQty) * 100;
      
      switch (filterValue) {
        case "high":
          return percentage >= 60;
        case "medium":
          return percentage >= 30 && percentage < 60;
        case "low":
          return percentage < 30;
        default:
          return true;
      }
    },
    size: 160,
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Qty</div>,
    cell: ({ row }: { row: any }) => (
      <div className="text-right tabular-nums">
        {row.original.stock_health.previousOrderQty}
      </div>
    ),
    size: 80,
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }: { row: any }) => (
      <div className="text-right font-medium tabular-nums">
        ₱{row.original.latest_order?.total
        // .toLocaleString(undefined, {
        //   minimumFractionDigits: 2,
        //   maximumFractionDigits: 2,
        // })
        }
      </div>
    ),
    size: 120,
  },

  // {
  //   accessorKey: "orderDate",
  //   header: "Last Order Date",
  //   cell: ({ row }: { row: any }) => (
  //     <div className="flex items-center gap-2 text-sm">
  //       <CalendarIcon className="size-3.5 text-muted-foreground" />
  //       <span>{ row.original.last_order_at}</span>
  //     </div>
  //   ),
  //   size: 130,
  // },

// In your column definition
{
  accessorKey: "last_order_at",
  header: "Last Order",
  cell: ({ row }) => {
    const date = row.original.last_order_at;
    if (!date) return <span className="text-muted-foreground">Never</span>;
    
    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date;
      return (
        <span title={format(parsedDate, 'PPP pp')}>
          {formatDistanceToNow(parsedDate, { addSuffix: true })}
        </span>
      );
    } catch {
      return <span className="text-muted-foreground">Invalid date</span>;
    }
  },
}
] as const;

// Status options for filtering
const statusOptions = [
  "all",
  "pending",
  "company_declined",
  "company_accepted",
  "pickup_claimed",
  "company_preparing",
  "ready_for_pickup",
  "in_transit",
  "delivered",
] as const;

// Stock health filter options
const stockHealthOptions = ["all", "high", "medium", "low"] as const;

function preventPaginationNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

interface WaterDeliveryOrdersSectionProps {
  data?: WaterDeliveryOrder[];
  onOrderClick?: (order: WaterDeliveryOrder) => void;
  onAssignDriver?: (orderId: string, driverName: string) => void;
  onUpdateStatus?: (orderId: string, status: WaterDeliveryOrder["status"]) => void;
}

export function WaterDeliveryOrdersSection({
  data: initialData = [],
  onOrderClick,
  onAssignDriver,
  onUpdateStatus,
}: WaterDeliveryOrdersSectionProps) {
  const [data, setData] = React.useState<WaterDeliveryOrder[]>(initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedOrder, setSelectedOrder] = React.useState<WaterDeliveryOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  );


  console.log(data, 'DATAA')
  const table = useReactTable({
    data: data,
    columns: waterDeliveryColumns as any,
    state: {
      rowSelection,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  // Simulate loading
  React.useEffect(() => {
    if (initialData.length > 0) {
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [initialData]);

  // Handle row click to show details
  const handleRowClick = React.useCallback((order: WaterDeliveryOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
    onOrderClick?.(order);
  }, [onOrderClick]);

  // Handle drag end
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = currentData.findIndex((item) => item.id === active.id);
        const newIndex = currentData.findIndex((item) => item.id === over.id);
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  }, []);

  // Handle drag start
  const handleDragStart = React.useCallback(() => {
    setIsDragging(true);
  }, []);

  const searchQuery = table.getState().globalFilter ?? "";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) ?? "all";
  const stockHealthFilter = (table.getColumn("stockHealth")?.getFilterValue() as string) ?? "all";
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();
  const filteredOrderCount = table.getFilteredRowModel().rows.length;
  const visibleOrderCount = table.getRowModel().rows.length;

  const pageNumbers = React.useMemo(() => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    if (currentPage <= 2) return [1, 2, 3];
    if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount];

    return [currentPage - 1, currentPage, currentPage + 1];
  }, [currentPage, pageCount]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Delivery Orders</CardTitle>
          <CardDescription>Loading orders...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
                <div className="h-6 w-20 bg-muted rounded" />
                <div className="h-6 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }


  console.log(selectedOrder, 'SLECTTED')
  return (
    <section>
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="leading-none flex items-center gap-2">
              Water Delivery Orders
              <Badge variant="secondary" className="ml-2">
                {filteredOrderCount}
              </Badge>
              {isDragging && (
                <Badge variant="outline" className="ml-2 animate-pulse">
                  Drag to reorder
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Track and manage water delivery orders across all statuses, from pending to delivery.
            </CardDescription>
          </div>

          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Input
                  className="h-9 w-full sm:w-44 md:w-52 pr-8"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(event) => {
                    table.setGlobalFilter(event.target.value || undefined);
                    table.setPageIndex(0);
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      table.setGlobalFilter(undefined);
                      table.setPageIndex(0);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <ListFilter data-icon="inline-start" />
                    Status
                    <ChevronDownIcon data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup
                    value={statusFilter}
                    onValueChange={(value) => {
                      table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value);
                      table.setPageIndex(0);
                    }}
                  >
                    {statusOptions.map((option) => (
                      <DropdownMenuRadioItem key={option} value={option}>
                        {option === "all" ? "All statuses" : getStatusLabel(option)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <ListFilter data-icon="inline-start" />
                    Stock Health
                    <ChevronDownIcon data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuRadioGroup
                    value={stockHealthFilter}
                    onValueChange={(value) => {
                      table.getColumn("stockHealth")?.setFilterValue(value === "all" ? undefined : value);
                      table.setPageIndex(0);
                    }}
                  >
                    <DropdownMenuRadioItem value="all">All stock levels</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="high">High (≥60%)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">Medium (30-59%)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="low">Low (&lt;30%)</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          <div className="overflow-hidden">
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              sensors={sensors}
              id={sortableId}
            >
              <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4 **:data-[slot='table-cell']:py-3">
                <TableHeader className="border-t **:data-[slot='table-head']:h-10 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot='table-row']:border-border/50">
                  {table.getRowModel().rows.length ? (
                    <SortableContext items={data.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRowClick(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </SortableContext>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <PackageIcon className="size-8 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No orders found matching your filters.</p>
                          {(statusFilter !== "all" || stockHealthFilter !== "all" || searchQuery) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                table.getColumn("status")?.setFilterValue(undefined);
                                table.getColumn("stockHealth")?.setFilterValue(undefined);
                                table.setGlobalFilter(undefined);
                                table.setPageIndex(0);
                              }}
                            >
                              Clear all filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>

          {filteredOrderCount > 0 && (
            <div className="flex items-center justify-between gap-4 px-4 pb-1">
              <p className="text-muted-foreground text-sm">
                Showing {visibleOrderCount} of {filteredOrderCount} orders
              </p>

              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent className="gap-1.5">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        preventPaginationNavigation(event);
                        table.previousPage();
                      }}
                    />
                  </PaginationItem>
                  {pageNumbers[0] > 1 ? (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : null}
                  {pageNumbers.map((pageNumber) => (
                    <PaginationItem key={`page-${pageNumber}`}>
                      <PaginationLink
                        href="#"
                        isActive={table.getState().pagination.pageIndex === pageNumber - 1}
                        onClick={(event) => {
                          preventPaginationNavigation(event);
                          table.setPageIndex(pageNumber - 1);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  {pageNumbers[pageNumbers.length - 1] < pageCount ? (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : null}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        preventPaginationNavigation(event);
                        table.nextPage();
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Order Details</SheetTitle>
            <SheetDescription>
              View complete order information and manage delivery
            </SheetDescription>
          </SheetHeader>
          {selectedOrder && (
            <div className="py-6 space-y-6">
              {/* Order Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PackageIcon className="size-5" />
                    Order #{selectedOrder.orderNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedOrder.customer} • {selectedOrder.customerPhone}
                  </p>
                </div>
                <Badge className={`${getStatusColor(selectedOrder.status)} border`}>
                  {getStatusLabel(selectedOrder.status)}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="grid gap-4 p-4 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  <UserIcon className="size-4" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Name</p>
                    <p className="font-medium">{selectedOrder.customer}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p className="font-medium">{selectedOrder.customerPhone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Address</p>
                    <p className="font-medium">{selectedOrder.address}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid gap-4 p-4 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  <TruckIcon className="size-4" />
                  Delivery Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Quantity</p>
                    <p className="font-medium">{selectedOrder.quantity} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="font-medium">₱{selectedOrder.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Stock Health</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-end gap-0.5">
                        {stockHealthSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={cn(
                              "h-5 w-1.5 rounded-full transition-colors",
                              slot.threshold <= getStockHealthScore(selectedOrder.remainingStock, selectedOrder.previousOrderQty)
                                ? "bg-emerald-500"
                                : "bg-emerald-500/20"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {Math.round((selectedOrder.remainingStock / selectedOrder.previousOrderQty) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Remaining Stock</p>
                    <p className="font-medium">{selectedOrder.remainingStock} units</p>
                  </div>
                  {selectedOrder.assignedDriver && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Assigned Driver</p>
                      <p className="font-medium flex items-center gap-2">
                        <TruckIcon className="size-3.5" />
                        {selectedOrder.assignedDriver}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Order Date</p>
                    <p className="font-medium flex items-center gap-2">
                      <CalendarIcon className="size-3.5" />
                      {selectedOrder.orderDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1">
                  Update Status
                </Button>
                {selectedOrder.assignedDriver && (
                  <Button variant="outline" className="flex-1">
                    Contact Driver
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}