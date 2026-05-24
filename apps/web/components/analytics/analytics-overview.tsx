// components/analytics/analytics-overview.tsx

"use client";

import * as React from "react";
import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { Check, ChevronsUpDown, Download, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Area, ComposedChart, XAxis, YAxis } from "recharts";

import { DateRangePicker } from "@/components/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useN8nQuery } from "@/hooks/useN8nQuery";
import { useURLFilters } from "@/hooks/useUrlFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterToggleKey = "enterpriseOnly" | "stalledOnly" | "overdueOnly" | "includeRenewals";

const FILTER_OPTIONS: Array<{ key: FilterToggleKey; label: string; summaryLabel: string }> = [
  { key: "enterpriseOnly", label: "Enterprise only", summaryLabel: "Enterprise" },
  { key: "stalledOnly", label: "Stalled deals (>14 days)", summaryLabel: "Stalled" },
  { key: "overdueOnly", label: "Closing date exceeded", summaryLabel: "Overdue" },
  { key: "includeRenewals", label: "Include renewals", summaryLabel: "Renewals" },
];

// Widget configuration for coordinators
const coordinatorWidget = {
  id: "coordinators",
  webhook: {
    url: "/webhook/get-coordinators",
    method: "GET",
    queryMap: {
      search: "search",
    },
  },
};

// Widget configuration for tellers (filtered by coordinator)
const tellersWidget = {
  id: "tellers",
  webhook: {
    url: "/webhook/get-tellers",
    method: "GET",
    queryMap: {
      coordinator_id: "coordinator_id",
      search: "search",
    },
  },
};

export function AnalyticsOverview() {
  const { filters, setFilters } = useURLFilters();
  
  // Get filters from URL or use defaults
  const selectedCoordinator = filters.coordinator || "all";
  const selectedTeller = filters.teller || "all";
  const dateRangeFrom = filters.from ? new Date(filters.from) : subDays(startOfDay(new Date()), 29);
  const dateRangeTo = filters.to ? new Date(filters.to) : startOfDay(new Date());

  const [selectedCoordinatorState, setSelectedCoordinatorState] = React.useState({id: selectedCoordinator}) as any;
  const [selectedTellerState, setSelectedTellerState] = React.useState(selectedTeller);
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
    from: dateRangeFrom,
    to: dateRangeTo,
  });
  const [selectedFilters, setSelectedFilters] = React.useState<FilterToggleKey[]>([]);
  const [tellerSearch, setTellerSearch] = React.useState("");

  // Fetch coordinators
  const { data: coordinatorsData, isLoading: coordinatorsLoading } = useN8nQuery({
    widget: coordinatorWidget,
    filters: {},
    enabled: true,
  });

  // Fetch tellers filtered by selected coordinator
  const { data: tellersData, isLoading: tellersLoading } = useN8nQuery({
    widget: tellersWidget,
    filters: { 
      coordinator_id: selectedCoordinatorState?.id !== "all" ? selectedCoordinatorState?.id : undefined,
      search: tellerSearch 
    },
    enabled: true,
  });

  const coordinators = React.useMemo(() => {
    const data = coordinatorsData || [];
    return [{ id: "all", name: "All Coordinators" }, ...data];
  }, [coordinatorsData]);

