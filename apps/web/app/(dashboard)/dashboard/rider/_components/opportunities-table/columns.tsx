"use client";
"use no memo";

import { useSortable } from "@dnd-kit/sortable";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { Check, ChevronsUpDown, EllipsisVerticalIcon, GripVerticalIcon, Package, Phone, Truck, User, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import type { WaterDeliveryOrder } from "./schema";

// Status variants for badges
const statusConfig = {
  pending: { label: "Pending", variant: "secondary" },
  company_declined: { label: "Company Declined", variant: "destructive" },
  company_accepted: { label: "Company Accepted", variant: "default" },
  pickup_claimed: { label: "Pickup Claimed", variant: "outline" },
  company_preparing: { label: "Company Preparing", variant: "outline" },
  ready_for_pickup: { label: "Ready for Pickup", variant: "default" },
  in_transit: { label: "In Transit", variant: "default" },
  delivered: { label: "Delivered", variant: "success" },
} as const;

// Mock data for available drivers
const availableDrivers = [
  { id: "DRV-001", name: "Juan Dela Cruz", phone: "+63 912 345 6789", activeDeliveries: 3 },
  { id: "DRV-002", name: "Maria Santos", phone: "+63 923 456 7890", activeDeliveries: 2 },
  { id: "DRV-003", name: "Reynaldo Mendoza", phone: "+63 934 567 8901", activeDeliveries: 1 },
  { id: "DRV-004", name: "Carmina Villanueva", phone: "+63 945 678 9012", activeDeliveries: 4 },
  { id: "DRV-005", name: "Gregory Ramos", phone: "+63 956 789 0123", activeDeliveries: 2 },
];

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

// Props for the DriverAssignment component
interface DriverAssignmentProps {
  orderId: string;
  currentDriver: string | null;
  onDriverChange?: (orderId: string, driverName: string | null, driverId: string | null) => void;
}

// DragHandle Component with proper styling
function DragHandle({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });

  return (
    <div ref={setNodeRef} className="flex items-center justify-center">
      <Button
        {...attributes}
        {...listeners}
        variant="ghost"
        size="icon"
        className={cn(
          "size-7 cursor-grab text-muted-foreground hover:bg-transparent active:cursor-grabbing",
          isDragging && "opacity-50"
        )}
      >
        <GripVerticalIcon className="size-4" />
        <span className="sr-only">Drag to reorder</span>
      </Button>
    </div>
  );
}

