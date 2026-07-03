"use client";
"use no memo";

import { useSortable } from "@dnd-kit/sortable";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  EllipsisVerticalIcon,
  GripVerticalIcon,
  Mail,
  MapPin,
  Phone,
  User,
  Calendar,
  Building,
  BadgeCheck,
  Users,
  ShoppingBag,
  DollarSign,
  Tag,
  Star,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Filter,
  Copy,
  Download,
  Printer,
} from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Enhanced Customer type matching Medusa's customer structure
export interface CustomerRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  metadata: {
    role?: string;
    company_id?: string;
    company_name?: string;
    city?: string;
    address?: string;
    status?: "active" | "inactive" | "vip" | "at_risk";
    segment?: "premium" | "regular" | "new" | "at_risk";
    tags?: string[];
    total_spent?: number;
    order_count?: number;
    last_order_date?: string;
    average_order_value?: number;
    lifetime_value?: number;
    [key: string]: any;
  } | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string | null;
  status?: "active" | "inactive" | "vip" | "at_risk";
  tags?: string[];
}

// Helper functions
const getFullName = (customer: CustomerRow): string => {
  const firstName = customer.first_name || "";
  const lastName = customer.last_name || "";
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return "No name provided";
};

const getInitials = (customer: CustomerRow): string => {
  const firstName = customer.first_name || "";
  const lastName = customer.last_name || "";
  if (firstName || lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  return customer.email.charAt(0).toUpperCase();
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getCustomerStatus = (customer: CustomerRow): { label: string; color: string; icon: React.ReactNode } => {
  const status = customer.metadata?.status || customer.status || "active";
  
  const statusMap = {
    active: { 
      label: "Active", 
      color: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle2 className="size-3" />
    },
    inactive: { 
      label: "Inactive", 
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: <XCircle className="size-3" />
    },
    vip: { 
      label: "VIP", 
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <Star className="size-3" />
    },
    at_risk: { 
      label: "At Risk", 
      color: "bg-red-100 text-red-800 border-red-200",
      icon: <AlertCircle className="size-3" />
    },
  };
  
  return statusMap[status as keyof typeof statusMap] || statusMap.active;
};

const getCustomerSegment = (customer: CustomerRow): { label: string; color: string } | null => {
  const segment = customer.metadata?.segment;
  if (!segment) return null;
  
  const segmentMap = {
    premium: { label: "Premium", color: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white" },
    regular: { label: "Regular", color: "bg-blue-100 text-blue-800" },
    new: { label: "New", color: "bg-emerald-100 text-emerald-800" },
    at_risk: { label: "At Risk", color: "bg-red-100 text-red-800" },
  };
  
  return segmentMap[segment as keyof typeof segmentMap] || null;
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

// Customer Detail Drawer Component
function CustomerDetailViewer({ customer, onAction }: { customer: CustomerRow; onAction?: (action: string, data: any) => void }) {
  const isMobile = useIsMobile();
  const fullName = getFullName(customer);
  const status = getCustomerStatus(customer);
  const segment = getCustomerSegment(customer);
  const totalSpent = customer.metadata?.total_spent || customer.totalSpent || 0;
  const totalOrders = customer.metadata?.order_count || customer.totalOrders || 0;
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const lastOrderDate = customer.metadata?.last_order_date || customer.lastOrderDate;

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action, { customerId: customer.id, customer });
    }
  };

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left font-medium text-foreground hover:text-primary transition-colors">
          {fullName}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            Customer Details
            {segment && (
              <Badge className={segment.color} variant="secondary">
                {segment.label}
              </Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>View and manage customer information and account details.</DrawerDescription>
        </DrawerHeader>
        
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
          {/* Customer Header */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://avatar.vercel.sh/${customer.email}`} />
                <AvatarFallback className="text-lg">{getInitials(customer)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{fullName}</h3>
                  <Badge className={status.color} variant="outline">
                    <span className="flex items-center gap-1">
                      {status.icon}
                      {status.label}
                    </span>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">ID: {customer.id}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Since {formatDate(customer.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
              <p className="text-lg font-semibold">{formatCurrency(totalSpent)}</p>
              {totalSpent > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="size-3 text-green-600" />
                  <span className="text-xs text-green-600">Loyal customer</span>
                </div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
              <p className="text-lg font-semibold">{totalOrders}</p>
              {totalOrders > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {formatCurrency(averageOrderValue)}
                </p>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Lifetime Value</p>
              <p className="text-lg font-semibold">{formatCurrency(customer.metadata?.lifetime_value || totalSpent)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Last Order</p>
              <p className="text-sm font-medium">{lastOrderDate ? formatDate(lastOrderDate) : "No orders"}</p>
              {lastOrderDate && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <User className="size-4" />
              Contact Information
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-3.5 text-muted-foreground" />
                <span>{customer.email}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-7 px-2"
                  onClick={() => handleAction('sendEmail')}
                >
                  <Send className="size-3" />
                  <span className="ml-1 text-xs">Send</span>
                </Button>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.metadata?.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>{customer.metadata.city}</span>
                </div>
              )}
              {customer.metadata?.company_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="size-3.5 text-muted-foreground" />
                  <span>{customer.metadata.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <BadgeCheck className="size-4" />
              Account Information
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline" className="capitalize">
                  {customer.metadata?.role || "customer"}
                </Badge>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{formatDateTime(customer.created_at)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">{formatDateTime(customer.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {(customer.metadata?.tags?.length > 0 || customer.tags?.length > 0) && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 font-medium flex items-center gap-2">
                <Tag className="size-4" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(customer.metadata?.tags || customer.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DrawerFooter className="border-t">
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleAction('edit')}>
              <Edit className="size-4 mr-2" />
              Edit Customer
            </Button>
            <Button variant="outline" onClick={() => handleAction('viewOrders')}>
              <ShoppingBag className="size-4 mr-2" />
              View Order History
            </Button>
            <Button variant="outline" onClick={() => handleAction('sendEmail')}>
              <Mail className="size-4 mr-2" />
              Send Email
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost">Close</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Customer Name Cell with Avatar
function CustomerNameCell({ customer }: { customer: CustomerRow }) {
  const fullName = getFullName(customer);
  
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{getInitials(customer)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <CustomerDetailViewer customer={customer} />
        <span className="text-xs text-muted-foreground">{customer.email}</span>
      </div>
    </div>
  );
}

// Status Badge Cell
function StatusCell({ customer }: { customer: CustomerRow }) {
  const status = getCustomerStatus(customer);
  
  return (
    <Badge className={cn("flex w-fit items-center gap-1", status.color)} variant="outline">
      {status.icon}
      {status.label}
    </Badge>
  );
}

// Spending Progress Cell
function SpendingCell({ customer }: { customer: CustomerRow }) {
  const totalSpent = customer.metadata?.total_spent || customer.totalSpent || 0;
  const maxSpent = 100000; // Configurable threshold
  const percentage = Math.min((totalSpent / maxSpent) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{formatCurrency(totalSpent)}</span>
        {totalSpent > 50000 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Star className="size-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>Premium Customer</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

// Orders Cell
function OrdersCell({ customer }: { customer: any }) {
  console.log(customer, 'CUSTOMER')
  const totalOrders = customer?.orderCount || customer.totalOrders || 0;
  
  return (
    <div className="flex items-center gap-2">
      <ShoppingBag className="size-3.5 text-muted-foreground" />
      <span className="font-medium">{totalOrders}</span>
    </div>
  );
}

// Actions Dropdown Menu
function ActionsCell({ customer, onAction }: { customer: CustomerRow; onAction?: (action: string, data: any) => void }) {
  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action, { customerId: customer.id, customer });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction('view')}>
          <Eye className="size-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('edit')}>
          <Edit className="size-4 mr-2" />
          Edit Customer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('sendEmail')}>
          <Send className="size-4 mr-2" />
          Send Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('viewOrders')}>
          <ShoppingBag className="size-4 mr-2" />
          View Orders
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Tag className="size-4 mr-2" />
            Change Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'active' })}>
              <CheckCircle2 className="size-4 mr-2 text-green-600" />
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'vip' })}>
              <Star className="size-4 mr-2 text-amber-600" />
              VIP
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'at_risk' })}>
              <AlertCircle className="size-4 mr-2 text-red-600" />
              At Risk
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'inactive' })}>
              <XCircle className="size-4 mr-2 text-gray-600" />
              Inactive
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction('copyEmail')} className="text-blue-600">
          <Copy className="size-4 mr-2" />
          Copy Email
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => handleAction('deactivate')}>
          <Trash2 className="size-4 mr-2" />
          Deactivate Account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Column Definitions
