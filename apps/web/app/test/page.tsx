// app/dashboard/page.tsx
'use client'

import { Suspense } from "react"
import { OrdersTable } from "@/components/orders-table"
import { CustomersTable } from "@/components/customers-table"
import { useURLFilters } from "@/hooks/useUrlFilters"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

const TAB_CONFIGS = {
  orders: {
    id: "orders",
    label: "Orders",
    value: "orders",
    component: OrdersTable,
  },
  customers: {
    id: "customers",
    label: "Customers",
    value: "customers",
    component: CustomersTable,
  },
}

function DashboardContent() {
  const { filters, setFilters } = useURLFilters({ defaultPage: 1, defaultLimit: 10 })
  
  const currentTab = filters.tab || "orders"
  const CurrentTableComponent = TAB_CONFIGS[currentTab as keyof typeof TAB_CONFIGS]?.component || OrdersTable

  const handleTabChange = (value: string) => {
    setFilters({ tab: value, page: 1 })
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="px-4 lg:px-6">
            <CurrentTableComponent />
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-7xl mx-auto p-4">
        <div className="h-12 bg-gray-200 rounded w-1/4"></div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}