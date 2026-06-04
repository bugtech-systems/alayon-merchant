import { CustomerTable } from "@/components/customers-table/table";
import { CustomerRow } from "@/components/customers-table/schema";
import { retrieveUser } from "@/lib/data";
import { retrieveCustomer } from "@/lib/actions";
import { toast } from "sonner";
import { CustomerCreateForm } from "@/components/forms/customer-create-form";
import { OrderDeliveryTable } from "@/components/orders-table/table";




export default async function CustomersPage() {
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

      {/* Customer Table */}
      <OrderDeliveryTable
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