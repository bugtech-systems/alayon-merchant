"use server";

import { CreateDriverDTO, CreateRestaurantAdminDTO } from "@/lib/types";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "../../lib/data/sessions";
import { sdk } from "../medusa/config";
import { getAuthHeaders, getCacheHeaders, getCacheTag, removeAuthToken } from "../medusa/data/cookies";
import { track } from "@vercel/analytics";
import { apiFetch } from "../apiClient";
import { n8nFetcher } from "@/hooks/useN8nQuery";

type FormState =
  | {
      message?: string;
    }
  | undefined;

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

export async function signup(prevState: FormState, data: FormData) {
  const user_type = data.get("user_type") as string;
  const company_id = data.get("company_id") as string;
  const first_name = data.get("first_name") as string;
  const last_name = data.get("last_name") as string;
  const phone = data.get("phone") as string;
  const email = data.get("email") as string;
  const password = data.get("password") as string;

 

  const actor_type = user_type as "company" | "driver";

  try {


    // const token = await createAuthUser({
    //   email,
    //   password,
    //   actor_type,
    //   provider: "emailpass",
    // }).catch((error) => {
    //   throw new Error("Error creating auth user");
    // });



    revalidateTag('users', 'max');

    const createUserData: any = {
      email,
      first_name,
      last_name,
      phone,
      actor_type,
      company_id
    };

      createUserData.company_id = company_id;
      
    let customer = await n8nFetcher({
      endpoint: "/webhook/register",
      method: "POST",
      body: { 
      ...createUserData,
      password, 
      metadata: {company_id, actor_type}}
    })

    console.log(customer, 'CUSTTOM')

    // console.log(createUserData, 'CREATE USER', token, company_id, 'siiignup')

    // await createUser(createUserData).catch((error) => {
    //   throw new Error("Error creating user");
    // });

    // const newToken = await getToken({
    //   email,
    //   password,
    //   actor_type,
    //   provider: "emailpass",
    // });


    // console.log(newToken, 'TOKKE')
    createSession(customer?.token);
    revalidateTag("users", "max");
  } catch (error) {
    return {
      message: "Error creating user",
    };
  }

  redirecter(actor_type);
}

export async function login(prevState: FormState, data: FormData) {
  const email = data.get("email") as string;
  const password = data.get("password") as string;
  const actor_type = data.get("actor_type") as "restaurant" | "driver";

  let token;

  try {
    token = await getToken({
      email,
      password,
      actor_type,
      provider: "emailpass",
    });
    await logout()
    destroySession();
    createSession(token);

    revalidateTag(getCacheTag("users"));
  } catch (error) {
    return {
      message: "Invalid email or password",
    };
  }

  redirecter(actor_type);
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
