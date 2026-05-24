'use client'

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AnalyticsOverview } from "@/components/dashboard-overview"
import { Suspense } from "react"
import { ProposalSectionsTable } from "@/components/dashboard/proposal-sections-table/table"
import { useURLFilters } from "@/hooks/useUrlFilters"
import { batchTableConfig, transactionsTableConfig } from "@/components/configData"

const dashboardCardsWidget = {
  id: "dashboard-cards",
  type: "kpi",
  webhook: {
    url: "/webhook/dashboard-cards",
    method: "GET",
    queryMap: {
      range: "range",
      from: "from",
      to: "to",
      branch: "branch",
      batch: "batch",
      peddler: "peddler"
    },
  },
}

const chartWidget = {
  id: "sales-chart",
  type: "area",
  webhook: {
    url: "/webhook/sales-chart",
    queryMap: {
      from: "from",
      to: "to",
      peddler: "peddler",
      branch: "branch"
    },
  },
  config: {
    "total": {
      "label": "Total Sales"
    },
    "new_can": {
      "label": "New Can",
      "color": "var(--primary)"
    },
    "refill": {
      "label": "Refill",
      "color": "var(--primary)"
    }
  }
}

const transactionWidget = {
  id: "sale-transaction-table",
  webhook: {
    url: "/webhook/get-sale-tansactions",
    method: "GET",
    queryMap: {
      page: "page",
      limit: "limit",
      sort_by: "sort_by",
      sort_order: "sort_order",
      from: "from",
      batch: "batch",
      branch: "branch",
      type: "type",
      status: "status",
      to: "to",
      peddler: "peddler"
    },
  },
}

const batchesWidget = {
  id: "batches-table",
  webhook: {
    url: "/webhook/get-batches-datatable",
    method: "GET",
    queryMap: {
      page: "page",
      limit: "limit",
      sort_by: "sort_by",
      sort_order: "sort_order",
      from: "from",
      batch: "batch",
      branch: "branch",
      type: "type",
      status: "status",
      to: "to",
      peddler: "peddler"
    },
  },
}

// Tab configurations
const TAB_CONFIGS = {
  transactions: {
    id: "transactions",
    label: "Transactions",
    value: "transactions",
    config: transactionsTableConfig,
    widget: transactionWidget,
  },
  batches: {
    id: "batches",
    label: "Batches",
    value: "batches",
    config: batchTableConfig,
    widget: batchesWidget,
  },
}

// Separate component that uses useURLFilters
function DashboardContent() {
  const { filters, setFilters } = useURLFilters({ defaultPage: 1, defaultLimit: 10 })
  
  // Get current tab from URL
  const currentTab = filters.tab || "transactions"
  
  // Get current configuration based on selected tab
  const currentConfig = TAB_CONFIGS[currentTab as keyof typeof TAB_CONFIGS] || TAB_CONFIGS.transactions

  const handleRowClick = (row: any) => {
    console.log("Row clicked:", row)
  }

  // Tab configuration for the DynamicDataTable
  const tabsConfig = [
    { id: "transactions", label: "Sales", value: "transactions" },
    { id: "batches", label: "Purchases", value: "batches" }
  ]

  return (
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <AnalyticsOverview />
              <SectionCards widget={dashboardCardsWidget} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive widget={chartWidget} />
              </div>
              <div className="px-4 lg:px-6">
                <ProposalSectionsTable 
                  key={currentTab}
                  config={currentConfig.config}
                  widgetConfig={currentConfig.widget}
                  tabsConfig={tabsConfig}
                  onRowClick={handleRowClick}
                />
              </div>
            </div>
          </div>
        </div>
  )
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-7xl mx-auto p-4">
        <div className="h-12 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
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