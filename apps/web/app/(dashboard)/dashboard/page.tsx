// app/dashboard/page.tsx
import { DeliveryActivityPipeline } from "@/components/pipeline-activity";
import { WaterDeliveryTable } from "@/components/proposal-sections-table/table";
import { DeliverySectionCards } from "@/components/company/section-cards";
import DriverDashboard from "./rider/page";
import { redirect } from "next/navigation";
import { retrieveUser } from "@/lib/data";
import { retrieveCustomer } from "@/lib/actions";

// Move server actions to separate functions outside the component
async function handleAssignRider(orderId: string, riderName: string | null, riderId: string | null) {
  'use server';
  // Server-side logic here
  console.log('Assign rider:', { orderId, riderName, riderId });
  // Add your database update logic here
}

async function handleUpdateStatus(orderId: string, status: string) {
  'use server';
  // Server-side logic here
  console.log('Update status:', { orderId, status });
  // Add your database update logic here
}

async function handleAddOrder() {
  'use server';
  // Server-side logic here
  console.log('Add new order');
  // Add your order creation logic here
}

async function handleContactRider(riderPhone: string) {
  'use server';
  // Server-side logic here
  console.log('Contact rider:', riderPhone);
  // Add your contact logic here (e.g., initiate call/SMS)
}

export default async function Page() {
  const user = await retrieveCustomer() || {} as any;
  console.log(user, 'cusstom')
  if (!user?.id) {
    redirect("/login");
  }
  
  const userRole = user?.metadata?.role as string || "driver";
  
  // Role-specific dashboard rendering
  if (userRole === "company") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DeliverySectionCards metricsWebhookUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE || ""} ridersWebhookUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/webhook/get-company-drivers'} />
        <DeliveryActivityPipeline />
        <WaterDeliveryTable
          webhookBaseUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/Webhook' || ""}
          onAssignRider={handleAssignRider}
          onUpdateStatus={handleUpdateStatus}
          onAddOrder={handleAddOrder}
          onContactRider={handleContactRider}
          refreshInterval={30000}
        />
      </div>
    );
  }
  
  // Driver dashboard
  if (userRole === "driver") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DriverDashboard />
        {/* Driver-specific components */}
      </div>
    );
  }
  
  // Default/fallback
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <p>Welcome {user.first_name || user.email}</p>
    </div>
  );
}