console.log(coordinators, 'CCORDS')
  // Update URL when filters change
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({
        coordinator: selectedCoordinatorState?.id === "all" ? undefined : selectedCoordinatorState?.id,
        teller: selectedTellerState === "all" ? undefined : selectedTellerState,
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
        analyticsFilters: selectedFilters.length > 0 ? selectedFilters.join(",") : undefined,
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [selectedCoordinatorState, selectedTellerState, dateRange, selectedFilters, setFilters]);

  // Reset teller when coordinator changes
  React.useEffect(() => {
    setSelectedTellerState("all");
  }, [selectedCoordinatorState]);

  // Handle date range change
  const handleDateRangeChange = (value: DateRange | undefined) => {
    if (!value?.from || !value?.to) return;
    setDateRange({ from: value.from, to: value.to });
  };

  // Handle filter toggle
  const handleFilterToggle = (key: FilterToggleKey, checked: boolean) => {
    setSelectedFilters((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key];
      }
      return prev.filter((item) => item !== key);
    });
  };

  // Handle coordinator change
  const handleCoordinatorChange = (value: string) => {
    let newCoord = coordinators.find(a => a.id == value)
    setSelectedCoordinatorState(newCoord);
    
  };

  // Handle teller change
  const handleTellerChange = (value: string) => {
    setSelectedTellerState(value);
  };

  // Revenue chart data
  const revenueSeries = React.useMemo(
    () => buildRevenueChartData(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to],
  );


  console.log(selectedCoordinatorState, 'selected')
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Coordinator Select */}
          <div className="min-w-[180px]">
            <Select value={selectedCoordinatorState?.id} onValueChange={handleCoordinatorChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select coordinator" />
              </SelectTrigger>
              <SelectContent>
                {coordinators.map((coordinator: any) => (
                  <SelectItem key={coordinator.id} value={coordinator?.id}>
                    {coordinator.name || `${coordinator.first_name} ${coordinator.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {coordinatorsLoading && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

   

          <FiltersPopover options={tellersData}  selectedFilters={selectedFilters} onToggle={handleFilterToggle} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker 
            value={dateRange} 
            onChange={handleDateRangeChange} 
          />
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <SummaryRow 
        revenueSeries={revenueSeries} 
        selectedCoordinator={selectedCoordinatorState?.name}
        selectedTeller={selectedTellerState}
        dateRange={dateRange}
        selectedFilters={selectedFilters}
        options={tellersData || []}
      />
    </div>
  );
}

function buildRevenueChartData(from: Date, to: Date) {
  const days = eachDayOfInterval({ start: from, end: to });
  const minRevenue = 22_000;
  const maxRevenue = 32_000;
  let currentRevenue = 27_500;

  return days.map((day) => {
    const nextRevenue = currentRevenue + Math.round((Math.random() - 0.45) * 4_000);
    currentRevenue = Math.max(minRevenue, Math.min(maxRevenue, nextRevenue));

    return {
      day: format(day, "MMM d"),
      revenue: currentRevenue,
    };
  });
}

function SummaryRow({ 
  revenueSeries, 
  selectedCoordinator,
  selectedTeller, 
  dateRange, 
  selectedFilters,
  options
}: any) {
  const revenueChartConfig = {
    revenue: {
      label: "Revenue",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const revenueValues = revenueSeries.map((point: any) => point.revenue);
  const minRevenue = Math.min(...revenueValues);
  const maxRevenue = Math.max(...revenueValues);
  const midpoint = (minRevenue + maxRevenue) / 2;
  const halfRange = Math.max((maxRevenue - minRevenue) * 1.6, 4_500);
   
  const getFilterSummary = () => {
    const parts = [];
    if (selectedCoordinator !== "all") parts.push(`Coordinator: ${selectedCoordinator}`);
    if (selectedTeller !== "all") parts.push(`Teller: ${selectedTeller}`);
    if (selectedFilters.length > 0) parts.push(summarizeFilterState(options, selectedFilters));
    return parts.length > 0 ? parts.join(" · ") : "All data";
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="min-w-0 space-y-2">
        <div>
          <div className="font-medium text-muted-foreground text-sm">Revenue</div>
          <div className="font-semibold text-3xl tabular-nums tracking-tight sm:text-4xl">$1,248,000</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">+9.4%</Badge>
          <Badge variant="secondary">+$107,000</Badge>
        </div>

        {/* <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <span>Previous $1,141,000</span>
          <Badge variant="outline" className="font-medium text-xs tabular-nums">
            {getFilterSummary()}
          </Badge>
        </div> */}
        <div>
          <ChartContainer config={revenueChartConfig} className="h-10 w-full rounded-md border">
            <ComposedChart data={revenueSeries} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={[midpoint - halfRange, midpoint + halfRange]} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Area
                dataKey="revenue"
                type="natural"
                fill="var(--color-revenue)"
                fillOpacity={0.14}
                stroke="var(--color-revenue)"
              />
            </ComposedChart>
          </ChartContainer>
          <span className="text-muted-foreground text-xs">
            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
          </span>
        </div>
      </div>

      <Card className="min-w-0 py-4 shadow-xs xl:col-span-2">
        <CardHeader className="px-4">
          <CardTitle>Risk summary</CardTitle>
          <CardDescription>Core risk signals vs previous period</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:divide-x xl:[&>div:first-child]:pl-0 xl:[&>div:last-child]:pr-0 xl:[&>div]:px-5">
          <RiskSummaryCard
            label="Stalled Deals"
            value="8"
            comparatorLabel="vs previous period"
            trend="up"
            trendValue="+2"
          />
          <RiskSummaryCard
            label="Revenue at Risk"
            value="$1,151,000"
            comparatorLabel="vs previous period"
            trend="up"
            trendValue="+$151,000"
          />
          <RiskSummaryCard
            label="Win Rate Trend"
            value="+8.3pp"
            comparatorLabel="vs previous period"
            trend="up"
            trendValue="+2.1pp"
          />
          <RiskSummaryCard
            label="Sales Cycle Drift"
            value="+2.3 days"
            comparatorLabel="vs previous period"
            trend="down"
            trendValue="+0.5 days"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RiskSummaryCard({ 
  label, 
  value, 
  comparatorLabel, 
  trend, 
  trendValue 
}: { 
  label: string; 
  value: string; 
  comparatorLabel: string; 
  trend: "up" | "down";
  trendValue: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="font-semibold text-2xl tabular-nums leading-tight">{value}</div>
      <div className="flex items-center gap-1">
        <Badge variant={trend === "up" ? "destructive" : "default"} className="text-xs">
          {trendValue}
        </Badge>
        <span className="text-muted-foreground text-xs">{comparatorLabel}</span>
      </div>
    </div>
  );
}

function FiltersPopover({
  selectedFilters,
  onToggle,
  options = []
}: any) {
  const [open, setOpen] = React.useState(false);
  const activeCount = selectedFilters.length;

  console.log(selectedFilters, 'sele')
  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-expanded={open}>
            Filters
            <Badge className="tabular-nums" variant="secondary">
              {activeCount}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Filters</h3>
              <Badge variant="outline" className="font-medium text-xs tabular-nums">
                Active: {activeCount}
              </Badge>
            </div>
            <div className="space-y-3">
              {options.map((item: any) => (
                <FilterToggle
                  key={item.id}
                  id={item.id}
                  label={item.name}
                  checked={selectedFilters.includes(item.id)}
                  onCheckedChange={(checked) => onToggle(item.id, checked)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <span className="text-muted-foreground text-sm hidden md:inline">
          Showing: <span className="font-medium">{summarizeFilterState(options, selectedFilters)}</span>
        </span>
      )}
    </div>
  );
}

function FilterToggle({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex cursor-pointer items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <Label htmlFor={id} className="cursor-pointer font-normal text-sm">
        {label}
      </Label>
    </div>
  );
}

function summarizeFilterState(options: any, selectedFilters: any) {
  if (selectedFilters.length === 0) {
    return "All deals";
  }
  return options.filter((item: any) => selectedFilters.includes(item.id))
    .map((item: any) => item.name)
    .join(" · ");
}