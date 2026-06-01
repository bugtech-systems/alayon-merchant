// hooks/useMedusaCustomers.ts
import { useQuery } from "@tanstack/react-query";
import { sdk } from "@/lib/config";
import { getCustomers } from "@/lib/actions";

interface UseMedusaCustomersParams {
  limit?: number;
  offset?: number;
  q?: string;
  order?: string;
  created_at?: {
    gte?: string;
    lte?: string;
  };
  has_account?: boolean;
}

export function useMedusaCustomers(params: UseMedusaCustomersParams) {
  return useQuery({
    queryKey: ["medusa-customers", params],
    queryFn: async () => {
      const response = await getCustomers(params);
      console.log(response, "RESSS")
      return response.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}