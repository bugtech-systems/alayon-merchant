import { HttpTypes } from "@medusajs/types";
import { sdk } from "../config";
import { getAuthHeaders, getCacheHeaders } from "../data/cookies";

export async function listCategories(): Promise<
  HttpTypes.StoreProductCategory[]
> {
  const { product_categories } = await sdk.store.category.list(
    {},
    {
      ...(await getAuthHeaders()),
      ...(await getCacheHeaders("categories")),
    }
  );
  return product_categories as HttpTypes.StoreProductCategory[];
}

export const getCategoryByHandle = async (
  categoryHandle: string[]
): Promise<HttpTypes.StoreProductCategory> => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
      }
    )
    .then(({ product_categories }) => product_categories[0])
}