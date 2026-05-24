// components/subscriber-overview.tsx
"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomersExport } from "@/lib/hooks/useN8nQuery";
import { RecentCustomersTable } from "./recent-customers-table/table";

interface SubscriberOverviewProps {
  initialData?: any[];
  initialTotal?: number;
  initialStats?: any;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function SubscriberOverview({ 
  initialData = [], 
  initialTotal = 0,
  initialStats = null,
  isLoading = false,
  onRefresh 
}: SubscriberOverviewProps) {
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const exportMutation = useCustomersExport();

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // Get current filters from URL
      const params: Record<string, any> = {};
      const companyId = searchParams.get("company_id");
      const search = searchParams.get("search");
      const status = searchParams.get("status");
      const billing = searchParams.get("billing");
      const joinedDate = searchParams.get("joinedDate");
      
      if (companyId) params.company_id = companyId;
      if (search) params.search = search;
      if (status && status !== "all") params.status = status;
      if (billing && billing !== "all") params.billing = billing;
      if (joinedDate && joinedDate !== "all") params.daysBack = joinedDate;
      
      const response = await exportMutation.mutateAsync(params);
      
      if (response.success && response.data) {
        // Create CSV blob and download
        const csvContent = convertToCSV(response.data);
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `customers-export-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error(response.error || "Export failed");
      }
    } catch (error) {
      console.error("Error exporting customers:", error);
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || "")).join(","));
    return [headers.join(","), ...rows].join("\n");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">
          {initialTotal.toLocaleString()} Customers
        </CardTitle>
        <CardDescription>
          Recent customer records with plan, billing, status, and signup activity.
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || exportMutation.isPending}>
            {(exporting || exportMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {(exporting || exportMutation.isPending) ? "Exporting..." : "Export"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-0">
        <RecentCustomersTable />
      </CardContent>
    </Card>
  );
}