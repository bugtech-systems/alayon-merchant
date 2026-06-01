"use client";

import { CalendarIcon, TrendingDown, TrendingUp, Users, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

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
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Delivery metrics interface
interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number;
  totalRevenue: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
  trends?: {
    totalDeliveries: number;
    completedDeliveries: number;
    onTimeRate: number;
    totalRevenue: number;
  };
}

// Rider interface
interface Rider {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// n8n webhook response interface for metrics
interface MetricsN8nResponse {
  success: boolean;
  data: DeliveryMetrics;
  error?: string;
}

// n8n webhook response interface for riders
interface RidersN8nResponse {
  success: boolean;
  data: Rider[];
  error?: string;
}

// Props for the component
interface DeliverySectionCardsProps {
  metricsWebhookUrl: string;  // Webhook for fetching delivery metrics
  ridersWebhookUrl: string;   // Webhook for fetching riders list
}

// Helper function to get date at UTC midnight (start of day)
function getUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

// Helper function to parse date from URL param without timezone issues
function parseDateFromParam(dateString: string): Date | null {
  if (!dateString) return null;
  // Parse YYYY-MM-DD format as UTC date
  const [year, month, day] = dateString.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  // Create date at UTC midnight
  return new Date(Date.UTC(year, month - 1, day));
}

// Helper function to format date for URL param (YYYY-MM-DD in UTC)
function formatDateForParam(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DeliverySectionCards({ 
  metricsWebhookUrl,
  ridersWebhookUrl,
}: DeliverySectionCardsProps) {
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
        return {
          from: fromDate,
          to: toDate,
        };
      }
    }
    
