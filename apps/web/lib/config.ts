// lib/medusa-client.ts
import Medusa from "@medusajs/js-sdk";
import { StoreProduct, StoreRegion } from "@medusajs/types";

// Environment configuration
const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.MEDUSA_SECRET_KEY || process.env.NEXT_PUBLIC_MEDUSA_SECRET_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn("Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY – storefront features may not work.");
}

if (!SECRET_KEY) {
  console.warn("Missing MEDUSA_SECRET_KEY – admin features may not work.");
}

// Cookie helpers
const COOKIE_REGION_KEY = "user_region";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}`;
};

/**
 * Medusa client singleton – supports region via request headers,
 * not via client re‑instantiation. The SDK itself doesn't hold region state;
 * region is sent with each request using the `region` header automatically.
 * This class only manages region for UI/store logic and persists it in cookies.
 */
class MedusaClientManager {
  private static instance: ReturnType<typeof Medusa> | null = null;
  private static adminInstance: ReturnType<typeof Medusa> | null = null;
  private static currentRegion: string | null = null;

  /**
   * Get storefront client instance
   * Maintains original getInstance() method for backward compatibility
   */
  static getInstance(): ReturnType<typeof Medusa> {
    if (!this.instance) {
      this.instance = new Medusa({
        baseUrl: MEDUSA_BACKEND_URL,
        debug: process.env.NODE_ENV === "development",
        publishableKey: PUBLISHABLE_KEY,
        apiKey: SECRET_KEY,
      });
    }
    return this.instance;
  }

  /**
   * Get admin client instance - for server-side only
   * This uses the secret key for admin operations
   */
  static getAdminInstance(): ReturnType<typeof Medusa> {
    if (!this.adminInstance) {
      if (typeof window !== "undefined") {
        throw new Error("Admin client can only be used server-side");
      }
      
      this.adminInstance = new Medusa({
        baseUrl: MEDUSA_BACKEND_URL,
        debug: process.env.NODE_ENV === "development",
        apiKey: SECRET_KEY,
        auth: {
          type: 'session'
        }
      });
    }
    return this.adminInstance;
  }

  /**
   * Get the currently selected region code (from memory or cookie).
   */
  static getCurrentRegion(): string | null {
    if (this.currentRegion) return this.currentRegion;
    if (typeof window !== "undefined") {
      this.currentRegion = getCookie(COOKIE_REGION_KEY);
    }
    return this.currentRegion;
  }

  /**
   * Set the active region. Persists to cookie and updates memory.
   * Does NOT recreate the SDK instance.
   * @param regionCode - ISO country code or region ID (e.g., "us", "ph")
   */
  static setRegion(regionCode: string): void {
    if (this.currentRegion === regionCode) return;
    this.currentRegion = regionCode;
    if (typeof window !== "undefined") {
      setCookie(COOKIE_REGION_KEY, regionCode, 30);
    }
    // Optional: Emit event for React components to react
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("regionChange", { detail: { region: regionCode } }));
    }
  }

  /**
   * Synchronize region from cookie on client startup.
   */
  static syncRegionFromCookie(): void {
    if (typeof window === "undefined") return;
    const cookieRegion = getCookie(COOKIE_REGION_KEY);
    if (cookieRegion && cookieRegion !== this.currentRegion) {
      this.currentRegion = cookieRegion;
    }
  }

  /**
   * Reset admin instance (useful for testing or re-authentication)
   */
  static resetAdminInstance(): void {
    this.adminInstance = null;
  }
}

// Export the SDK instance (storefront usage) - maintains original export
export const sdk = MedusaClientManager.getInstance();

// Export admin SDK - for server-side only
export const getAdminSdk = () => MedusaClientManager.getAdminInstance();

// Export region management helpers - maintains original exports
export const getRegion = () => MedusaClientManager.getCurrentRegion();
export const setRegion = (region: string) => MedusaClientManager.setRegion(region);
export const syncRegion = () => MedusaClientManager.syncRegionFromCookie();

// Convenience function to get region header for API calls (if needed manually)
export const getRegionHeader = (): Record<string, string> => {
  const region = getRegion();
  return region ? { "x-medusa-region": region } : {};
};

// For server-side API routes and server components
export const getMedusaServerClient = () => {
  if (typeof window !== "undefined") {
    throw new Error("Server client can only be used on the server");
  }
  
  return new Medusa({
    baseUrl: MEDUSA_BACKEND_URL,
    apiKey: SECRET_KEY,
    auth: {
      type: 'session'
    }
  });
};

// Storefront product fetching with region support - maintains original function
export async function getStoreProducts(region?: string, limit = 10, offset = 0) {
  const client = MedusaClientManager.getInstance();
  const regionCode = region ?? getRegion();
  
  const { products, count } = await client.store.product.list({
    limit,
    offset,
    region_id: regionCode ?? undefined,
  });
  
  return { products, count };
}

// lib/water-production/config.ts
const WATER_PRODUCTION_API_URL = process.env.SMS_URL || 'http://localhost:3500';

export const productionApiConfig = {
  baseUrl: WATER_PRODUCTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Type exports
export type { StoreProduct, StoreRegion };
export default sdk;