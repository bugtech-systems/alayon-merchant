import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../lib/config";
import { AdminUpdateCompany, AdminCompanyResponse } from "../../types";
import { adminCompanyKeys } from "./admin-company-keys";
import { toast } from "@medusajs/ui";

export const useUpdateCompany = (companyId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AdminUpdateCompany) => {
      const formData = new FormData();
      
      // Append update data as JSON
      formData.append("data", JSON.stringify({
        name: data.name,
        handle: data.handle,
        municipality: data.municipality,
        products: data.products,
      }));
      
      // Append files if they're being updated
      if (data.logo instanceof File) {
        formData.append("logo", data.logo);
      }
      
      if (data.banner instanceof File) {
        formData.append("banner", data.banner);
      }
      
      const response = await sdk.client.fetch<AdminCompanyResponse>(
        `/admin/companies/${companyId}`,
        {
          method: "PUT",
          body: formData,
        }
      );
      
      return response;
    },
    onSuccess: (data) => {
      // Invalidate specific company detail
      queryClient.invalidateQueries({
        queryKey: adminCompanyKeys.detail(companyId),
      });
      
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: adminCompanyKeys.lists(),
      });
      
      toast.success("Success", {
        description: `Company "${data.company.name}" has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to update company. Please try again.",
      });
    },
  });
};