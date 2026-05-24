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
