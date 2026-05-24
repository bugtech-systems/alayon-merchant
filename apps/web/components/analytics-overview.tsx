"use client"

import * as React from "react"
import { Download, ChevronsUpDown, Check, TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, Users, Beer, Calendar } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, subDays, eachDayOfInterval, isBefore } from "date-fns"

import { DateRangePicker } from "@/components/date-range-picker"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"

import { useURLFilters } from "@/hooks/useUrlFilters"
import { useN8nQuery } from "@/hooks/useN8nQuery"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import { Area, ComposedChart, XAxis, YAxis, Bar, Line } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { findObjectsByIds, sortByDateOldestFirst } from "../lib/utils/helpers"

// Widget configurations
const branchesWidget = {
  id: "branches",
  webhook: {
    url: "/webhook/get-branches",
    queryMap: {},
  },
}

const batchesWidget = {
  id: "batches",
  webhook: {
    url: "/webhook/get-batches",
    queryMap: {
      branch: "branch"
   }
  },
}

const analyticsOverviewWidget = {
  id: "analytics",
  webhook: {
    url: "/webhook/get-analytics-overview",
    queryMap: {
      branch: "branch",
      batch: "batch",
      page: "page",
      limit: "limit",
      sort_by: "sort_by",
      sort_order: "sort_order",
      from: "from",
      to: "to",
      range: "range"
   }
  },
}

const inventoryWidget = {
  id: "inventory",
  webhook: {
    url: "/webhook/get-inventory-summary",
    queryMap: {
      branch: "branch",
      batch: "batch",
      from: "from",
      to: "to"
    }
  },
}

// Types
interface RevenueData {
  day: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

interface RevenueSummary {
  totalRevenue: number;
  previousPeriodRevenue: number;
  percentageChange: number;
  absoluteChange: number;
  trend: "up" | "down";
}

interface InventorySummary {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  reorderNeeded: number;
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    value: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
    value: number;
  }>;
}

interface RiskMetric {
  label: string;
  value: string;
  comparatorLabel: string;
  trend: "up" | "down";
  trendValue: string;
}

// Default date range: last 30 days
const getDefaultDateRange = () => ({
  from: subDays(new Date(), 30),
  to: new Date(),
})

export function AnalyticsOverview() {
  const { filters, setFilters, clearFilters } = useURLFilters({
    defaultPage: 1,
    defaultLimit: 50,
    defaultDateRange: {
      fromKey: 'from',
      toKey: 'to',
    }
  })
  const [selectedBranch, setSelectedBranch] = React.useState({id: filters.branch});
  const [selectedFilters, setSelectedFilters] = React.useState<string[]>(() => {
    if (filters.batch && filters.batch !== 'all') {
      return filters.batch.split(',')
    }
    return []
  })

  // Fetch data
  const { data: branches = [], isLoading: branchesLoading } = useN8nQuery({
    widget: branchesWidget, 
    filters: { branch: filters.branch }
  })
  
  const { data: batches = [], isLoading: batchesLoading } = useN8nQuery({
    widget: batchesWidget, 
    filters: { branch: filters.branch }
  })
  
  const { data: analyticsData, isLoading: revenueLoading } = useN8nQuery({
    widget: analyticsOverviewWidget, 
    filters: filters
  })


  
  const { revenueSeries: revenueData, summary, inventoryMetrics, inventorySummary } = analyticsData || {inventorySummary: {}};



  // Date range handling
  const dateRange: DateRange = {
    from: filters.from ? new Date(filters.from) : getDefaultDateRange().from,
    to: filters.to ? new Date(filters.to) : getDefaultDateRange().to,
  }

  const handleDateChange = (range?: DateRange) => {
    if (!range?.from || !range?.to) return
    
    setFilters({
      from: format(range.from, "yyyy-MM-dd"),
      to: format(range.to, "yyyy-MM-dd"),
      page: 1,
    })
  }

  const handleFilterToggle = (key: string, checked: boolean) => {
    setSelectedFilters((prev) => {
      const newFilters = checked 
        ? [...prev, key]
        : prev.filter((item) => item !== key)

      let newBatches = findObjectsByIds(newFilters, batches, 'id');
      let older = sortByDateOldestFirst(newBatches, 'purchase_date')[0];
      let startDate = older ? String(older.purchase_date).split('T')[0] : undefined;

      setFilters({
        batch: newFilters.length > 0 ? newFilters.join(",") : undefined,
        lastDate: newFilters.length > 0 ? startDate : undefined,
        from: startDate || filters.from,
      })
      
      return newFilters
    })
  }

  const clearFilterToggle = () => {
    setSelectedFilters([])
    setFilters({
      batch: "",
      lastDate: undefined,
      page: 1,
    })
  }

  const handleBranch = (value: string) => {
    let newBranch = branches.find((a: any) => a?.id == value)
    setSelectedBranch(newBranch)
    clearFilterToggle()
    setFilters({
      branch: value,
      batch: "all",
      peddler: undefined,
      page: 1,
      lastDate: undefined,
    })
  }

  // Calculate revenue summary from API data
  const revenueSummary = React.useMemo(() => {
    if (!summary || revenueData?.length === 0) {
      return {
        current_paid_total_amount: 0,
        current_unpaid_total_amount: 0,
        totalRevenue: 0,
        previousPeriodRevenue: 0,
        percentageChange: 0,
        absoluteChange: 0,
        trend: "up" as const
      }
    }

    const totalRevenue = revenueData.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0)
    const previousPeriodRevenue = totalRevenue * 0.91 // Example calculation - replace with actual previous period data
    const absoluteChange = totalRevenue - previousPeriodRevenue
    const percentageChange = (absoluteChange / previousPeriodRevenue) * 100

    return {
      ...summary,
      totalRevenue,
      previousPeriodRevenue,
      percentageChange: Math.abs(percentageChange),
      absoluteChange,
      trend: percentageChange >= 0 ? "up" as const : "down" as const
    }
  }, [revenueData, summary])

  // Calculate risk metrics
