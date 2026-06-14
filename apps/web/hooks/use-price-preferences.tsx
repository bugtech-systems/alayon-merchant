// hooks/use-price-preferences.ts
import { useQuery } from "@tanstack/react-query";
import { getMedusaServerClient } from "@/lib/config";

export interface PricePreference {
  id: string;
  attribute: string;
  value: string;
  is_tax_inclusive: boolean;
}

export const usePricePreferences = (enabled = true) => {
  return useQuery({
    queryKey: ["price-preferences"],
    queryFn: async (): Promise<any> => {
      const client = getMedusaServerClient();
      if (!client) throw new Error("Medusa client not initialized");

      const response = await client.admin.pricePreference.list();
      console.log(response, 'resp prcie pref')
      // The SDK may return { price_preferences: [...] } or direct array
      return response.price_preferences || response.data || [];
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};