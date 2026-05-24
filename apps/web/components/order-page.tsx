// app/(checkout)/your-order/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Clock, MapPin, Package2, Truck, Phone, 
  CheckCircle2, AlertCircle, ClipboardCheck, 
  ShoppingBag, ChevronRight, XCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { retrieveDelivery, retrieveDriver } from "@/lib/data";

// Types
type DeliveryStatus = 
  | "pending" 
  | "company_accepted" 
  | "pickup_claimed" 
  | "company_preparing" 
  | "ready_for_pickup" 
  | "in_transit" 
  | "delivered" 
  | "cancelled";

interface Delivery {
  id: string;
  delivery_status: DeliveryStatus;
  delivery_fee: number;
  tax_amount: number;
  eta?: string;
  delivered_at?: string;
  driver_id?: string;
  delivery_address?: {
    address_1: string;
    address_2?: string;
    city: string;
    country_code: string;
    postal_code?: string;
  };
  delivery_instructions?: string;
  cart?: {
    items: Array<{
      id: string;
      title: string;
      thumbnail?: string;
      quantity: number;
      unit_price: number;
      variant?: { title: string };
    }>;
  };
  company?: {
    name: string;
  };
  timeline?: Array<{
    message: string;
    created_at: string;
  }>;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
}

// Status configuration
const STATUS_CONFIG: Record<DeliveryStatus, {
  label: string;
  shortLabel: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success";
  icon: any;
  progress: number;
  color: string;
  description: string;
}> = {
  pending: {
    label: "Order Placed",
    shortLabel: "Placed",
    variant: "secondary",
    icon: Clock,
    progress: 0,
    color: "bg-gray-500",
    description: "Your order has been received and is awaiting confirmation"
  },
  company_accepted: {
    label: "Order Confirmed",
    shortLabel: "Confirmed",
    variant: "default",
    icon: CheckCircle2,
    progress: 20,
    color: "bg-blue-500",
    description: "The store has accepted your order"
  },
  pickup_claimed: {
    label: "Pickup Assigned",
    shortLabel: "Assigned",
    variant: "default",
    icon: ClipboardCheck,
    progress: 35,
    color: "bg-indigo-500",
    description: "A rider has been assigned to pick up your order"
  },
  company_preparing: {
    label: "Preparing Your Order",
    shortLabel: "Preparing",
    variant: "default",
    icon: Package2,
    progress: 50,
    color: "bg-purple-500",
    description: "The store is preparing your items"
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    shortLabel: "Ready",
    variant: "default",
    icon: ShoppingBag,
    progress: 65,
    color: "bg-yellow-500",
    description: "Your order is ready and waiting for pickup"
  },
  in_transit: {
    label: "Out for Delivery",
    shortLabel: "On the Way",
    variant: "default",
    icon: Truck,
    progress: 85,
    color: "bg-orange-500",
    description: "Your order is on its way to you"
  },
  delivered: {
    label: "Delivered",
    shortLabel: "Delivered",
    variant: "success",
    icon: CheckCircle2,
    progress: 100,
    color: "bg-green-500",
    description: "Your order has been delivered"
  },
  cancelled: {
    label: "Cancelled",
    shortLabel: "Cancelled",
    variant: "destructive",
    icon: XCircle,
    progress: 0,
    color: "bg-red-500",
    description: "Your order has been cancelled"
  }
};

const STATUS_STEPS: DeliveryStatus[] = [
  "pending",
  "company_accepted",
  "pickup_claimed",
  "company_preparing",
  "ready_for_pickup",
  "in_transit",
  "delivered"
];

const getNumericStatus = (status: DeliveryStatus): number => {
  const index = STATUS_STEPS.indexOf(status);
  return index === -1 ? 0 : index;
};

// Mobile Timeline Component
function MobileTimeline({ currentStatus, progressPercentage, estimatedRemaining, deliveredAt }: any) {
  const currentConfig = STATUS_CONFIG[currentStatus as DeliveryStatus];
  
  return (
    <div className="lg:hidden space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", currentConfig.color)} />
            <span className="text-sm font-medium">{currentConfig.label}</span>
          </div>
          {estimatedRemaining && !deliveredAt && (
            <span className="text-xs text-primary font-medium">{estimatedRemaining} left</span>
          )}
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-2">{currentConfig.description}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {STATUS_STEPS.map((step, idx) => {
            const stepConfig = STATUS_CONFIG[step];
            const StepIcon = stepConfig.icon;
            const isCompleted = getNumericStatus(currentStatus) >= getNumericStatus(step);
            const isCurrent = currentStatus === step;
            
            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isCompleted ? "bg-green-500 text-white" :
                    isCurrent ? "bg-primary text-white ring-4 ring-primary/20" :
                    "bg-gray-100 text-gray-400"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    {stepConfig.shortLabel}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Desktop Timeline Component
