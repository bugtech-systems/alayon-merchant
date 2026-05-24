"use client"

import * as React from "react"
import { ArrowDownLeft, ArrowUpRight, Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, startOfYear, endOfYear, subYears } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@workspace/ui/components/badge"
import { formatCurrency } from "@/lib/utils"
import { useURLFilters } from "@/hooks/useUrlFilters"
import { useN8nQuery } from "@/hooks/useN8nQuery"
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Widget configuration
const cashFlowWidget = {
  id: "cash-flow",
  webhook: {
    url: "/webhook/get-cash-flow",
    queryMap: {
      branch: "branch",
      batch: "batch",
      period: "period",
      year: "year"
    }
  },
}

// Types
interface CashFlowData {
  month: string;
  month_num: number;
  income: number;
  expenses: number;
}

interface CashFlowSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  previousPeriodIncome: number;
  previousPeriodExpenses: number;
  incomeTrend: "up" | "down";
  expensesTrend: "up" | "down";
  incomeChangePercent: number;
  expensesChangePercent: number;
}

const chartConfig = {
  income: {
    label: "Income",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
} as ChartConfig | any

export function CashFlowOverview() {
  const { filters, setFilters } = useURLFilters({
    defaultPage: 1,
    defaultLimit: 50,
  })

  const [selectedPeriod, setSelectedPeriod] = React.useState<"this-year" | "last-year">(
    (filters.period as "this-year" | "last-year") || "this-year"
  )

  // Get date range based on selected period
  const getDateRange = React.useCallback(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    if (selectedPeriod === "this-year") {
      return {
        from: format(startOfYear(now), "yyyy-MM-dd"),
        to: format(endOfYear(now), "yyyy-MM-dd"),
        year: currentYear
      }
    } else {
      const lastYear = subYears(now, 1)
      return {
        from: format(startOfYear(lastYear), "yyyy-MM-dd"),
        to: format(endOfYear(lastYear), "yyyy-MM-dd"),
        year: currentYear - 1
      }
    }
  }, [selectedPeriod])

  // Update filters when period changes
  React.useEffect(() => {
    const { year } = getDateRange()
    setFilters({
      period: selectedPeriod,
      year: year,
    })
  }, [selectedPeriod, setFilters, getDateRange])

  // Fetch cash flow data
  const {isLoading, data: cashData, error} = useN8nQuery({
    widget: cashFlowWidget,
    filters: filters
  }) as any
  // Process and transform data
  const { chartData, summary } = React.useMemo(() => {
    if ((!cashData || cashData[0]?.length === 0)) {

      const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return {
        chartData: allMonths.map(month => ({ month, income: 0, expenses: 0 })),
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          netCashFlow: 0,
          previousPeriodIncome: 0,
          previousPeriodExpenses: 0,
          incomeTrend: "up" as const,
          expensesTrend: "up" as const,
          incomeChangePercent: 0,
          expensesChangePercent: 0,
        }
      }
    }
    let { summary: summaryData, data } = cashData[0] || {};
    console.log(summaryData, data, 'sss')
    const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    const dataMap = new Map(data.map((item: any) => [item.month, item]))
    
    const formattedData = allMonths.map(month => {
      const monthData = dataMap.get(month) as any
      return {
        month,
        income: monthData ? Number(monthData.income) : 0,
        expenses: monthData ? -Number(monthData.expenses) : 0,
      }
    })

    const totalIncome = formattedData.reduce((sum, item) => sum + item.income, 0)
    const totalExpenses = formattedData.reduce((sum, item) => sum + Math.abs(item.expenses), 0)
    
    // Use trends from API if available, otherwise calculate
    const summary = summaryData || {
      ...summaryData,
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses
    }

    return { chartData: formattedData, summary }
  }, [cashData])

  const formatLargeCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Overview</CardTitle>
          <CardDescription>Error loading cash flow data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load cash flow data. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const { from, to, year } = getDateRange()
  const dateRangeDisplay = `${format(new Date(from), "MMM d")} - ${format(new Date(to), "MMM d")}`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cash Flow Overview</CardTitle>
            <CardDescription>
              Monthly income and expenses for {year} ({dateRangeDisplay})
            </CardDescription>
          </div>
          <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as "this-year" | "last-year")}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="this-year">This Year ({new Date().getFullYear()})</SelectItem>
                <SelectItem value="last-year">Last Year ({new Date().getFullYear() - 1})</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Separator />
        
        {/* Summary Metrics */}
        <div className="flex items-start justify-between gap-2 py-5 md:items-stretch md:gap-0">
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-1">
              <ArrowDownLeft className="size-6 stroke-background" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Total Income</p>
              <p className="font-medium text-2xl tabular-nums">
                {isLoading ? "Loading..." : formatCurrency(summary.totalIncome, { noDecimals: true })}
              </p>
             
            </div>
          </div>
          <Separator orientation="vertical" className="h-auto! self-stretch" />
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-2">
              <ArrowUpRight className="size-6 stroke-background" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Total Expenses</p>
              <p className="font-medium text-2xl tabular-nums">
                {isLoading ? "Loading..." : formatCurrency(summary.totalExpenses, { noDecimals: true })}
              </p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Net Cash Flow Indicator */}
        <div className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Net Cash Flow ({format(new Date(from), "MMM d")} - {format(new Date(to), "MMM d")})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-semibold tabular-nums ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.netCashFlow, { noDecimals: true })}
            </span>
            {summary.netCashFlow >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Chart */}
        <ChartContainer className="max-h-72 w-full mt-4" config={chartConfig}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="space-y-2 text-center">
                <div className="animate-pulse">Loading chart data...</div>
              </div>
            </div>
          ) : (
            <BarChart
              stackOffset="sign"
              margin={{ left: -25, right: 0, top: 25, bottom: 0 }}
              accessibilityLayer
              data={chartData}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  const abs = Math.abs(value)
                  return value < 0 ? `-${formatLargeCurrency(abs)}` : formatLargeCurrency(abs)
                }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    hideLabel 
                    formatter={(value, name) => {
                      const formattedValue = formatCurrency(Math.abs(value as number), { noDecimals: true })
                      return [formattedValue, name === 'income' ? 'Income' : 'Expenses']
                    }}
                  />
                } 
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="income" stackId="a" fill={chartConfig.income.color} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" stackId="a" fill={chartConfig.expenses.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}