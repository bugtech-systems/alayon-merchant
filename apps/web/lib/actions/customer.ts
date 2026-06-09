"use server"

import { sdk } from "@/lib/config"
import medusaError from "@/lib/medusa/util/medusa-error"
import { B2BCustomer } from "@/types/global"
import { HttpTypes } from "@medusajs/types"
import { track } from "@vercel/analytics/server"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getCustomerGroupId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "@/lib/data/cookies"
import { z } from "zod"

const BASE_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "https://api.sharewin.pro";

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
  limit: z.number().min(1).max(100).default(20),
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
  sortBy: z.enum(["created_at", "email", "first_name", "last_name", "orders", "total_spent"]).default("created_at"),
  sortOrder: z.enum(["ASC", "DESC"]).default("DESC"),
  includeCompany: z.boolean().default(false),
  includeOrders: z.boolean().default(false),
})

/**
 * Get customers with filtering, sorting, and pagination
 */
export async function getCustomers(
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
    const response = await sdk.client.fetch<{
      customers: B2BCustomer[]
      count: number
      offset: number
      limit: number
    }>(`/dashboard/customers`, {
      method: "GET",
      query: queryParams,
      headers,
      next,
    })

    let customers = response.customers || []
    let total = response.count || 0

    // Apply additional filters that can't be done via API
    if (validatedParams.minSpent || validatedParams.maxSpent || 
        validatedParams.minOrders || validatedParams.maxOrders || 
        validatedParams.city || validatedParams.hasCompany !== undefined) {
      
      customers = customers.filter(customer => {
        let matches = true

        // Filter by total spent
        if (validatedParams.minSpent !== undefined) {
          const totalSpent = customer.metadata?.total_spent as number || 0
          if (totalSpent < validatedParams.minSpent) matches = false
        }
        if (matches && validatedParams.maxSpent !== undefined) {
          const totalSpent = customer.metadata?.total_spent as number || 0
          if (totalSpent > validatedParams.maxSpent) matches = false
        }

        // Filter by order count
        if (matches && validatedParams.minOrders !== undefined) {
          const orderCount = customer.metadata?.order_count as number || 0
          if (orderCount < validatedParams.minOrders) matches = false
        }
        if (matches && validatedParams.maxOrders !== undefined) {
          const orderCount = customer.metadata?.order_count as number || 0
          if (orderCount > validatedParams.maxOrders) matches = false
        }

        // Filter by city
        if (matches && validatedParams.city) {
          const customerCity = customer.metadata?.city as string || ""
          if (!customerCity.toLowerCase().includes(validatedParams.city.toLowerCase())) {
            matches = false
          }
        }

        // Filter by company association
        if (matches && validatedParams.hasCompany !== undefined) {
          const hasCompany = !!customer.metadata?.company_id
          if (hasCompany !== validatedParams.hasCompany) matches = false
        }

        return matches
      })

      total = customers.length
    }

    // Apply sorting for fields not supported by API
    if (validatedParams.sortBy === "total_spent" || 
        validatedParams.sortBy === "orders") {
      customers.sort((a, b) => {
        let aValue = 0
        let bValue = 0
        
        if (validatedParams.sortBy === "total_spent") {
          aValue = a.metadata?.total_spent as number || 0
          bValue = b.metadata?.total_spent as number || 0
        } else if (validatedParams.sortBy === "orders") {
          aValue = a.metadata?.order_count as number || 0
          bValue = b.metadata?.order_count as number || 0
        }
        
        return validatedParams.sortOrder === "DESC" 
          ? bValue - aValue 
          : aValue - bValue
      })
    }

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

/**
 * Get customer by ID with optional relations
 */
export async function getCustomerById(
  id: string,
  includeOrders: boolean = false,
  includeCompany: boolean = false
): Promise<{ success: boolean; data?: B2BCustomer; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders()
    if (!authHeaders) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    const expand: string[] = []
    if (includeOrders) expand.push("orders")
    if (includeCompany) expand.push("company")

    const queryParams: Record<string, any> = {}
    if (expand.length > 0) {
      queryParams.expand = expand.join(",")
    }

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
      tags: [await getCacheTag(`customer-${id}`)],
    }

    const { customer } = await sdk.client.fetch<{ customer: B2BCustomer }>(
      `/store/customers/${id}`,
      {
        method: "GET",
        query: queryParams,
        headers,
        next,
      }
    )

    return {
      success: true,
      data: customer,
    }
  } catch (error) {
    console.error("Error in getCustomerById:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customer",
    }
  }
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(
  companyId?: string
): Promise<{ success: boolean; data?: CustomerStats; error?: string }> {
  try {
    const authHeaders = await getAuthHeaders()
    if (!authHeaders) {
      return {
        success: false,
        error: "Authentication required",
      }
    }

    // Fetch all customers (you might want to limit this for large datasets)
    const customersResult = await getCustomers({
      limit: 1000,
      companyId,
      includeOrders: true,
    })

    if (!customersResult.success || !customersResult.data) {
      return {
        success: false,
        error: customersResult.error || "Failed to fetch customers",
      }
    }

    const customers = customersResult.data.customers
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Calculate statistics
    const stats: CustomerStats = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.metadata?.status === "active").length,
      newCustomersThisMonth: customers.filter(c => 
        c.created_at && new Date(c.created_at) >= startOfMonth
      ).length,
      averageOrderValue: 0,
      totalRevenue: 0,
      topCities: [],
      customerSegments: [],
    }

    // Calculate revenue and order metrics
    let totalOrders = 0
    let totalRevenue = 0
    const cityMap = new Map<string, number>()
    const segmentMap = new Map<string, number>()

    customers.forEach(customer => {
      const orderCount = customer.metadata?.order_count as number || 0
      const totalSpent = customer.metadata?.total_spent as number || 0
      const city = customer.metadata?.city as string || "Unknown"
      const segment = customer.metadata?.segment as string || "Regular"

      totalOrders += orderCount
      totalRevenue += totalSpent
      
      cityMap.set(city, (cityMap.get(city) || 0) + 1)
      segmentMap.set(segment, (segmentMap.get(segment) || 0) + 1)
    })

    stats.averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    stats.totalRevenue = totalRevenue
    
    stats.topCities = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    stats.customerSegments = Array.from(segmentMap.entries())
      .map(([segment, count]) => ({ segment, count }))

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    console.error("Error in getCustomerStats:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customer stats",
    }
  }
}

