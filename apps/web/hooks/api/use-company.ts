import { useQuery } from "@tanstack/react-query";
import { sdk } from "@/lib/config";
import { adminCompanyKeys } from "./admin-company-keys";
import { AdminCompanyResponse } from "../../types";

export const useCompany = (companyId: string) => {
  return useQuery({
    queryKey: adminCompanyKeys.detail(companyId),
    queryFn: async () => {
      const response = await sdk.client.fetch<AdminCompanyResponse>(
        `/admin/companies/${companyId}`,
        {
          method: "GET",
        }
      );
      return response;
    },
    enabled: !!companyId,
  });
};