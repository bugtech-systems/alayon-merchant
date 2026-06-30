// src/app/dashboard/page.tsx
"use client";

import * as React from "react";
import { KpiCards } from "./_components/kpi-cards";
import { WaterDeliveryOrdersSection } from "./_components/opportunities-section";
import { PipelineActivity } from "./_components/pipeline-activity";
import { TaskReminders } from "./_components/task-reminders";
import { listCustomersWithOrders } from "@/lib/data/customer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

// Types
interface CustomerWithOrders {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  has_account: boolean;
  groups: Array<{
    id: string;
    name: string;
  }>;
  latest_order: any | null;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_at: string | null;
  customer_summary: {
    total_orders: number;
    total_spent: number;
    average_order_value: number;
    last_order_date: string | null;
  };
  stock_health?: {
    remainingStock: number;
    previousOrderQty: number;
    stockHealthScore: number;
    stockHealthPercentage: number;
    stockHealthStatus: "high" | "medium" | "low";
  };
}

// Transform customer data to WaterDeliveryOrder format
function transformToWaterDeliveryOrder(customer: CustomerWithOrders): any {
  const latestOrder = customer.latest_order;
  
  // Get stock health from API response or calculate fallback
  const stockHealth = customer.stock_health || {
    remainingStock: 1000,
    previousOrderQty: 10,
    stockHealthScore: 6,
    stockHealthPercentage: 50,
    stockHealthStatus: "medium" as const,
  };

  // Get status mapping
  const statusMap: Record<string, any> = {
    "pending": "pending",
    "processing": "company_accepted",
    "completed": "delivered",
    "cancelled": "company_declined",
    "requires_action": "company_preparing",
  };

  // Get the first item for stock calculation
  const firstItem = latestOrder?.items?.[0];
  const itemQuantity = latestOrder?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

  return {
    id: customer.id,
    orderNumber: latestOrder?.display_id?.toString() || customer.id.slice(-6),
    customer: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || "Guest",
    customerPhone: customer.phone || "N/A",
    location: latestOrder?.shipping_address?.city || "N/A",
    address: latestOrder?.shipping_address?.address_1 || latestOrder?.shipping_address?.city || "N/A",
    quantity: itemQuantity,
    total: latestOrder?.total || 0,
    status: statusMap[latestOrder?.status] || "pending",
    orderDate: latestOrder?.created_at ? new Date(latestOrder.created_at).toLocaleDateString() : "N/A",
    assignedDriver: latestOrder?.metadata?.assigned_driver || customer._display?.assigned_driver || null,
    assignedDriverId: latestOrder?.metadata?.assigned_driver_id || customer._display?.assigned_driver_id || null,
    remainingStock: stockHealth.remainingStock,
    previousOrderQty: stockHealth.previousOrderQty || itemQuantity,
    stockHealthScore: stockHealth.stockHealthScore,
    stockHealthPercentage: stockHealth.stockHealthPercentage,
    stockHealthStatus: stockHealth.stockHealthStatus,
  };
}

export default function DashboardPage({user}: any) {
  // Pricing strategy from user context
  const pricingContext = React.useMemo(() => ({
    priceListId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.price_list_id 
      : user?.driver?.price_list_id,
    customerGroupId: user?.metadata?.role === 'company' 
      ? user.employee?.company?.customer_group_id 
      : user?.driver?.customer_group_id,
    customerId: user?.id,
    driverId: user?.metadata?.role == 'company' ? user.id : user?.driver?.id,
    stockLocationId: user?.metadata?.role == 'company' ? user.employee?.company?.stock_location_id : user?.driver?.stock_location_id,
    pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group'
  }), [user]);


  // Use React Query for data fetching
  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: async () => {
      const result = await listCustomersWithOrders({
        limit: 100,
        offset: 0,
        sort_field: "created_at",
        sort_order: "DESC",
        customer_group_id: pricingContext.customerGroupId
      });
      return result;
    },
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: false,
  });

  // Transform data when it changes
  const transformedData = React.useMemo(() => {
    if (!data) return { orders: [], kpiData: { totalCustomers: 0, activeCustomers: 0, totalRevenue: 0, totalOrders: 0 } };

    const customers = data.customers || [];
    
    // Transform customers to orders
    const orders = customers
      // .filter((c: CustomerWithOrders) => c.latest_order !== null)
      .map(transformToWaterDeliveryOrder);

    // Calculate KPI data
    const totalCustomers = data.meta?.total_customers || customers.length;
    const activeCustomers = data.meta?.active_customers || customers.filter((c: CustomerWithOrders) => c.total_orders > 0).length;
    const totalRevenue = data.meta?.total_revenue || customers.reduce((sum: number, c: CustomerWithOrders) => sum + c.total_spent, 0);
    const totalOrders = customers.reduce((sum: number, c: CustomerWithOrders) => sum + c.total_orders, 0);

    return {
      orders,
      kpiData: {
        totalCustomers,
        activeCustomers,
        totalRevenue,
        totalOrders,
      }
    };
  }, [data]);

  // Handle order click
  const handleOrderClick = React.useCallback((order: any) => {
    // Navigate to order details or open modal
    console.log("Order clicked:", order);
    // You can add navigation here:
    // router.push(`/dashboard/orders/${order.id}`);
  }, []);

  // Handle driver assignment
  const handleAssignDriver = React.useCallback(async (orderId: string, driverName: string) => {
    console.log(`Assigning driver ${driverName} to order ${orderId}`);
    try {
      // Call API to assign driver
      // await assignDriverToOrder(orderId, driverName);
      // Refetch data to update the UI
      await refetch();
    } catch (error) {
      console.error("Failed to assign driver:", error);
    }
  }, [refetch]);

  // Handle status update
  const handleUpdateStatus = React.useCallback(async (orderId: string, status: any) => {
    console.log(`Updating order ${orderId} status to ${status}`);
    try {
      // Call API to update status
      // await updateOrderStatus(orderId, status);
      // Refetch data to update the UI
      await refetch();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }, [refetch]);

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription className="flex items-center gap-4 flex-wrap">
            <span>{error instanceof Error ? error.message : "An error occurred while loading the dashboard data."}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Retry'}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { orders, kpiData } = transformedData;

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6">
      {/* Refresh Indicator */}
      {isFetching && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <RefreshCwIcon className="h-4 w-4 animate-spin" />
            <span className="text-sm">Updating...</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <KpiCards 
        totalCustomers={kpiData.totalCustomers}
        activeCustomers={kpiData.activeCustomers}
        totalRevenue={kpiData.totalRevenue}
        totalOrders={kpiData.totalOrders}
        isLoading={isLoading || isFetching}
      />

      {/* Task Reminders */}
      <TaskReminders customerId={pricingContext.customerId} locationId={pricingContext.stockLocationId}/>

      {/* Water Delivery Orders */}
      <WaterDeliveryOrdersSection 
        data={orders}
        onOrderClick={handleOrderClick}
        onAssignDriver={handleAssignDriver}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}