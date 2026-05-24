// hooks/useN8nQuery.ts
import { getAuthHeaders } from "@/lib/data/cookies";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE + '/webhook' ||
  "https://n8n.sharewin.pro/webhook";

const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

type QueryOptions = {
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, string>;

  // backward compatibility
  widget?: any;
  filters?: Record<string, any>;

  enabled?: boolean;
  refetchInterval?: number;
};

type MutationOptions = {
  endpoint: string;
  method?: "POST" | "PUT" | "DELETE";
  params?: Record<string, any>;
  body?: Record<string, any>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
};

type BulkDeleteOptions = {
  endpoint: string;
  ids: (string | number)[];
  concurrency?: number;
  onProgress?: (processed: number, total: number, successful: number, failed: number) => void;
};

type BulkUpdateOptions = {
  endpoint: string;
  ids: (string | number)[];
  data: Record<string, any>;
};

function buildURL(endpoint: string, params?: Record<string, any>) {
  const url = new URL(endpoint, BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function n8nFetcher<T = any>({
  endpoint,
  method = "GET",
  params,
  body = {},
  headers,
}: QueryOptions): Promise<T> {
  if (!endpoint) throw new Error("Missing endpoint");
  
  const url =
    method === "GET"
      ? buildURL(endpoint, params)
      : new URL(endpoint, BASE_URL).toString();

  const authHeaders = await getAuthHeaders();

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUB_KEY,
      ...authHeaders,
      ...headers,
    },
    body: method !== "GET" ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`n8n error: ${res.status} - ${errorText}`);
  }
  
  const json = await res.json();
  return Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : json.data ?? json;
}

// Helper for bulk delete with concurrency
async function bulkDeleteItems({
  endpoint,
  ids,
  concurrency = 5,
  onProgress,
}: BulkDeleteOptions): Promise<{
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ id: string | number; error: string }>;
  failedIds: (string | number)[];
  message?: string;
}> {
  const results = {
    success: true,
    totalProcessed: ids.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ id: string | number; error: string }>,
    failedIds: [] as (string | number)[],
  };

  if (!ids.length) {
    results.success = false;
    return { ...results, message: "No IDs provided for bulk delete" };
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Process in chunks with concurrency
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (id) => {
      try {
        await n8nFetcher({
          endpoint: `${endpoint}/${id}`,
          method: "DELETE",
        });
        return { id, success: true, error: null };
      } catch (error: any) {
        return { id, success: false, error: error.message };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    
    for (const result of chunkResults) {
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({ id: result.id, error: result.error || "Unknown error" });
        results.failedIds.push(result.id);
      }
    }

    if (onProgress) {
      onProgress(results.successful + results.failed, results.totalProcessed, results.successful, results.failed);
    }

    // Small delay between chunks to prevent rate limiting
    if (i + concurrency < ids.length) {
      await delay(300);
    }
  }

  results.success = results.failed === 0;
  results.message = `Deleted ${results.successful} out of ${results.totalProcessed} items`;
  if (results.failed > 0) {
    results.message += `. Failed: ${results.failed}`;
  }

  return results;
}

// Main hook
export function useN8nQuery<T = any>(options: QueryOptions) {
  const {
    endpoint,
    method,
    params,
    body,
    headers,
    widget,
    filters,
    enabled,
    refetchInterval,
  } = options;

  // 🔁 backward compatibility layer
  let finalEndpoint = endpoint;
  let finalParams = params as any;

  if (widget) {
    finalEndpoint = widget.webhook.url;
    finalParams = {};
    Object.entries(widget.webhook.queryMap || {}).forEach(
      ([filterKey, queryKey]: any) => {
        const value = filters?.[filterKey];
        if (value != null) {
          finalParams[queryKey] = value;
        }
      }
    );
  }

  return useQuery<T>({
    queryKey: [finalEndpoint, finalParams, method],
    queryFn: () =>
      n8nFetcher({
        endpoint: finalEndpoint,
        method: method || "GET",
        params: finalParams,
        body,
        headers,
      }),
    enabled: enabled !== false && !!finalEndpoint,
    refetchInterval,
    staleTime: 60 * 1000,
  });
}

// Mutation hook for POST/PUT/DELETE operations
export function useN8nMutation<T = any>(options: MutationOptions) {
  const queryClient = useQueryClient();
  const { endpoint, method = "POST", params, body, onSuccess, onError } = options;

  return useMutation({
    mutationFn: async () => {
      return n8nFetcher<T>({
        endpoint,
        method,
        params,
        body,
      });
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [endpoint.split("/")[0]] });
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      onError?.(error);
    },
  });
}

// Specialized hook for bulk delete
export function useN8nBulkDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ endpoint, ids, concurrency, onProgress }: BulkDeleteOptions) => {
      return bulkDeleteItems({ endpoint, ids, concurrency, onProgress });
    },
    onSuccess: (data, variables) => {
      // Invalidate queries for the endpoint
      queryClient.invalidateQueries({ queryKey: [variables.endpoint.split("/")[0]] });
    },
  });
}

// Specialized hook for bulk update
export function useN8nBulkUpdate<T = any>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ endpoint, ids, data }: BulkUpdateOptions) => {
      return n8nFetcher<T>({
        endpoint: `${endpoint}/bulk`,
        method: "POST",
        body: { ids, ...data },
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.endpoint.split("/")[0]] });
    },
  });
}

// Customer-specific hooks for your table
export function useCustomers(params?: Record<string, any>) {
  return useN8nQuery<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    endpoint: "/webhook/customers",
    method: "GET",
    params,
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string | number) => {
      return n8nFetcher({
        endpoint: `/customers/${id}`,
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/customers"] });
    },
  });
}

export function useBulkDeleteCustomers() {
  return useN8nBulkDelete();
}

export function useBulkUpdateCustomerStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: (string | number)[]; status: string }) => {
      return n8nFetcher({
        endpoint: "/customers/bulk-update-status",
        method: "POST",
        body: { customerIds: ids, status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/customers"] });
    },
  });
}

export function useBulkUpdateCustomerBilling() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, billingStatus }: { ids: (string | number)[]; billingStatus: string }) => {
      return n8nFetcher({
        endpoint: "/customers/bulk-update-billing",
        method: "POST",
        body: { customerIds: ids, billingStatus },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/customers"] });
    },
  });
}

export function useUpdateCustomerStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string | number; status: string }) => {
      return n8nFetcher({
        endpoint: `/customers/${id}/status`,
        method: "PUT",
        body: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/customers"] });
    },
  });
}

export function useCustomersStats() {
  return useN8nQuery<{
    total: number;
    active: number;
    inactive: number;
    subscribed: number;
    newThisMonth: number;
  }>({
    endpoint: "/webhook/get-customers-stats",
    method: "GET",
  });
}


// hooks/useN8nQuery.ts - Add this hook

export function useCustomersExport() {
  return useMutation({
    mutationFn: async (filters?: Record<string, any>) => {
      const response = await n8nFetcher({
        endpoint: "/webhook/export-customers",
        method: "GET",
        params: filters,
      });
      return response;
    },
  });
}