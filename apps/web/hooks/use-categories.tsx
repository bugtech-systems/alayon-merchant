// hooks/use-categories.ts
import { useQuery } from "@tanstack/react-query";
import { getMedusaServerClient } from "@/lib/config";

export const useCategories = (options?: { limit?: number; enabled?: boolean }) => {
  const { limit = 100, enabled = true } = options || {};

  return useQuery({
    queryKey: ["categories", { limit }],
    queryFn: async () => {
      const client = getMedusaServerClient();
      if (!client) throw new Error("Medusa client not initialized");

      // Medusa V2 admin categories list
      const response = await client.admin.productCategory.list({
        limit,
        fields: "id,name,parent_category_id,parent_category,products_count",
      });

      // Flatten nested categories if needed or just return the list
      const categories = response.product_categories || response.data || [];
      return categories;
    },
    enabled: enabled && !!getMedusaServerClient(),
    staleTime: 5 * 60 * 1000,
  });
};