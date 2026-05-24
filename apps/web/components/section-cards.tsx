"use client"

import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { useN8nQuery } from "@/hooks/useN8nQuery"
import { useURLFilters } from "@/hooks/useUrlFilters"

const iconMap = {
  up: TrendingUpIcon,
  down: TrendingDownIcon,
} as any


export function SectionCards({ widget }: any) {
  const { filters } = useURLFilters()


  const { data = [], isLoading, error } = useN8nQuery({widget, filters}) as any
  // console.log(error, isLoading, 'sec')
  // if (isLoading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-500">Error loading data</div>


  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {data.map((card: any, i: any) => {
        const Icon = iconMap[card.trend] || TrendingUpIcon

        return (
          <Card key={i} className="@container/card">
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>

              <CardTitle className="text-2xl font-semibold">
                {card.value}
              </CardTitle>

              <CardAction>
                <Badge variant="outline">
                  <Icon />
                  {card.change > 0 ? "+" : ""}
                  {card.change}%
                </Badge>
              </CardAction>
            </CardHeader>

            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex gap-2 font-medium">
                {card.footer}
                <Icon className="size-4" />
              </div>

              <div className="text-muted-foreground">
                {card.description}
              </div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}