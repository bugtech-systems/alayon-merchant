"use client";

import { useSortable } from "@dnd-kit/sortable";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { GripVerticalIcon, Package, Phone, Truck, User, X, ChevronsUpDown, Check, ChevronDown, Loader2, RefreshCw, Settings2, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { fetchAvailableDrivers } from "@/lib/data";

// ==================== Types ====================

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
  total: number;
  status: "pending" | "accepted" | "preparing" | "ready" | "in_transit" | "delivered" | "declined";
  orderDate: string;
  assignedDriver: string | null;
  assignedDriverId: string | null;
  notes?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  activeDeliveries: number;
  status: "available" | "busy" | "offline";
  joinedDate?: string;
  rating?: number;
}

// ==================== Components ====================

// Drag Handle Component
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
      <GripVerticalIcon className="size-4" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

// Order Details View Component
function OrderDetailsView({ order }: { order: Order }) {
  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-amber-100 text-amber-800",
      accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-indigo-100 text-indigo-800",
      ready: "bg-cyan-100 text-cyan-800",
      in_transit: "bg-emerald-100 text-emerald-800",
      delivered: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left font-medium text-foreground">
          {order.display_id}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order {order.display_id}</DialogTitle>
          <DialogDescription>View complete order details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Information */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <User className="size-4" />
              Customer Information
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{order?.customer?.first_name} {order?.customer?.last_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{order?.customer?.phone}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Address:</span>
                <p className="font-medium">
                  {order?.address?.street}, {order?.address?.barangay}, {order?.address?.city}
                </p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Package className="size-4" />
              Order Details
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Quantity:</span>
                <p className="font-medium">{order.quantity} units</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <p className="font-medium">₱{order.total.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge className={`ml-1 ${getStatusColor(order.status)}`}>
                  {order.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Order Date:</span>
                <p className="font-medium">{order.orderDate}</p>
              </div>
            </div>

            {/* Items List */}
            {order.items.length > 0 && (
              <div className="mt-3">
                <span className="text-muted-foreground text-sm">Items:</span>
                <div className="mt-1 space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm border-b last:border-0 py-1">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₱{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Driver Assignment */}
          {order.assignedDriver && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium flex items-center gap-2">
                <Truck className="size-4" />
                Assigned Driver
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{order.assignedDriver}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {order.assignedDriverId || "No contact"}
                </span>
              </div>
            </div>
          )}

          {order.notes && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">Notes</h4>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Customer View Component
function CustomerView({ customer }: { customer: Order["customer"] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left font-medium">
          {customer?.first_name} {customer?.last_name}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customer Information</DialogTitle>
          <DialogDescription>View customer details and contact information</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Name</span>
                <p className="font-medium">{customer?.first_name} {customer?.last_name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Phone</span>
                <p className="font-medium flex items-center gap-2">
                  {customer?.phone}
                  <Button variant="outline" size="sm" className="h-7">
                    <Phone className="size-3 mr-1" />
                    Call
                  </Button>
                </p>
              </div>
              {customer?.email && (
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="font-medium">{customer?.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Driver Assignment Component (FIXED) ====================

interface DriverAssignmentProps {
  orderId: string;
  currentDriver: string | null;
  currentDriverId?: string | null;
  companyId: string;
  onAssign: (driverId: string | null, driverName: string | null) => void;
  onError?: (error: Error) => void;
}

export function DriverAssignment({
  orderId,
  currentDriver,
  currentDriverId,
  companyId,
  onAssign,
  onError,
}: DriverAssignmentProps) {
  const [open, setOpen] = React.useState(false);
  const [isChanging, setIsChanging] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const fetchRef = React.useRef<boolean>(false);

  // Fetch drivers from API - using a ref to prevent multiple calls
  const fetchDrivers = React.useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchRef.current) return;
    
    if (!companyId) return;

    fetchRef.current = true;
    setIsLoading(true);
    
    try {
      const response = await fetchAvailableDrivers();
      
      console.log(response, 'RESPPP DRIRVERE');
      
      // Handle different response structures
      const driversList = Array.isArray(response) ? response : response || [];
      
      // Map API response to Driver type
      const mappedDrivers: Driver[] = driversList.map((driver: any) => ({
        id: driver.id || driver.driver_id,
        name: driver.name || driver.full_name || `${driver.first_name} ${driver.last_name}`,
        phone: driver.phone || driver.phone_number || driver.mobile,
        email: driver.email,
        activeDeliveries: driver.active_deliveries || driver.activeDeliveries || 0,
        status: driver.status || driver.availability || "available",
        rating: driver.rating,
        joinedDate: driver.joined_date || driver.created_at,
      }));

      setDrivers(mappedDrivers);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      onError?.(error instanceof Error ? error : new Error("Failed to load drivers"));
      toast.error("Failed to load available drivers");
    } finally {
      setIsLoading(false);
      fetchRef.current = false;
    }
  }, [companyId, onError]);

  // Fetch drivers when popover opens - with proper guards
  React.useEffect(() => {
    if (open && !hasLoaded && !isLoading && !fetchRef.current) {
      fetchDrivers();
    }
  }, [open, hasLoaded, isLoading, fetchDrivers]);

  // Reset hasLoaded when component unmounts or companyId changes
  React.useEffect(() => {
    return () => {
      setHasLoaded(false);
      fetchRef.current = false;
    };
  }, [companyId]);

  // Filter drivers based on search query
  const filteredDrivers = React.useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    
    const query = searchQuery.toLowerCase().trim();
    return drivers.filter(
      (driver) =>
        driver.name.toLowerCase().includes(query) ||
        driver.phone.includes(query) ||
        driver.id.toLowerCase().includes(query)
    );
  }, [drivers, searchQuery]);

  // Available drivers (not busy or offline)
  const availableDrivers = React.useMemo(() => {
    return filteredDrivers.filter(driver => driver.status !== "offline");
  }, [filteredDrivers]);

  const handleDriverSelect = async (driver: Driver | null) => {
    if (isChanging) return;
    setIsChanging(true);

    try {
      if (!driver) {
        // Unassign driver
        onAssign(null, null);
        toast.success(`Driver unassigned from order ${orderId}`);
      } else {
        // Assign driver
        onAssign(driver.id, driver.name);
        toast.success(`${driver.name} assigned to order ${orderId}`);
      }
    } catch (error) {
      toast.error("Failed to assign driver. Please try again.");
      onError?.(error instanceof Error ? error : new Error("Assignment failed"));
    } finally {
      setIsChanging(false);
      setOpen(false);
    }
  };

  // Get current driver info
  const currentDriverInfo = React.useMemo(() => {
    if (!currentDriverId) return null;
    return drivers.find(d => d.id === currentDriverId) || null;
  }, [drivers, currentDriverId]);

  // If driver is assigned - show with change option
  if (currentDriver) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="size-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {currentDriver}
          </span>
          {currentDriverInfo?.status === "busy" && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 border-amber-500 text-amber-600">
              Busy
            </Badge>
          )}
          {currentDriverInfo?.rating && (
            <span className="text-xs text-muted-foreground">
              ★ {currentDriverInfo.rating.toFixed(1)}
            </span>
          )}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 p-0 hover:bg-muted flex-shrink-0"
              disabled={isChanging}
            >
              <ChevronsUpDown className="size-3.5" />
              <span className="sr-only">Change driver</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="end">
            <DriverSelectionList
              drivers={availableDrivers}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={handleDriverSelect}
              currentDriverId={currentDriverId}
              onRefresh={() => {
                setHasLoaded(false);
                fetchDrivers();
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Unassigned - show assign button
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-36 justify-between"
          disabled={isChanging}
        >
          <span className="text-muted-foreground truncate">Assign driver</span>
          <ChevronsUpDown className="ml-2 size-3.5 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <DriverSelectionList
          drivers={availableDrivers}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleDriverSelect}
          currentDriverId={currentDriverId}
          onRefresh={() => {
            setHasLoaded(false);
            fetchDrivers();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// ==================== Driver Selection List Component ====================

interface DriverSelectionListProps {
  drivers: Driver[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (driver: Driver | null) => void;
  currentDriverId?: string | null;
  onRefresh: () => void;
}

function DriverSelectionList({
  drivers,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelect,
  currentDriverId,
  onRefresh,
}: DriverSelectionListProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <Command className="rounded-lg border shadow-md">
      <div className="flex items-center border-b px-3">
        <CommandInput
          placeholder="Search drivers..."
          value={searchQuery}
          onValueChange={onSearchChange}
          className="flex-1 border-0 focus:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 flex-shrink-0"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>
      
      <CommandList className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : drivers.length === 0 ? (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Truck className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No drivers available</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "All drivers are currently busy"}
              </p>
            </div>
          </CommandEmpty>
        ) : (
          <CommandGroup heading="Available Drivers">
            {/* Unassign option - only show if currently assigned */}
            {currentDriverId && (
              <CommandItem
                onSelect={() => onSelect(null)}
                className="text-destructive hover:text-destructive"
              >
                <X className="mr-2 size-4" />
                <span>Unassign driver</span>
              </CommandItem>
            )}

            {drivers.map((driver) => (
              <CommandItem
                key={driver.id}
                onSelect={() => onSelect(driver)}
                className="flex items-center justify-between py-2.5 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="size-4" />
                      </div>
                      {driver.status === "available" && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                      {driver.status === "busy" && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {driver.name}
                      </span>
                      {driver.id === currentDriverId && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      <span className="truncate">{driver.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs h-5 px-1.5">
                    {driver.activeDeliveries} active
                  </Badge>
                  {driver.rating && (
                    <span className="text-xs text-amber-500">
                      ★ {driver.rating.toFixed(1)}
                    </span>
                  )}
                  {driver.id === currentDriverId && (
                    <Check className="size-4 text-primary" />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

// ==================== Table Columns ====================

export function getOrderColumns({
  onAssignDriver,
  onRowClick,
  companyId,
  onError,
}: {
  onAssignDriver?: (orderId: string, driverId: string | null, driverName: string | null) => void;
  onRowClick?: (order: Order) => void;
  companyId: string;
  onError?: (error: Error) => void;
}): ColumnDef<Order>[] {
  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-amber-100 text-amber-800",
      accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-indigo-100 text-indigo-800",
      ready: "bg-cyan-100 text-cyan-800",
      in_transit: "bg-emerald-100 text-emerald-800",
      delivered: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const statusLabels: Record<Order["status"], string> = {
    pending: "Pending",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    in_transit: "In Transit",
    delivered: "Delivered",
    declined: "Declined",
  };

  return [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => <OrderDetailsView order={row.original} />,
      enableHiding: false,
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => <CustomerView customer={row.original.customer} />,
    },
    {
      accessorKey: "totalQuantity",
      header: "Qty",
      cell: ({ row }) => <div >{row.original.totalQuantity}</div>,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <div className="font-medium">₱{row.original.total.toLocaleString()}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "assignedDriver",
      header: "Driver",
      cell: ({ row }) => (
        <DriverAssignment
          orderId={row.original.id}
          currentDriver={row.original.assignedDriver}
          currentDriverId={row.original.assignedDriverId}
          companyId={companyId}
          onAssign={(driverId, driverName) => {
            onAssignDriver?.(row.original.id, driverId, driverName);
            // Update local data
            row.original.assignedDriver = driverName;
            row.original.assignedDriverId = driverId;
          }}
          onError={onError}
        />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <span className="sr-only">Open menu</span>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRowClick?.(row.original)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>Update Status</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Cancel Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      size: 50,
    },
  ];
}

// ==================== Main Table Component ====================

interface OrdersTableProps {
  data: Order[];
  totalCount: number;
  isLoading?: boolean;
  onAssignDriver?: (orderId: string, driverId: string | null, driverName: string | null) => void;
  onRefresh?: () => void;
  onRowClick?: (order: Order) => void;
  onBulkAction?: (action: string, selectedOrders: Order[]) => void;
  enableDragDrop?: boolean;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  companyId?: string;
}

export function CompanyOrdersTable({
  companyId = "",
  data,
  totalCount,
  isLoading = false,
  onAssignDriver,
  onRefresh,
  onRowClick,
  onBulkAction,
  enableDragDrop = true,
  enableColumnVisibility = true,
  enableRowSelection = true,
}: OrdersTableProps) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const columns = React.useMemo(
    () => getOrderColumns({ onAssignDriver, onRowClick, companyId }),
    [onAssignDriver, onRowClick, companyId]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
  });

  function handleDragEnd(event: DragEndEvent) {
    if (!enableDragDrop) return;
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      toast.info("Order reordered");
    }
  }

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search orders..."
            className="w-64"
          />
          
          <Button variant="outline" size="sm">
            <Filter className="size-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          )}

          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="size-4" />
                  <span className="ml-2 hidden sm:inline">View</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter(col => col.getCanHide())
                  .map(column => (
                    <DropdownMenu
                      key={column.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        column.toggleVisibility();
                      }}
                    >
                      <div className="flex items-center px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
                        <Checkbox
                          checked={column.getIsVisible()}
                          onCheckedChange={() => column.toggleVisibility()}
                          className="mr-2"
                        />
                        <span className="capitalize">
                          {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                        </span>
                      </div>
                    </DropdownMenu>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {enableRowSelection && selectedCount > 0 && onBulkAction && (
        <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
          <span className="text-sm">{selectedCount} order(s) selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onBulkAction("update-status", [])}>
              Update Status
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <div className="relative">
            {isLoading && data.length === 0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id} style={{ width: header.getSize() }}>
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
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onRowClick?.(row.original)}
                          >
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </SortableContext>
                    ) : (
                      table.getRowModel().rows.map(row => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onRowClick?.(row.original)}
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
                          <Package className="size-8 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No orders found</p>
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
      <div className="flex items-center justify-between px-4 flex-wrap gap-4">
        <div className="text-muted-foreground text-sm">
          Showing {table.getRowModel().rows.length} of {totalCount} orders
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows</span>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) => setPagination(prev => ({ ...prev, pageSize: Number(value), pageIndex: 0 }))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map(size => (
                  <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm">
            Page {pagination.pageIndex + 1} of {Math.ceil(totalCount / pagination.pageSize)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
              disabled={pagination.pageIndex >= Math.ceil(totalCount / pagination.pageSize) - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.ceil(totalCount / pagination.pageSize) - 1 }))}
              disabled={pagination.pageIndex >= Math.ceil(totalCount / pagination.pageSize) - 1}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}