// app/dashboard/DashboardClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import DriverDashboard from "./rider/page";
import { CompanyOrdersTable } from "@/components/company-orders-table/table";
import React, { useState } from "react";
import { useMedusaOrders } from "@/hooks/useMedusaOrders";
import { assignDriverToOrder, unassignDriverToOrder } from "@/lib/data";
import { PrintDialog } from "@/app/pos/_components/print-dialog";

interface DashboardClientProps {
  user: any;
  userRole: string;
}

export function DashboardClient({ user, userRole }: DashboardClientProps) {
  const [cartPrint, setCartPrint] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get pagination and filter params from URL
  const page = parseInt(searchParams?.get('page') || '1', 10);
  const limit = parseInt(searchParams?.get('limit') || '10', 10);
  const search = searchParams?.get('search') || '';
  const statusFilter = searchParams?.get('status') || '';

  const pricingContext = React.useMemo(() => ({
    priceListId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.price_list_id 
      : user?.driver?.price_list_id,
    customerGroupId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.customer_group_id 
      : user?.driver?.customer_group_id,
    customerId: user?.id,
    companyId: user?.metadata?.role == 'company' ? user.employee?.company_id : user?.driver?.company_id,
    stockLocationId: user?.metadata?.role == 'company' ? user.employee?.company?.stock_location_id : user?.driver?.stock_location_id,
    pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group'
  }), [user]);

  // Fetch orders with pagination and filters
  const { data, refetch, isLoading } = useMedusaOrders({
    filters: { 
      company_id: pricingContext.companyId,
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit
    }
  });

  const handleAssignRider = async (orderId: string, riderId: string | null) => {
    try {
      let response;
      if (!riderId) {
        response = await unassignDriverToOrder(orderId);
      } else {
        response = await assignDriverToOrder(orderId, riderId);

      }
      await refetch();
      console.log("Rider assigned successfully", response);
    } catch (error) {
      console.error("Error assigning rider:", error);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      // const response = await fetch("/api/orders/update-status", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ orderId, status }),
      // });
      
      // if (!response.ok) throw new Error("Failed to update status");
      console.log(orderId, status, 'UPDATE STATUS')
      // toast.success(`Order ${orderId} status updated to ${status}`);
      await refetch();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };



  const handleRowClick = (order: any) => {
    console.log(order, 'ORDER')
    // router.push(`/orders/${order.id}`);
  };

  // Update URL query params
  const updateQueryParams = (params: Record<string, string | number | undefined>) => {
    const current = new URLSearchParams(searchParams?.toString() || '');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        current.set(key, String(value));
      } else {
        current.delete(key);
      }
    });
    const queryString = current.toString();
    router.push(queryString ? `?${queryString}` : window.location.pathname, { scroll: false });
  };

  const handleSearchChange = (query: string) => {
    updateQueryParams({ search: query, page: 1 });
  };

  // Company role view
  if (userRole === "company") {
    const { company } = user.employee;
      console.log(cartPrint, 'cccart')
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PrintDialog open={cartPrint} onOpenChange={setCartPrint} cart={cartPrint} />
        
        {/* <DeliverySectionCards 
          metricsWebhookUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/webhook/get-company-drivers' || ""} 
          ridersWebhookUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/webhook/get-company-drivers'} 
        />
        
        <DeliveryActivityPipeline 
          onAssignRider={handleAssignRider}
          onUpdateStatus={handleUpdateStatus}
          onAddOrder={handleAddOrder}
          onContactRider={handleContactRider}
        /> */}
        
        <CompanyOrdersTable
          data={data?.orders || []}
          totalCount={data?.total || 0}
          isLoading={isLoading}
          onAssignDriver={handleAssignRider}
          onStatusChange={handleUpdateStatus}
          onRefresh={() => refetch()}
          onRowClick={handleRowClick}
          companyId={company?.id}
          searchQuery={search}
          onSearchChange={handleSearchChange}
          enableDragDrop={true}
          enableColumnVisibility={true}
          enableRowSelection={true}
          onPrint={setCartPrint}
        />
      </div>
    );
  }
  
  // Driver role view
  if (userRole === "driver") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DriverDashboard user={user}/>
      </div>
    );
  }

  // Store role view (similar to driver)
  if (userRole === "store") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DriverDashboard user={user}/>
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <p>Welcome {user.first_name || user.email}</p>
    </div>
  );
}