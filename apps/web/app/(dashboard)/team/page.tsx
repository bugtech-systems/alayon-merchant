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
    // Navigate to details or open dialog
  };

  return (
  

                      <DynamicDataTable
                        config={usersTableConfig}
                        widgetConfig={teamWidget}
                        onRowClick={handleRowClick}
                      />
  )
}

