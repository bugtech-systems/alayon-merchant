"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { useN8nQuery } from "@/hooks/useN8nQuery"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { useURLFilters } from "@/hooks/useUrlFilters"

export function ChartAreaInteractive({ widget }: any) {
  const isMobile = useIsMobile()
  const { filters, setFilters, clearFilters } = useURLFilters({
    defaultRange: "30d",
    defaultBranch: "all",
    defaultBatch: "all"
  })
  // ✅ Internal state instead of URL filters
  const [range, setRange] = React.useState("30d") as any


  const handleDateChange = (rangeDate?: any) => {
   
    
    setRange(rangeDate)
    setFilters({
      ...filters,
      range: rangeDate, // Clear range preset when using custom dates
    })
  }

  // ✅ Auto adjust for mobile
  React.useEffect(() => {
    if (isMobile && range !== "7d") {
      setRange("7d")
    }
  }, [isMobile])

  // ----------------------------
  // ✅ Compute date range
  // ----------------------------
  const { from, to } = React.useMemo(() => {
    const now = new Date()

    const map = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    } as any

    const days = map[range] || 7 as any

    const fromDate = new Date(
      now.getTime() - days * 24 * 60 * 60 * 1000
    )

    return {
      from: fromDate.toISOString(),
      to: now.toISOString(),
    }
  }, [range])


  // ✅ Pass computed params directly
  const { data = [] } = useN8nQuery({widget, filters: { ...filters, range, from, to }})

  // if (isLoading) return <div className="p-4">Loading chart...</div>

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Sales</CardTitle>
        <CardDescription>
          Dynamic data from n8n webhook
        </CardDescription>

        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(val) => val && handleDateChange(val)}
            variant="outline"
            className="hidden @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>

          <Select value={range} onValueChange={handleDateChange}>
            <SelectTrigger className="w-40 @[767px]/card:hidden">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer className="h-[250px] w-full" config={widget.config}>
          <AreaChart data={data as any}>
            <defs>
              <linearGradient id="fillNewCan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-new_can)" />
                <stop offset="95%" stopColor="var(--color-new_can)" stopOpacity={0.1} />
              </linearGradient>

              <linearGradient id="fillRefill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-refill)" />
                <stop offset="95%" stopColor="var(--color-refill)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />

            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
              }
            />

            <Area
              dataKey="new_can"
              type="natural"
              fill="url(#fillNewCan)"
              stroke="var(--color-new_can)"
              stackId="a"
            />

            <Area
              dataKey="refill"
              type="natural"
              fill="url(#fillRefill)"
              stroke="var(--color-refill)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}