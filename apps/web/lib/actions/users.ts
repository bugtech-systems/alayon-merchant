"use server";

import { CreateDriverDTO, CreateRestaurantAdminDTO } from "@/lib/types";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "../../lib/data/sessions";
import { sdk } from "../medusa/config";
import { getAuthHeaders, getCacheHeaders, getCacheTag, removeAuthToken } from "../medusa/data/cookies";
import { track } from "@vercel/analytics/server";
import { n8nFetcher } from "@/hooks/useN8nQuery";
import { retrieveCustomer, transferCart } from "./customer";
import { setAuthToken, setCustomerGroupId } from "../data/cookies";
import { z } from "zod";
import { updateCart } from "../data/cart";
import { retrieveCart } from "./cart";
import { retrieveCustomerPhone } from "../data/customer";
import { retrieveUser } from "../data";


type FormState = {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

// Validation schema for signup
const signupSchema = z.object({
  user_type: z.enum(["driver", "company"], {
    required_error: "User type is required",
    invalid_type_error: "Invalid user type",
  }),
  company_id: z.string().optional().nullable(),
  first_name: z.string().min(1, "First name is required").max(50, "First name is too long"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name is too long"),
  phone: z.string().min(10, "Phone number must be at least 10 characters").max(13, "Phone number is too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const redirecter = (actor_type: "admin" | "company" | "driver") => {
  let redirectPatch;
  if (actor_type === "company") {
    redirectPatch = "/dashboard/company";
  } else if (actor_type === "driver") {
    redirectPatch = "/dashboard/driver";
  } if (actor_type === "admin") {
    redirectPatch = "/leo";
  } else {
    redirectPatch = "/";
  }
  redirect(redirectPatch);
};

export async function logout() {
  destroySession();
  removeAuthToken()
  redirect("/");
}




export async function signup(prevState: FormState, data: FormData): Promise<FormState> {
  // Extract form data
  const rawData = {
    user_type: data.get("user_type") as string,
    company_id: data.get("company_id") as string,
    first_name: data.get("first_name") as string,
    last_name: data.get("last_name") as string,
    phone: data.get("phone") as string,
    email: data.get("email") as string,
    password: data.get("password") as string,
  };

  // Validate input with zod
  const validationResult = signupSchema.safeParse(rawData);
  console.log(validationResult.error, 'VALLID')
  if (!validationResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    validationResult.error.errors.forEach((err) => {
      const path = err.path[0];
      if (path) {
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      }
    });
    
    return {
      error: "Please check your input",
      fieldErrors,
      success: false,
    };
  }

  const { user_type, company_id, first_name, last_name, phone, email, password } = validationResult.data;
  const actor_type = user_type as "company" | "driver";

  // Additional validation for company users
  if (actor_type === "company" && !company_id) {
    return {
      error: "Company selection is required",
      fieldErrors: {
        company_id: ["Please select a company"],
      },
      success: false,
    };
  }

  try {
    // Step 1: Register user with Medusa auth
    let token: string;
    try {





      token = await sdk.auth.register("customer", "emailpass", {
        email: email || `${phone.replace(/[^0-9]/g, '')}@temp.user`, // Fallback email if not provided
        password: password,
       
      });
      
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
    } catch (authError: any) {
      console.error("Auth registration error:", authError);
      
      // Handle specific auth errors
      if (authError.message?.includes("already exists") || authError.status === 409) {
        return {
          error: "An account with this email already exists. Please login instead.",
          fieldErrors: {
            email: ["Email already registered"],
          },
          success: false,
        };
      }
      
      return {
        error: authError.message || "Failed to register account. Please try again.",
        success: false,
      };
    }

    let customer = await retrieveCustomerPhone(phone);
    


    // Step 2: Create customer profile
    const customerForm = {
      email: email || `${phone.replace(/[^0-9]/g, '')}@temp.user`,
      first_name,
      last_name,
      phone,
      metadata: { role: actor_type },
    };

    const customHeaders = { authorization: `Bearer ${token}` };
    let createdCustomer;

    try {


      if(customer){
        createdCustomer = customer;
      } else {
      const response = await sdk.store.customer.create(customerForm, {}, customHeaders);
      createdCustomer = response.customer;
      }

      console.log(customer, createdCustomer, 'CREATE CUSTOM')
      if (!createdCustomer || !createdCustomer.id) {
        throw new Error("Failed to create customer profile");
      }
    } catch (customerError: any) {
      console.error("Customer creation error:", customerError);
      
      return {
        error: customerError.message || "Failed to create customer profile. Please try again.",
        success: false,
      };
    }

    // Step 3: Get authentication token for session
    let authToken: string;
    try {
      authToken = await getToken({
        email: customerForm.email,
        password: password,
        provider: 'emailpass',
        actor_type,
      });
      
      if (!authToken) {
        throw new Error("Failed to get authentication token");
      }
    } catch (tokenError: any) {
      console.error("Token retrieval error:", tokenError);
      
      return {
        error: "Failed to authenticate. Please try logging in.",
        success: false,
      };
    }

    // Step 4: Set auth token and create session
    try {


      console.log(authToken, token, createdCustomer, 'TOOOKKs')
      setAuthToken(authToken);
      createSession(authToken);
    } catch (sessionError: any) {
      console.error("Session creation error:", sessionError);
      // Continue even if session creation fails, we can still try to create user
    }

    // Step 5: Create user/employee record in your database
    let user: any;
    const createUserData = {
      email: customerForm.email,
      first_name,
      last_name,
      customer_id: createdCustomer.id,
      phone,
      actor_type,
      token,
    };

    try {
      if (actor_type !== 'driver') {
        // Create company employee
        if (!company_id) {
          throw new Error("Company ID is required for company users");
        }
        
        user = await createEmployee({
          company_id: company_id,
          customer_id: createdCustomer.id,
          is_admin: false,
          spending_limit: 0,
        });
        
        if (!user) {
          throw new Error("Failed to create employee record");
        }
      } else {
        // Create regular user
        user = await createUser(createUserData);
        
        if (!user) {
          throw new Error("Failed to create user record");
        }
      }
    } catch (userCreationError: any) {
      console.error("User/Employee creation error:", userCreationError);
      
      // Attempt cleanup - delete Medusa customer if user creation fails
      try {
        await sdk.admin.customer.delete(createdCustomer.id, {}, customHeaders);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
        // Log but don't throw - customer might need manual cleanup
      }
      
      return {
        error: userCreationError.message || "Failed to create user profile. Please contact support.",
        success: false,
      };
    }

    // Step 6: Revalidate caches
    try {
      const cacheTag = await getCacheTag("customers");
      revalidateTag(cacheTag, "max");
      revalidateTag("users", "max");
    } catch (cacheError) {
      console.error("Cache revalidation error:", cacheError);
      // Non-critical error, continue
    }

    // Step 7: Transfer cart (if exists)
    try {
      await transferCart();
    } catch (cartError) {
      console.error("Cart transfer error:", cartError);
      // Non-critical error, continue
    }

    // Step 8: Redirect based on user type
    try {
      redirecter(actor_type);
    } catch (redirectError) {
      // Next.js redirect throws an error, we need to re-throw it
      if (redirectError instanceof Error && redirectError.message.includes('NEXT_REDIRECT')) {
        throw redirectError;
      }
      console.error("Redirect error:", redirectError);
      
      // Manual fallback redirect
      if (actor_type === 'driver') {
        redirect('/dashboard/driver');
      } else {
        redirect('/dashboard/company');
      }
    }

    // Return success state (though redirect will happen before this)
    return {
      success: true,
      message: "Account created successfully",
    };
    
  } catch (error: any) {
    console.error("Signup process error:", error);
    
    // Handle Next.js redirect specially
    if (error.message?.includes('NEXT_REDIRECT')) {
      throw error; // Re-throw redirect errors
    }
    
    // Handle specific error types
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return {
        error: "Request timed out. Please try again.",
        success: false,
      };
    }
    
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      return {
        error: "Network error. Please check your connection and try again.",
        success: false,
      };
    }
    
    // Generic error fallback
    return {
      error: error.message || "An unexpected error occurred. Please try again.",
      success: false,
    };
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    return await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        track("customer_logged_in")
        setAuthToken(token as string)

        const [customerCacheTag, productsCacheTag, cartsCacheTag] =
          await Promise.all([
            getCacheTag("customers"),
            getCacheTag("products"),
            getCacheTag("carts"),
          ])

        revalidateTag(customerCacheTag, "max")
        const userData = await retrieveUser()
        const customer = await retrieveCustomer()
        const cart = await retrieveCart()
        console.log(customer, cart, userData, 'ccssese')
        // if (customer?.employee?.company_id) {
        //   await updateCart({
        //     metadata: {
        //       ...cart?.metadata,
        //       company_id: customer.employee.company_id,
        //     },
        //   })
        // }
                if(userData && userData?.metadata?.role){
                    if(userData?.metadata?.role == 'driver'){
                        setCustomerGroupId(userData.driver.customer_group_id)
                    } else if(userData?.metadata?.role == 'company'){
                        setCustomerGroupId(userData.employee.company.customer_group_id)
                    }
            }
        revalidateTag(productsCacheTag, "max")
        revalidateTag(cartsCacheTag, "max")
            await transferCart()
            return {success: true, token}
      })
  } catch (error: any) {
            console.log(error, 'errr ccssese')
    return error.toString()
  } 

  try {
    await transferCart()
  } catch (error: any) {
      console.log(error, 'errr  lassst ccssese')
    return error.toString()
  }
}

