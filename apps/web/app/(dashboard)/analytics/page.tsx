// app/page.tsx

'use client';

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar";
import { Suspense, useMemo } from "react";
import { DynamicDataTable } from "@/components/DynamicDataTable";
import { 
  transactionsTableConfig,
  batchTableConfig
} from "@/components/configData";
import { useURLFilters } from "@/hooks/useUrlFilters";
import { AnalyticsOverview } from "@/components/analytics-overview";
import { CashFlowOverview } from "@/components/analytics/cash-flow-overview";
import { BalanceDistributionCard } from "@/components/finance/balance-distribution-card";

// Widget configurations
const dashboardCardsWidget = {
  id: "dashboard-cards",
  type: "kpi",
  webhook: {
    url: "/webhook/revs-dashboard-cards",
    method: "GET",
    queryMap: {
      range: "range",
      from: "from",
      to: "to",
      branch: "branch",
      batch: "batch"
    },
  },
};

const chartWidget = {
  id: "sales-chart",
  type: "area",
  webhook: {
    url: "/webhook/bettings-sales-chart",
    queryMap: {
      from: "from",
      to: "to",
      segment: "segment",
    },
  },
  config: {
    total: {
      label: "Total Sales"
    },
    new_can: {
      label: "New Can",
      color: "var(--primary)"
    },
    refill: {
      label: "Refill",
      color: "var(--primary)"
    }
  }
};

const transactionWidget = {
  id: "transaction-table",
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
};

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
};

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
  }
};

// Separate component that uses useURLFilters
function DashboardContent() {
  const { filters, setFilters } = useURLFilters() as any;
  
  // Get current tab from URL
  const currentTab = filters.tab || "transactions";
  
  // Get current configuration based on selected tab
  const currentConfig = TAB_CONFIGS[currentTab as keyof typeof TAB_CONFIGS] || TAB_CONFIGS.transactions;

  const handleRowClick = (row: any) => {
    console.log("Row clicked:", row);
  };

  // Tab configuration for the DynamicDataTable
  const tabsConfig = [
    { id: "transactions", label: "Transactions", value: "transactions" },
    { id: "batches", label: "Batches", value: "batches" }
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="px-4 lg:px-6 flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <AnalyticsOverview />
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <CashFlowOverview />
            </div>
            <BalanceDistributionCard />
          </div>
          <div className="px-4 lg:px-6">
            <DynamicDataTable
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
  );
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="px-4 lg:px-6 flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Analytics Overview Skeleton */}
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          </div>
          
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
          
          {/* Table Skeleton */}
          <div className="px-4 lg:px-6">
            <div className="animate-pulse">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
          <DashboardContent />
  );
}