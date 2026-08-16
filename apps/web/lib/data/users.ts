import { n8nFetcher } from "@/hooks/useN8nQuery";
import { getAuthHeaders, getCacheOptions } from "../data/cookies";
import sdk from "../config";

export async function retrieveUser() {
  try {
    const { user } = await sdk.client.fetch("/store/users/me", {
      headers: {
        ...(await getAuthHeaders()),
        ...getCacheOptions("users"),
      },
    });

    let headers = await getAuthHeaders();


   let token = String(headers?.authorization).split('Bearer ')[1];


    let userContext = {
        priceListId: user?.metadata?.role === 'company' 
          ? user.employee?.company?.price_list_id 
          : user?.driver?.price_list_id,
        customerGroupId: user?.metadata?.role === 'company' 
          ? user.employee?.company?.customer_group_id 
          : user?.driver?.customer_group_id,
        customerId: user?.id,
        companyId: user?.metadata?.role == 'company' ? user.employee?.company_id : user?.driver?.company_id,
        stockLocationId: user?.metadata?.role == 'company' ? user.employee?.company?.stock_location_id : user?.driver?.stock_location_id,
        pricingStrategy: user?.metadata?.role === 'company' ? 'price_list' : 'customer_group',
        token
      }
      
    return {...userContext, ...user, token};
  } catch (error) {
    console.error(error);
    return null;
  }
}




export async function loginUser(data: any) {
  try {



        // Method 1: Using the list endpoint with handle filter (recommended)
       const headers = {
        ...(await getAuthHeaders()),
      }
    
      const next = {
        ...(await getCacheOptions("user")),
      }


    const user = await n8nFetcher({endpoint: "/webhook/auth/session", 
      method: "POST",
      headers,
      // next
    });


    return user;
  } catch (error) {
    console.log(error, 'errr');
    return null;
  }
}
