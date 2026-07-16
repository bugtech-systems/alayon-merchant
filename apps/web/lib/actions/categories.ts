// data/categories-mutations.ts
import { getAdminClient, sdk } from "../config"; // this should be your admin SDK instance

export async function createCategory(payload: {
  name: string;
  handle?: string;
  description?: string;
  is_active?: boolean;
  is_internal?: boolean;
  parent_category_id?: string;
  metadata?: Record<string, any>;
}) {
  const { product_category } = await  sdk.admin.productCategory.create(payload);
  return product_category;
}

export async function updateCategory(
  id: string,
  payload: {
    name?: string;
    handle?: string;
    rank?: any;
    description?: string;
    is_active?: boolean;
    is_internal?: boolean;
    parent_category_id?: string | null;
    metadata?: Record<string, any>;
  }
) {
  const { product_category } = await sdk.admin.productCategory.update(id, payload);
  return product_category;
}

export async function deleteCategory(id: string) {
  const resp = await sdk.admin.productCategory.delete(id);
  return resp;
}