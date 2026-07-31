"use server"

import { sdk } from "@/lib/config";
import medusaError from "@/lib/medusa/util/medusa-error"
import { B2BCustomer } from "@/types/global"
import { HttpTypes } from "@medusajs/types"
import { track } from "@vercel/analytics/server"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { retrieveCart, updateCart } from "./cart"
import { createCompany, createEmployee } from "./companies"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "../data/cookies"
import { n8nFetcher } from "@/hooks/useN8nQuery"

export const retrieveCustomer = async (): Promise<B2BCustomer | null> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders) return null

  const headers = {
    ...authHeaders,
  }

  const next = {
    ...(await getCacheOptions("customers")),
  }



  return await sdk.client.fetch(`/store/customers/me`, {
      method: "GET",
      query: {
        // fields: "",
      },
      headers,
      next,
    })
    .then(({ customer }) => customer as B2BCustomer)
    .catch(() => null)
}


export const retrieveCustomerPhone = async (phone: any): Promise<B2BCustomer | null> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders) return null

  const headers = {
    ...authHeaders,
  }

  const next = {
    ...(await getCacheOptions("customers")),
  }



  return await sdk.client
    .fetch<{ customer: B2BCustomer }>(`/store/customers/phone`, {
      method: "GET",
      query: {
          phone
        // fields: "",
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

  return updateRes
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
    company_name: formData.get("company_name") as string,
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    const customHeaders = { authorization: `Bearer ${token}` }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      customHeaders
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    setAuthToken(loginToken as string)

    const companyForm = {
      name: formData.get("company_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("company_phone") as string,
      address: formData.get("company_address") as string,
      city: formData.get("company_city") as string,
      state: formData.get("company_state") as string,
      zip: formData.get("company_zip") as string,
      country: formData.get("company_country") as string,
      currency_code: formData.get("currency_code") as string,
    }

    const createdCompany = await createCompany(companyForm)

    const createdEmployee = await createEmployee({
      company_id: createdCompany?.id as string,
      customer_id: createdCustomer.id,
      is_admin: true,
      spending_limit: 0,
    }).catch((err) => {
      console.log("error creating employee", err)
    })

    const cacheTag = await getCacheTag("customers")
    revalidateTag(cacheTag)

    await transferCart()

    return {
      customer: createdCustomer,
      company: createdCompany,
      employee: createdEmployee,
    }
  } catch (error: any) {
    console.log("error", error)
    return error.toString()
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth
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

        revalidateTag(customerCacheTag, 'max')

        const customer = await retrieveCustomer()
        const cart = await retrieveCart()

        
        console.log(customer, 'CUSTOMERR')
        if (customer?.employee?.company_id) {
          await updateCart({
            metadata: {
              ...cart?.metadata,
              company_id: customer.employee.company_id,
            },
          })
        }

        revalidateTag(productsCacheTag, 'max')
        revalidateTag(cartsCacheTag, 'max')
      })
  } catch (error: any) {
    return error.toString()
  }

  try {
    await transferCart()
  } catch (error: any) {
    return error.toString()
  }
}

export async function signout(countryCode: string, customerId: string) {
  await sdk.auth.logout()
  removeAuthToken()
  track("customer_logged_out")

  // remove next line if want the cart to persist after logout
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

  redirect(`/account`)
}


export async function register(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()

    return createdCustomer
  } catch (error: any) {
    return error.toString()
  }
}


