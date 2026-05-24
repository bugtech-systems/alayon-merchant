"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";
import { useN8nQuery } from "@/hooks/useN8nQuery";
import { useURLFilters } from "@/hooks/useUrlFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Widget configuration
const balanceDistributionWidget = {
  id: "balance-distribution",
  webhook: {
    url: "/webhook/get-balance-distribution",
    queryMap: {
      branch: "branch",
      batch: "batch",
      year: "year",
      period: "period",
    }
  },
};

// Types
interface BalanceAccount {
  account: string;
  amount: number;
  key: string;
  percentage: number;
  color?: string;
}

interface BalanceDistributionData {
  accounts: BalanceAccount[];
  totalBalance: number;
  currency: string;
}

const chartConfig = {
  amount: {
    label: "Balance",
  },
} satisfies ChartConfig;

// Default colors for accounts (will be overridden by API if provided)
const defaultColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function BalanceDistributionCard() {
  const { filters } = useURLFilters({
    defaultPage: 1,
    defaultLimit: 50,
  });

  // Fetch balance distribution data
  const { data: balanceData, isLoading, error } = useN8nQuery({
    widget: balanceDistributionWidget,
    filters: filters
  });

  // Process and transform data
  const { chartData, totalBalance, currency } = React.useMemo(() => {
    console.log(balanceData, 'ball')


    if (!balanceData || !balanceData.accounts || balanceData.accounts.length === 0) {
      return {
        chartData: [],
        totalBalance: 0,
        currency: "USD"
      };
    }

    // Assign colors to accounts
    const accountsWithColors = balanceData.accounts.map((account: BalanceAccount, index: number) => ({
      ...account,
      fill: account.color || defaultColors[index % defaultColors.length],
    }));

    // Update chart config dynamically
    accountsWithColors.forEach((account: BalanceAccount | any) => {
      if (!chartConfig[account.key as keyof typeof chartConfig]) {
        (chartConfig as any)[account.key] = {
          color: account.fill,
          label: account.account,
        };
      }
    });
    
    

    return {
      chartData: accountsWithColors,
      totalBalance: balanceData.totalBalance || accountsWithColors.reduce((sum: number, item: BalanceAccount) => sum + item.amount, 0),
      currency: balanceData.currency || "USD"
    };
  }, [balanceData]);

  // Get color for chart config
  const getAccountColor = (key: string) => {
    const config = (chartConfig as any)[key];
    return config?.color;
  };

  // Update chart data with fills
  const enrichedChartData = chartData.map((item: BalanceAccount) => ({
    ...item,
    fill: getAccountColor(item.key),
  }));

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-normal">Account Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load balance distribution data. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Account Allocation</CardTitle>
      </CardHeader>

      <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        {isLoading ? (
          <>
            <div className="mx-auto aspect-square h-50">
              <Skeleton className="h-full w-full rounded-full" />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <div className="min-w-0">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          </>
        ) : chartData.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-muted-foreground">
            No balance data available for the selected filters
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-50">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel className="w-52" nameKey="account" />}
                />
                <Pie
                  cornerRadius={6}
                  data={enrichedChartData}
                  dataKey="amount"
                  innerRadius={65}
                  nameKey="account"
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (!(viewBox && "cx" in viewBox && "cy" in viewBox)) {
                        return null;
                      }

                      return (
                        <text dominantBaseline="middle" textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                          <tspan className="fill-muted-foreground text-xs" x={viewBox.cx} y={(viewBox.cy ?? 0) - 8}>
                            Total
                          </tspan>
                          <tspan
                            className="fill-foreground font-heading font-medium text-lg tabular-nums"
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 14}
                          >
                            {formatCurrency(totalBalance, { currency, noDecimals: true })}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex min-w-0 flex-col gap-3">
              {enrichedChartData.map((item: BalanceAccount | any) => (
                <div className="grid grid-cols-[1fr_auto] items-end gap-3" key={item.key}>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <span 
                        aria-hidden="true" 
                        className="h-2 w-1 rounded-full" 
                        style={{ backgroundColor: item.fill }} 
                      />
                      <p className="truncate text-muted-foreground text-xs">{item.account}</p>
                    </div>
                    <p className="font-medium tabular-nums">
                      {formatCurrency(item.amount, { currency, noDecimals: true })}
                    </p>
                  </div>
                  <div className="font-medium tabular-nums">{item.percentage}%</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}