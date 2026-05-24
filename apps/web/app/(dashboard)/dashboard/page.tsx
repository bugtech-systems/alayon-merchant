// app/dashboard/page.tsx
import { DeliveryActivityPipeline } from "@/components/pipeline-activity";
import { waterDeliveryData } from "@/data/water-delivery-table";
import { WaterDeliveryTable } from "@/components/proposal-sections-table/table";
import { DeliverySectionCards } from "@/components/company/section-cards";
import  DriverDashboard from "./rider/page";
import { redirect } from "next/navigation";
import { retrieveUser } from "@/lib/data";

export default async function Page() {
  const customer = await retrieveUser();
  
  if (!customer) {
    redirect("/login");
  }
  
  const userRole = customer.user.metadata?.role as string || "driver";
  console.log(userRole, 'USSSRRLOE')
  // Role-specific dashboard rendering
  if (userRole === "company") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DeliverySectionCards />
        <DeliveryActivityPipeline />
        <WaterDeliveryTable data={waterDeliveryData} />
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
      <p>Welcome {customer.first_name || customer.email}</p>
    </div>
  );
}