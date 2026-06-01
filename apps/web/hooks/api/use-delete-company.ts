import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../lib/config";
import { adminCompanyKeys } from "./admin-company-keys";
import { toast } from "@medusajs/ui";

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (companyId: string) => {
      await sdk.client.fetch(`/admin/companies/${companyId}`, {
        method: "DELETE",
      });
      return companyId;
    },
    onSuccess: (companyId) => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({
        queryKey: adminCompanyKeys.lists(),
      });
      
      // Remove the specific company from cache
      queryClient.removeQueries({
        queryKey: adminCompanyKeys.detail(companyId),
      });
      
      toast.success("Success", {
        description: "Company has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message || "Failed to delete company. Please try again.",
      });
    },
  });
};