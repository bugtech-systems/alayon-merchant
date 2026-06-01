import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk } from "@/lib/config";
import { AdminCreateCompany, AdminCompanyResponse } from "../../types";
import { adminCompanyKeys } from "./admin-company-keys";
import { toast } from "@medusajs/ui";

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: AdminCreateCompany) => {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Append company data as JSON
      formData.append("data", JSON.stringify({
        name: data.name,
        handle: data.handle,
        municipality: data.municipity,
        products: data.products,
      }));
      
      // Append files if they exist
      if (data.logo) {
        formData.append("logo", data.logo);
      }
      
      if (data.banner) {
        formData.append("banner", data.banner);
      }
      
      const response = await sdk.client.fetch<AdminCompanyResponse>(
        "/admin/companies",
        {
          method: "POST",
          body: formData,
          headers: {
            // Don't set Content-Type for FormData - browser will set it with boundary
          },
        }
      );
      
      return response;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({
        queryKey: adminCompanyKeys.lists(),
      });
      
      // Show success toast
      toast.success("Success", {
        description: `Company "${data.company.name}" has been created successfully.`,
      });
    },
    onError: (error: Error, variables, context) => {
      // Show error toast
      toast.error("Error", {
        description: error.message || "Failed to create company. Please try again.",
      });
    },
  });
  
  return {
    mutateAsync: mutation.mutateAsync,
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};