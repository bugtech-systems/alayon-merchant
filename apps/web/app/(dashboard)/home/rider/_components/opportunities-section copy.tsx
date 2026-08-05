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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type VisibilityState,
  type Row,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ListFilter,
  XIcon,
  PackageIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  TrendingUpIcon,
  GripVerticalIcon,
  EditIcon,
  UserPlusIcon,
  Trash2Icon,
  LayoutGridIcon,
  AlertCircleIcon,
  MoreHorizontalIcon,
  EyeIcon,
  CopyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  HomeIcon,
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CustomerLocationModal } from "@/components/customers-table/customer-location";
import { toast } from "sonner";

// ============================================================
// 1. TYPES & CONFIG
// ============================================================

export const STOCK_HEALTH_SLOTS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  threshold: i + 1,
}));

export const STOCK_STATUS_CONFIG = {
  high: { color: "bg-emerald-500", label: "High", textColor: "text-emerald-700" },
  medium: { color: "bg-amber-500", label: "Medium", textColor: "text-amber-700" },
  low: { color: "bg-rose-500", label: "Low", textColor: "text-rose-700" },
} as any;

export interface CustomerDetails {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalOrders: number;
  lifetimeValue: number;
  joinDate: string;
  tags: string[];
}

export interface LocationDetails {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  coordinates: { lat: number; lng: number };
  deliveryZone: string;
  notes: string;
}

export interface OrderDetails {
  id: string;
  orderNumber: string;
  customerId: string;
  locationId: string;
  quantity: number;
  total: number;
  status: WaterDeliveryOrder["status"];
  orderDate: string;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  notes: string;
  paymentMethod: string;
  deliveryInstructions: string;
  estimatedDelivery: string;
}

export interface WaterDeliveryOrder {
  id: string;
  orderNumber: string;
  customer: string;
  customerPhone: string;
  location: string;
  address: string;
  quantity: number;
  total: number;
  status: "pending" | "company_declined" | "company_accepted" | "pickup_claimed" | "company_preparing" | "ready_for_pickup" | "in_transit" | "delivered" | "completed";
  orderDate: string;
  assignedDriver: string | null;
  assignedDriverId: string | null;
  remainingStock: number;
  previousOrderQty: number;
  customerDetails: CustomerDetails;
  locationDetails: LocationDetails;
  orderDetails: OrderDetails;
  driverDetails?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
  };
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: any;
  last_order_at?: string;
  latest_order?: any;
  stock_health?: {
    remainingStock: number;
    previousOrderQty: number;
    stockHealthScore: number;
    stockHealthPercentage: number;
    stockHealthStatus: "all" | "high" | "medium" | "low";
  };
}

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
  "completed",
] as const;

const stockHealthOptions = ["all", "high", "medium", "low"] as const;

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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    company_declined: "Declined",
    company_accepted: "Accepted",
    pickup_claimed: "Pickup Claimed",
    company_preparing: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    in_transit: "In Transit",
    delivered: "Delivered",
    completed: "Completed",
  };
  return labels[status] || status;
}

function getStatusIcon(status: string) {
  const icons: Record<string, React.ReactNode> = {
    pending: <ClockIcon className="size-3.5" />,
    company_declined: <XCircleIcon className="size-3.5" />,
    company_accepted: <CheckCircleIcon className="size-3.5" />,
    pickup_claimed: <UserIcon className="size-3.5" />,
    company_preparing: <ClockIcon className="size-3.5" />,
    ready_for_pickup: <PackageIcon className="size-3.5" />,
    in_transit: <TruckIcon className="size-3.5" />,
    delivered: <HomeIcon className="size-3.5" />,
    completed: <CheckCircleIcon className="size-3.5" />,
  };
  return icons[status] || <ClockIcon className="size-3.5" />;
}

// ============================================================
// 2. SORTABLE ROW - FIXED WITH PROPER DRAG HANDLE
// ============================================================

interface SortableRowProps {
  row: Row<WaterDeliveryOrder>;
  children: React.ReactNode;
  onClick: () => void;
}

