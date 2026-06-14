// lib/services/medusa-client.ts
import Medusa from "@medusajs/js-sdk";

// Storefront client (publishable key - no auth required)
export const storefrontClient = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  debug: process.env.NODE_ENV === "development",
});

// Admin client (secret key + basic auth)
export const adminClient = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  apiKey: process.env.MEDUSA_SECRET_KEY, // Server-side only!
  debug: process.env.NODE_ENV === "development",
});

// For direct fetch calls with Basic Auth
export const adminFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
  const token = process.env.MEDUSA_SECRET_KEY;
  console.log(token, 'TOOKL')
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Basic ${token}`,
    ...options.headers,
  };
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });
  
  
console.log(baseUrl, token, headers, `${baseUrl}${endpoint}`, 'ahahaha', process.env)

  if (!response.ok) {
    throw new Error(`Admin API error: ${response.statusText}`);
  }
  
  return response.json();
};