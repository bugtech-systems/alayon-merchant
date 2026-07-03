// components/orders/order-details-view.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Package,
  Truck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock as ClockIcon,
  Truck as TruckIcon,
  Package as PackageIcon,
  User as UserIcon,
  Building,
  MapPinned,
  PhoneCall,
  MessageSquare,
  Download,
  Printer,
  Share2,
  MoreHorizontal,
  ChevronRight,
  Copy,
  Check,
  X,
  Star,
  Shield,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Eye,
  Edit,
  Send,
  FileText,
  CalendarDays,
  Timer,
  Box,
  ShoppingCart,
  Wallet,
  Gift,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

// Types
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  image?: string;
  sku?: string;
}

interface OrderAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
}

interface OrderCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar?: string;
}

interface Order {
  id: string;
  display_id: number;
  customer: OrderCustomer;
  address: OrderAddress;
  items: OrderItem[];
  quantity: number;
  total: number;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  status: "pending" | "accepted" | "company_accepted" | "ready_for_pickup" | "preparing" | "ready" | "in_transit" | "delivered" | "declined" | "completed";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string;
  orderDate: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  assignedDriver?: string;
  assignedDriverId?: string;
  driver_phone?: string;
  notes?: string;
  tracking_number?: string;
  delivery_instructions?: string;
  special_requests?: string;
  rating?: number;
  review?: string;
  metadata?: Record<string, any>;
}

// Status Configuration
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: ClockIcon,
    progress: 10,
  },
  accepted: {
    label: "Accepted",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle2,
    progress: 25,
  },
  preparing: {
    label: "Preparing",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: PackageIcon,
    progress: 45,
  },
  ready: {
    label: "Ready",
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    icon: Box,
    progress: 65,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: TruckIcon,
    progress: 80,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
    progress: 100,
  },
  declined: {
    label: "Declined",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
    progress: 0,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircle,
    progress: 0,
  },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800" },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800" },
};


const getStatusIcon = (status: Order["status"]) => {
  const Icon = STATUS_CONFIG[status]?.icon || AlertCircle;
  return <Icon className="size-4" />;
};

