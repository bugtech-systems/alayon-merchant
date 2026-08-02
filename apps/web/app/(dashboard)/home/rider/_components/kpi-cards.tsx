"use client";

import { ArrowUpRight, Package, TrendingDown, TrendingUp, Truck, CalendarDays, Clock, MapPin, Map } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

// Mock data - in real app, this would come from API based on selected date
interface RiderStats {
  totalDeliveries?: number;
  completedDeliveries?: number;
  totalEarnings?: number;
  onTimeRate?: number;
  distanceTraveled?: number;
}

export function KpiCards() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  // Mock data that would change based on selectedDate
  const stats: RiderStats = {
    totalDeliveries: 24,
    completedDeliveries: 18,
    totalEarnings: 4680,
    onTimeRate: 92.5,
    distanceTraveled: 156,
  };

  const pendingDeliveries = stats.totalDeliveries - stats.completedDeliveries;
  const completionRate = (stats.completedDeliveries / stats.totalDeliveries) * 100;

  return (
    <section className="space-y-5">
      {/* Header with Date Picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl tracking-tight">Rider Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            Track your deliveries, earnings, and performance metrics.
          </p>
        </div>

        <Link href={'/map'}>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <Map className="mr-2 size-4" />
               <span>Map Route</span>
              </Button>
              </Link>
        {/* Date Picker */}
          {/* <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarDays className="mr-2 size-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover> */}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Total Deliveries Card */}
        <Card>
          <CardHeader>
            <CardDescription>Total Deliveries</CardDescription>
            <CardAction>
              <Package className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none tracking-tight">{stats.totalDeliveries}</span>
              <Badge variant="outline" className="border-blue-200 bg-blue-500/10 text-blue-700">
                <Package className="size-3" />
                {pendingDeliveries} pending
              </Badge>
            </div>
            <p className="text-sm">
              <span className="font-medium text-foreground">{stats.completedDeliveries} completed</span>
              <span className="text-muted-foreground"> today</span>
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate Card */}
        <Card>
          <CardHeader>
            <CardDescription>Completion Rate</CardDescription>
            <CardAction>
              <TrendingUp className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none tracking-tight">{completionRate.toFixed(1)}%</span>
              {completionRate >= 80 ? (
                <Badge className="border-green-200 bg-green-500/10 text-green-700">
                  <TrendingUp className="size-3" />
                  On Track
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                  <TrendingDown className="size-3" />
                  Needs Improvement
                </Badge>
              )}
            </div>
            <p className="text-sm">
              <span className="font-medium text-foreground">{stats.completedDeliveries}</span>
              <span className="text-muted-foreground"> out of {stats.totalDeliveries} delivered</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Earnings Card */}
        <Card>
          <CardHeader>
            <CardDescription>Total Earnings</CardDescription>
            <CardAction>
              <ArrowUpRight className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none tracking-tight">
                ₱{stats.totalEarnings.toLocaleString()}
              </span>
              <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700">
                <TrendingUp className="size-3" />
                +₱{Math.round(stats.totalEarnings * 0.12).toLocaleString()}
              </Badge>
            </div>
            <p className="text-sm">
              <span className="font-medium text-foreground">₱{(stats.totalEarnings / stats.completedDeliveries).toFixed(0)}</span>
              <span className="text-muted-foreground"> average per delivery</span>
            </p>
          </CardContent>
        </Card>

        {/* On-Time Rate Card */}
        <Card>
          <CardHeader>
            <CardDescription>On-Time Rate</CardDescription>
            <CardAction>
              <Clock className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none tracking-tight">{stats.onTimeRate}%</span>
              {stats.onTimeRate >= 90 ? (
                <Badge className="border-green-200 bg-green-500/10 text-green-700">
                  <TrendingUp className="size-3" />
                  Excellent
                </Badge>
              ) : stats.onTimeRate >= 70 ? (
                <Badge className="border-yellow-200 bg-yellow-500/10 text-yellow-700">
                  Good
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                  Needs Attention
                </Badge>
              )}
            </div>
            <p className="text-sm">
              <span className="font-medium text-foreground">{Math.round(stats.totalDeliveries * (stats.onTimeRate / 100))}</span>
              <span className="text-muted-foreground"> on-time deliveries</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Rider Info - Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Distance Traveled</CardDescription>
            <CardAction>
              <MapPin className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{stats.distanceTraveled}</span>
              <span className="text-muted-foreground">kilometers</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(stats.distanceTraveled / 200) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Daily average: 32km • On track for {stats.distanceTraveled > 150 ? "excellent" : "good"} performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Today's Schedule</CardDescription>
            <CardAction>
              <CalendarDays className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next delivery</span>
                <span className="font-medium">2:30 PM - Palo</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining stops</span>
                <span className="font-medium">{pendingDeliveries} locations</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated finish</span>
                <span className="font-medium">5:45 PM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}