export async function createAuthUser({
  email,
  password,
  actor_type,
  provider,
}: {
  email: string;
  password: string;
  actor_type: "company" | "driver";
  provider: "emailpass";
}) {
  const { token }: { token: string } = await sdk.client.fetch(
    `/auth/${actor_type}/${provider}/register`,
    {
      method: "POST",
      body: { entity_id: email, password, email },
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
        ...(await getCacheHeaders("users")),
      },
    }
  );

  return token;
}

export type CreateUserType = (CreateDriverDTO | CreateRestaurantAdminDTO) & {
  actor_type: string;
  company_id?: string;
  token: string;
};

export async function createUser(input: CreateUserType) {
  const { token, ...rest } = input;

  const res = await sdk.client.fetch("/store/users", {
    method: "POST",
    body: rest,
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
      ...(await getCacheHeaders("users")),
    },
  });

  return res;
}

export async function getToken({
  email,
  password,
  actor_type,
  provider,
}: {
  email: string;
  password: string;
  actor_type: "company" | "driver";
  provider: "emailpass";
}) {
  const { token }: { token: string } = await sdk.client.fetch(
    `/auth/${actor_type}/${provider}`,
    {
      method: "POST",
      body: { email, password: password.toString() },
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
        ...(await getCacheHeaders("users")),
      },
    }
  );

  return token;
}

