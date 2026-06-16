// lib/medusa-client.ts
import Medusa from "@medusajs/js-sdk";
import { StoreProduct, StoreRegion } from "@medusajs/types";

// Environment configuration
const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn("Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY – storefront features may not work.");
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
  private static currentRegion: string | null = null;

  static getInstance(): ReturnType<typeof Medusa> {
    if (!this.instance) {
      this.instance = new Medusa({
        baseUrl: MEDUSA_BACKEND_URL,
        debug: process.env.NODE_ENV === "development",
        publishableKey: PUBLISHABLE_KEY,
        // The JS SDK automatically adds region header if you pass region in options,
        // but you can also set default headers globally. We'll handle region per request.
      });
    }
    return this.instance;
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
}

// Export the SDK instance (storefront usage)
export const sdk = MedusaClientManager.getInstance();

// Export region management helpers
export const getRegion = () => MedusaClientManager.getCurrentRegion();
export const setRegion = (region: string) => MedusaClientManager.setRegion(region);
export const syncRegion = () => MedusaClientManager.syncRegionFromCookie();

// Convenience function to get region header for API calls (if needed manually)
export const getRegionHeader = (): Record<string, string> => {
  const region = getRegion();
  return region ? { "x-medusa-region": region } : {};
};

// Example: Storefront product fetching with region support
// (Demonstrates how to pass region to the SDK)
export async function getStoreProducts(region?: string, limit = 10, offset = 0) {
  const client = MedusaClientManager.getInstance();
  const regionCode = region ?? getRegion();
  
  // The JS SDK automatically adds region header if region is passed in options
  const { products, count } = await client.store.product.list({
    limit,
    offset,
    region_id: regionCode ?? undefined, // or region: regionCode – see SDK docs
  });
  
  return { products, count };
}

// For admin operations (requires secret key, not publishable key)
// It's better to create a separate admin client via API routes to keep key secure.
// Example server‑side helper:
export const getAdminClient = () => {
  if (typeof window !== "undefined") {
    throw new Error("Admin client can only be used server-side");
  }
  // Dynamically import medusa-js or js-sdk with admin key
  const { Medusa } = require("@medusajs/js-sdk");
  return Medusa({
    baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
    apiKey: process.env.NEXT_PUBLIC_MEDUSA_SECRET_KEY!,
  });
};

// For server-side usage (API routes, server components)
export const getMedusaServerClient = () => {
  return new Medusa({
    baseUrl: MEDUSA_BACKEND_URL,
    apiKey: process.env.NEXT_PUBLIC_MEDUSA_SECRET_KEY!,
    auth: {
      type: 'session'   
    }
  });
};

// Type exports (optional)
export type { StoreProduct, StoreRegion };
export default sdk