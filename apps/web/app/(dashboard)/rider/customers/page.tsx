// app/customers/page.tsx
"use client";

import { Suspense } from "react";
import { SubscriberOverview } from "@/components/subscriber-overview";
import { useCustomers, useCustomersStats } from "@/lib/hooks/useN8nQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

function CustomersContent() {
  // Fetch customers data
  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomers({
    page: 1,
    pageSize: 10,
  });

  // Fetch stats data
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useCustomersStats();

  const isLoading = isLoadingCustomers || isLoadingStats;
  const error = customersError || statsError;

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load customer data. Please try again later.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              refetchCustomers();
              refetchStats();
            }}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <SubscriberOverview
      initialData={customersData?.data || []}
      initialTotal={customersData?.total || 0}
      initialStats={stats || null}
      isLoading={isLoading}
      onRefresh={() => {
        refetchCustomers();
        refetchStats();
      }}
    />
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersContent />
    </Suspense>
  );
}

function CustomersSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    </div>
  );
}