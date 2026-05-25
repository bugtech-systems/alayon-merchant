// lib/medusa-client.ts
import Medusa from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  // Add default region to prevent auto-redirects
  // defaultRegion: "ph",
})

// Optional: Create a wrapper to ensure region is always set
export const getMedusaClient = (region?: string) => {
  // Create a new instance with custom headers
  const client = new Medusa({
    baseUrl: MEDUSA_BACKEND_URL,
    debug: process.env.NODE_ENV === "development",
    publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    // defaultRegion: region || "ph",
  })
  
  // Add custom headers to prevent redirects
  // @ts-ignore - accessing internal fetch client
  if (client.client?.fetch) {
    // @ts-ignore
    const originalFetch = client.client.fetch;
    // @ts-ignore
    client.client.fetch = (url: string, options: any = {}) => {
      options.headers = {
        ...options.headers,
        'x-medusa-region-handled': 'true',
        'x-user-region': region || 'ph',
      }
      return originalFetch(url, options)
    }
  }
  
  return client
}

// Singleton instance for default usage
export default sdk