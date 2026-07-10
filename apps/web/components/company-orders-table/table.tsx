"use client";

import { useSortable } from "@dnd-kit/sortable";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { GripVerticalIcon, Package, Phone, Truck, User, X, ChevronsUpDown, Check, ChevronDown, Loader2, RefreshCw, Settings2, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Banknote, Search, Printer } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';

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
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { fetchAvailableDrivers } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, OrderStatusBadge } from "./OrderStatusBadge";
import { DriverAssignment } from "./driver-assignment";
import { OrderDetailsView } from "./OrderDetailsView";
import { TimeFromNow } from "./time-from-now";

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
  status: "pending" | "company_accepted" | "driver_accepted" | "preparing" | "ready_for_pickup" | "in_transit" | "delivered" | "declined" | "completed";
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



// ==================== Status Dropdown Component ====================

interface StatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
  paymentStatus?: string;
  canCapturePayment?: boolean;
  onCapturePayment?: () => void;
  isMobile?: boolean;
}

const StatusDropdown = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  paymentStatus,
  canCapturePayment = false,
  onCapturePayment,
  isMobile = false,
}: StatusDropdownProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  console.log(currentStatus, 'CURR')
  const statuses = ['pending', 'company_accepted', 'driver_accepted',  'preparing', 'ready_for_pickup', 'in_transit', 'delivered', 'completed', 'declined'];
  const currentConfig = ORDER_STATUS_CONFIG[currentStatus?.toLowerCase()];

  const handleStatusChange = async (status: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onStatusChange(status);
      setIsOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCapturePayment = async () => {
    if (!onCapturePayment || isUpdating) return;
    setIsUpdating(true);
    try {
      await onCapturePayment();
      setIsOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={isMobile ? "default" : "sm"}
          className={cn(
            "h-8 px-2 hover:bg-transparent",
            isMobile && "h-10 w-full justify-start"
          )}
          disabled={disabled || isUpdating}
        >
          <div className={cn(
            "flex items-center gap-1.5",
            isMobile && "w-full"
          )}>
            <OrderStatusBadge status={currentStatus} showLabel={!isOpen} />
            {!isOpen && currentConfig?.icon && (
              <span className="text-muted-foreground">{currentConfig.icon}</span>
            )}
            <ChevronDown className={cn(
              "h-3 w-3 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
              isMobile && "ml-auto"
            )} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isMobile ? "center" : "start"} 
        className={cn(
          "w-48",
          isMobile && "w-[calc(100vw-2rem)] max-w-[320px]"
        )}
        sideOffset={5}
      >
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map((status) => {
          const config = ORDER_STATUS_CONFIG[status];
          const isActive = currentStatus?.toLowerCase() === status;
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className={cn(
                "gap-2 capitalize cursor-pointer",
                isActive && "bg-muted",
                isUpdating && "opacity-50 pointer-events-none"
              )}
            >
              <span className="flex items-center gap-2 flex-1">
                {config?.icon}
                {config?.label}
              </span>
              {isActive && <Check className="h-3 w-3 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {canCapturePayment && paymentStatus === 'authorized' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCapturePayment}
              className="gap-2 text-blue-600 cursor-pointer"
              disabled={isUpdating}
            >
              <Banknote className="h-4 w-4" />
              Capture Payment
              {isUpdating && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


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



// Customer View Component
function CustomerView({ customer }: { customer: Order["customer"] }) {
  return (
    <>
    {!customer ? 'Guest' : 
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
    }
    </>
  );
}

// ==================== Driver Assignment Component (FIXED) ====================



// ==================== Driver Selection List Component ====================

// interface DriverSelectionListProps {
//   drivers: Driver[];
//   isLoading: boolean;
//   searchQuery: string;
//   onSearchChange: (query: string) => void;
//   onSelect: (driver: Driver | null) => void;
//   currentDriverId?: string | null;
//   onRefresh: () => void;
// }

// function DriverSelectionList({
//   drivers,
//   isLoading,
//   searchQuery,
//   onSearchChange,
//   onSelect,
//   currentDriverId,
//   onRefresh,
// }: DriverSelectionListProps) {
//   const [isRefreshing, setIsRefreshing] = React.useState(false);

//   const handleRefresh = async () => {
//     setIsRefreshing(true);
//     await onRefresh();
//     setIsRefreshing(false);
//   };

//   return (
//     <Command className="rounded-lg border shadow-md">
//       <div className="flex items-center border-b px-3">
//         <CommandInput
//           placeholder="Search drivers..."
//           value={searchQuery}
//           onValueChange={onSearchChange}
//           className="flex-1 border-0 focus:ring-0"
//         />
//         <Button
//           variant="ghost"
//           size="icon"
//           className="size-8 flex-shrink-0"
//           onClick={handleRefresh}
//           disabled={isRefreshing}
//         >
//           <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
//         </Button>
//       </div>
      
//       <CommandList className="max-h-[300px] overflow-y-auto">
//         {isLoading ? (
//           <div className="flex items-center justify-center py-8">
//             <Loader2 className="size-6 animate-spin text-muted-foreground" />
//           </div>
//         ) : drivers.length === 0 ? (
//           <CommandEmpty>
//             <div className="flex flex-col items-center gap-2 py-6">
//               <Truck className="size-8 text-muted-foreground/50" />
//               <p className="text-sm text-muted-foreground">No drivers available</p>
//               <p className="text-xs text-muted-foreground">
//                 {searchQuery ? "Try adjusting your search" : "All drivers are currently busy"}
//               </p>
//             </div>
//           </CommandEmpty>
//         ) : (
//           <CommandGroup heading="Available Drivers">
//             {/* Unassign option - only show if currently assigned */}
//             {currentDriverId && (
//               <CommandItem
//                 onSelect={() => onSelect(null)}
//                 className="text-destructive hover:text-destructive"
//               >
//                 <X className="mr-2 size-4" />
//                 <span>Unassign driver</span>
//               </CommandItem>
//             )}

//             {drivers.map((driver) => (
//               <CommandItem
//                 key={driver.id}
//                 onSelect={() => onSelect(driver)}
//                 className="flex items-center justify-between py-2.5 cursor-pointer"
//               >
//                 <div className="flex items-center gap-3 min-w-0 flex-1">
//                   <div className="flex-shrink-0">
//                     <div className="relative">
//                       <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
//                         <User className="size-4" />
//                       </div>
//                       {driver.status === "available" && (
//                         <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
//                       )}
//                       {driver.status === "busy" && (
//                         <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
//                       )}
//                     </div>
//                   </div>
//                   <div className="min-w-0 flex-1">
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm font-medium truncate">
//                         {driver.name}
//                       </span>
//                       {driver.id === currentDriverId && (
//                         <Badge variant="secondary" className="text-xs h-5 px-1.5">
//                           Current
//                         </Badge>
//                       )}
//                     </div>
//                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                       <Phone className="size-3" />
//                       <span className="truncate">{driver.phone}</span>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2 flex-shrink-0">
//                   <Badge variant="outline" className="text-xs h-5 px-1.5">
//                     {driver.activeDeliveries} active
//                   </Badge>
//                   {driver.rating && (
//                     <span className="text-xs text-amber-500">
//                       ★ {driver.rating.toFixed(1)}
//                     </span>
//                   )}
//                   {driver.id === currentDriverId && (
//                     <Check className="size-4 text-primary" />
//                   )}
//                 </div>
//               </CommandItem>
//             ))}
//           </CommandGroup>
//         )}
//       </CommandList>
//     </Command>
//   );
// }

// ==================== Updated Table Columns with Status Dropdown ====================

export function getOrderColumns({
  onAssignDriver,
  onPrint,
  onRowClick,
  companyId,
  onStatusChange,
  onError,
  isMobile = false,
}: {
  onAssignDriver?: (orderId: string, driverId: string | null, driverName: string | null) => void;
  onRowClick?: (order: Order) => void;
  companyId: string;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
  onError?: (error: Error) => void;
  isMobile?: boolean;
  onPrint?: any;
}): ColumnDef<Order>[] {
  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-amber-100 text-amber-800",
      driver_accepted: "bg-blue-100 text-blue-800",
      company_accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-indigo-100 text-indigo-800",
      ready_for_pickup: "bg-cyan-100 text-cyan-800",
      in_transit: "bg-emerald-100 text-emerald-800",
      delivered: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const statusLabels: Record<Order["status"], string> = {
    pending: "Pending",
    driver_accepted: "Driver Accepted",
    company_accepted: "Accepted",
    preparing: "Preparing",
    ready_for_pickup: "Ready",
    // ready_for_pickup: "Ready for Pickup",
    in_transit: "In Transit",
    delivered: "Delivered",
    declined: "Declined",
    completed: "Completed",
  };


  // For mobile, we combine everything into a single cell
  if (isMobile) {
    return [
      {
        id: "expand",
        header: () => null,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex flex-col gap-2 p-2 w-full">
              <div className="flex items-center justify-between">
                <OrderDetailsView order={order} />
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(order.status)}>
                    {statusLabels[order.status]}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onRowClick?.(order)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5">
                        <StatusDropdown
                          currentStatus={order.status}
                          onStatusChange={(status) => onStatusChange?.(order.id, status)}
                          paymentStatus={order.paymentStatus}
                          canCapturePayment={order.canCapturePayment}
                          isMobile
                        />
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Cancel Order
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p className="font-medium truncate">{order.customer?.first_name} {order.customer?.last_name}</p>
                </div>

                <TimeFromNow date={row.original.delivery?.eta} />
                <div className="text-primary">{row.original.metadata.isTakeOut && 'Takeout' }</div>

                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-medium">₱{order.total.toLocaleString()}</p>
                </div>
                <div className="col-span-2 w-full space-between d-flex">
                  {/* <DriverAssignment
                  
                    order={row.original}
                    currentDriver={row.original.assignedDriverId}
                    currentDriverId={row.original.assignedDriverId}
                    companyId={companyId}
                    onAssign={(driverId, driverName) => {
                      onAssignDriver?.(row.original.id, driverId, driverName);
                      row.original.assignedDriver = driverName;
                      row.original.assignedDriverId = driverId;
                    }}
                    onError={onError}
                  /> */}
                <Button onClick={() => onPrint(order)}>
                  <Printer/>
                </Button>
                </div>
                
              </div>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 400,
      },
    ];
  }

  // Desktop columns
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
      cell: ({ row }) => <div>{row.original.totalQuantity || row.original.quantity}</div>,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <div className="font-medium">₱{row.original.total.toLocaleString()}</div>
      ),
    },
    {
      accessorKey: "eta",
      header: "ETA",
      cell: ({ row }) => (
        <div>
<TimeFromNow date={row.original.delivery?.eta} />
<div className="text-primary">{row.original.metadata.isTakeOut && 'Takeout' }</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusDropdown
          currentStatus={row.original.status}
          onStatusChange={(status) => onStatusChange?.(row.original.id, status)}
          paymentStatus={row.original.paymentStatus}
          canCapturePayment={row.original.canCapturePayment}
        />
      ),
    },
    // {
    //   accessorKey: "assignedDriver",
    //   header: "Driver",
    //   cell: ({ row }) => (
    //     <DriverAssignment
    //       order={row.original}
    //       currentDriver={row.original.assignedDriverId}
    //       currentDriverId={row.original.assignedDriverId}
    //       companyId={companyId}
    //       onAssign={(driverId, driverName) => {
    //         onAssignDriver?.(row.original.id, driverId, driverName);
    //         row.original.assignedDriver = driverName;
    //         row.original.assignedDriverId = driverId;
    //       }}
    //       onError={onError}
    //     />
    //   ),
    // },
   
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onRowClick?.(row.original)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <StatusDropdown
                currentStatus={row.original.status}
                onStatusChange={(status) => onStatusChange?.(row.original.id, status)}
                paymentStatus={row.original.paymentStatus}
                canCapturePayment={row.original.canCapturePayment}
              />
            </div>
            <DropdownMenuSeparator />
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
  data: any;
  totalCount: number;
  isLoading?: boolean;
  onAssignDriver?: (orderId: string, driverId: string | null, driverName: string | null) => void;
  onRefresh?: () => void;
  onRowClick?: (order: Order) => void;
  onBulkAction?: (action: string, selectedOrders: Order[]) => void;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
  enableDragDrop?: boolean;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  companyId?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onPrint?: (query: string) => void;
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
  onStatusChange,
  enableDragDrop = true,
  enableColumnVisibility = true,
  enableRowSelection = true,
  searchQuery = "",
  onSearchChange,
  onPrint,
}: OrdersTableProps) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );


  const columns = React.useMemo(
    () => getOrderColumns({ 
      onAssignDriver, 
      onRowClick, 
      companyId, 
      onStatusChange,
      isMobile,
      onPrint
    }),
    [onAssignDriver, onRowClick, companyId, onStatusChange, isMobile, onPrint]
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

  // Handle search with debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        onSearchChange?.(localSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, searchQuery, onSearchChange]);

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-8 w-full"
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
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="size-4 mr-2" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          )}

          {enableColumnVisibility && !isMobile && (
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
                    <div
                      key={column.id}
                      className="flex items-center px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => column.toggleVisibility()}
                    >
                      <Checkbox
                        checked={column.getIsVisible()}
                        onCheckedChange={() => column.toggleVisibility()}
                        className="mr-2"
                      />
                      <span className="capitalize">
                        {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                      </span>
                    </div>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {enableRowSelection && selectedCount > 0 && onBulkAction && (
        <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg flex-wrap gap-2">
          <span className="text-sm">{selectedCount} order(s) selected</span>
          <div className="flex gap-2 flex-wrap">
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
                <TableHeader className={isMobile ? "hidden" : ""}>
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
                    enableDragDrop && !isMobile ? (
                      <SortableContext items={data.map(d => d.id)} strategy={verticalListSortingStrategy}>
                        {table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onRowClick?.(row.original)}
                          >
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id} className={isMobile ? "p-0" : ""}>
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
                            <TableCell key={cell.id} className={isMobile ? "p-0" : ""}>
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
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm hidden sm:inline">Rows</span>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) => {
                setPagination(prev => ({ ...prev, pageSize: Number(value), pageIndex: 0 }));
              }}
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
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
              disabled={pagination.pageIndex >= Math.ceil(totalCount / pagination.pageSize) - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
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