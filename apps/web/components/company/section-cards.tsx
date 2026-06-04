// components/dashboard/DeliverySectionCards.tsx
"use client";

import { CalendarIcon, TrendingDown, TrendingUp, Users, Loader2, RefreshCw, Truck, Package, Clock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Metrics service
import { getDeliveryMetrics, getAvailableDrivers } from "@/lib/data/deliveries";

// Types
interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number;
  totalRevenue: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
  inTransitDeliveries: number;
  trends?: {
    totalDeliveries: number;
    completedDeliveries: number;
    onTimeRate: number;
    totalRevenue: number;
  };
}

interface Driver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

// Helper functions
function getUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function parseDateFromParam(dateString: string): Date | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateForParam(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DeliverySectionCards() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // State management
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const fromParam = searchParams.get("dateFrom");
    const toParam = searchParams.get("dateTo");
    
    if (fromParam && toParam) {
      const fromDate = parseDateFromParam(fromParam);
      const toDate = parseDateFromParam(toParam);
      
      if (fromDate && toDate && !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        return { from: fromDate, to: toDate };
      }
    }
    
    // Default: last 30 days
    const to = getUTCMidnight(new Date());
    const from = getUTCMidnight(new Date());
    from.setDate(from.getDate() - 30);
    
    return { from, to };
  });
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState(() => {
    return searchParams.get("driver") || "all";
  });
  
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch drivers from Medusa SDK
  const fetchDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    
    try {
      const driversList = await getAvailableDrivers();
      const allOption: Driver = { id: "all", name: "All Drivers" };
      setDrivers([allOption, ...driversList]);
    } catch (err) {
      console.error("Error fetching drivers:", err);
      setDrivers([{ id: "all", name: "All Drivers" }]);
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  // Fetch metrics using Medusa SDK
// components/dashboard/DeliverySectionCards.tsx (partial - fetch function update)
const fetchMetrics = useCallback(async (from: Date, to: Date, driverId: string) => {
  setLoading(true);
  setError(null);
  
  try {
    // Set dates to start and end of day
    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
    
    const result = await getDeliveryMetrics({
      dateFrom: startDate,
      dateTo: endDate,
      driverId: driverId === "all" ? undefined : driverId,
    });
    
    if (result.success && result.data) {
      setMetrics(result.data);
    } else {
      throw new Error(result.error || "Failed to fetch metrics");
    }
  } catch (err) {
    console.error("Error fetching metrics:", err);
    setError(err instanceof Error ? err.message : "Failed to load delivery metrics");
    
    // Set empty metrics to avoid UI breakage
    setMetrics({
      totalDeliveries: 0,
      completedDeliveries: 0,
      onTimeRate: 0,
      avgDeliveryTime: 0,
      totalRevenue: 0,
      pendingDeliveries: 0,
      cancelledDeliveries: 0,
      inTransitDeliveries: 0,
    });
  } finally {
    setLoading(false);
  }
}, []);

  // Fetch drivers on component mount
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Update URL params when filters change
  const updateUrlParams = useCallback((from: Date, to: Date, driver: string) => {
    const params = new URLSearchParams(searchParams);
    
    params.set("dateFrom", formatDateForParam(from));
    params.set("dateTo", formatDateForParam(to));
    params.set("driver", driver);
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Handle filter changes
  const handleDateRangeChange = (range: { from: Date; to: Date } | undefined) => {
    if (range?.from && range?.to) {
      const normalizedFrom = getUTCMidnight(range.from);
      const normalizedTo = getUTCMidnight(range.to);
      
      setDateRange({ from: normalizedFrom, to: normalizedTo });
      updateUrlParams(normalizedFrom, normalizedTo, selectedDriver);
    }
  };
  
  const handleDriverChange = (driverId: string) => {
    setSelectedDriver(driverId);
    updateUrlParams(dateRange.from, dateRange.to, driverId);
  };
  
  const handleRefresh = () => {
    fetchMetrics(dateRange.from, dateRange.to, selectedDriver);
  };

  // Effect to fetch data when URL params change
  useEffect(() => {
    const fromParam = searchParams.get("dateFrom");
    const toParam = searchParams.get("dateTo");
    const driverParam = searchParams.get("driver");
    
    let from = dateRange.from;
    let to = dateRange.to;
    let driver = selectedDriver;
    let needsUpdate = false;
    
    if (fromParam && toParam) {
      const newFrom = parseDateFromParam(fromParam);
      const newTo = parseDateFromParam(toParam);
      
      if (newFrom && newTo && !isNaN(newFrom.getTime()) && !isNaN(newTo.getTime())) {
        if (from.getTime() !== newFrom.getTime() || to.getTime() !== newTo.getTime()) {
          from = newFrom;
          to = newTo;
          needsUpdate = true;
        }
      }
    }
    
    if (driverParam && driverParam !== selectedDriver) {
      driver = driverParam;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      if (from !== dateRange.from || to !== dateRange.to) {
        setDateRange({ from, to });
      }
      if (driver !== selectedDriver) {
        setSelectedDriver(driver);
      }
    }
    
    // Fetch metrics
    fetchMetrics(from, to, driver);
  }, [searchParams, fetchMetrics]);

  // Helper functions for UI
  const getTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) {
      return { value: "0", isUp: false };
    }
    const percentChange = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(percentChange).toFixed(1),
      isUp: percentChange > 0,
    };
  };

  const formatDateForDisplay = (date: Date) => {
    return format(date, "LLL dd, yyyy");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const selectedDriverName = drivers.find(d => d.id === selectedDriver)?.name || "Filter by driver";

  // Loading state
  if (loadingDrivers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading delivery data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metrics?.totalDeliveries) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const completedTrend = getTrend(
    metrics.completedDeliveries, 
    metrics.trends?.completedDeliveries
  );
  const revenueTrend = getTrend(
    metrics.totalRevenue, 
    metrics.trends?.totalRevenue
  );
  const totalTrend = getTrend(
    metrics.totalDeliveries,
    metrics.trends?.totalDeliveries
  );
  const onTimeTrend = getTrend(
    metrics.onTimeRate,
    metrics.trends?.onTimeRate
  );

  return (
    <>
      {/* Filters Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-4">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
              disabled={loading}
            >
              <CalendarIcon className="mr-2 size-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {formatDateForDisplay(dateRange.from)} -{" "}
                    {formatDateForDisplay(dateRange.to)}
                  </>
                ) : (
                  formatDateForDisplay(dateRange.from)
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to
              }}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
              defaultMonth={dateRange.from}
            />
          </PopoverContent>
        </Popover>

        {/* Driver Filter */}
        <Select value={selectedDriver} onValueChange={handleDriverChange} disabled={loading}>
          <SelectTrigger className="h-9 min-w-[160px]">
            <Users className="mr-2 size-4" />
            <SelectValue placeholder="Filter by driver">
              {selectedDriverName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  <div className="flex items-center gap-2">
                    <span>{driver.name}</span>
                    {driver.phone && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {driver.phone}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Refresh Button */}
        <Button onClick={handleRefresh} size="sm" className="h-9" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4">
        {/* Total Deliveries Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Deliveries</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {metrics.totalDeliveries.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1",
                  totalTrend.isUp ? "text-green-600" : "text-red-600"
                )}
              >
                {totalTrend.isUp ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {totalTrend.value}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {totalTrend.isUp ? "Increase" : "Decrease"} in volume
              {totalTrend.isUp ? 
                <TrendingUp className="size-4" /> : 
                <TrendingDown className="size-4" />
              }
            </div>
            <div className="text-muted-foreground">
              {metrics.inTransitDeliveries} in transit, {metrics.pendingDeliveries} pending
            </div>
          </CardFooter>
        </Card>

        {/* Completed Deliveries Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Completed Deliveries</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {metrics.completedDeliveries.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  completedTrend.isUp ? "text-green-600" : "text-red-600"
                )}
              >
                {completedTrend.isUp ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {completedTrend.value}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {completedTrend.isUp ? "Growth" : "Decline"} in completion rate{" "}
              {completedTrend.isUp ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
            </div>
            <div className="text-muted-foreground">
              {((metrics.completedDeliveries / metrics.totalDeliveries) * 100).toFixed(1)}% completion rate
            </div>
          </CardFooter>
        </Card>

        {/* On-Time Delivery Rate Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>On-Time Delivery Rate</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {metrics.onTimeRate}%
            </CardTitle>
            <CardAction>
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1",
                  onTimeTrend.isUp ? "text-green-600" : "text-red-600"
                )}
              >
                {onTimeTrend.isUp ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {onTimeTrend.value}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {onTimeTrend.isUp ? "Improved" : "Decreased"} punctuality
              {onTimeTrend.isUp ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
            </div>
            <div className="text-muted-foreground">
              Avg. {metrics.avgDeliveryTime} day{metrics.avgDeliveryTime !== 1 ? 's' : ''} delivery time
            </div>
          </CardFooter>
        </Card>

        {/* Delivery Revenue Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Delivery Revenue</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {formatCurrency(metrics.totalRevenue)}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  revenueTrend.isUp ? "text-green-600" : "text-red-600"
                )}
              >
                {revenueTrend.isUp ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {revenueTrend.value}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Revenue from delivery fees{" "}
              {revenueTrend.isUp ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
            </div>
            <div className="text-muted-foreground">
              Avg. {(metrics.totalRevenue / metrics.completedDeliveries || 0).toFixed(2)} per delivery
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}