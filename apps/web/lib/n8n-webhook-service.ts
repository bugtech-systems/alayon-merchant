// lib/n8n.service.ts

interface WebhookResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface BulkDeleteResult {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ id: string | number; error: string }>;
  failedIds?: (string | number)[];
}

interface BulkDeleteOptions {
  endpoint: string;
  ids: (string | number)[];
  concurrency?: number; // Max parallel requests (default: 5)
  batchSize?: number;   // Chunk size for batched requests (default: 100)
  onProgress?: (processed: number, total: number, successful: number, failed: number) => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE || 'https://n8n.sharewin.pro/webhook';
const API_TOKEN = process.env.NEXT_PUBLIC_N8N_API_TOKEN;

async function n8nRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    params?: Record<string, any>;
  } = {}
): Promise<WebhookResponse<T>> {
  try {
    const url = new URL(`${BASE_URL}${endpoint}`);
    
    // Add query params
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.append(key, String(value));
      });
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;

    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json();
    
    if (!res.ok) return { success: false, error: data.message || 'Request failed' };
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Helper function to delete a single item
async function deleteSingleItem(endpoint: string, id: string | number): Promise<{ success: boolean; error?: string }> {
  const result = await n8nRequest(`${endpoint}/${id}`, { method: 'DELETE' });
  return { success: result.success, error: result.error };
}

// Helper for delayed execution (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Core bulk delete function
async function deleteBulk({
  endpoint,
  ids,
  concurrency = 5,
  batchSize = 100,
  onProgress,
}: BulkDeleteOptions): Promise<BulkDeleteResult> {
  const results: BulkDeleteResult = {
    success: true,
    totalProcessed: ids.length,
    successful: 0,
    failed: 0,
    errors: [],
    failedIds: [],
  };

  if (!ids.length) {
    results.success = false;
    results.error = 'No IDs provided for bulk delete';
    return results;
  }

  // Process in batches to avoid overwhelming the server
  const batches = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchPromises: Promise<{ id: string | number; success: boolean; error?: string }>[] = [];

    // Process items within batch with concurrency limit
    for (let i = 0; i < batch.length; i += concurrency) {
      const chunk = batch.slice(i, i + concurrency);
      const chunkPromises = chunk.map(id => 
        deleteSingleItem(endpoint, id).then(result => ({
          id,
          success: result.success,
          error: result.error,
        }))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      batchPromises.push(...chunkResults.map(r => Promise.resolve(r)));
      
      // Small delay between chunks to prevent rate limiting
      if (i + concurrency < batch.length) {
        await delay(100);
      }
    }

    const batchResults = await Promise.all(batchPromises);
    
    // Aggregate results
    for (const result of batchResults) {
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({ id: result.id, error: result.error || 'Unknown error' });
        results.failedIds?.push(result.id);
      }
    }

    // Report progress
    if (onProgress) {
      const processed = results.successful + results.failed;
      onProgress(processed, results.totalProcessed, results.successful, results.failed);
    }

    // Delay between batches
    if (batchIndex < batches.length - 1) {
      await delay(500);
    }
  }

  results.success = results.failed === 0;
  results.message = `Deleted ${results.successful} out of ${results.totalProcessed} items`;
  
  if (results.failed > 0) {
    results.message += `. Failed: ${results.failed}`;
  }

  return results;
}

// Export convenience methods with bulk delete support
export const n8n = {
  get: <T = any>(endpoint: string, params?: Record<string, any>) => 
    n8nRequest<T>(endpoint, { method: 'GET', params }),
  
  post: <T = any>(endpoint: string, body?: any) => 
    n8nRequest<T>(endpoint, { method: 'POST', body }),
  
  put: <T = any>(endpoint: string, body?: any) => 
    n8nRequest<T>(endpoint, { method: 'PUT', body }),
  
  delete: <T = any>(endpoint: string, params?: Record<string, any>) => 
    n8nRequest<T>(endpoint, { method: 'DELETE', params }),
  
  // Bulk delete items by IDs
  deleteBulk: async (
    endpoint: string, 
    ids: (string | number)[], 
    options?: Partial<Omit<BulkDeleteOptions, 'endpoint' | 'ids'>>
  ): Promise<BulkDeleteResult> => {
    return deleteBulk({
      endpoint,
      ids,
      concurrency: options?.concurrency || 5,
      batchSize: options?.batchSize || 100,
      onProgress: options?.onProgress,
    });
  },

  // Delete all items matching a filter (useful for cleanup)
  deleteAll: async (
    endpoint: string,
    listEndpoint?: string,
    listFilters?: Record<string, any>
  ): Promise<BulkDeleteResult> => {
    // First, get all IDs to delete
    const list = await n8n.get<{ data: Array<{ id: string | number }> }>(
      listEndpoint || endpoint,
      { limit: 999999, ...listFilters }
    );
    
    if (!list.success || !list.data?.data.length) {
      return {
        success: false,
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        errors: [{ id: 'all', error: list.error || 'No items found to delete' }],
        failedIds: [],
      };
    }
    
    const ids = list.data.data.map(item => item.id);
    return deleteBulk({ endpoint, ids });
  },
  
  // Paginated request helper (kept from original)
  paginated: async <T = any>(
    endpoint: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: Record<string, any>
  ) => {
    const res = await n8nRequest<{
      data: T[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(endpoint, { method: 'GET', params: { page, pageSize, ...filters } });
    
    if (!res.success) return res;
    
    return {
      success: true,
      data: {
        data: res.data!.data,
        total: res.data!.total,
        page: res.data!.page,
        pageSize: res.data!.pageSize,
        totalPages: res.data!.totalPages,
        hasNext: res.data!.page < res.data!.totalPages,
        hasPrevious: res.data!.page > 1,
      },
    };
  },
};