/**
 * Search customers by various criteria
 */
export async function searchCustomers(
  query: string,
  limit: number = 10
): Promise<{ success: boolean; data?: B2BCustomer[]; error?: string }> {
  try {
    const result = await getCustomers({
      search: query,
      limit,
      page: 1,
      includeCompany: true,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      }
    }

    return {
      success: true,
      data: result.data?.customers || [],
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search customers",
    }
  }
}

/**
 * Get customers by group ID
 */
export async function getCustomersByGroup(
  groupId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ success: boolean; data?: CustomerListResponse; error?: string }> {
  return getCustomers({
    group: groupId,
    page,
    limit,
    includeCompany: true,
  })
}

/**
 * Get customers by company ID
 */
export async function getCustomersByCompany(
  companyId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ success: boolean; data?: CustomerListResponse; error?: string }> {
  return getCustomers({
    companyId,
    page,
    limit,
    includeCompany: true,
  })
}

/**
 * Get recent customers
 */
export async function getRecentCustomers(
  days: number = 30,
  limit: number = 10
): Promise<{ success: boolean; data?: B2BCustomer[]; error?: string }> {
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - days)

  const result = await getCustomers({
    dateFrom,
    sortBy: "created_at",
    sortOrder: "DESC",
    limit,
    page: 1,
  })

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    success: true,
    data: result.data?.customers || [],
  }
}

/**
 * Export customers to CSV
 */
