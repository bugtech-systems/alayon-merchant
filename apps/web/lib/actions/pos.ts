"use server";

import { sdk } from "@/lib/config";
import { getAuthHeaders, getCacheHeaders, getCacheOptions } from "@/lib/data/cookies";
import { revalidateTag } from "next/cache";

export interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  thumbnail: string | null;
  images?: { url: string }[];
  variants: MedusaProductVariant[];
  categories?: MedusaProductCategory[];
  is_giftcard: boolean;
  discountable: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MedusaProductVariant {
  id: string;
  title: string;
  sku: string | null;
  prices: MedusaPrice[];
  inventory_quantity: number;
  allow_backorder: boolean;
  manage_inventory: boolean;
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
  };
}

export interface MedusaPrice {
  id: string;
  amount: number;
  currency_code: string;
  price_list_id: string | null;
}

export interface MedusaProductCategory {
  id: string;
  name: string;
  description: string | null;
  handle: string;
  parent_category_id: string | null;
  parent_category?: MedusaProductCategory;
  category_children?: MedusaProductCategory[];
}

export interface MedusaCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  has_account: boolean;
  created_at: string;
}

export async function listCategories(): Promise<MedusaProductCategory[]> {
  try {
    const { product_categories } = await sdk.store.category.list(
      {},
      {
        ...(await getAuthHeaders()),
        ...(await getCacheHeaders("categories")),
        next: { tags: ["categories"] },
      }
    );
    return product_categories as MedusaProductCategory[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function listProducts({
  page = 1,
  limit = 24,
  categoryId,
  search,
  sortBy = "created_at",
  regionId,
}: {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  sortBy?: "created_at" | "title" | "price";
  regionId?: string;
}) {
  const offset = (page - 1) * limit;
  
  try {
    const query: any = {
      limit,
      offset,
      fields: "*variants.calculated_price",
    };
    
    if (categoryId && categoryId !== "all") {
      query.category_id = [categoryId];
    }
    
    if (search) {
      query.q = search;
    }
    
    if (sortBy === "title") {
      query.order = "title";
    } else if (sortBy === "price") {
      query.order = "variants.prices.amount";
    }
    
    if (regionId) {
      query.region_id = regionId;
    }
    
    const headers = await getAuthHeaders();
    
    const { products, count } = await sdk.client.fetch<{ products: MedusaProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query,
        headers,
        next: { tags: ["products"] },
      }
    );
    
    return {
      products,
      count,
      hasMore: count > offset + limit,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], count: 0, hasMore: false };
  }
}

export async function listCustomers(searchTerm?: string): Promise<MedusaCustomer[]> {
  try {
    const query: any = { limit: 50 };
    if (searchTerm) {
      query.q = searchTerm;
    }
    
    const { customers } = await sdk.admin.customer.list(query, {
      ...(await getAuthHeaders()),
      next: { tags: ["customers"] },
    });
    
    return customers as MedusaCustomer[];
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

export async function createCustomer(data: {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}): Promise<MedusaCustomer | null> {
  try {
    const { customer } = await sdk.admin.customer.create(data, {
      ...(await getAuthHeaders()),
    });
    
    revalidateTag("customers");
    return customer as MedusaCustomer;
  } catch (error) {
    console.error("Error creating customer:", error);
    return null;
  }
}

export async function createOrder(orderData: any) {
  try {
    const { order } = await sdk.admin.order.create(orderData, {
      ...(await getAuthHeaders()),
    });
    
    revalidateTag("orders");
    return order;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
}