const getStatusProgress = (status: Order["status"]) => {
  return STATUS_CONFIG[status]?.progress || 0;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

// Timeline Component
function OrderTimeline({ status, orderDate, estimatedDelivery, actualDelivery }: {
  status: Order["status"];
  orderDate: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}) {
  const steps = [
    { label: "Order Placed", date: orderDate, completed: true },
    { label: "Confirmed", completed: status !== "pending" && status !== "declined" && status !== "cancelled" },
    { label: "Preparing", completed: ["preparing", "ready", "in_transit", "delivered"].includes(status) },
    { label: "Ready", completed: ["ready", "in_transit", "delivered"].includes(status) },
    { label: "In Transit", completed: ["in_transit", "delivered"].includes(status) },
    { label: "Delivered", completed: status === "delivered" },
  ];

  const currentStep = steps.findIndex(step => !step.completed);
  const activeStep = currentStep === -1 ? steps.length - 1 : currentStep - 1;

  return (
    <div className="space-y-6">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3">
          {/* Timeline Line */}
          <div className="flex flex-col items-center">
            <div className={cn(
              "rounded-full p-1.5 border-2 transition-all duration-300",
              step.completed
                ? "border-green-500 bg-green-500 text-white"
                : index === activeStep
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-gray-300 bg-white text-gray-300"
            )}>
              {step.completed ? (
                <Check className="size-3" />
              ) : index === activeStep ? (
                <div className="size-3 animate-pulse rounded-full bg-blue-500" />
              ) : (
                <div className="size-3 rounded-full bg-gray-300" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-0.5 h-6",
                step.completed ? "bg-green-500" : "bg-gray-300"
              )} />
            )}
          </div>

          {/* Step Content */}
          <div className="flex-1 pt-0.5">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-sm font-medium",
                step.completed ? "text-gray-900" : index === activeStep ? "text-blue-600" : "text-gray-400"
              )}>
                {step.label}
              </span>
              {step.date && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(step.date)}
                </span>
              )}
            </div>
            {step.completed && index === steps.length - 1 && actualDelivery && (
              <p className="text-xs text-green-600 mt-0.5">
                Delivered on {formatDateTime(actualDelivery)}
              </p>
            )}
            {index === activeStep && status === "in_transit" && estimatedDelivery && (
              <p className="text-xs text-blue-600 mt-0.5">
                Estimated delivery: {formatDate(estimatedDelivery)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Order Items Table
function OrderItemsTable({ items }: { items: OrderItem[] }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="space-y-3">
      <div className="divide-y">
        {items.map((item) => (
          <div key={item.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <Package className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground">{item.variant}</p>
                    )}
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-sm">{formatCurrency(item.price * item.quantity)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <Separator />
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>{formatCurrency(0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(0)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function OrderDetailsView({ order }: { order: any }) {

  console.log(order, "ORDERssaaaasR")

  const isMobile = useIsMobile();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setIsCopied(true);
    toast.success("Order ID copied");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const statusLabels: Record<Order["status"], string> = {
    pending: "Pending",
    accepted: "Accepted",
    company_accepted: "Company Accepted",
    preparing: "Preparing",
    ready: "Ready",
    ready_for_pickup: "Ready for Pickup",
    in_transit: "In Transit",
    delivered: "Delivered",
    declined: "Declined",
    completed: "Completed",
  };

  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-amber-100 text-amber-800",
      accepted: "bg-blue-100 text-blue-800",
      company_accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-indigo-100 text-indigo-800",
      ready: "bg-cyan-100 text-cyan-800",
      ready_for_pickup: "bg-cyan-100 text-cyan-800",
      in_transit: "bg-emerald-100 text-emerald-800",
      delivered: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };



  const Content = () => (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-2xl font-bold">Order #{order.display_id}</h3>
            <Badge  variant="outline">
              <span className="flex items-center gap-1">
                {getStatusIcon(order.status)}
              </span>
            </Badge>
       
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatDateTime(order.orderDate)}
            </span>
            <button
              onClick={handleCopyOrderId}
              className="flex items-center gap-1 text-xs hover:text-primary transition-colors"
            >
              {isCopied ? (
                <Check className="size-3 text-green-500" />
              ) : (
                <Copy className="size-3" />
              )}
              {isCopied ? "Copied!" : "Copy ID"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download Invoice</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Printer className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Order</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Share2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share Order</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Order Progress */}
      {order.status !== "declined" && order.status !== "cancelled" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={getStatusProgress(order.status)} className="h-2" />
            <div className="mt-4">
              <OrderTimeline
                status={order.status}
                orderDate={order.orderDate}
                estimatedDelivery={order.estimated_delivery}
                actualDelivery={order.actual_delivery}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="size-4" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={order.customer.avatar} />
                <AvatarFallback>
                  {getInitials(order.customer.first_name, order.customer.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {order.customer.first_name} {order.customer.last_name}
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="size-3.5" />
                    <span>{order.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="size-3.5" />
                    <span>{order.customer.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <MapPin className="size-4" />
                Delivery Address
              </p>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>{order.shipping_address.street}</p>
                <p>Barangay {order.shipping_address.barangay}, {order.shipping_address.city}</p>
                <p>{order.shipping_address.province}, {order.shipping_address.postal_code}</p>
                <p>{order.shipping_address.country}</p>
              </div>
              {order.delivery_instructions && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                  <p className="font-medium">Delivery Instructions:</p>
                  <p className="text-muted-foreground">{order.delivery_instructions}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="size-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium">{order.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(order.subtotal || order.total)}</span>
              </div>
              {order.shipping_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping Fee</span>
                  <span className="font-medium">{formatCurrency(order.shipping_fee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="size-3" />
                    Discount
                  </span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment Method</span>
                {/* <span className="capitalize">{order.payment_method.replace(/_/g, ' ')}</span> */}
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          {order.assignedDriver && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Truck className="size-4" />
                  Driver Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {order.assignedDriver.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{order.assignedDriver}</p>
                    {order.driver_phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        <span>{order.driver_phone}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto">
                    <PhoneCall className="size-3.5" />
                  </Button>
                </div>
                {order.tracking_number && (
                  <div className="text-xs text-muted-foreground">
                    Tracking: <span className="font-mono">{order.tracking_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rating */}
          {order.rating && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-4",
                          i < order.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{order.rating}.0</span>
                </div>
                {order.review && (
                  <p className="text-sm text-muted-foreground mt-1">"{order.review}"</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingBag className="size-4" />
            Order Items
          </CardTitle>
          <CardDescription>{order.items.length} item{order.items.length > 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} />
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="size-4" />
              Order Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Special Requests */}
      {order.special_requests && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="size-4" />
              Special Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.special_requests}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="link" className="w-fit px-0 text-left font-medium text-foreground">
            #{order.display_id}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader>
            <DrawerTitle>Order #{order.display_id}</DrawerTitle>
            <DrawerDescription>View complete order details</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <Content />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left font-medium text-foreground hover:text-primary transition-colors">
          #{order.display_id}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order #{order.display_id}</DialogTitle>
          <DialogDescription>View complete order details and status</DialogDescription>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}