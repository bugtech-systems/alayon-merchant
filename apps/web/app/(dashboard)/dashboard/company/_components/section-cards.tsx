"use client";

import { CalendarIcon, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useState } from "react";

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

// Mock data structure for delivery metrics
interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number;
  totalRevenue: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
}

// Mock rider data
const riders = [
  { id: "all", name: "All Riders" },
  { id: "rider_1", name: "John Doe" },
  { id: "rider_2", name: "Jane Smith" },
  { id: "rider_3", name: "Mike Johnson" },
  { id: "rider_4", name: "Sarah Williams" },
];

// Mock function to fetch metrics based on filters
const fetchDeliveryMetrics = (
  dateRange: { from: Date; to: Date },
  riderId: string
): DeliveryMetrics => {
  // In real implementation, this would be an API call
  // For now, returning mock data that changes with filters
  const baseMetrics = {
    totalDeliveries: 1234,
    completedDeliveries: 1189,
    onTimeRate: 92.5,
    avgDeliveryTime: 2.3,
    totalRevenue: 45678.5,
    pendingDeliveries: 34,
    cancelledDeliveries: 11,
  };

  // Adjust metrics based on rider filter
  if (riderId !== "all") {
    baseMetrics.totalDeliveries = Math.floor(baseMetrics.totalDeliveries * 0.25);
    baseMetrics.completedDeliveries = Math.floor(
      baseMetrics.completedDeliveries * 0.25
    );
    baseMetrics.totalRevenue = baseMetrics.totalRevenue * 0.25;
  }

  return baseMetrics;
};

export function DeliverySectionCards() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });
  const [selectedRider, setSelectedRider] = useState("all");
  const [metrics, setMetrics] = useState<DeliveryMetrics>(
    fetchDeliveryMetrics(dateRange, selectedRider)
  );

  // Update metrics when filters change
  const updateMetrics = () => {
    const newMetrics = fetchDeliveryMetrics(dateRange, selectedRider);
    setMetrics(newMetrics);
  };

  // Calculate trend indicators (mock logic)
  const getTrend = (current: number, previous: number) => {
    const percentChange = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(percentChange).toFixed(1),
      isUp: percentChange > 0,
    };
  };

  const completedTrend = getTrend(metrics.completedDeliveries, 1120);
  const revenueTrend = getTrend(metrics.totalRevenue, 42100);

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
            >
              <CalendarIcon className="mr-2 size-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
            //   onSelect={(range) => range && setDateRange(range)}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Rider Filter */}
        <Select value={selectedRider} onValueChange={setSelectedRider}>
          <SelectTrigger className="h-9 min-w-[160px]">
            <Users className="mr-2 size-4" />
            <SelectValue placeholder="Filter by rider" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {riders.map((rider) => (
                <SelectItem key={rider.id} value={rider.id}>
                  {rider.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Apply Button */}
        <Button onClick={updateMetrics} size="sm" className="h-9">
          Apply Filters
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
                +8.2%
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
                +3.2%
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