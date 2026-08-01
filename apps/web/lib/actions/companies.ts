"use server";

import { retrieveSession } from "@/lib/data/sessions";
import {CompanyDTO, CompanyProductDTO } from "@/lib/types";
import { promises as fs } from "fs";
import { revalidateTag } from "next/cache";
import { sdk } from "../medusa/config";
import { getAuthHeaders, getCacheTag } from "../medusa/data/cookies";
import { StoreCompaniesResponse, StoreCompanyResponse, StoreCreateCompany, StoreCreateEmployee, StoreEmployeeResponse, StoreUpdateCompany } from "@/types";
import { track } from "@vercel/analytics";
import { getCacheOptions } from "../data/cookies";
import { z } from "zod"


const FRONTEND_URL =
  (process.env.NEXT_PUBLIC_VERCEL_URL &&
    `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`) ||
  "http://localhost:3000";

export async function setCompanyStatus(
  companyId: string,
  status: boolean
): Promise<CompanyDTO | { message: string }> {
  try {
    const { company } = await sdk.client.fetch<{
      company: CompanyDTO;
    }>(`/store/companies/${companyId}/status`, {
      method: "POST",
      body: { is_open: status },
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
    });

    revalidateTag("companies", "max");

    return company;
  } catch (error) {
    return { message: "Error setting company status" };
  }
}

