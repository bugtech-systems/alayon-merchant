import  CustomerMap from "@/components/map/customer-map";
import { retrieveUser } from "@/lib/data";
import { listCustomerGroupCustomers, listCustomers, listCustomersWithOrders } from "@/lib/data/customer";

export default async function Home() {
  let user = await retrieveUser();
 const pricingContext = {
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
      }

  let customersData = await listCustomers();
console.log(customersData?.customers, 'CUSTOMMSSS')
  let customersRoutes = customersData?.customers?.length ? customersData?.customers?.filter((a: any) => {return (a.lat && a.lng)}) : [];
  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Customer Mapping</h1>
      </div>
      <CustomerMap user={user} customers={customersRoutes}/>
    </div>
  );
}