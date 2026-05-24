"use client";

import { CalendarDays, CalendarRange, Package, Phone, Truck, MapPin, CheckCircle, Circle, Clock } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mock data for monthly delivery goal
const deliveriesCompleted = 142;
const deliveryGoal = 200;
const deliveryProgressPercentage = Math.round((deliveriesCompleted / deliveryGoal) * 100);
const deliveryGoalBarCount = 42;
const activeDeliveryBars = Math.round((deliveriesCompleted / deliveryGoal) * deliveryGoalBarCount);

const deliveryGoalBars = Array.from({ length: deliveryGoalBarCount }, (_, index) => ({
  id: `delivery-goal-${index + 1}`,
  active: index < activeDeliveryBars,
}));

// Mock upcoming deliveries data with Philippines locations
interface UpcomingDelivery {
  id: string;
  time: string;
  customer: string;
  phoneNumber: string;
  location: "Tacloban City" | "Palo";
  address: string;
  quantity: number;
  status: "pending" | "preparing" | "in_transit" | "delivered";
  progress: number; // 0-100
}

const upcomingDeliveries: UpcomingDelivery[] = [
  {
    id: "1",
    time: "08:45",
    customer: "Asteron Bioworks",
    phoneNumber: "+63 912 345 6789",
    location: "Tacloban City",
    address: "Brgy. 88, San Jose District",
    quantity: 250,
    status: "pending",
    progress: 0,
  },
  {
    id: "2",
    time: "09:00",
    customer: "BlueHaven Systems",
    phoneNumber: "+63 923 456 7890",
    location: "Palo",
    address: "National Highway, Barangay Baras",
    quantity: 300,
    status: "preparing",
    progress: 25,
  },
  {
    id: "3",
    time: "10:00",
    customer: "Cinder Health",
    phoneNumber: "+63 934 567 8901",
    location: "Tacloban City",
    address: "Real Street, Downtown Area",
    quantity: 400,
    status: "in_transit",
    progress: 60,
  },
  {
    id: "4",
    time: "10:20",
    customer: "Drift Manufacturing",
    phoneNumber: "+63 945 678 9012",
    location: "Palo",
    address: "San Joaquin Street",
    quantity: 350,
    status: "pending",
    progress: 0,
  },
  {
    id: "5",
    time: "11:30",
    customer: "Everline Freight",
    phoneNumber: "+63 956 789 0123",
    location: "Tacloban City",
    address: "Magsaysay Boulevard",
    quantity: 500,
    status: "preparing",
    progress: 15,
  },
  {
    id: "6",
    time: "13:15",
    customer: "Fieldstone Capital",
    phoneNumber: "+63 967 890 1234",
    location: "Tacloban City",
    address: "Sen. Enage Street",
    quantity: 280,
    status: "in_transit",
    progress: 75,
  },
  {
    id: "7",
    time: "14:45",
    customer: "Granite Studios",
    phoneNumber: "+63 978 901 2345",
    location: "Palo",
    address: "Leyte Park Road",
    quantity: 400,
    status: "delivered",
    progress: 100,
  },
  {
    id: "8",
    time: "15:30",
    customer: "Halcyon Dynamics",
    phoneNumber: "+63 989 012 3456",
    location: "Tacloban City",
    address: "P. Gomez Street",
    quantity: 320,
    status: "in_transit",
    progress: 90,
  },
];

const getStatusIcon = (status: UpcomingDelivery["status"]) => {
  switch (status) {
    case "pending":
      return <Clock className="size-3.5" />;
    case "preparing":
      return <Package className="size-3.5" />;
    case "in_transit":
      return <Truck className="size-3.5" />;
    case "delivered":
      return <CheckCircle className="size-3.5" />;
    default:
      return <CalendarRange className="size-3.5" />;
  }
};

const getStatusColor = (status: UpcomingDelivery["status"]) => {
  switch (status) {
    case "pending":
      return "bg-amber-500 text-amber-950 hover:bg-amber-600";
    case "preparing":
      return "bg-blue-500 text-blue-950 hover:bg-blue-600";
    case "in_transit":
      return "bg-emerald-500 text-emerald-950 hover:bg-emerald-600";
    case "delivered":
      return "bg-green-500 text-green-950 hover:bg-green-600";
    default:
      return "bg-primary text-primary-foreground";
  }
};

const getStatusText = (status: UpcomingDelivery["status"]) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "preparing":
      return "Preparing";
    case "in_transit":
      return "In Transit";
    case "delivered":
      return "Delivered";
    default:
      return status;
  }
};