export async function createProduct(
  prevState: any,
  createProductData: FormData
): Promise<CompanyProductDTO | { message: string }> {
  const token = retrieveSession();
  const restaurantId = createProductData.get("company_id") as string;
  const image = createProductData.get("image") as File;
  const fileName = image?.name;

  if (image) {
    await saveFile(image, fileName as string);
  }

  createProductData.set("thumbnail", `${FRONTEND_URL}/${fileName}`);

  createProductData.delete("image");

  const productData = {} as Record<string, any>;

  Array.from(createProductData.entries()).forEach(([key, value]) => {
    if (key === "company_id") {
      return;
    }
    productData[key] = value;
  });

  try {
    const { restaurant_product } = await sdk.client.fetch<{
      restaurant_product: CompanyProductDTO;
    }>(`/restaurants/${restaurantId}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: productData,
    });

    revalidateTag(getCacheTag("products"));

    return restaurant_product;
  } catch (error) {
    return { message: "Error creating product" };
  }
}

async function saveFile(file: File, fileName: string) {
  const data = await file.arrayBuffer();
  await fs.appendFile(`./public/${fileName}`, Buffer.from(data));
  return;
}

export async function deleteProduct(productId: string, restaurantId: string) {
  try {
    await sdk.client.fetch(`/restaurants/${restaurantId}/products`, {
      method: "DELETE",
      body: { product_ids: [productId] },
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    revalidateTag(getCacheTag("products"));
    revalidateTag(getCacheTag("restaurants"));

    return true;
  } catch (error) {
    return false;
  }
}


export const retrieveCompany = async (companyId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("companies")),
  }

  const { company } = await sdk.client.fetch<StoreCompanyResponse>(
    `/store/companies/${companyId}`,
    {
      query: {
        fields:
          "",
      },
      method: "GET",
      headers
    }
  )
  console.log(company, 'COM<<P RETT')
  return company
}

export const createCompany = async (data: StoreCreateCompany) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const {
    companies: [company],
  } = await sdk.client.fetch<StoreCompaniesResponse>(`/store/companies`, {
    method: "POST",
    body: data,
    headers,
  })

  track("company_created", {
    company_id: company.id,
    company_name: company.name,
  })

  const cacheTag = await getCacheTag("companies")
  revalidateTag(cacheTag, "max")

  return company
}

export const updateCompany = async (data: StoreUpdateCompany) => {
  const { id, ...companyData } = data

  const headers = {
    ...(await getAuthHeaders()),
  }

  const company = await sdk.client.fetch<StoreCompanyResponse>(
    `/store/companies/${id}`,
    {
      method: "POST",
      body: companyData,
      headers,
    }
  )

  const cacheTag = await getCacheTag("companies")
  revalidateTag(cacheTag, "max")

  return company
}

// export const createEmployee = async (data: StoreCreateEmployee) => {
//   const { company_id, ...employeeData } = data

//   const headers = {
//     ...(await getAuthHeaders()),
//   }

//   const employee = await sdk.client.fetch<StoreEmployeeResponse>(
//     `/store/companies/${company_id}/employees`,
//     {
//       method: "POST",
//       body: employeeData,
//       headers,
//     }
//   )

//   track("employee_created", {
//     employee_id: employee.employee.id,
//   })

//   const cacheTag = await getCacheTag("companies")
//   revalidateTag(cacheTag, "max")

//   return employee
// }

export const updateEmployee = async (data: StoreUpdateEmployee) => {
  const { id, company_id, ...employeeData } = data

  const headers = {
    ...(await getAuthHeaders()),
  }

  const employee = await sdk.client.fetch<StoreEmployeeResponse>(
    `/store/companies/${company_id}/employees/${id}`,
    {
      method: "POST",
      body: employeeData,
      headers,
    }
  )

  const cacheTag = await getCacheTag("companies")
  revalidateTag(cacheTag, "max")

  return employee
}

export const deleteEmployee = async (companyId: string, employeeId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.client.fetch(
    `/store/companies/${companyId}/employees/${employeeId}`,
    {
      method: "DELETE",
      headers,
    }
  )

  const cacheTag = await getCacheTag("companies")
  revalidateTag(cacheTag, "max")
}

export const updateApprovalSettings = async (
  companyId: string,
  requiresAdminApproval: boolean
) => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    Accept: "plain/text",
  }

  await sdk.client.fetch(`/store/companies/${companyId}/approval-settings`, {
    method: "POST",
    body: {
      requires_admin_approval: requiresAdminApproval,
    },
    headers,
  })

  const cacheTag = await getCacheTag("companies")
  revalidateTag(cacheTag, "max")
}

// Types
export interface CustomerFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  group?: string
  dateFrom?: Date
  dateTo?: Date
  minSpent?: number
  maxSpent?: number
  minOrders?: number
  maxOrders?: number
  city?: string
  hasCompany?: boolean
  companyId?: string
  sortBy?: string
  sortOrder?: "ASC" | "DESC"
  customer_group_id?: string
  includeCompany?: boolean
  includeOrders?: boolean
}

export interface CustomerListResponse {
  customers: B2BCustomer[]
  total: number
  page: number
  limit: number
  totalPages: number
  filters?: CustomerFilters
}

export interface CustomerStats {
  totalCustomers: number
  activeCustomers: number
  newCustomersThisMonth: number
  averageOrderValue: number
  totalRevenue: number
  topCities: Array<{ city: string; count: number }>
  customerSegments: Array<{ segment: string; count: number }>
}

// Validation schemas
const GetCustomersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(10000).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  group: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minSpent: z.number().min(0).optional(),
  maxSpent: z.number().min(0).optional(),
  minOrders: z.number().min(0).optional(),
  maxOrders: z.number().min(0).optional(),
  city: z.string().optional(),
  hasCompany: z.boolean().optional(),
  companyId: z.string().optional(),
  customer_group_id: z.string().optional(),
  sortBy: z.enum(["created_at", "email", "first_name", "last_name", "orders", "total_spent"]).default("created_at"),
  sortOrder: z.enum(["ASC", "DESC"]).default("DESC"),
  includeCompany: z.boolean().default(false),
  includeOrders: z.boolean().default(false),
})

export async function getCompanyCustomers(
  params: CustomerFilters = {}
): Promise<{ success: boolean; data?: CustomerListResponse; error?: string }> {
  try {
    // Validate parameters
    const validatedParams = GetCustomersSchema.parse({
      page: params.page || 1,
      limit: params.limit || 20,
      search: params.search,
      status: params.status,
      group: params.group,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      minSpent: params.minSpent,
      maxSpent: params.maxSpent,
      minOrders: params.minOrders,
      maxOrders: params.maxOrders,
      city: params.city,
      hasCompany: params.hasCompany,
      companyId: params.companyId,
      customer_group_id: params.customer_group_id,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      includeCompany: params.includeCompany,
      includeOrders: params.includeOrders,
    })

    const authHeaders = await getAuthHeaders()
    if (!authHeaders) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Build query parameters
    const queryParams: Record<string, any> = {
      limit: validatedParams.limit,
      offset: (validatedParams.page - 1) * validatedParams.limit,
      fields: "*",
    }

    // Add sorting
    if (validatedParams.sortBy) {
      queryParams.order = `${validatedParams.sortBy}:${validatedParams.sortOrder.toLowerCase()}`
    }

    // Add search
    if (validatedParams.search) {
      queryParams.q = validatedParams.search
    }

    // Add company filter
    if (validatedParams.companyId) {
      queryParams.company_id = validatedParams.companyId
    }

        // Add company filter
    if (validatedParams.customer_group_id) {
      queryParams.customer_group_id = validatedParams.customer_group_id
    }

    // Add date range filters
    if (validatedParams.dateFrom) {
      queryParams.created_at = { $gte: validatedParams.dateFrom.toISOString() }
    }
    if (validatedParams.dateTo) {
      queryParams.created_at = { 
        ...queryParams.created_at,
        $lte: validatedParams.dateTo.toISOString() 
      }
    }

    // Add customer group filter
    if (validatedParams.group) {
      queryParams.groups = { $in: [validatedParams.group] }
    }

    // Build expand fields
    const expand: string[] = []
    if (validatedParams.includeCompany) {
      expand.push("company")
    }
    if (validatedParams.includeOrders) {
      expand.push("orders")
    }
    if (expand.length > 0) {
      queryParams.expand = expand.join(",")
    }

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
      tags: [await getCacheTag("customers-list")],
    }

    // Fetch customers from Medusa
    const response = await sdk.client.fetch(`/dashboard/company/customers`, {
      method: "GET",
      query: queryParams,
      headers,
      next,
    })

    let customers = response.customers || []
    let total = response.count || 0




    // Apply pagination after filtering
    const start = (validatedParams.page - 1) * validatedParams.limit
    const end = start + validatedParams.limit
    const paginatedCustomers = customers.slice(start, end)

    const totalPages = Math.ceil(total / validatedParams.limit)
    return {
      success: true,
      data: {
        customers: paginatedCustomers,
        total,
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalPages,
        filters: validatedParams,
      },
    }
  } catch (error) {
    console.error("Error in getCustomers:", error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid parameters: ${error.errors.map(e => e.message).join(", ")}`,
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customers",
    }
  }
}