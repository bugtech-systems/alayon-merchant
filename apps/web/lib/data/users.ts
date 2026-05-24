import { n8nFetcher } from "@/hooks/useN8nQuery";
import { getAuthHeaders, getCacheOptions } from "../data/cookies";

export async function retrieveUser() {
  try {

        // Method 1: Using the list endpoint with handle filter (recommended)
       const headers = {
        ...(await getAuthHeaders()),
      }
    
      const next = {
        ...(await getCacheOptions("user")),
      }


    const user = await n8nFetcher({endpoint: "/webhook/auth/session", 
      method: "GET",
      headers,
      // next
    });


    return user;
  } catch (error) {
    console.log(error, 'errr');
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
