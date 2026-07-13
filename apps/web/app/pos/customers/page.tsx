import { CustomerRow } from "@/components/customers-table/schema";
import { retrieveUser } from "@/lib/data";
import { retrieveCustomer } from "@/lib/actions";
import { toast } from "sonner";
import { CustomerCreateForm } from "@/components/forms/customer-create-form";
import { OrderDeliveryTable } from "@/components/orders-table/table";
import { CustomerTable } from "@/components/customers-table/table";




export default async function CustomersPage() {
  const user = await retrieveUser();



  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer base, view order history, and track engagement
          </p>
        </div>
      </div>
<CustomerTable user={user}/>
      {/* Customer Table */}
      {/* <OrderDeliveryTable
          webhookBaseUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/Webhook' || ""}
          onAssignRider={handleAssignRider}
          onUpdateStatus={handleUpdateStatus}
          onAddOrder={handleAddOrder}
          onContactRider={handleContactRider}
          refreshInterval={30000}
      /> */}

    </div>
  );
}