import { n8nFetcher } from "@/hooks/useN8nQuery";
import { getAuthHeaders, getCacheOptions } from "../data/cookies";
import sdk from "../config";

export async function retrieveUser() {
  try {
    const { user } = await sdk.client.fetch<{
      user: any | null;
    }>("/store/users/me", {
      headers: {
        ...(await getAuthHeaders()),
        ...getCacheOptions("users"),
      },
    });

    return user;
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