// Order Detail Viewer Component
function OrderDetailViewer({ item }: { item: WaterDeliveryOrder }) {
  const isMobile = useIsMobile();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800";
      case "company_accepted": return "bg-blue-100 text-blue-800";
      case "pickup_claimed": return "bg-purple-100 text-purple-800";
      case "company_preparing": return "bg-indigo-100 text-indigo-800";
      case "ready_for_pickup": return "bg-cyan-100 text-cyan-800";
      case "in_transit": return "bg-emerald-100 text-emerald-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "company_declined": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left font-medium text-foreground">
          {item.orderNumber}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>Order {item.orderNumber}</DrawerTitle>
          <DrawerDescription>View and manage order details, assign or change driver.</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="space-y-3">
            {/* Customer Information */}
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 font-medium flex items-center gap-2">
                <User className="size-4" />
                Customer Information
              </h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {item.customer}</p>
                <p><span className="text-muted-foreground">Phone:</span> {item.customerPhone}</p>
                <p><span className="text-muted-foreground">Location:</span> {item.location}</p>
                <p><span className="text-muted-foreground">Address:</span> {item.address}</p>
              </div>
            </div>

            {/* Order Details */}
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 font-medium flex items-center gap-2">
                <Package className="size-4" />
                Order Details
              </h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Quantity:</span> {item.quantity} units</p>
                <p><span className="text-muted-foreground">Total Amount:</span> ₱{item.total.toLocaleString()}</p>
                <p><span className="text-muted-foreground">Status:</span> 
                  <Badge className={`ml-2 ${getStatusColor(item.status)}`}>
                    {item.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </p>
                <p><span className="text-muted-foreground">Order Date:</span> {item.orderDate}</p>
              </div>
            </div>

            {/* Stock Health */}
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 font-medium">Stock Health</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining Stock:</span>
                  <span className="font-medium">{item.remainingStock} units</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Previous Order:</span>
                  <span>{item.previousOrderQty} units</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(item.previousOrderQty > 0 ? (item.remainingStock / item.previousOrderQty) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button>Update Order</Button>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Driver Assignment Component
function DriverAssignment({ orderId, currentDriver, onDriverChange }: DriverAssignmentProps) {
  const [open, setOpen] = React.useState(false);
  const [localDriver, setLocalDriver] = React.useState<string | null>(currentDriver);
  const [isChanging, setIsChanging] = React.useState(false);

  // Sync local state when currentDriver prop changes
  React.useEffect(() => {
    setLocalDriver(currentDriver);
  }, [currentDriver]);

  const handleDriverSelect = React.useCallback(async (driverName: string | null) => {
    if (isChanging) return;
    
    setIsChanging(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!driverName || driverName === "unassigned") {
        setLocalDriver(null);
        onDriverChange?.(orderId, null, null);
        toast.success(`Driver unassigned from order ${orderId}`);
      } else {
        const driver = availableDrivers.find(d => d.name === driverName);
        setLocalDriver(driverName);
        onDriverChange?.(orderId, driverName, driver?.id || null);
        toast.success(`${driverName} assigned to order ${orderId}`);
      }
    } catch (error) {
      toast.error("Failed to assign driver. Please try again.");
    } finally {
      setIsChanging(false);
      setOpen(false);
    }
  }, [orderId, onDriverChange, isChanging]);

  const isAssigned = localDriver && localDriver !== "unassigned";

  // For assigned driver - show with change button using Popover
  if (isAssigned) {
    const currentDriverInfo = availableDrivers.find(d => d.name === localDriver);
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Truck className="size-3 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[100px]">{localDriver}</span>
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 p-0 hover:bg-muted"
              disabled={isChanging}
            >
              <ChevronsUpDown className="size-3.5" />
              <span className="sr-only">Change driver</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search drivers..." />
              <CommandList>
                <CommandEmpty>No drivers found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleDriverSelect("unassigned")}
                    className="text-destructive"
                  >
                    <X className="mr-2 size-4" />
                    <span>Unassign driver</span>
                  </CommandItem>
                  {availableDrivers.map((driver) => (
                    <CommandItem
                      key={driver.id}
                      onSelect={() => handleDriverSelect(driver.name)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          localDriver === driver.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <span>{driver.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {driver.activeDeliveries} active
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // For unassigned - show assign dropdown using Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-36 justify-between"
          disabled={isChanging}
        >
          <span className="text-muted-foreground">Assign driver</span>
          <ChevronsUpDown className="ml-2 size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search drivers..." />
          <CommandList>
            <CommandEmpty>No drivers found.</CommandEmpty>
            <CommandGroup>
              {availableDrivers.map((driver) => (
                <CommandItem
                  key={driver.id}
                  onSelect={() => handleDriverSelect(driver.name)}
                  className="cursor-pointer"
                >
                  <Truck className="mr-2 size-4" />
                  <div className="flex flex-1 items-center justify-between">
                    <span>{driver.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {driver.activeDeliveries} active
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const waterDeliveryColumns: ColumnDef<WaterDeliveryOrder>[] = [
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
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all orders"
        />
      </div>
    ),
    cell: ({ row }) => (
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
    cell: ({ row }) => <OrderDetailViewer item={row.original} />,
    enableHiding: false,
    size: 120,
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="size-3 text-muted-foreground" />
        <span className="text-sm font-medium">{row.original.customer}</span>
      </div>
    ),
    size: 150,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const config = statusConfig[status];
      return (
        <Badge variant={config.variant as any} className="rounded-full px-2.5">
          {config.label}
        </Badge>
      );
    },
    filterFn: "equalsString",
    size: 140,
  },
  {
    accessorKey: "stockHealth",
    header: "Stock Bar",
    cell: ({ row }) => {
      const { remainingStock, previousOrderQty } = row.original;
      const healthScore = getStockHealthScore(remainingStock, previousOrderQty);
      
      return (
        <div className="flex items-end gap-0.5" title={`${remainingStock} units remaining from previous order`}>
          <span className="sr-only">
            Stock health: {Math.round((remainingStock / previousOrderQty) * 100)}% remaining
          </span>
          {stockHealthSlots.map((slot) => (
            <div
              key={`${row.original.id}-${slot.id}`}
              className={cn(
                "h-5 w-1.5 rounded-full transition-colors",
                slot.threshold <= healthScore 
                  ? "bg-emerald-500/85" 
                  : healthScore <= 2 
                    ? "bg-red-500/15"
                    : "bg-emerald-500/15"
              )}
            />
          ))}
        </div>
      );
    },
    filterFn: (row, id, filterValue: string) => {
      const { remainingStock, previousOrderQty } = row.original;
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
    size: 150,
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Qty</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.quantity.toLocaleString()} units
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        ₱{row.original.total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    ),
    size: 120,
  },
  // {
  //   accessorKey: "assignedDriver",
  //   header: "Assigned Driver",
  //   cell: ({ row }) => (
  //     <DriverAssignment 
  //       orderId={row.original.id} 
  //       currentDriver={row.original.assignedDriver}
  //       onDriverChange={(orderId, driverName, driverId) => {
  //         // This will be handled by the parent component through the table meta
  //         const event = new CustomEvent('driverChange', { 
  //           detail: { orderId, driverName, driverId } 
  //         });
  //         window.dispatchEvent(event);
  //       }}
  //     />
  //   ),
  //   size: 200,
  // },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
            <EllipsisVerticalIcon className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Update Status</DropdownMenuItem>
          <DropdownMenuItem>Contact Driver</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Cancel Order</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
    size: 50,
  },
];

// Draggable Row Component with animation
export function DraggableWaterDeliveryRow({ row }: { row: Row<WaterDeliveryOrder> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      className={cn(
        "relative z-0 transition-all",
        isDragging && "z-10 opacity-80 shadow-lg"
      )}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}