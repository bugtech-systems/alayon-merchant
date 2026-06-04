// app/dashboard/DashboardClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { DeliveryActivityPipeline } from "@/components/pipeline-activity";
import { DynamicOrdersTable } from "@/components/proposal-sections-table/table";
import { DeliverySectionCards } from "@/components/company/section-cards";
import DriverDashboard from "./rider/page";
import type { DashboardOrder } from "@/lib/data/orders";

interface DashboardClientProps {
  user: any;
  userRole: string;
}

export function DashboardClient({ user, userRole }: DashboardClientProps) {
  const router = useRouter();

  const handleAssignRider = async (orderId: string, riderName: string | null, riderId: string | null) => {
    try {
      const response = await fetch("/api/orders/assign-rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, riderName, riderId }),
      });
      
      if (!response.ok) throw new Error("Failed to assign rider");
      
      // Show success notification
      console.log("Rider assigned successfully");
    } catch (error) {
      console.error("Error assigning rider:", error);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch("/api/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      
      if (!response.ok) throw new Error("Failed to update status");
      
      console.log("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleAddOrder = async () => {
    router.push("/orders/new");
  };

  const handleContactRider = async (riderPhone: string) => {
    // Handle contact logic (e.g., open phone dialer)
    window.location.href = `tel:${riderPhone}`;
  };

  const handleRowClick = (order: DashboardOrder) => {
    router.push(`/orders/${order.id}`);
  };

  const handleBulkAction = async (action: string, orders: DashboardOrder[]) => {
    switch (action) {
      case "export":
        // Handle export
        console.log(`Exporting ${orders.length} orders`);
        break;
      case "update-status":
        // Handle bulk status update
        console.log(`Updating status for ${orders.length} orders`);
        break;
      default:
        console.log(`Bulk ${action} on ${orders.length} orders`);
    }
  };

  if (userRole === "company") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DeliverySectionCards 
          metricsWebhookUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/webhook/get-company-drivers' || ""} 
          ridersWebhookUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/webhook/get-company-drivers'} 
        />
        <DeliveryActivityPipeline 
          onAssignRider={handleAssignRider}
          onUpdateStatus={handleUpdateStatus}
          onAddOrder={handleAddOrder}
          onContactRider={handleContactRider}
        />
       <DynamicOrdersTable
  views={[
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending", paramValue: "pending" },
    { id: "processing", label: "Processing", paramValue: "processing" },
    { id: "completed", label: "Delivered", paramValue: "completed" },
  ]}
  filters={[
    { id: "status", label: "Status", type: "multiselect", field: "status", options: [] },
    { id: "created_at", label: "Date Range", type: "dateRange", field: "created_at" },
  ]}
  enableExport={true}
  enableBulkActions={true}
  onAssignRider={handleAssignRider}
  onUpdateStatus={handleUpdateStatus}
  onContactRider={handleContactRider}
  refreshInterval={30000}
/>
      </div>
    );
  }
  
  if (userRole === "driver") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DriverDashboard />
      </div>
    );
  }
  
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <p>Welcome {user.first_name || user.email}</p>
    </div>
  );
}