export async function exportCustomers(
  filters?: CustomerFilters
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    // Fetch all customers matching filters
    const result = await getCustomers({
      ...filters,
      limit: 10000, // Max limit for export
      page: 1,
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch customers for export",
      }
    }

    const customers = result.data.customers

    // Convert to CSV
    const headers = [
      "ID",
      "Email",
      "First Name",
      "Last Name",
      "Phone",
      "Status",
      "Created At",
      "Total Spent",
      "Total Orders",
      "Last Order Date",
      "City",
      "Company",
    ]

    const rows = customers.map(customer => [
      customer.id,
      customer.email,
      customer.first_name || "",
      customer.last_name || "",
      customer.phone || "",
      customer.metadata?.status || "active",
      customer.created_at,
      customer.metadata?.total_spent || 0,
      customer.metadata?.order_count || 0,
      customer.metadata?.last_order_date || "",
      customer.metadata?.city || "",
      customer.metadata?.company_name || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    return {
      success: true,
      data: csvContent,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export customers",
    }
  }
}

// Keep existing functions below...
export const retrieveCustomer = async (): Promise<B2BCustomer | null> => {
  const authHeaders = await getAuthHeaders()
  if (!authHeaders) return null

  const headers = {
    ...authHeaders,
  }

  const next = {
    ...(await getCacheOptions("customers")),
  }

  return await sdk.client
    .fetch<{ customer: B2BCustomer }>(`/store/customers/me`, {
      method: "GET",
      query: {
        fields: "*orders",
      },
      headers,
      next,
    })
    .then(({ customer }) => customer as B2BCustomer)
    .catch(() => null)
}

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag, "max")
  revalidateTag("customers-list", "max")

  return updateRes
}

export async function signout(countryCode: string, customerId: string) {
  await sdk.auth.logout()
  removeAuthToken()
  track("customer_logged_out")

  await removeCartId()

  const [authCacheTag, customerCacheTag, productsCacheTag, cartsCacheTag] =
    await Promise.all([
      getCacheTag("auth"),
      getCacheTag("customers"),
      getCacheTag("products"),
      getCacheTag("carts"),
    ])

  revalidateTag(authCacheTag, "max")
  revalidateTag(customerCacheTag, "max")
  revalidateTag(productsCacheTag, "max")
  revalidateTag(cartsCacheTag, "max")

  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, "max")
}

export const addCustomerAddress = async (
  _currentState: unknown,
  formData: FormData
): Promise<any> => {
  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag, "max")
      revalidateTag("customers-list", "max")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag, "max")
      revalidateTag("customers-list", "max")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId = currentState.addressId as string

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const cacheTag = await getCacheTag("customers")
      revalidateTag(cacheTag, "max")
      revalidateTag("customers-list", "max")
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export async function createGuestCustomer(customerData: {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}) {
  try {
    const response = await fetch(`${BASE_URL}/store/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders())
      },
      body: JSON.stringify(customerData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create customer');
    }
    
    const { customer } = await response.json();
    revalidateTag("customers-list", "max")
    return customer;
  } catch (error) {
    console.error('Error creating guest customer:', error);
    return null;
  }
}

export async function createQuickCustomer(customerData: any) {
  try {
    let groupId = await getCustomerGroupId()
    let newData = {
       customer_group_id: groupId,
      ...customerData
    }

      const response = await sdk.client.fetch<{
          customer: any;
        }>(`/dashboard/customers`, {
          method: "POST",
          body: newData,
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeaders()),
          },
        });


    revalidateTag("customer", "max")
    return response?.data;
  } catch (error) {
    console.error('Error creating guest customer:', error);
    return null;
  }
}

/**
 * Update customer status
 */
export async function updateCustomerStatus(
  customerId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.customer.update(
      { 
        metadata: { status } 
      },
      { id: customerId },
      headers
    )

    revalidateTag(`customer-${customerId}`, "max")
    revalidateTag("customers-list", "max")

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update customer status",
    }
  }
}

/**
 * Bulk update customer statuses
 */
export async function bulkUpdateCustomerStatus(
  customerIds: string[],
  status: string
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    let updatedCount = 0
    const errors: string[] = []

    for (const customerId of customerIds) {
      try {
        await sdk.store.customer.update(
          { 
            metadata: { status } 
          },
          { id: customerId },
          headers
        )
        updatedCount++
      } catch (error) {
        errors.push(`Failed to update ${customerId}`)
      }
    }

    customerIds.forEach(id => revalidateTag(`customer-${id}`, "max"))
    revalidateTag("customers-list", "max")

    if (errors.length > 0) {
      return {
        success: false,
        error: `Failed to update ${errors.length} customers`,
        updatedCount,
      }
    }

    return { success: true, updatedCount }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to bulk update customers",
    }
  }
}


export async function bulkSendSms(data: any): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

        const response = await fetch(`${BASE_URL}/dashboard/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders())
      },
      body: JSON.stringify(data),
    });

    return { success: true, response }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to bulk update customers",
    }
  }
}


export async function deleteCustomer(id: string) {
  try {
      await sdk.client.fetch(`/dashboard/customers/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
      });
  
    revalidateTag("customer", "max");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
