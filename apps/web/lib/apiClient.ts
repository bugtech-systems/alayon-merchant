
// lib/apiClient.ts
import Medusa from "@medusajs/js-sdk";

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.NEXT_PUBLIC_MEDUSA_SECRET_KEY;

console.log('Medusa Client Config:', {
  backendUrl: BACKEND_URL,
  hasPublishableKey: !!PUBLISHABLE_KEY,
  hasSecretKey: !!SECRET_KEY,
});

// Create storefront client with correct Medusa v2 structure
export const storefrontClient = {
  variants: {
    retrieve: async (id: string) => {
      const response = await fetch(`${BACKEND_URL}/store/variants/${id}`, {
        headers: {
          'x-publishable-api-key': PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch variant: ${response.statusText}`);
      return response.json();
    },
    list: async (params?: any) => {
      const queryString = params ? new URLSearchParams(params).toString() : '';
      const response = await fetch(`${BACKEND_URL}/store/variants${queryString ? `?${queryString}` : ''}`, {
        headers: {
          'x-publishable-api-key': PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch variants: ${response.statusText}`);
      return response.json();
    },
  },
  carts: {
    create: async (data: any) => {
      const response = await fetch(`${BACKEND_URL}/store/carts`, {
        method: 'POST',
        headers: {
          'x-publishable-api-key': PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`Failed to create cart: ${response.statusText}`);
      return response.json();
    },
    retrieve: async (id: string) => {
      const response = await fetch(`${BACKEND_URL}/store/carts/${id}`, {
        headers: {
          'x-publishable-api-key': PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to retrieve cart: ${response.statusText}`);
      return response.json();
    },
    createLineItem: async (cartId: string, data: any) => {
      const response = await fetch(`${BACKEND_URL}/store/carts/${cartId}/line-items`, {
        method: 'POST',
        headers: {
          'x-publishable-api-key': PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`Failed to add line item: ${response.statusText}`);
      return response.json();
    },
    delete: async (id: string) => {
      const response = await fetch(`${BACKEND_URL}/store/carts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-publishable-api-key': PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to delete cart: ${response.statusText}`);
      return response.json();
    },
  },
};

// Admin client for authenticated requests
export const adminClient = {
  priceLists: {
    retrieve: async (id: string) => {
      const response = await fetch(`${BACKEND_URL}/admin/price-lists/${id}`, {
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch price list: ${response.statusText}`);
      return response.json();
    },
  },
  variants: {
    retrieve: async (id: string) => {
      const response = await fetch(`${BACKEND_URL}/admin/variants/${id}`, {
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch variant: ${response.statusText}`);
      return response.json();
    },
  },
  customers: {
    retrieve: async (id: string) => {
      const response = await fetch(`${BACKEND_URL}/admin/customers/${id}`, {
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch customer: ${response.statusText}`);
      return response.json();
    },
  },
};

// lib/apiClient.ts (updated adminFetch to handle array query params)
export const adminFetch = async (endpoint: string, options: RequestInit & { query?: Record<string, any> } = {}) => {
  const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const apiKey = process.env.NEXT_PUBLIC_MEDUSA_SECRET_KEY;
  console.log(options, 'OPTTIONS')
  // Build URL with query parameters
  let url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  if (options.query) {
    const params = new URLSearchParams();
    
    // Handle array parameters properly
    Object.entries(options.query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      
      if (Array.isArray(value)) {
        // Medusa v2 expects array params as key[]=value1&key[]=value2
        value.forEach(item => {
          if (item !== undefined && item !== null) {
            params.append(`${key}[]`, String(item));
          }
        });
      } else if (typeof value === 'object') {
        // Handle nested objects by converting to JSON string
        params.append(key, JSON.stringify(value));
      } else {
        params.append(key, String(value));
      }
    });
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers as Record<string, string>,
  };
  
  // Add authorization if API key exists
  if (apiKey) {
    headers["Authorization"] = `Basic ${apiKey}`;
  }
  
  console.log(`Admin fetch: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      method: options.method || 'GET',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Admin API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Admin API error: ${response.status} ${response.statusText}: ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Admin fetch failed:', error);
    throw error;
  }
};