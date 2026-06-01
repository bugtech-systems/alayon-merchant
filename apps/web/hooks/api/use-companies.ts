import { useQuery } from "@tanstack/react-query";
import { sdk } from "@/lib/config";
import { adminCompanyKeys } from "./admin-company-keys";
import { AdminCompanyListResponse } from "../../types";

interface UseCompaniesOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export const useCompanies = (options?: UseCompaniesOptions) => {
  const { limit = 20, offset = 0, search } = options || {};
  
  return useQuery({
    queryKey: adminCompanyKeys.list({ limit, offset, search }),
    queryFn: async () => {
      const response = await sdk.client.fetch<AdminCompanyListResponse>(
        "/store/companies",
        {
          method: "GET",
          query: {
            
            ...(search && { q: search }),
          },
        }
      );
      return response;
    },
  });
};