export async function transferCart() {
  const cartId = await getCartId()
  console.log(cartId, 'CAAAAARTT')
  if (!cartId) {
    return
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")

  revalidateTag(cartCacheTag, "max")
  return;
}


export async function assignCustomerToCart(id: any, customer: any) {
  const cartId = id || await getCartId();
  if (!cartId || !customer) {
    return
  }



  await sdk.client.fetch(
      `/dashboard/carts/${cartId}/customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: {
          customer_id: customer.id,
        }
      }
    );
    

  const cartCacheTag = await getCacheTag("cart")

  revalidateTag(cartCacheTag, "max")
  return;
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
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const saveCustomerToList = async (phone: any) => {
    let newCustomer = await n8nFetcher({endpoint: '/webhook/customer-phone', method: "POST", body: {phone}})
    return newCustomer
}

export const listCustomerGroupCustomers = async (groupId: any) => {


  const headers = {
    ...(await getAuthHeaders()),
  }

     return await sdk.client.fetch(`/dashboard/customers?customer_group_id=${groupId}`, {
        method: "GET",
        headers,
      });
}



export const listCustomers = async (params: any = {}): Promise<any> => {
  const headers = await getAuthHeaders()
  
  // Build query string
  const queryParams = new URLSearchParams()
  
  if (params.search) queryParams.append('search', params.search)
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.offset) queryParams.append('offset', params.offset.toString())
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.order) queryParams.append('order', params.order)
  if (params.email) queryParams.append('email', params.email)
  if (params.phone) queryParams.append('phone', params.phone)
  if (params.first_name) queryParams.append('first_name', params.first_name)
  if (params.last_name) queryParams.append('last_name', params.last_name)
  if (params.company_name) queryParams.append('company_name', params.company_name)
  if (params.has_account !== undefined) queryParams.append('has_account', params.has_account.toString())
  if (params.customer_group_id) queryParams.append('customer_group_id', params.customer_group_id)
  if (params.created_at_start) queryParams.append('created_at_start', params.created_at_start)
  if (params.created_at_end) queryParams.append('created_at_end', params.created_at_end)
  if (params.include_addresses) queryParams.append('include_addresses', 'true')
  if (params.include_groups) queryParams.append('include_groups', 'true')
  if (params.include_orders) queryParams.append('include_orders', 'true')
  
  const queryString = queryParams.toString()
  const url = `/dashboard/customers${queryString ? `?${queryString}` : ''}`
  
  return await sdk.client.fetch(url, {
    method: "GET",
    headers,
  })
}


// Get single customer by ID
export const getCustomer = async (customerId: string): Promise<{ success: boolean; data: Customer }> => {
  const headers = await getAuthHeaders()
  
  return await sdk.client.fetch(`/dashboard/customers/${customerId}`, {
    method: "GET",
    headers,
  })
}


export interface ListCustomersWithOrdersParams {
  limit?: number;
  offset?: number;
  search?: string;
  company_id?: string;
  customer_group_id?: string;
  has_account?: string;
  sort_field?: string;
  sort_order?: "ASC" | "DESC";
}

export interface CustomerWithOrders {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  has_account: boolean;
  groups: Array<{
    id: string;
    name: string;
  }>;
  latest_order: any | null;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_at: string | null;
  customer_summary: {
    total_orders: number;
    total_spent: number;
    average_order_value: number;
    last_order_date: string | null;
  };
}

export interface ListCustomersWithOrdersResponse {
  customers: CustomerWithOrders[];
  count: number;
  limit: number;
  offset: number;
  meta: {
    total_customers: number;
    active_customers: number;
    total_revenue: number;
    filters: any;
    sort: any;
  };
}

export async function listCustomersWithOrders(
  params: ListCustomersWithOrdersParams = {}
): Promise<ListCustomersWithOrdersResponse> {
  try {
    const headers = await getAuthHeaders();
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.offset) queryParams.append("offset", params.offset.toString());
    // if (params.search) queryParams.append("search", params.search);
    if (params.company_id) queryParams.append("company_id", params.company_id);
    if (params.customer_group_id) queryParams.append("customer_group_id", params.customer_group_id);
    // if (params.has_account) queryParams.append("has_account", params.has_account);
    if (params.sort_field) queryParams.append("sort_field", params.sort_field);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const url = `/dashboard/drivers/customers-order?${queryParams.toString()}`;
    
    const response = await sdk.client.fetch(url, {
      method: "GET",
      headers,
    });

    
    console.log(response, "RESSPP", url)
    return response;
  } catch (error) {
    console.error("Error fetching customers with orders:", error);
    throw new Error("Failed to fetch customers");
  }
}

// Fetch single customer with orders
export async function getCustomerWithOrders(customerId: string): Promise<CustomerWithOrders | null> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await sdk.client.fetch(`/admin/customers-with-orders/${customerId}`, {
      method: "GET",
      headers,
    });

    if (!response.customer) {
      return null;
    }

    return response.customer;
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:`, error);
    return null;
  }
}