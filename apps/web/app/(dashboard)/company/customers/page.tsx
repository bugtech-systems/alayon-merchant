// app/customers/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { CustomerTable } from "@/components/customers-table/table";
import { CustomerRow } from "@/components/customers-table/schema";
import { retrieveUser } from "@/lib/data";
import { retrieveCustomer } from "@/lib/actions";
import { toast } from "sonner";
import { CustomerCreateForm } from "@/components/forms/customer-create-form";


export default function CustomersPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        // Try customer (storefront) session
        const customer = await retrieveCustomer() as any;
        if (customer?.metadata?.company_id) {
          setCompanyId(customer.metadata.company_id);
          return;
        }
        
        // Fallback to admin session
        const { user } = await retrieveUser();
        if (user?.metadata?.company_id) {
          setCompanyId(user.metadata.company_id);
          return;
        }
        
        setError("No company assigned to your account");
      } catch (err) {
        console.error("Medusa auth error", err);
        setError("Failed to authenticate. Please log in.");
      } finally {
        setIsLoadingUser(false);
      }
    };
    
    fetchUserAndCompany();
  }, []);

  // Handlers for customer actions
  const handleEditCustomer = useCallback((customerId: string) => {
    // Navigate to edit page or open modal
    console.log("Edit customer:", customerId);
    toast.info(`Editing customer ${customerId}`);
  }, []);

  const handleAddCustomer = useCallback(() => {
    // Open add customer modal or navigate to add page
    console.log("Add new customer");
    toast.info("Add new customer form");
    setIsOpen(true)
  }, []);

  const handleSendEmail = useCallback((customerId: string, email: string) => {
    // Open email composition modal or navigate to email page
    console.log(`Send email to ${email} (ID: ${customerId})`);
    toast.info(`Preparing email to ${email}`);
  }, []);

  const handleViewOrders = useCallback((customerId: string) => {
    // Navigate to customer orders page
    console.log("View orders for customer:", customerId);
    // router.push(`/customers/${customerId}/orders`);
    toast.info(`Viewing orders for customer ${customerId}`);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error("Customer table error:", error);
    toast.error(error.message || "An error occurred");
  }, []);

  const handleSuccess = useCallback((message: string) => {
    console.log("Customer table success:", message);
    toast.success(message);
  }, []);

  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-pulse text-muted-foreground">
          Loading your company information...
        </div>
      </div>
    );
  }

  if (error || !companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-destructive text-center max-w-md">
          <p className="font-semibold mb-2">Authentication Error</p>
          <p className="text-sm text-muted-foreground">{error || "Unable to determine company"}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer base, view order history, and track engagement
          </p>
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable
        apiBaseUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE || "http://localhost:3000/api"}
        companyId={companyId}
        onEditCustomer={handleEditCustomer}
        onAddCustomer={handleAddCustomer}
        onSendEmail={handleSendEmail}
        onViewOrders={handleViewOrders}
        onError={handleError}
        onSuccess={handleSuccess}
        refreshInterval={30000} // Auto-refresh every 30 seconds
        defaultPageSize={10}
      />
      <CustomerCreateForm
         isOpen={isOpen}
         onClose={() => setIsOpen(false)}
      />
    </div>
  );
}