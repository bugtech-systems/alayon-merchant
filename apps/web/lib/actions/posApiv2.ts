// lib/actions/posApiv2-actions.ts
"use server";

import { sdk } from "@/lib/config";
import { getAuthHeaders } from "@/lib/data/cookies";
import { revalidateTag } from "next/cache";

// Types
export interface DraftOrderItem {
  variant_id: string;
  quantity: number;
  title?: string;
  unit_price?: number;
  notes?: string;
}

export interface CreateDraftOrderParams {
  email: string;
  region_id: string;
  items: DraftOrderItem[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  table_ids?: string[];
  table_names?: string[];
  notes?: string;
  metadata?: Record<string, any>;
  sales_channel_id?: string;
  is_offline?: boolean;
}

// ============================================================================
// SERVER ACTIONS (must be async functions)
// ============================================================================

export async function createDraftOrder(params: CreateDraftOrderParams) {
  try {
    const headers = await getAuthHeaders();
    
    const requestBody: any = {
      email: params.email,
      region_id: params.region_id,
      items: params.items.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        metadata: {
          title: item.title,
          unit_price: item.unit_price,
          notes: item.notes,
        },
      })),
      metadata: {
        customer_name: params.customer_name,
        customer_email: params.customer_email,
        customer_phone: params.customer_phone,
        table_ids: params.table_ids || [],
        table_names: params.table_names || [],
        notes: params.notes,
        is_offline: params.is_offline || false,
        ...params.metadata,
      },
    };

    if (params.sales_channel_id) {
      requestBody.sales_channel_id = params.sales_channel_id;
    }

    const response = await sdk.client.fetch("/dashboard/draft-orders", {
      method: "POST",
      headers,
      body: requestBody,
    });

    revalidateTag("draft-orders","max");
    return response;
  } catch (error: any) {
    console.error("Error creating draft order:", error);
    throw new Error(error.message || "Failed to create draft order");
  }
}

export async function getDraftOrder(draftId: string) {
  try {
    const headers = await getAuthHeaders();
    const response = await sdk.client.fetch(`/admin/draft-orders/${draftId}`, {
      method: "GET",
      headers,
    });
    return response;
  } catch (error: any) {
    console.error("Error fetching draft order:", error);
    throw new Error(error.message || "Failed to fetch draft order");
  }
}

export async function updateDraftOrder(params: {
  draft_id: string;
  items?: DraftOrderItem[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  table_ids?: string[];
  table_names?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const headers = await getAuthHeaders();
    
    const updateData: any = {};
    
    if (params.customer_name) {
      updateData.metadata = {
        ...updateData.metadata,
        customer_name: params.customer_name,
        customer_email: params.customer_email,
        customer_phone: params.customer_phone,
      };
    }
    
    if (params.table_ids) {
      updateData.metadata = {
        ...updateData.metadata,
        table_ids: params.table_ids,
        table_names: params.table_names,
      };
    }
    
    if (params.notes) {
      updateData.metadata = {
        ...updateData.metadata,
        notes: params.notes,
      };
    }
    
    if (params.metadata) {
      updateData.metadata = {
        ...updateData.metadata,
        ...params.metadata,
      };
    }

    if (params.items && params.items.length > 0) {
      updateData.items = params.items.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        metadata: {
          title: item.title,
          unit_price: item.unit_price,
          notes: item.notes,
        },
      }));
    }

    const response = await sdk.client.fetch(`/admin/draft-orders/${params.draft_id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(updateData),
    });

    revalidateTag(`draft-order-${params.draft_id}`,"max");
    revalidateTag("draft-orders","max");
    
    return response;
  } catch (error: any) {
    console.error("Error updating draft order:", error);
    throw new Error(error.message || "Failed to update draft order");
  }
}

export async function addDraftOrderLineItem(params: {
  draft_id: string;
  variant_id: string;
  quantity: number;
  metadata?: Record<string, any>;
}) {
  try {
    const headers = await getAuthHeaders();
    
    const response = await sdk.client.fetch(`/admin/draft-orders/${params.draft_id}/line-items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        variant_id: params.variant_id,
        quantity: params.quantity,
        metadata: params.metadata,
      }),
    });

    revalidateTag(`draft-order-${params.draft_id}`,"max");
    revalidateTag("draft-orders","max");
    
    return response;
  } catch (error: any) {
    console.error("Error adding line item:", error);
    throw new Error(error.message || "Failed to add line item");
  }
}

export async function updateDraftOrderLineItem(params: {
  draft_id: string;
  line_item_id: string;
  quantity: number;
  metadata?: Record<string, any>;
}) {
  try {
    const headers = await getAuthHeaders();
    
    const response = await sdk.client.fetch(
      `/admin/draft-orders/${params.draft_id}/line-items/${params.line_item_id}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          quantity: params.quantity,
          metadata: params.metadata,
        }),
      }
    );

    revalidateTag(`draft-order-${params.draft_id}`,"max");
    revalidateTag("draft-orders","max");
    
    return response;
  } catch (error: any) {
    console.error("Error updating line item:", error);
    throw new Error(error.message || "Failed to update line item");
  }
}

export async function removeDraftOrderLineItem(draftId: string, lineItemId: string) {
  try {
    const headers = await getAuthHeaders();
    
    await sdk.client.fetch(`/admin/draft-orders/${draftId}/line-items/${lineItemId}`, {
      method: "DELETE",
      headers,
    });

    revalidateTag(`draft-order-${draftId}`,"max");
    revalidateTag("draft-orders","max");
  } catch (error: any) {
    console.error("Error removing line item:", error);
    throw new Error(error.message || "Failed to remove line item");
  }
}

export async function completeDraftOrder(
  draftId: string,
  paymentMethod: "cash" | "card" | "qr_code" = "cash"
) {
  try {
    const headers = await getAuthHeaders();
    
    const response = await sdk.client.fetch(`/admin/draft-orders/${draftId}/complete`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        payment_method: paymentMethod,
        metadata: {
          completed_at: new Date().toISOString(),
          payment_method: paymentMethod,
        },
      }),
    });

    revalidateTag(`draft-order-${draftId}`,"max");
    revalidateTag("draft-orders","max");
    revalidateTag("orders","max");
    
    return response;
  } catch (error: any) {
    console.error("Error completing draft order:", error);
    throw new Error(error.message || "Failed to complete draft order");
  }
}

export async function deleteDraftOrder(draftId: string) {
  try {
    const headers = await getAuthHeaders();
    
    await sdk.client.fetch(`/admin/draft-orders/${draftId}`, {
      method: "DELETE",
      headers,
    });

    revalidateTag("draft-orders","max");
  } catch (error: any) {
    console.error("Error deleting draft order:", error);
    throw new Error(error.message || "Failed to delete draft order");
  }
}