export function TaskReminders() {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [hoveredDelivery, setHoveredDelivery] = React.useState<string | null>(null);
  const [expandedDelivery, setExpandedDelivery] = React.useState<string | null>(null);

  const handleDeliveryClick = (id: string) => {
    setExpandedDelivery(expandedDelivery === id ? null : id);
  };

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Upcoming Deliveries Card */}
      <Card className="xl:col-span-8">
        <CardHeader>
          <CardTitle>Upcoming Deliveries</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm">
              <CalendarDays data-icon="inline-start" />
              View Schedule
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeline Header */}
          <div className="flex items-center justify-between text-muted-foreground text-xs tabular-nums">
            <div className="flex flex-col items-center gap-1">
              <span>08:00</span>
              <span className="h-2 w-px bg-border" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>10:00</span>
              <span className="h-2 w-px bg-border" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>12:00</span>
              <span className="h-2 w-px bg-border" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>14:00</span>
              <span className="h-2 w-px bg-border" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span>16:00</span>
              <span className="h-2 w-px bg-border" />
            </div>
          </div>

          {/* Horizontal Scrollable Deliveries Container */}
          <div 
            ref={scrollContainerRef}
            className="relative overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-border"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="relative min-w-[500px]">
              {/* Timeline Base Line */}
              <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-border/80" />
              
              {/* Delivery Cards */}
              <div className="flex items-start gap-4">
                {upcomingDeliveries.map((delivery) => {
                  // Calculate position based on time
                  const timeToPercent = (time: string) => {
                    const [hours, minutes] = time.split(":").map(Number);
                    const totalMinutes = hours * 60 + minutes;
                    const startMinutes = 8 * 60; // 8:00 AM
                    const endMinutes = 16 * 60; // 4:00 PM
                    return ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
                  };
                  
                  const position = timeToPercent(delivery.time);
                  const isHovered = hoveredDelivery === delivery.id;
                  const isExpanded = expandedDelivery === delivery.id;
                  
                  return (
                    <div
                      key={delivery.id}
                      className="absolute top-0 transition-all duration-300"
                      style={{ 
                        left: `${position}%`,
                        transform: "translateX(-50%)",
                        zIndex: isHovered || isExpanded ? 50 : 10,
                      }}
                    >
                      <div className="relative top-2">
                        {/* Delivery Card */}
                        <div
                          className={cn(
                            "w-64 cursor-pointer rounded-lg p-3 shadow-sm transition-all duration-300",
                            getStatusColor(delivery.status),
                            isHovered && "scale-110 shadow-lg",
                            isExpanded && "scale-110 shadow-xl"
                          )}
                          onMouseEnter={() => setHoveredDelivery(delivery.id)}
                          onMouseLeave={() => setHoveredDelivery(null)}
                          onClick={() => handleDeliveryClick(delivery.id)}
                        >
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/20">
                              {getStatusIcon(delivery.status)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-xs leading-none">
                                {delivery.customer}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] opacity-75">
                                <span>{delivery.quantity.toLocaleString()} units</span>
                                <span>•</span>
                                <span>{delivery.time}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                              <span>Delivery Progress</span>
                              <span>{delivery.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/20">
                              <div 
                                className="h-full rounded-full bg-white transition-all duration-500"
                                style={{ width: `${delivery.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-medium">
                              {getStatusIcon(delivery.status)}
                              <span>{getStatusText(delivery.status)}</span>
                            </span>
                          </div>

                          {/* Expanded Details */}
                          {(isHovered || isExpanded) && (
                            <div className="mt-3 space-y-2 border-t border-background/20 pt-2 animate-in fade-in duration-200">
                              {/* Location */}
                              <div className="flex items-start gap-1.5 text-[10px]">
                                <MapPin className="mt-0.5 size-3 shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium">{delivery.location}</div>
                                  <div className="opacity-75">{delivery.address}</div>
                                </div>
                              </div>
                              
                              {/* Phone Number */}
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <Phone className="size-3" />
                                <span className="opacity-75">{delivery.phoneNumber}</span>
                              </div>

                              {/* Amount */}
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="font-medium">Amount:</span>
                                <span className="opacity-75">
                                  ₱{(delivery.quantity * 85).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>

                              {/* Action Buttons */}
                              {delivery.status !== "delivered" && (
                                <div className="mt-2 flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="h-7 flex-1 text-[10px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Handle update progress
                                    }}
                                  >
                                    Update Progress
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 flex-1 text-[10px] bg-background/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Handle contact
                                    }}
                                  >
                                    <Phone className="mr-1 size-3" />
                                    Contact
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Timeline connector */}
                        <div className="absolute -bottom-5 left-1/2 h-2 w-px -translate-x-1/2 bg-border" />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Spacer to accommodate absolute positioned cards */}
              <div className="min-h-70" />
            </div>
          </div>
          
          {/* Scroll Hint */}
          {upcomingDeliveries.length > 4 && (
            <div className="flex justify-center">
              <p className="text-muted-foreground text-xs animate-pulse">
                ← Scroll to see more deliveries →
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Delivery Goal Card */}
      <Card className="xl:col-span-4">
        <CardHeader>
          <CardTitle>Monthly Delivery Goal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-end justify-between gap-3">
            <div className="font-medium text-2xl tabular-nums leading-none">
              {deliveriesCompleted}{" "}
              <span className="font-normal text-base text-muted-foreground">delivered</span>
            </div>
            <div className="text-muted-foreground text-sm tabular-nums">{deliveryGoal} target</div>
          </div>
          <div className="flex h-10 w-full items-end gap-0.5">
            {deliveryGoalBars.map((bar) => (
              <div key={bar.id} className="flex flex-1 justify-center">
                <div
                  className={cn(
                    "h-10 w-1.5 rounded-full transition-all duration-300",
                    bar.active ? "bg-emerald-500/75" : "bg-muted-foreground/25"
                  )}
                />
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm">
            {deliveryProgressPercentage}% of this month&apos;s delivery target reached.
            {deliveryGoal - deliveriesCompleted} deliveries remaining.
          </p>

          {/* Quick Stats */}
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Value Delivered</span>
              <span className="font-medium tabular-nums">
                ₱{(deliveriesCompleted * 2500).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Deliveries</span>
              <span className="font-medium">
                {upcomingDeliveries.filter(d => d.status !== "delivered").length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tacloban City</span>
              <span className="font-medium">
                {upcomingDeliveries.filter(d => d.location === "Tacloban City").length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Palo</span>
              <span className="font-medium">
                {upcomingDeliveries.filter(d => d.location === "Palo").length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}