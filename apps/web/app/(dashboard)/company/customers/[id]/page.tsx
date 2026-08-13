import { retrieveUser } from "@/lib/data";
import CustomerDetailPage from "@/components/customers/customer-page";




export default async function CustomersPage() {
  const user = await retrieveUser();



  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}

<CustomerDetailPage user={user}/> 

    </div>
  );
}