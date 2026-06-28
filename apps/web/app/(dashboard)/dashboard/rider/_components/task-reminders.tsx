// components/TaskReminders.tsx

"use client";

import { CalendarDays, Package, Truck, MapPin, Clock, Loader2, Box, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { retrieveDriverStocks } from "@/lib/data";

// Types based on actual data structure
interface InventoryItem {
  inventory_item: {
    id: string;
    sku: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    requires_shipping: boolean;
  };
  stock_location_id: string;
  current_stock: {
    stocked_quantity: number;
    reserved_quantity: number;
    available_quantity: number;
    beginning_inventory: number;
  };
  customer_orders: {
    total_ordered: number;
    total_fulfilled: number;
    beginning_inventory: number;
    order_count: number;
    orders: any[];
  };
  inventory_level: {
    id: string;
    location_id: string;
    stocked_quantity: number;
    reserved_quantity: number;
    incoming_quantity: number;
  } | null;
  reservations: any[];
}

interface InventoryProgressData {
  customer_id: string;
  stock_location_id: string;
  inventory_items: InventoryItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    count: number;
    has_more: boolean;
  };
  summary: {
    total_stocked: number;
    total_reserved: number;
    total_available: number;
    total_beginning_inventory: number;
    total_items: number;
    total_ordered: number;
    total_fulfilled: number;
  };
  customer_orders_summary: {
    total_orders: number;
    order_statuses: string;
    total_order_items: number;
    unique_inventory_items: number;
  };
}

interface IncomingDelivery {
  id: string;
  time: string;
  customer: string;
  location: string;
  address: string;
  quantity: number;
  status: "pending" | "preparing" | "in_transit" | "delivered";
  progress: number;
  sku: string;
}

interface TaskRemindersProps {
  customerId: string;
  locationId: string;
}

