"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock data: Deliveries per month (instead of qualified leads)
const deliveryChartValues = [42, 48, 51, 57, 63, 68, 72, 78, 84, 91, 97, 104] as const;

const deliveryChartConfig = {
  delivered: {
    label: "Delivered",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const axisMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
const tooltipMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });

function getRollingMonthData(values: readonly number[]) {
  return values.map((delivered, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (values.length - 1 - index));

    return {
      date: date.toISOString(),
      delivered,
    };
  });
}

export function DeliveryActivityPipeline() {
  const deliveryChartData = getRollingMonthData(deliveryChartValues);
  const totalDeliveries = deliveryChartData.reduce((sum, item) => sum + item.delivered, 0);
  
  // Merchant-specific metrics
  const onTimeDeliveries = 892;
  const lateDeliveries = 156;
  const onTimeRate = Math.round((onTimeDeliveries / (onTimeDeliveries + lateDeliveries)) * 100);
  
  const pendingDeliveries = 34;
  const avgDeliveryTime = 2.4; // days

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card className="xl:col-span-12">
        <CardHeader>
          <CardTitle>Order Delivery Pipeline</CardTitle>
          <CardAction>
            <Select defaultValue="last-12-months">
              <SelectTrigger size="sm" className="min-w-40">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="last-30-days">Last 30 days</SelectItem>
                  <SelectItem value="last-quarter">Last quarter</SelectItem>
                  <SelectItem value="last-12-months">Last 12 months</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Chart Section */}
            <ChartContainer config={deliveryChartConfig} className="h-72 w-full lg:col-span-8">
              <BarChart data={deliveryChartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }} barSize={38}>
                <defs>
                  <pattern
                    id="delivery-pattern"
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="6" height="6" fill="var(--color-delivered)" fillOpacity="0.15" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      stroke="var(--color-delivered)"
                      strokeWidth="1.25"
                      strokeOpacity="0.40"
                    />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="0" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => axisMonthFormatter.format(new Date(String(value)))}
                />
                <YAxis hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideIndicator
                      labelFormatter={(value) => tooltipMonthFormatter.format(new Date(String(value)))}
                      formatter={(value) => [`${value} deliveries`, "Delivered"]}
                    />
                  }
                />
                <Bar
                  dataKey="delivered"
                  fill="url(#delivery-pattern)"
                  radius={[8, 8, 0, 0]}
                  stroke="var(--color-delivered)"
                  strokeOpacity={0.5}
                  strokeWidth={0.5}
                />
              </BarChart>
            </ChartContainer>

            {/* Metrics Panel */}
            <div className="flex flex-col gap-5 rounded-lg p-4 lg:col-span-4">
              {/* Total Deliveries */}
              <div className="flex flex-col gap-1">
                <div className="font-medium text-4xl tabular-nums leading-none">
                  {totalDeliveries} <span className="font-normal text-lg text-muted-foreground">deliveries</span>
                </div>
                <p className="text-muted-foreground text-sm">Total completed deliveries over the last 12 months.</p>
              </div>

              {/* On-Time Delivery Rate */}
              <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
                <div className="text-[11px] text-muted-foreground uppercase tracking-widest">
                  On-Time Delivery Rate
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="font-medium text-2xl tabular-nums leading-none">
                    {onTimeRate}% <span className="font-normal text-muted-foreground text-sm">on-time rate</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {onTimeDeliveries} out of {onTimeDeliveries + lateDeliveries} orders delivered on schedule.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-0.5">
                  <Progress
                    value={onTimeRate}
                    className="h-2.5 bg-emerald-500/12 *:data-[slot='progress-indicator']:bg-emerald-500"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                      {onTimeDeliveries} on-time
                    </div>
                    <div className="text-muted-foreground tabular-nums">{lateDeliveries} late</div>
                  </div>
                </div>
              </div>

              {/* Additional Merchant Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">
                    Pending
                  </div>
                  <div className="font-medium text-2xl tabular-nums leading-none">
                    {pendingDeliveries}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">Awaiting delivery</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">
                    Avg. Delivery Time
                  </div>
                  <div className="font-medium text-2xl tabular-nums leading-none">
                    {avgDeliveryTime} <span className="text-sm font-normal">days</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">From order to delivery</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}