export const customerColumns: ColumnDef<CustomerRow>[] = [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <div className="flex items-center justify-center">
  //       <Checkbox
  //         checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
  //         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //         aria-label="Select all customers"
  //       />
  //     </div>
  //   ),
  //   cell: ({ row }) => (
  //     <div className="flex items-center justify-center">
  //       <Checkbox
  //         checked={row.getIsSelected()}
  //         onCheckedChange={(value) => row.toggleSelected(!!value)}
  //         aria-label={`Select customer ${row.original.email}`}
  //       />
  //     </div>
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  //   size: 40,
  // },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => <CustomerNameCell customer={row.original} />,
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const nameA = getFullName(rowA.original);
      const nameB = getFullName(rowB.original);
      return nameA.localeCompare(nameB);
    },
    size: 250,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Phone className="size-3.5 text-muted-foreground" />
        <span className="text-sm">{row.original.phone || "—"}</span>
      </div>
    ),
    size: 140,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell customer={row.original} />,
    size: 120,
  },
  {
    accessorKey: "totalSpent",
    header: () => (
      <div className="flex items-center gap-1">
        <DollarSign className="size-3.5" />
        <span>Total Spent</span>
      </div>
    ),
    cell: ({ row }) => <SpendingCell customer={row.original} />,
    size: 180,
  },
  {
    accessorKey: "orderCount",
    header: () => (
      <div className="flex items-center gap-1">
        <ShoppingBag className="size-3.5" />
        <span>Orders</span>
      </div>
    ),
    cell: ({ row }) => <OrdersCell customer={row.original} />,
    size: 100,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.metadata?.role || "customer";
      const roleColors: Record<string, string> = {
        company: "bg-purple-100 text-purple-800",
        admin: "bg-red-100 text-red-800",
        customer: "bg-blue-100 text-blue-800",
      };
      const roleLabels: Record<string, string> = {
        company: "Company",
        admin: "Admin",
        customer: "Customer",
      };
      
      return (
        <Badge className={roleColors[role] || "bg-gray-100 text-gray-800"} variant="outline">
          {roleLabels[role] || role}
        </Badge>
      );
    },
    size: 100,
  },
  {
    accessorKey: "created_at",
    header: () => (
      <div className="flex items-center gap-1">
        <Calendar className="size-3.5" />
        <span>Joined</span>
      </div>
    ),
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm cursor-help">
              {formatDate(row.original.created_at)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {formatDateTime(row.original.created_at)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    size: 110,
  },
  {
    accessorKey: "lastOrder",
    header: () => (
      <div className="flex items-center gap-1">
        <Clock className="size-3.5" />
        <span>Last Order</span>
      </div>
    ),
    cell: ({ row }) => {
      const lastOrder = row.original.lastOrder;
      if (!lastOrder) {
        return <span className="text-sm text-muted-foreground">—</span>;
      }
      const daysAgo = Math.floor((Date.now() - new Date(lastOrder).getTime()) / (1000 * 60 * 60 * 24));
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <span className="text-sm">{formatDate(lastOrder)}</span>
                {daysAgo > 90 && <AlertCircle className="size-3 text-amber-500" />}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {daysAgo === 0 ? "Today" : `${daysAgo} days ago`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 110,
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as any;
      const handleAction = (action: string, data: any) => {
        if (meta?.onAction) {
          meta.onAction(action, data);
        }
      };
      return <ActionsCell customer={row.original} onAction={handleAction} />;
    },
    enableSorting: false,
    size: 70,
  },
];

// Draggable Row Component
export function DraggableCustomerRow({ row, onAction }: { row: Row<CustomerRow>; onAction?: (action: string, data: any) => void }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  // Inject onAction into the row's cells
  const cells = row.getVisibleCells().map((cell) => {
    if (cell.column.id === 'actions') {
      return {
        ...cell,
        getContext: () => ({
          ...cell.getContext(),
          onAction,
        }),
      };
    }
    return cell;
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      className={cn(
        "relative z-0 transition-colors",
        isDragging && "z-10 opacity-80 shadow-lg"
      )}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
    >
      {cells.map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}