function DesktopTimeline({ currentStatus, progressPercentage, estimatedRemaining, deliveredAt }: any) {
  const currentConfig = STATUS_CONFIG[currentStatus as DeliveryStatus];
  
  return (
    <div className="hidden lg:block">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                {STATUS_STEPS.map(step => (
                  <span key={step}>{STATUS_CONFIG[step].shortLabel}</span>
                ))}
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-7 gap-1">
              {STATUS_STEPS.map((step) => {
                const stepConfig = STATUS_CONFIG[step];
                const StepIcon = stepConfig.icon;
                const isCompleted = getNumericStatus(currentStatus) >= getNumericStatus(step);
                const isCurrent = currentStatus === step;
                
                return (
                  <div key={step} className="text-center">
                    <div className={cn(
                      "w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-all",
                      isCompleted ? "bg-green-500 text-white" : 
                      isCurrent ? "bg-primary text-white ring-4 ring-primary/20" :
                      "bg-gray-200 text-gray-500"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <p className={cn(
                      "text-xs mt-2",
                      isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                    )}>
                      {stepConfig.shortLabel}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">{currentConfig.description}</p>
              {estimatedRemaining && !deliveredAt && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Estimated {estimatedRemaining} remaining
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Order Item Components
function OrderItem({ item, formatPrice, isMobile = false }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemTotal = item.quantity * item.unit_price;
  
  if (isMobile) {
    return (
      <div>
        <div className="flex gap-3 py-3">
          <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {item.thumbnail ? (
              <Image
                src={item.thumbnail}
                alt={item.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package2 className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-sm text-foreground line-clamp-2 flex-1">
                {item.title}
              </h3>
              <span className="font-semibold text-primary text-sm whitespace-nowrap">
                {formatPrice(itemTotal)}
              </span>
            </div>
            {item.variant?.title && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.variant.title}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Less" : "More"} details
              </Button>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="ml-[68px] mb-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
            <p><span className="text-muted-foreground">Unit price:</span> {formatPrice(item.unit_price)}</p>
            <p><span className="text-muted-foreground">Total:</span> {formatPrice(itemTotal)}</p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex gap-4 py-3 border-b last:border-0">
      <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package2 className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground line-clamp-2">{item.title}</h3>
        {item.variant?.title && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.variant.title}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
          <span className="font-semibold text-primary">{formatPrice(itemTotal)}</span>
        </div>
      </div>
    </div>
  );
}

export default function OrderStatusPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deliveryId = searchParams.get("id");
  
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryId) {
      router.push("/account/orders?error=no_order_selected");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const deliveryData = await retrieveDelivery(deliveryId) as any;
        
        if (!deliveryData) {
          setError("Order not found");
          return;
        }
        
        setDelivery(deliveryData);
        
        if (deliveryData.driver_id) {
          try {
            const driverData = await retrieveDriver(deliveryData.driver_id) as any;
            setDriver(driverData);
          } catch (err) {
            console.error("Failed to fetch driver:", err);
          }
        }
      } catch (err) {
        console.error("Failed to fetch delivery:", err);
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deliveryId, router]);

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || "Unable to find your order"}</p>
            <Link href="/account/orders">
              <Button>View All Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtotal = delivery.cart?.items?.reduce(
    (total, item) => total + item.quantity * item.unit_price,
    0
  ) || 0;

  const deliveryFee = delivery.delivery_fee || 0;
  const taxAmount = delivery.tax_amount || 0;
  const totalAmount = subtotal + deliveryFee + taxAmount;

  const currentStatus = delivery.delivery_status;
  const currentStatusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;
  const CurrentStatusIcon = currentStatusConfig.icon;
  const progressPercentage = currentStatusConfig.progress;

  const eta = delivery.eta ? formatTime(delivery.eta) : null;
  const deliveredAt = delivery.delivered_at ? formatTime(delivery.delivered_at) : null;
  const deliveryDate = delivery.delivered_at ? formatDate(delivery.delivered_at) : null;

  const getEstimatedRemaining = () => {
    if (delivery.delivered_at || !delivery.eta) return null;
    const etaDate = new Date(delivery.eta);
    const now = new Date();
    const diffMinutes = Math.ceil((etaDate.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes <= 0) return "Any minute now";
    if (diffMinutes < 60) return `${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  };

  const estimatedRemaining = getEstimatedRemaining();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Order #{delivery.id.slice(-8)}</p>
              <h1 className="text-lg font-semibold text-foreground">Track Order</h1>
            </div>
            <Badge  className="text-xs">
              <CurrentStatusIcon className="h-3 w-3 mr-1" />
              {currentStatusConfig.shortLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Package2 className="h-5 w-5" />
                <span className="text-sm font-medium">Order Status</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
                Order #{delivery.id.slice(-8)}
              </h1>
              <p className="text-muted-foreground mt-1">
                Track your order from {delivery.company?.name || "Alayon Store"}
              </p>
            </div>
            <Badge  className="w-fit text-sm py-1.5 px-4">
              <CurrentStatusIcon className="h-3.5 w-3.5 mr-1.5" />
              {currentStatusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            <MobileTimeline 
              currentStatus={currentStatus}
              progressPercentage={progressPercentage}
              estimatedRemaining={estimatedRemaining}
              deliveredAt={deliveredAt}
            />
            <DesktopTimeline 
              currentStatus={currentStatus}
              progressPercentage={progressPercentage}
              estimatedRemaining={estimatedRemaining}
              deliveredAt={deliveredAt}
            />

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Package2 className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                  Order Items
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {delivery.cart?.items?.length || 0} items
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 lg:space-y-4">
                <div className="lg:hidden space-y-2">
                  {delivery.cart?.items?.map((item) => (
                    <OrderItem key={item.id} item={item} formatPrice={formatPrice} isMobile={true} />
                  ))}
                </div>
                <div className="hidden lg:block space-y-2">
                  {delivery.cart?.items?.map((item) => (
                    <OrderItem key={item.id} item={item} formatPrice={formatPrice} isMobile={false} />
                  ))}
                </div>

                <Separator className="my-3 lg:my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax (12% VAT)</span>
                      <span>{formatPrice(taxAmount)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-primary text-base lg:text-xl">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4 lg:space-y-6">
            {/* Delivery Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Truck className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {eta && !deliveredAt && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Delivery</p>
                      <p className="font-semibold text-foreground">{eta}</p>
                    </div>
                    {estimatedRemaining && (
                      <Badge variant="secondary" className="text-xs">
                        {estimatedRemaining} left
                      </Badge>
                    )}
                  </div>
                )}

                {driver && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">Your delivery partner</p>
                      {driver.phone && (
                        <div className="flex items-center gap-2 mt-1">
                          <a href={`tel:${driver.phone}`}>
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs gap-1">
                              <Phone className="h-3 w-3" />
                              {driver.phone}
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {delivery.delivery_address && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <MapPin className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <address className="not-italic text-sm text-muted-foreground">
                    <p>{delivery.delivery_address.address_1}</p>
                    {delivery.delivery_address.address_2 && <p>{delivery.delivery_address.address_2}</p>}
                    <p>
                      {delivery.delivery_address.city}, {delivery.delivery_address.country_code?.toUpperCase()}
                      {delivery.delivery_address.postal_code && ` ${delivery.delivery_address.postal_code}`}
                    </p>
                  </address>
                  {delivery.delivery_instructions && (
                    <div className="p-2 bg-gray-50 rounded-lg text-xs">
                      <p className="font-medium text-muted-foreground mb-0.5">Instructions:</p>
                      <p className="text-foreground">"{delivery.delivery_instructions}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            {delivery.timeline && delivery.timeline.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                    Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {delivery.timeline.slice(0, 3).map((event, index) => (
                      <div key={index} className="flex gap-2 text-sm">
                        <div className="w-16 text-xs text-muted-foreground flex-shrink-0">
                          {new Date(event.created_at).toLocaleTimeString("en-PH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                        <p className="text-sm text-foreground">{event.message}</p>
                      </div>
                    ))}
                    {delivery.timeline.length > 3 && (
                      <details className="text-sm">
                        <summary className="text-primary cursor-pointer text-xs font-medium">
                          View {delivery.timeline.length - 3} more events
                        </summary>
                        <div className="mt-2 space-y-2">
                          {delivery.timeline.slice(3).map((event, index) => (
                            <div key={index} className="flex gap-2 text-sm pt-2 border-t border-gray-100">
                              <div className="w-16 text-xs text-muted-foreground flex-shrink-0">
                                {new Date(event.created_at).toLocaleTimeString("en-PH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </div>
                              <p className="text-sm text-foreground">{event.message}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 lg:h-10 lg:w-10 text-primary mx-auto mb-2 lg:mb-3" />
                  <h3 className="font-semibold text-foreground mb-1 lg:mb-2 text-sm lg:text-base">Need Help?</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground mb-3 lg:mb-4">
                    Having issues with your order? Contact our support team.
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/support?order=${delivery.id}`} className="flex-1">
                      <Button size="sm" className="w-full text-xs lg:text-sm">
                        Contact Support
                      </Button>
                    </Link>
                    <Link href="/account/orders">
                      <Button variant="outline" size="sm" className="text-xs lg:text-sm">
                        All Orders
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