function SortableRow({ row, children, onClick }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: row.id,
    data: {
      type: "row",
      row,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "hover:bg-muted/50 transition-colors",
        isDragging && "shadow-lg ring-2 ring-primary/20 z-50 bg-background"
      )}
      onClick={onClick}
      data-id={row.id}
    >
      {/* Drag Handle - Always first */}
      <TableCell className="w-10 px-2">
        <div
          {...listeners}
          className="flex items-center justify-center hover:bg-muted/80 rounded p-1 transition-colors cursor-grab active:cursor-grabbing"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Prevent row click when dragging
            e.stopPropagation();
          }}
        >
          <GripVerticalIcon className="size-4 text-muted-foreground" />
        </div>
      </TableCell>
      
      {/* Render all other cells */}
      {children}
    </TableRow>
  );
}

// ============================================================
// 3. ACTION POPOVER COMPONENT
// ============================================================

interface RowActionPopoverProps {
  order: WaterDeliveryOrder;
  onAction: (action: string, order: WaterDeliveryOrder) => void;
  onUpdateStatus?: (orderId: string, status: WaterDeliveryOrder["status"]) => void;
}

function RowActionPopover({ order, onAction, onUpdateStatus }: RowActionPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  const handleAction = (action: string) => {
    onAction(action, order);
    setIsOpen(false);
  };

  const handleStatusUpdate = (status: WaterDeliveryOrder["status"]) => {
    if (onUpdateStatus) {
      onUpdateStatus(order.id, status);
      toast.success(`Order status updated to ${getStatusLabel(status)}`);
    }
    setIsOpen(false);
    setShowStatusMenu(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Open actions</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9"
            onClick={() => handleAction("view")}
          >
            <EyeIcon className="size-4" />
            View Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9"
            onClick={() => handleAction("customer")}
          >
            <UserIcon className="size-4" />
            View Customer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9"
            onClick={() => handleAction("location")}
          >
            <MapPinIcon className="size-4" />
            View Location
          </Button>
          <Separator className="my-1" />
          <Popover open={showStatusMenu} onOpenChange={setShowStatusMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusMenu(true);
                }}
              >
                <EditIcon className="size-4" />
                Update Status
                <ChevronDownIcon className="size-3 ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1" side="right">
              {statusOptions.filter(s => s !== "all").map((status) => (
                <Button
                  key={status}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-8 text-xs"
                  onClick={() => handleStatusUpdate(status as WaterDeliveryOrder["status"])}
                >
                  {getStatusIcon(status)}
                  {getStatusLabel(status)}
                </Button>
              ))}
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9"
            onClick={() => {
              navigator.clipboard.writeText(order.orderNumber);
              toast.success("Order number copied to clipboard");
              setIsOpen(false);
            }}
          >
            <CopyIcon className="size-4" />
            Copy Order #
          </Button>
          <Separator className="my-1" />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleAction("delete")}
          >
            <Trash2Icon className="size-4" />
            Delete Order
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// 4. DETAIL MODALS
// ============================================================

function OrderDetailModal({ open, onOpenChange, order }: { open: boolean; onOpenChange: (open: boolean) => void; order: WaterDeliveryOrder | null }) {
  if (!order) return null;
  const latest = order.latest_order || {};
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageIcon className="size-5" />
            Order #{order.orderNumber || latest.orderNumber || "N/A"}
          </DialogTitle>
          <DialogDescription>Complete order details and delivery information.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Badge className={`${getStatusColor(order.status || latest.status)} border mt-1`}>
                {getStatusLabel(order.status || latest.status)}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Order Date</Label>
              <p className="font-medium flex items-center gap-1">
                <CalendarIcon className="size-3.5" />
                {format(parseISO(order.last_order_at || latest.orderDate || new Date().toISOString()), "PPP p")}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quantity</Label>
              <p className="font-medium">{latest.total_items || order.quantity || 0} units</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total</Label>
              <p className="font-medium">₱{(latest.total || order.total || 0).toFixed(2)}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <p className="font-medium">{latest.paymentMethod || "N/A"}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Delivery Instructions</Label>
              <p className="text-sm text-muted-foreground">{latest.deliveryInstructions || "None"}</p>
            </div>
            {latest.metadata?.notes && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <p className="text-sm text-muted-foreground">{latest.metadata.notes}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button>Update Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailModal({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (open: boolean) => void; customer: any }) {
  if (!customer) return null;
  const name = customer.first_name ? `${customer.first_name} ${customer.last_name || ''}` : customer.name || "Unknown";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="size-5" />
            Customer Details
          </DialogTitle>
          <DialogDescription>View customer profile and history.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{customer.phone || "N/A"}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p>{customer.email || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Joined</Label>
              <p>{customer.created_at ? format(parseISO(customer.created_at), "PPP") : "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Orders</Label>
              <p>{customer.totalOrders ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Lifetime Value</Label>
              <p>₱{customer.lifetimeValue?.toFixed(2) ?? "—"}</p>
            </div>
          </div>
          {customer.tags && customer.tags.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {customer.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="default">View Orders</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationDetailModal({ open, onOpenChange, location }: { open: boolean; onOpenChange: (open: boolean) => void; location: any }) {
  if (!location) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinIcon className="size-5" />
            Location Details
          </DialogTitle>
          <DialogDescription>Delivery location information.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <p className="font-medium">{location.name || "N/A"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Address</Label>
            <p className="text-sm">{location.address || "N/A"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <p>{location.city || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Province</Label>
              <p>{location.province || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Postal Code</Label>
              <p>{location.postalCode || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Zone</Label>
              <p>{location.deliveryZone || "N/A"}</p>
            </div>
          </div>
          {location.coordinates && (
            <div>
              <Label className="text-xs text-muted-foreground">Coordinates</Label>
              <p className="font-mono text-sm">
                {location.coordinates.lat?.toFixed(6)}, {location.coordinates.lng?.toFixed(6)}
              </p>
            </div>
          )}
          {location.notes && (
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <p className="text-sm text-muted-foreground">{location.notes}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="default">Open Map</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockDetailModal({ open, onOpenChange, order }: { open: boolean; onOpenChange: (open: boolean) => void; order: WaterDeliveryOrder | null }) {
  if (!order) return null;
  const stock = order.stock_health || { remainingStock: 0, previousOrderQty: 0, stockHealthScore: 0, stockHealthPercentage: 0, stockHealthStatus: "low" };
  const { remainingStock, previousOrderQty, stockHealthScore, stockHealthPercentage, stockHealthStatus } = stock;
  const pct = stockHealthPercentage;
  const score = stockHealthScore;
  const status = stockHealthStatus;
  const color = status === "high" ? "text-emerald-600" : status === "medium" ? "text-amber-600" : "text-red-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUpIcon className="size-5" />
            Stock Health
          </DialogTitle>
          <DialogDescription>Remaining stock from previous order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <Badge className={cn("border", status === "high" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : status === "medium" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200")}>
              {STOCK_STATUS_CONFIG[status]?.label || "Unknown"}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Remaining Stock</span>
            <span className="font-medium">{remainingStock} units</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Previous Order</span>
            <span className="font-medium">{previousOrderQty} units</span>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Health Score</span>
              <span className={cn("font-bold", color)}>{pct}%</span>
            </div>
            <div className="flex items-end gap-0.5 mt-1">
              {STOCK_HEALTH_SLOTS.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    "h-6 w-2 rounded-full transition-colors duration-300",
                    slot.threshold <= score ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            <p>Based on previous order quantity of {previousOrderQty} units.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusUpdateModal({ open, onOpenChange, order, onUpdate }: { open: boolean; onOpenChange: (open: boolean) => void; order: WaterDeliveryOrder | null; onUpdate?: (status: WaterDeliveryOrder["status"]) => void }) {
  const [newStatus, setNewStatus] = React.useState<WaterDeliveryOrder["status"] | null>(null);
  if (!order) return null;

  const handleUpdate = () => {
    if (newStatus && onUpdate) {
      onUpdate(newStatus);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>Change order status for #{order.orderNumber}.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={(value) => setNewStatus(value as WaterDeliveryOrder["status"])}>
            <SelectTrigger>
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.filter(s => s !== "all").map((s) => (
                <SelectItem key={s} value={s}>
                  {getStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={!newStatus}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// 5. DEBOUNCE HOOK
// ============================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ============================================================
// 6. QUERY PARAMS HELPERS
// ============================================================

interface QueryParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  status: string;
  stockHealth: string;
  search: string;
}

function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  return {
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
    sortBy: searchParams.get("sortBy") || "",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
    status: searchParams.get("status") || "all",
    stockHealth: searchParams.get("stockHealth") || "all",
    search: searchParams.get("search") || "",
  };
}

function buildQueryString(params: QueryParams): string {
  const url = new URLSearchParams();
  if (params.page > 1) url.set("page", String(params.page));
  if (params.pageSize !== 10) url.set("pageSize", String(params.pageSize));
  if (params.sortBy) url.set("sortBy", params.sortBy);
  if (params.sortOrder !== "asc") url.set("sortOrder", params.sortOrder);
  if (params.status !== "all") url.set("status", params.status);
  if (params.stockHealth !== "all") url.set("stockHealth", params.stockHealth);
  if (params.search) url.set("search", params.search);
  const query = url.toString();
  return query ? `?${query}` : "";
}

// ============================================================
// 7. MAIN COMPONENT
// ============================================================

interface WaterDeliveryOrdersSectionProps {
  fetchOrders: (params: QueryParams) => Promise<{ data: WaterDeliveryOrder[]; total: number }>;
  onOrderClick?: (order: WaterDeliveryOrder) => void;
  onAssignDriver?: (orderId: string, driverName: string) => void;
  onUpdateStatus?: (orderId: string, status: WaterDeliveryOrder["status"]) => void;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  onPriorityUpdate?: (orderedIds: string[]) => Promise<void> | void;
}

export function WaterDeliveryOrdersSection({
  fetchOrders,
  onOrderClick,
  onAssignDriver,
  onUpdateStatus,
  onBulkAction,
  onPriorityUpdate,
}: WaterDeliveryOrdersSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParams = React.useMemo(() => parseQueryParams(searchParams), [searchParams]);

  const [orders, setOrders] = React.useState<WaterDeliveryOrder[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [density, setDensity] = React.useState<"compact" | "normal">("normal");
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<WaterDeliveryOrder | null>(null);
  const [detailType, setDetailType] = React.useState<"order" | "customer" | "location" | "stock" | "status">("order");

  const debouncedSearch = useDebounce(initialParams.search, 300);
  const currentParams: QueryParams = React.useMemo(() => ({
    ...initialParams,
    search: debouncedSearch,
  }), [initialParams, debouncedSearch]);

  const sensors = useSensors(
    useSensor(MouseSensor, { 
      activationConstraint: { 
        distance: 5,
      } 
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 200, 
        tolerance: 5,
      } 
    }),
    useSensor(KeyboardSensor, {})
  );

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchOrders(currentParams);
      setOrders(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch orders"));
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrders, currentParams]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateUrl = React.useCallback((newParams: Partial<QueryParams>) => {
    const merged = { ...currentParams, ...newParams };
    if (newParams.page === undefined && (newParams.sortBy || newParams.status || newParams.stockHealth || newParams.search !== undefined)) {
      merged.page = 1;
    }
    const queryString = buildQueryString(merged);
    router.push(`${queryString}`, { scroll: false });
  }, [router, currentParams]);

  // --- Table columns ---
  const columns = React.useMemo<ColumnDef<WaterDeliveryOrder>[]>(() => {
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.original.orderNumber}`}
          />
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "priority",
        header: "#",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">{row.index + 1}</span>
        ),
        size: 40,
        enableSorting: false,
        enableHiding: true,
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const order = row.original;
          const name = order.first_name ? `${order.first_name} ${order.last_name || ''}` : order.customer || "Unknown";
          const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
          return (
            <div
              className="flex items-center gap-3 cursor-pointer hover:text-primary group"
              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setDetailType("customer"); setIsDetailOpen(true); }}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials || <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm group-hover:underline">{name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <PhoneIcon className="size-3" />
                  {order.phone || order.customerPhone || "N/A"}
                </span>
              </div>
            </div>
          );
        },
        size: 220,
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => {
          const order = row.original;
          const meta = order.metadata || {};
          return (
            <div
              className="flex flex-row justify-start items-center gap-3 cursor-pointer hover:text-primary group"
              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setDetailType("location"); setIsDetailOpen(true); }}
            >
              <MapPinIcon className="size-5 text-muted-foreground" />
              <div className="flex flex-col justify-start items-start gap-0.5">
                <span className="font-medium text-sm group-hover:underline">{meta.city || "N/A"}</span>
                <span className="text-xs text-muted-foreground">{meta.barangay || "N/A"}</span>
              </div>
            </div>
          );
        },
        size: 160,
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const order = row.original;
          const status = order.status || order.latest_order?.status || "pending";
          return (
            <div
              className="cursor-pointer hover:opacity-80 flex items-center gap-1.5"
              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setDetailType("status"); setIsDetailOpen(true); }}
            >
              {getStatusIcon(status)}
              <Badge className={`${getStatusColor(status)} border`}>
                {getStatusLabel(status)}
              </Badge>
            </div>
          );
        },
        size: 150,
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "quantity",
        header: () => <div className="text-right">Qty</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.latest_order?.total_items || row.original.quantity || 0}</div>
        ),
        size: 80,
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums">₱{(row.original.latest_order?.total || row.original.total || 0).toFixed(2)}</div>
        ),
        size: 120,
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "orderDate",
        header: "Last Order",
        cell: ({ row }) => {
          const date = row.original.last_order_at || row.original.orderDate || new Date().toISOString();
          return (
            <span title={format(parseISO(date), "PPP pp")}>
              {formatDistanceToNow(parseISO(date), { addSuffix: true })}
            </span>
          );
        },
        size: 130,
        enableSorting: true,
        sortingFn: "datetime",
      },
      {
        accessorKey: "stockHealth",
        header: () => <span className="hidden sm:inline">Stock Health</span>,
        cell: ({ row }) => {
          const order = row.original;
          const stock = order.stock_health || {
            remainingStock: 0,
            previousOrderQty: 0,
            stockHealthScore: 0,
            stockHealthPercentage: 0,
            stockHealthStatus: "low",
          };

          const pct = Math.min(100, Math.max(0, stock.stockHealthPercentage ?? 0));
          const status = stock.stockHealthStatus ?? "low" as any;
          const remaining = stock.remainingStock ?? 0;
          const prevQty = stock.previousOrderQty ?? 0;

          const statusConfig = STOCK_STATUS_CONFIG[status] || STOCK_STATUS_CONFIG.low;
          const showBars = prevQty > 0;
          const filledSlots = Math.min(10, Math.round(pct / 10));

          return (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-1.5 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity px-1 py-0.5 rounded-md hover:bg-muted/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                      setDetailType("stock");
                      setIsDetailOpen(true);
                    }}
                  >
                    <div
                      className="flex items-end gap-[2px] sm:gap-[3px]"
                      aria-label={`Stock health: ${pct}% remaining`}
                    >
                      {STOCK_HEALTH_SLOTS.map((slot) => {
                        const isFilled = slot.threshold <= filledSlots;
                        return (
                          <div
                            key={slot.id}
                            className={cn(
                              "h-4 w-1.5 sm:h-5 sm:w-2 rounded-full transition-all duration-300",
                              isFilled && showBars ? statusConfig.color : "bg-muted-foreground/20",
                              !showBars && "bg-muted-foreground/10"
                            )}
                            style={{
                              opacity: isFilled && showBars ? 0.7 + (slot.threshold / 10) * 0.3 : 1,
                            }}
                          />
                        );
                      })}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs font-medium tabular-nums transition-colors",
                        showBars ? statusConfig.textColor : "text-muted-foreground",
                        "hidden xs:inline"
                      )}
                    >
                      {showBars ? `${pct}%` : "—"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="max-w-xs p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">Stock Health</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        status === "high" && "bg-emerald-100 text-emerald-800",
                        status === "medium" && "bg-amber-100 text-amber-800",
                        status === "low" && "bg-rose-100 text-rose-800"
                      )}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-mono font-medium text-right">{remaining} units</span>
                    <span className="text-muted-foreground">Last order</span>
                    <span className="font-mono font-medium text-right">{prevQty} units</span>
                    <span className="text-muted-foreground">Percentage</span>
                    <span className="font-mono font-medium text-right">{pct}%</span>
                  </div>
                  {!showBars && (
                    <p className="text-xs text-muted-foreground italic mt-1">No prior order data.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        size: 160,
        minSize: 120,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.stock_health?.stockHealthPercentage ?? 0;
          const b = rowB.original.stock_health?.stockHealthPercentage ?? 0;
          return b - a;
        },
      },
      {
        accessorKey: "orderNumber",
        header: "Order #",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div
              className="flex items-center gap-2 cursor-pointer hover:text-primary group"
              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setDetailType("order"); setIsDetailOpen(true); }}
            >
              <PackageIcon className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-sm font-medium group-hover:underline">#{order.orderNumber || order.latest_order?.orderNumber || "N/A"}</span>
            </div>
          );
        },
        size: 140,
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActionPopover
            order={row.original}
            onAction={(action, order) => {
              switch (action) {
                case "view":
                  setSelectedOrder(order);
                  setDetailType("order");
                  setIsDetailOpen(true);
                  break;
                case "customer":
                  setSelectedOrder(order);
                  setDetailType("customer");
                  setIsDetailOpen(true);
                  break;
                case "location":
                  setSelectedOrder(order);
                  setDetailType("location");
                  setIsDetailOpen(true);
                  break;
                case "delete":
                  if (confirm(`Delete order #${order.orderNumber}?`)) {
                    setOrders(prev => prev.filter(o => o.id !== order.id));
                    toast.success(`Order #${order.orderNumber} deleted`);
                  }
                  break;
                default:
                  break;
              }
            }}
            onUpdateStatus={onUpdateStatus}
          />
        ),
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }, [onUpdateStatus]);

  // --- Table instance ---
  const table = useReactTable({
    data: orders,
    columns,
    state: {
      rowSelection,
      columnVisibility,
      pagination: {
        pageIndex: currentParams.page - 1,
        pageSize: currentParams.pageSize,
      },
      sorting: currentParams.sortBy ? [{ id: currentParams.sortBy, desc: currentParams.sortOrder === "desc" }] : [],
      globalFilter: currentParams.search,
      columnFilters: [
        { id: "status", value: currentParams.status !== "all" ? currentParams.status : undefined },
        { id: "stockHealth", value: currentParams.stockHealth !== "all" ? currentParams.stockHealth : undefined },
      ],
    },
    pageCount: Math.ceil(total / currentParams.pageSize),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // --- Event handlers ---
  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    updateUrl({ pageSize: newSize, page: 1 });
  };

  const handleSortingChange = (sortBy: string, sortOrder: "asc" | "desc") => {
    updateUrl({ sortBy, sortOrder, page: 1 });
  };

  const handleStatusChange = (status: string) => {
    updateUrl({ status: status === "all" ? "all" : status, page: 1 });
  };

  const handleStockHealthChange = (stockHealth: string) => {
    updateUrl({ stockHealth: stockHealth === "all" ? "all" : stockHealth, page: 1 });
  };

  const [rawSearch, setRawSearch] = React.useState(currentParams.search);
  const debouncedSearchForUrl = useDebounce(rawSearch, 300);

  React.useEffect(() => {
    if (debouncedSearchForUrl !== currentParams.search) {
      updateUrl({ search: debouncedSearchForUrl || "", page: 1 });
    }
  }, [debouncedSearchForUrl, updateUrl, currentParams.search]);

  React.useEffect(() => {
    setRawSearch(currentParams.search);
  }, [currentParams.search]);

  // ============================================================
  // DRAG END HANDLER - FIXED
  // ============================================================
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!active || !over) return;
    
    if (active.id !== over.id) {
      const oldIndex = orders.findIndex((item) => item.id === active.id);
      const newIndex = orders.findIndex((item) => item.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return;
      
      const newData = arrayMove(orders, oldIndex, newIndex);
      setOrders(newData);
      
      if (onPriorityUpdate) {
        const orderedIds = newData.map(item => item.id);
        try {
          await onPriorityUpdate(orderedIds);
          toast.success("Order priority updated successfully");
        } catch (error) {
          console.error("Failed to update priorities:", error);
          toast.error("Failed to update order priorities");
          // Revert on error
          setOrders(orders);
        }
      } else {
        toast.success("Order priority updated");
      }
    }
  };

  const handleBulkAction = (action: string) => {
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    if (selectedIds.length === 0) return;
    if (onBulkAction) {
      onBulkAction(action, selectedIds);
    } else {
      if (action === "delete") {
        if (confirm(`Delete ${selectedIds.length} orders?`)) {
          setOrders(prev => prev.filter(order => !selectedIds.includes(order.id)));
          setRowSelection({});
          toast.success(`${selectedIds.length} orders deleted`);
        }
      } else if (action === "status") {
        const newStatus = prompt("Enter new status (pending, delivered, etc.)") as WaterDeliveryOrder["status"] | null;
        if (newStatus && statusOptions.includes(newStatus)) {
          setOrders(prev => prev.map(order =>
            selectedIds.includes(order.id) ? { ...order, status: newStatus } : order
          ));
          setRowSelection({});
          toast.success(`Status updated for ${selectedIds.length} orders`);
        }
      }
    }
  };

  // --- UI state ---
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();
  const filteredOrderCount = total;

  const pageNumbers = React.useMemo(() => {
    const pages = [];
    const totalPages = pageCount;
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
      }
    }
    return pages;
  }, [currentPage, pageCount]);

  // --- Loading / error states ---
  if (isLoading && orders.length === 0) {
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Delivery Orders</CardTitle>
          <CardDescription>Error loading orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircleIcon className="size-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button onClick={fetchData} className="mt-4">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ----- Render -----
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              Water Delivery Orders
              <Badge variant="secondary">{filteredOrderCount}</Badge>
            </CardTitle>
            <CardDescription>
              Track and manage water delivery orders across all statuses.
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Input
                  className="h-9 w-full sm:w-44 md:w-52 pr-8"
                  placeholder="Search orders..."
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                />
                {rawSearch && (
                  <button
                    onClick={() => {
                      setRawSearch("");
                      updateUrl({ search: "", page: 1 });
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
                    <ListFilter className="size-4 mr-1" />
                    Status
                    <ChevronDownIcon className="size-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup
                    value={currentParams.status}
                    onValueChange={handleStatusChange}
                  >
                    {statusOptions.map((opt) => (
                      <DropdownMenuRadioItem key={opt} value={opt}>
                        {opt === "all" ? "All statuses" : getStatusLabel(opt)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <TrendingUpIcon className="size-4 mr-1" />
                    Stock Health
                    <ChevronDownIcon className="size-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup
                    value={currentParams.stockHealth}
                    onValueChange={handleStockHealthChange}
                  >
                    {stockHealthOptions.map((opt) => (
                      <DropdownMenuRadioItem key={opt} value={opt}>
                        {opt === "all" ? "All stock levels" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <LayoutGridIcon className="size-4 mr-1" />
                    View
                    <ChevronDownIcon className="size-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  {table.getAllLeafColumns().filter(col => col.id !== "select" && col.id !== "actions").map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.columnDef.header?.toString() || column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Density</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={density}
                    onValueChange={(v) => setDensity(v as "compact" | "normal")}
                  >
                    <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-y border-primary/10">
              <span className="text-sm font-medium">{selectedCount} selected</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">Actions <ChevronDownIcon className="size-3 ml-1" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleBulkAction("status")}>
                      <EditIcon className="size-3 mr-2" /> Update Status
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleBulkAction("assign")}>
                      <UserPlusIcon className="size-3 mr-2" /> Assign Driver
                    </Button>
                    <Separator />
                    <Button variant="ghost" size="sm" className="w-full justify-start text-destructive" onClick={() => handleBulkAction("delete")}>
                      <Trash2Icon className="size-3 mr-2" /> Delete Selected
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setRowSelection({})}>
                <XIcon className="size-3 mr-1" /> Clear
              </Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <Table className={`min-w-[900px] ${density === "compact" ? "text-sm" : ""}`}>
                <TableHeader className="border-t">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {/* Drag handle header */}
                      <TableHead className="w-10" />
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const sortHandler = canSort ? () => {
                          const currentSort = header.column.getIsSorted();
                          const newOrder = currentSort === "asc" ? "desc" : "asc";
                          const sortKey = header.column.id;
                          handleSortingChange(sortKey, newOrder);
                        } : undefined;
                        return (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder ? null : (
                              <div
                                className={cn(
                                  "flex items-center gap-1",
                                  canSort && "cursor-pointer select-none hover:text-foreground"
                                )}
                                onClick={sortHandler}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {canSort && (
                                  <span className="ml-1">
                                    {header.column.getIsSorted() === "asc" && <ChevronDownIcon className="size-3 rotate-180" />}
                                    {header.column.getIsSorted() === "desc" && <ChevronDownIcon className="size-3" />}
                                    {!header.column.getIsSorted() && <ChevronDownIcon className="size-3 opacity-30" />}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {orders.length ? (
                    <SortableContext
                      items={orders.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {table.getRowModel().rows.map((row) => (
                        <SortableRow
                          key={row.id}
                          row={row}
                          onClick={() => {
                            setSelectedOrder(row.original);
                            setDetailType("order");
                            setIsDetailOpen(true);
                            onOrderClick?.(row.original);
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="py-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </SortableRow>
                      ))}
                    </SortableContext>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <PackageIcon className="size-8 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No orders match the current filters.</p>
                          {(currentParams.status !== "all" || currentParams.stockHealth !== "all" || currentParams.search) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                updateUrl({ status: "all", stockHealth: "all", search: "", page: 1 });
                                setRawSearch("");
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

          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pb-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select
                  value={String(currentParams.pageSize)}
                  onValueChange={(val) => handlePageSizeChange(Number(val))}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map(size => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>
                  {currentParams.pageSize * (currentParams.page - 1) + 1}–
                  {Math.min(currentParams.pageSize * currentParams.page, total)} of {total}
                </span>
              </div>
              <Pagination className="mx-0 w-auto">
                <PaginationContent className="gap-1.5">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                    />
                  </PaginationItem>
                  {pageNumbers.map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === page}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={currentPage >= pageCount ? "pointer-events-none opacity-50" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < pageCount) handlePageChange(currentPage + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Detail Modals ===== */}
      <OrderDetailModal
        open={isDetailOpen && detailType === "order"}
        onOpenChange={(open) => { if (!open) setIsDetailOpen(false); }}
        order={selectedOrder}
      />
      <CustomerDetailModal
        open={isDetailOpen && detailType === "customer"}
        onOpenChange={(open) => { if (!open) setIsDetailOpen(false); }}
        customer={selectedOrder || null}
      />

      <CustomerLocationModal
        isOpen={(isDetailOpen && detailType === "location")}
        onClose={() => { if (isDetailOpen) { setIsDetailOpen(false); setDetailType('order'); } }}
        customer={selectedOrder}
        onSuccess={() => fetchData()}
      />

      <StockDetailModal
        open={isDetailOpen && detailType === "stock"}
        onOpenChange={(open) => { if (!open) setIsDetailOpen(false); }}
        order={selectedOrder}
      />
      <StatusUpdateModal
        open={isDetailOpen && detailType === "status"}
        onOpenChange={(open) => { if (!open) setIsDetailOpen(false); }}
        order={selectedOrder}
        onUpdate={(status) => {
          if (selectedOrder && onUpdateStatus) {
            onUpdateStatus(selectedOrder.id, status);
            fetchData();
          }
          setIsDetailOpen(false);
        }}
      />
    </section>
  );
}