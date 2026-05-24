// app/customers/page.tsx
"use client";

import { Suspense, useState } from "react";
import { SubscriberOverview } from "@/components/subscriber-overview";
import { useCustomersStats, useCustomers } from "@/lib/hooks/useN8nQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Types
interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  metadata: any;
  has_account: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  subscribed: number;
  newThisMonth: number;
}

// Client component that uses hooks
function CustomersContent() {
  const [currentPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch customers data using hook
  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomers({
    page: currentPage,
    pageSize: pageSize,
  });

  // Fetch stats using hook
  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useCustomersStats();

  const customers = customersData?.data || [];
  const total = customersData?.total || 0;
  const stats = statsData || null;

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
      initialData={customers}
      initialTotal={total}
      initialStats={stats}
      isLoading={isLoading}
      onRefresh={() => {
        refetchCustomers();
        refetchStats();
      }}
    />
  );
}

// Loading skeleton component
function CustomersPageSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-80" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>
        
        {/* Table Skeleton */}
        <Skeleton className="h-[600px]" />
        
        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomersPageSkeleton />}>
      <CustomersContent />
    </Suspense>
  );
}