export function TaskReminders({ customerId, locationId }: TaskRemindersProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [hoveredDelivery, setHoveredDelivery] = React.useState<string | null>(null);
  const [expandedDelivery, setExpandedDelivery] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const itemsPerPage = 3;

  // Fetch inventory data
  const { data: inventoryData, isLoading, error } = useQuery({
    queryKey: ['inventory', customerId, locationId],
    queryFn: async () => {
      const response = await retrieveDriverStocks(customerId, locationId);
      return response.data as InventoryProgressData;
    },
    enabled: !!customerId && !!locationId,
    retry: 2,
    staleTime: 30000,
  });

  // Transform inventory items to incoming deliveries
  const incomingDeliveries = React.useMemo((): IncomingDelivery[] => {
    if (!inventoryData?.inventory_items || inventoryData.inventory_items.length === 0) {
      return [];
    }

    return inventoryData.inventory_items
      .filter(item => item.current_stock.available_quantity > 0 || item.current_stock.stocked_quantity > 0)
      .map((item, index) => {
        const hours = 8 + Math.floor((index * 1.5) % 8);
        const minutes = (index * 30) % 60;
        const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        const stock = item.current_stock;
        let status: IncomingDelivery["status"] = "pending";
        const progress = stock.available_quantity > 0 
          ? Math.min(100, Math.round((stock.available_quantity / (stock.stocked_quantity || 1)) * 100))
          : 0;
        
        if (progress >= 100) status = "delivered";
        else if (progress >= 70) status = "in_transit";
        else if (progress >= 30) status = "preparing";

        const locations = ["Tacloban City", "Palo", "Ormoc City", "Baybay City"];
        const location = locations[index % locations.length];

        return {
          id: item.inventory_item.id,
          time,
          customer: item.inventory_item.title || `Item ${index + 1}`,
          location,
          address: `Brgy. ${Math.floor(10 + Math.random() * 90)}, ${location}`,
          quantity: stock.available_quantity || stock.stocked_quantity || 0,
          status,
          progress,
          sku: item.inventory_item.sku,
        };
      });
  }, [inventoryData]);

  // Calculate stock summary metrics
  const stockMetrics = React.useMemo(() => {
    if (!inventoryData) {
      return {
        totalItems: 0,
        totalStocked: 0,
        totalAvailable: 0,
        totalReserved: 0,
        totalBeginning: 0,
        totalOrders: 0,
        percentageAvailable: 0,
        activeItems: 0,
        lowStockItems: 0,
        goalBarCount: 42,
        activeDeliveryBars: 0,
      };
    }

    const { summary } = inventoryData;
    const totalStocked = summary.total_stocked || 0;
    const totalAvailable = summary.total_available || 0;
    const percentageAvailable = totalStocked > 0 ? Math.round((totalAvailable / totalStocked) * 100) : 0;
    const goalBarCount = 42;
    const activeDeliveryBars = totalStocked > 0 ? Math.round((totalAvailable / totalStocked) * goalBarCount) : 0;

    return {
      totalItems: summary.total_items || 0,
      totalStocked,
      totalAvailable,
      totalReserved: summary.total_reserved || 0,
      totalBeginning: summary.total_beginning_inventory || 0,
      totalOrders: inventoryData.customer_orders_summary?.total_orders || 0,
      percentageAvailable,
      activeItems: inventoryData.inventory_items.filter(
        item => item.current_stock.available_quantity > 0
      ).length,
      lowStockItems: inventoryData.inventory_items.filter(
        item => item.current_stock.available_quantity > 0 && item.current_stock.available_quantity < 20
      ).length,
      goalBarCount,
      activeDeliveryBars,
    };
  }, [inventoryData]);

  // Generate stock goal bars
  const stockGoalBars = React.useMemo(() => {
    const { goalBarCount, activeDeliveryBars } = stockMetrics;
    return Array.from({ length: goalBarCount }, (_, index) => ({
      id: `stock-goal-${index + 1}`,
      active: index < activeDeliveryBars,
    }));
  }, [stockMetrics]);

  // Pagination for deliveries
  const totalPages = Math.ceil(incomingDeliveries.length / itemsPerPage);
  const paginatedDeliveries = React.useMemo(() => {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return incomingDeliveries.slice(start, end);
  }, [incomingDeliveries, currentPage]);

  const getStatusIcon = (status: IncomingDelivery["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="size-3.5" />;
      case "preparing":
        return <Package className="size-3.5" />;
      case "in_transit":
        return <Truck className="size-3.5" />;
      case "delivered":
        return <Package className="size-3.5" />;
      default:
        return <CalendarDays className="size-3.5" />;
    }
  };

  const getStatusColor = (status: IncomingDelivery["status"]) => {
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

  const getStatusText = (status: IncomingDelivery["status"]) => {
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

  const handleDeliveryClick = (id: string) => {
    setExpandedDelivery(expandedDelivery === id ? null : id);
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading deliveries...</span>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading stock metrics...</span>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-12">
          <CardContent className="py-8 text-center">
            <p className="text-red-500">Error loading data: {error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Empty state
  if (!inventoryData || inventoryData.inventory_items.length === 0) {
    return (
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-12">
          <CardContent className="py-12 text-center">
            <Package className="mx-auto size-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No inventory items found</p>
            <p className="text-sm text-muted-foreground">Add inventory items to track deliveries</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Incoming Deliveries Card */}
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardTitle>Incoming Deliveries</CardTitle>
          <CardAction>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex">
                {incomingDeliveries.length} deliveries
              </Badge>
              <Button variant="outline" size="sm">
                <CalendarDays className="mr-1 size-3.5" />
                Schedule
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeline Header - Desktop */}
          <div className="hidden sm:flex items-center justify-between text-muted-foreground text-xs tabular-nums">
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

          {/* Deliveries List - Mobile & Desktop */}
          <div className="space-y-3">
            {paginatedDeliveries.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="mx-auto size-8 opacity-50" />
                <p className="mt-2">No incoming deliveries</p>
              </div>
            ) : (
              paginatedDeliveries.map((delivery) => {
                const isHovered = hoveredDelivery === delivery.id;
                const isExpanded = expandedDelivery === delivery.id;

                return (
                  <div
                    key={delivery.id}
                    className={cn(
                      "relative rounded-lg border p-4 transition-all cursor-pointer",
                      getStatusColor(delivery.status),
                      isHovered && "shadow-lg scale-[1.02]",
                      isExpanded && "shadow-xl scale-[1.02]"
                    )}
                    onMouseEnter={() => setHoveredDelivery(delivery.id)}
                    onMouseLeave={() => setHoveredDelivery(null)}
                    onClick={() => handleDeliveryClick(delivery.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Icon + Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/20">
                          {getStatusIcon(delivery.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {delivery.customer}
                            </h4>
                            <Badge variant="secondary" className="text-[10px] bg-background/20">
                              {delivery.sku}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
                            <span>{delivery.quantity.toLocaleString()} units</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {delivery.location}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {delivery.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status + Progress */}
                      <div className="flex items-center gap-3 sm:ml-auto">
                        <div className="hidden sm:block w-24">
                          <div className="flex items-center justify-between text-[10px] opacity-75 mb-0.5">
                            <span>Progress</span>
                            <span>{delivery.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/20">
                            <div
                              className="h-full rounded-full bg-white transition-all duration-500"
                              style={{ width: `${delivery.progress}%` }}
                            />
                          </div>
                        </div>
                        <Badge className="bg-background/20 text-[10px] whitespace-nowrap">
                          {getStatusText(delivery.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {(isHovered || isExpanded) && (
                      <div className="mt-3 space-y-2 border-t border-background/20 pt-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 size-3 shrink-0" />
                            <div>
                              <div className="font-medium">{delivery.location}</div>
                              <div className="opacity-75">{delivery.address}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Package className="size-3" />
                            <span className="opacity-75">SKU: {delivery.sku}</span>
                          </div>
                        </div>
                        
                        {/* Mobile Progress Bar */}
                        <div className="sm:hidden">
                          <div className="flex items-center justify-between text-[10px] opacity-75 mb-0.5">
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

                        {/* Action Buttons */}
                        {delivery.status !== "delivered" && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button size="sm" variant="secondary" className="h-7 text-[10px] flex-1 sm:flex-none">
                              Update Progress
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[10px] bg-background/20 flex-1 sm:flex-none">
                              View Details
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="text-xs"
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="text-xs"
              >
                Next
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Inventory Progress Card */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="size-4" />
            Stock Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stock Summary */}
          <div>
            <div className="flex items-end justify-between gap-3">
              <div className="font-medium text-2xl tabular-nums leading-none">
                {stockMetrics.totalAvailable}{" "}
                <span className="font-normal text-base text-muted-foreground">available</span>
              </div>
              <div className="text-muted-foreground text-sm tabular-nums">
                {stockMetrics.totalStocked} total
              </div>
            </div>
            
            {/* Stock Progress Bars */}
            <div className="flex h-10 w-full items-end gap-0.5 mt-2">
              {stockGoalBars.map((bar) => (
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
            <p className="text-muted-foreground text-sm mt-1">
              {stockMetrics.percentageAvailable}% of total stock available.
              {stockMetrics.totalReserved > 0 && ` ${stockMetrics.totalReserved} units reserved.`}
            </p>
          </div>

          {/* Stock Stats */}
          <div className="space-y-2 border-t pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-lg font-semibold">{stockMetrics.totalItems}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Active Items</p>
                <p className="text-lg font-semibold text-green-600">{stockMetrics.activeItems}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-lg font-semibold text-amber-600">{stockMetrics.lowStockItems}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Customer Orders</p>
                <p className="text-lg font-semibold">{stockMetrics.totalOrders}</p>
              </div>
            </div>
          </div>

          {/* Stock Breakdown */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Stock Breakdown</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stocked</span>
                <span className="font-medium">{stockMetrics.totalStocked}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium text-green-600">{stockMetrics.totalAvailable}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reserved</span>
                <span className="font-medium text-amber-600">{stockMetrics.totalReserved}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Beginning Inventory</span>
                <span className="font-medium text-blue-600">{stockMetrics.totalBeginning}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}