export const createEmployee = async (data: any) => {
  const { company_id, ...employeeData } = data

  const headers = {
    ...(await getAuthHeaders()),
  }

  const employee = await sdk.client.fetch<any>(
    `/store/companies/${company_id}/employees`,
    {
      method: "POST",
      body: employeeData,
      headers,
    }
  )

  track("employee_created", {
    employee_id: employee.employee.id,
  })

  const cacheTag = await getCacheTag("companies")
  revalidateTag(cacheTag, "max")

  return employee
}


export const getEmployee = async (id: any) => {



  const employee = await n8nFetcher({endpoint: `/webhook/get-company-employee?employee_id=${id}`, method: "GET",})

  return employee
}

// lib/utils/phone.ts
export const sanitizePhilippinePhone = async (phone: string) => {
  if (!phone) return phone;
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Convert to +639 format
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return '+63' + cleaned.substring(1);
  }
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    return '+63' + cleaned;
  }
  if (cleaned.length === 12 && cleaned.startsWith('63')) {
    return '+' + cleaned;
  }
  
  return phone; // Return original if format not recognized
}

// lib/actions/team-member.ts
export async function createTeamMember(userData: CreateTeamMemberInput) {
  try {
    // Register the user via auth
    const registerResponse = await sdk.client.fetch(
      `/auth/user/emailpass/register`,
      {
        method: "POST",
        body: { 
          entity_id: userData.email, 
          password: userData.password, 
          email: userData.email 
        },
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("users")),
        },
      }
    );

    if (!registerResponse) {
      throw new Error('Failed to register team member');
    }

    // Create the user profile with role
    const response = await sdk.client.fetch(
      `/admin/users`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
        }),
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("users")),
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create team member');
    }
    
    const { user } = await response.json();
    
    revalidateTag("team-members-list");
    revalidateTag("users");
    
    return user;
  } catch (error) {
    console.error('Error creating team member:', error);
    return null;
  }
}

export async function updateTeamMemberRole(userId: string, role: string) {
  try {
    const response = await sdk.client.fetch(
      `/admin/users/${userId}`,
      {
        method: 'POST',
        body: JSON.stringify({ role }),
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("users")),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update team member role');
    }
    
    revalidateTag("team-members-list");
    revalidateTag("users");
    
    return true;
  } catch (error) {
    console.error('Error updating team member:', error);
    return false;
  }
}

export async function deleteTeamMember(userId: string) {
  try {
    const response = await sdk.client.fetch(
      `/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          ...(await getAuthHeaders()),
          ...(await getCacheHeaders("users")),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to delete team member');
    }
    
    revalidateTag("team-members-list");
    revalidateTag("users");
    
    return true;
  } catch (error) {
    console.error('Error deleting team member:', error);
    return false;
  }
}

export async function getTeamMembers() {
  try {
    const response = await sdk.client.fetch(`/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
        ...(await getCacheHeaders("team-members-list")),
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch team members');
    }
    
    const { users } = await response.json();
    return users;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}