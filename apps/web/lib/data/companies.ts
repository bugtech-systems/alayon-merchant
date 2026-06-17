"use server"

import { sdk } from "@/lib/config"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
} from "@/lib/data/cookies"
import {
  StoreCompaniesResponse,
  StoreCompanyResponse,
  StoreCreateCompany,
  StoreCreateEmployee,
  StoreEmployeeResponse,
  StoreUpdateCompany,
  StoreUpdateEmployee,
} from "@/types"
import { track } from "@vercel/analytics/server"
import { revalidateTag } from "next/cache"
import { n8nFetcher } from "@/hooks/useN8nQuery"

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
          "+spending_limit_reset_frequency,*employees.customer,*approval_settings",
      },
      method: "GET",
      headers,
      next,
    }
  )

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
  }) as any
 
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

export const createEmployee = async (data: StoreCreateEmployee) => {
  const { company_id, ...employeeData } = data

  const headers = {
    ...(await getAuthHeaders()),
  }

  const employee = await sdk.client.fetch<StoreEmployeeResponse>(
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

export const getCompanyProducts = async (companyId: string) => {

        const response = await n8nFetcher({endpoint: `/webhook/get-company-products?company_id=${companyId}`})

        console.log(response,'rr')
        return response;
     
};

export const listCompanies = async (filter: any) => {
   const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...( await getCacheOptions("companies")),
  }


  const query = new URLSearchParams(filter).toString();

 let {companies} = await sdk.client.fetch(`/store/companies?${query}`, {
      method: "GET",
      headers,
      next
    }) as any;
      console.log(companies)
     return companies;
}