// Calculate inventory metrics from API data
const invMetrics = React.useMemo(() => {
  if (inventoryMetrics && (!inventorySummary && inventoryMetrics.length === 0)) {
    return [
      { 
        label: "Batches Cans", 
        value: "0", 
        footer: "Total Crates: 0",
        icon: <Beer className="h-4 w-4" />,
        trend: "up" as const, 
        trendValue: "0"
      },
      { 
        label: "Cans Sold", 
        value: "0", 
        footer: "Refill: 0 | New: 0",
        icon: <ShoppingCart className="h-4 w-4" />,
        trend: "up" as const, 
        trendValue: "0"
      },
      { 
        label: "Remaining Cans", 
        value: "0", 
        footer: "Bad orders: 0",
        icon: <Package className="h-4 w-4" />,
        trend: "down" as const, 
        trendValue: "0"
      },
      { 
        label: "Batch Sales Cycle", 
        value: "0 days", 
        footer: "Utilization: 0% | Waste: 0%",
        icon: <Calendar className="h-4 w-4" />,
        trend: "down" as const, 
        trendValue: "0 days"
      }
    ]
  }
  // Extract metrics from inventory data
  const totalCans = inventorySummary.totalCans || 0
  const totalCrates = inventorySummary.totalCrates || 0
  const cansSoldRefill = inventorySummary.cansSoldRefill || 0
  const cansSoldNew = inventorySummary.cansSoldNew || 0
  const remainingCans = inventorySummary.remainingCans || 0
  const badOrderCans = inventorySummary.badOrderCans || 0
  const averageDaysPerBatch = inventorySummary.averageDaysPerBatch || 0
  const averageDaysDifference = inventorySummary.averageDaysDifference || 0
  const utilizationRate = inventorySummary.utilizationRate || 
    (totalCans > 0 ? ((cansSoldRefill + cansSoldNew) / totalCans * 100).toFixed(1) : 0)
  const wasteRate = inventorySummary.wasteRate ||
    (totalCans > 0 ? (badOrderCans / totalCans * 100).toFixed(1) : 0)

  // Calculate trends based on previous period data
  const previousTotalCans = inventorySummary.previousTotalCans || totalCans * 0.95
  const cansTrend = totalCans > previousTotalCans ? 'up' : 'down'
  const cansChange = Math.abs(totalCans - previousTotalCans)
  const cansTrendValue = `${cansTrend === 'up' ? '+' : '-'}${cansChange.toLocaleString()}`

  const previousCansSold = inventorySummary.previousCansSold || (cansSoldRefill + cansSoldNew) * 0.92
  const totalCansSold = cansSoldRefill + cansSoldNew
  const soldTrend = totalCansSold > previousCansSold ? 'up' : 'down'
  const soldChange = Math.abs(totalCansSold - previousCansSold)
  const soldTrendValue = `${soldTrend === 'up' ? '+' : '-'}${soldChange.toLocaleString()}`

  const previousRemaining = inventorySummary.previousRemainingCans || remainingCans * 1.08
  const remainingTrend = remainingCans < previousRemaining ? 'down' : 'up'
  const remainingChange = Math.abs(remainingCans - previousRemaining)
  const remainingTrendValue = `${remainingTrend === 'down' ? '-' : '+'}${remainingChange.toLocaleString()}`

  const cycleTrend = averageDaysDifference > 0 ? 'up' : 'down'
  const cycleTrendValue = `${cycleTrend === 'up' ? '+' : ''}${Math.abs(averageDaysDifference).toFixed(1)} days`
  return inventoryMetrics
}, [inventoryMetrics, inventorySummary])

  // Initialize default URL parameters
  React.useEffect(() => {
    const defaults: any = {}
    let needsUpdate = false
    
    if (!filters.branch && branches.length > 0) {
      defaults.branch = "all"
      needsUpdate = true
    }
    
    if (!filters.batch) {
      defaults.batch = "all"
      defaults.lastDate = undefined;
      needsUpdate = true
    }
    
    if (!filters.from || !filters.to) {
      const { from, to } = getDefaultDateRange()
      defaults.from = format(from, "yyyy-MM-dd")
      defaults.to = format(to, "yyyy-MM-dd")
      needsUpdate = true
    }

    
    if (needsUpdate) {
      setFilters(defaults)
    }
  }, [branches.length, filters.branch, filters.batch, filters.from, filters.to, setFilters])



  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <BranchSelect
            branches={branches}
            value={filters.branch || "all"}
            onChange={handleBranch}
          />

          <FiltersPopover 
            options={batches}  
            disabled={!filters.branch || filters.branch === "all"}
            selectedFilters={selectedFilters} 
            onToggle={handleFilterToggle} 
            clearFilter={clearFilterToggle}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker 
            value={dateRange} 
            onChange={handleDateChange} 
            disabled={{
              before: filters.lastDate,
            }}
          />
        </div>
      </div>

      {/* Revenue Summary */}
      <RevenueSummaryRow 
        revenueData={revenueData || []}
        revenueSummary={revenueSummary}
        dateRange={dateRange}
        invMetrics={invMetrics || []}
      />

    </div>
  )
}