    // Default: last 30 days
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    
    // Set to UTC midnight to avoid timezone issues
    return {
      from: getUTCMidnight(from),
      to: getUTCMidnight(to),
    };
  });
  
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState(() => {
    return searchParams.get("rider") || "all";
  });
  
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ridersError, setRidersError] = useState<string | null>(null);

  // Fetch riders from n8n webhook
  const fetchRiders = useCallback(async () => {
    setLoadingRiders(true);
    setRidersError(null);
    
    try {
      const response = await fetch(ridersWebhookUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });
        console.log(response, 'RSSSPSSDR')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: RidersN8nResponse = await response.json();
              console.log(result, 'RSSSPwwwaaaSSDR')

      // if (!result.success) {
      //   throw new Error(result.error || "Failed to fetch riders");
      // }
      
      // Ensure we have an "all" option
      const ridersList = (result.data || result || []);
      const allOption: Rider = { id: "all", name: "All Riders" };
      setRiders([allOption, ...ridersList]);
      
    } catch (err) {
      console.error("Error fetching riders from n8n:", err);
      setRidersError(err instanceof Error ? err.message : "Failed to load riders");
      
      // Fallback to default riders in development
      if (process.env.NODE_ENV === "development") {
        console.warn("Using default riders due to API error");
        setRiders(defaultRiders);
      } else {
        // In production, at least show "All Riders" option
        setRiders([{ id: "all", name: "All Riders" }]);
      }
    } finally {
      setLoadingRiders(false);
    }
  }, [ridersWebhookUrl]);

  // Fetch metrics from n8n webhook
  const fetchMetricsFromN8n = useCallback(async (
    from: Date, 
    to: Date, 
    riderId: string
  ): Promise<DeliveryMetrics | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Send dates as UTC strings to avoid timezone ambiguity
      const requestBody = {
        dateRange: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        riderId: riderId,
        timestamp: new Date().toISOString(),
      };
      
      console.log("Fetching metrics with:", requestBody);
      
      const response = await fetch(metricsWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: MetricsN8nResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch metrics");
      }
      
      return result.data;
    } catch (err) {
      console.error("Error fetching from n8n:", err);
      setError(err instanceof Error ? err.message : "Failed to load delivery metrics");
      
      // Fallback to mock data for development
      if (process.env.NODE_ENV === "development") {
        console.warn("Using mock data due to API error");
        return getMockMetrics(from, riderId);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [metricsWebhookUrl]);

  // Fetch riders on component mount
  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  // Update URL params when filters change
  const updateUrlParams = useCallback((from: Date, to: Date, rider: string) => {
    const params = new URLSearchParams(searchParams);
    
    // Use UTC date strings to avoid timezone shifts
    params.set("dateFrom", formatDateForParam(from));
    params.set("dateTo", formatDateForParam(to));
    params.set("rider", rider);
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Handle filter changes and trigger n8n call
  const handleDateRangeChange = (range: { from: Date; to: Date } | undefined) => {
    if (range?.from && range?.to) {
      // Ensure dates are normalized to UTC midnight
      const normalizedFrom = getUTCMidnight(range.from);
      const normalizedTo = getUTCMidnight(range.to);
      
      setDateRange({ from: normalizedFrom, to: normalizedTo });
      updateUrlParams(normalizedFrom, normalizedTo, selectedRider);
    }
  };
  
  const handleRiderChange = (riderId: string) => {
    setSelectedRider(riderId);
    updateUrlParams(dateRange.from, dateRange.to, riderId);
  };
  
  // Manual refresh button handler
  const handleRefresh = () => {
    updateUrlParams(dateRange.from, dateRange.to, selectedRider);
  };

  // Effect to fetch data when URL params change
  useEffect(() => {
    const fromParam = searchParams.get("dateFrom");
    const toParam = searchParams.get("dateTo");
    const riderParam = searchParams.get("rider");
    
    let from = dateRange.from;
    let to = dateRange.to;
    let rider = selectedRider;
    let needsUpdate = false;
    
    if (fromParam && toParam) {
      const newFrom = parseDateFromParam(fromParam);
      const newTo = parseDateFromParam(toParam);
      
      if (newFrom && newTo && !isNaN(newFrom.getTime()) && !isNaN(newTo.getTime())) {
        // Check if dates actually changed (comparing timestamps)
        if (from.getTime() !== newFrom.getTime() || to.getTime() !== newTo.getTime()) {
          from = newFrom;
          to = newTo;
          needsUpdate = true;
        }
      }
    }
    
    if (riderParam && riderParam !== selectedRider) {
      rider = riderParam;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      if (from !== dateRange.from || to !== dateRange.to) {
        setDateRange({ from, to });
      }
      if (rider !== selectedRider) {
        setSelectedRider(rider);
      }
    }
    
    // Fetch data from n8n
    const loadData = async () => {
      const data = await fetchMetricsFromN8n(from, to, rider);
      if (data) {
        setMetrics(data);
      }
    };
    
    loadData();
  }, [searchParams]); // Re-run when URL params change

  // Calculate trend indicators based on actual data
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

  // Format date for display (using local timezone for readability)
  const formatDateForDisplay = (date: Date) => {
    return format(date, "LLL dd, yyyy");
  };

  // Get selected rider name for display
  const selectedRiderName = riders.find(r => r.id === selectedRider)?.name || "Filter by rider";

  // Show loading state for riders
  if (loadingRiders) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading riders list...</p>
        </div>
      </div>
    );
  }

  // Show riders error state
  if (ridersError && riders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load riders</p>
          <p className="text-sm text-muted-foreground">{ridersError}</p>
          <Button onClick={fetchRiders} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state for metrics
  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading delivery metrics...</p>
        </div>
      </div>
    );
  }

  // Show error state for metrics
  if (error && !metrics) {
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

        {/* Rider Filter - Dynamically populated from n8n webhook */}
        <Select value={selectedRider} onValueChange={handleRiderChange} disabled={loading}>
          <SelectTrigger className="h-9 min-w-[160px]">
            <Users className="mr-2 size-4" />
            <SelectValue placeholder="Filter by rider">
              {selectedRiderName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {riders.map((rider: any) => (
                <SelectItem key={rider.id} value={rider.id}>
                  <div className="flex items-center gap-2">
                    {rider.avatar && (
                      <img 
                        src={rider.avatar_url} 
                        alt={rider.full_name} 
                        className="size-5 rounded-full object-cover"
                      />
                    )}
                    <span>{rider.full_name}</span>
                    {rider.phone && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {rider.phone}
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
            "Refresh"
          )}
        </Button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
        {/* Total Deliveries Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Deliveries</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {metrics.totalDeliveries.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="size-3" />
                +{metrics.trends?.totalDeliveries || 8.2}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Delivery volume increased <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Compared to previous period
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
              {metrics.pendingDeliveries} pending, {metrics.cancelledDeliveries}{" "}
              cancelled
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
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="size-3" />
                +{metrics.trends?.onTimeRate || 3.2}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Improved delivery punctuality{" "}
              <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Avg. {metrics.avgDeliveryTime} days delivery time
            </div>
          </CardFooter>
        </Card>

        {/* Delivery Revenue Card */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Delivery Revenue</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              ${metrics.totalRevenue.toLocaleString()}
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
              Based on completed deliveries
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

// Default riders data (fallback)
const defaultRiders: Rider[] = [
  { id: "all", name: "All Riders" },
  { id: "rider_1", name: "John Doe", phone: "+1234567890" },
  { id: "rider_2", name: "Jane Smith", phone: "+1234567891" },
  { id: "rider_3", name: "Mike Johnson", phone: "+1234567892" },
  { id: "rider_4", name: "Sarah Williams", phone: "+1234567893" },
];

// Mock data for development fallback
function getMockMetrics(from: Date, riderId: string): DeliveryMetrics {
  // Add some variation based on the date range length
  const daysDiff = Math.ceil(Math.abs(from.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  const multiplier = Math.min(1, daysDiff / 30);
  
  const baseMetrics = {
    totalDeliveries: Math.floor(1234 * multiplier),
    completedDeliveries: Math.floor(1189 * multiplier),
    onTimeRate: 92.5,
    avgDeliveryTime: 2.3,
    totalRevenue: 45678.5 * multiplier,
    pendingDeliveries: Math.floor(34 * multiplier),
    cancelledDeliveries: Math.floor(11 * multiplier),
    trends: {
      totalDeliveries: 8.2,
      completedDeliveries: 6.2,
      onTimeRate: 3.2,
      totalRevenue: 8.5,
    },
  };

  if (riderId !== "all") {
    baseMetrics.totalDeliveries = Math.floor(baseMetrics.totalDeliveries * 0.25);
    baseMetrics.completedDeliveries = Math.floor(baseMetrics.completedDeliveries * 0.25);
    baseMetrics.totalRevenue = baseMetrics.totalRevenue * 0.25;
  }

  return baseMetrics;
}