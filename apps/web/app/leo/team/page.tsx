'use client'
import { AppSidebar } from "@/components/app-sidebar"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AnalyticsOverview } from "@/components/analytics-overview"
import { Suspense } from "react"
import { DynamicDataTable } from "@/components/DynamicDataTable";
import { usersTableConfig } from "@/components/configData";

const teamWidget = {
  id: "users-table",
  webhook: {
    url: "/webhook/get-users",
    method: "GET",
    queryMap: {
      page: "page",
      limit: "limit"
    },
  },
};



export default function Page() {
  const handleRowClick = (row: any) => {
    console.log("Row clicked:", row);
    // Navigate to details or open dialog
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset"  />
      <SidebarInset>
      <Suspense>
        <SiteHeader 
            pageTitle="Team"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">

            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    {/* <DashboardFiltersBar /> */}
              <div className="px-4 lg:px-6">
                      <DynamicDataTable
                        config={usersTableConfig}
                        widgetConfig={teamWidget}
                        onRowClick={handleRowClick}
                      />
              </div>
            </div>
          </div>
        </div>
    </Suspense>

      </SidebarInset>
    </SidebarProvider>
  )
}