// Revenue Summary Component
function RevenueSummaryRow({ 
  revenueData, 
  revenueSummary, 
  dateRange,
  invMetrics
}: { 
  revenueData: any[];
  revenueSummary: RevenueSummary | any;
  dateRange: DateRange | any;
  invMetrics: any;
}) {
  const revenueChartConfig = {
    revenue: {
      label: "Revenue",
      color: "var(--chart-1)",
    },
    orders: {
      label: "Orders",
      color: "var(--chart-2)",
    },
  }

  const revenueValues = revenueData.map((point: any) => point.revenue || 0)
  const minRevenue = revenueValues.length > 0 ? Math.min(...revenueValues) : 0
  const maxRevenue = revenueValues.length > 0 ? Math.max(...revenueValues) : 0
  const midpoint = (minRevenue + maxRevenue) / 2
  const halfRange = Math.max((maxRevenue - minRevenue) * 1.6, 4500)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'Php',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Revenue Card */}
      <Card className="min-w-0">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Cash Sales</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <div className="font-semibold text-3xl tabular-nums tracking-tight sm:text-4xl">
            {formatCurrency(revenueSummary.current_paid_total_amount)}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* <Badge variant={revenueSummary.trend === "up" ? "default" : "destructive"}>
              {revenueSummary.trend === "up" ? "↑" : "↓"} {revenueSummary.percentageChange.toFixed(1)}%
            </Badge> */}
            <Badge variant="secondary">
             Unpaid: {formatCurrency(Math.abs(revenueSummary?.current_unpaid_total_amount))}
            </Badge>
          </div>

          {revenueData.length > 0 && (
            <div>
              <ChartContainer config={revenueChartConfig} className="h-10 w-full rounded-md">
                <ComposedChart data={revenueData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <XAxis dataKey="day" />
                  <YAxis hide domain={[midpoint - halfRange, midpoint + halfRange]} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Area
                    dataKey="revenue"
                    type="natural"
                    fill="var(--color-revenue)"
                    fillOpacity={0.14}
                    stroke="var(--color-revenue)"
                    strokeWidth={1.5}
                  />
                </ComposedChart>
              </ChartContainer>
              <span className="text-muted-foreground text-xs">
                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Summary Card */}
      <Card className="min-w-0 py-4 shadow-xs xl:col-span-2">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Inventory summary</CardTitle>
          <CardDescription className="text-xs">Inventory Details Per Batch/s</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
          { invMetrics.map((metric: any, index: any) => (
            <InventoryMetricCard
              key={index}
              label={metric.label}
              value={metric.value}
              footer={metric.footer}
              trend={metric.trend}
              trendValue={metric.trendValue}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}


// Risk Summary Card Component
function RiskSummaryCard({ 
  label, 
  value, 
  comparatorLabel, 
  trend, 
  trendValue 
}: RiskMetric) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-muted-foreground text-sm">{label}</div>
      <div className="font-semibold text-2xl tabular-nums leading-tight">{value}</div>
      <div className="flex items-center gap-1">
        <Badge variant={trend === "up" ? "destructive" : "default"} className="text-xs">
          {trend === "up" ? "↑" : "↓"} {trendValue}
        </Badge>
        <span className="text-muted-foreground text-xs">{comparatorLabel}</span>
      </div>
    </div>
  )
}

// Inventory Metric Card Component
function InventoryMetricCard({ 
  label, 
  value, 
  footer, 
  icon,
  trend,
  trendValue
}: { 
  label: string;
  value: string;
  footer: string;
  icon?: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="font-semibold text-2xl tabular-nums leading-tight">{value}</div>
      <div className="flex items-center gap-1">
        {trend && trendValue && (
          <Badge variant={trend === "up" ? "destructive" : "default"} className="text-xs">
            {trend === "up" ? "↑" : "↓"} {trendValue}
          </Badge>
        )}
        <span className="text-muted-foreground text-xs flex items-center gap-1">
          {footer}
        </span>
      </div>
    </div>
  )
}



// Branch Select Component
function BranchSelect({ branches, value, onChange }: any) {
  const [open, setOpen] = React.useState(false)

  const selectedBranch = value === "all" 
    ? "All Branches" 
    : branches.find((b: any) => b.id === value)?.name || "All Branches"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {selectedBranch}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange("all")
                  setOpen(false)
                }}
              >
                All Branches
                <Check className={cn("ml-auto", value === "all" ? "opacity-100" : "opacity-0")} />
              </CommandItem>

              {branches.map((b: any) => (
                <CommandItem
                  key={b.id}
                  value={b.id}
                  onSelect={() => {
                    onChange(b.id)
                    setOpen(false)
                  }}
                >
                  {b.name}
                  <Check className={cn("ml-auto", value === b.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Filters Popover Component
function FiltersPopover({
  selectedFilters,
  onToggle,
  options = [],
  clearFilter,
  disabled
}: {
  selectedFilters: string[]
  onToggle: (id: string, checked: boolean) => void
  options: any[]
  clearFilter?: any
  disabled?: any
}) {
  const [open, setOpen] = React.useState(false)
  const activeCount = selectedFilters.length

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-expanded={open} disabled={disabled}>
            Filters
            {activeCount > 0 && (
              <Badge className="tabular-nums ml-1" variant="secondary">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Filter by Batches</h3>
              {activeCount > 0 && (
                <Badge variant="link" className="cursor-pointer" onClick={clearFilter}>
                  Clear
                </Badge>
              )}
              <Badge variant="outline" className="font-medium text-xs tabular-nums">
                Active: {activeCount}
              </Badge>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {options.map((item) => (
                <FilterToggle
                  key={item.id}
                  id={item.id}
                  label={`Batch #${item.batch_number}`}
                  checked={selectedFilters.includes(item.id)}
                  onCheckedChange={(checked) => onToggle(item.id, checked)}
                />
              ))}
              {options.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No batches available
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function FilterToggle({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex cursor-pointer items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <Label htmlFor={id} className="cursor-pointer font-normal text-sm">
        {label}
      </Label>
    </div>
  )
}
