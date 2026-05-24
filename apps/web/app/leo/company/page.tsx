import AccountBadge from "@/components/dashboard/account-badge";
import DeliveryColumn from "@/components/dashboard/delivery-column";
import RealtimeClient from "@/components/dashboard/realtime-client";
import RestaurantStatus from "@/components/dashboard/company/company-status";
import { DeliveryStatus, RestaurantAdminDTO } from "@/lib/types";
import { Container, Heading, StatusBadge, Text } from "@medusajs/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { retrieveUser } from "@/lib/data";
import { retrieveCompany } from "@/lib/data";
import { Suspense } from "react";

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>
      <Container className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 gap-4">
        <div className="flex flex-col justify-between gap-2">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="h-24 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </Container>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-96 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  )
}

// Client component wrappers for components that use client hooks
function RealtimeClientWrapper({ companyId }: { companyId: string }) {
  return (
    <Suspense fallback={<span className="text-muted-foreground">Connecting...</span>}>
      <RealtimeClient companyId={companyId} />
    </Suspense>
  )
}

function RestaurantStatusWrapper({ company }: { company: any }) {
  return (
    <Suspense fallback={<div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>}>
      <RestaurantStatus company={company} />
    </Suspense>
  )
}

function AccountBadgeWrapper({ data, type }: { data: any; type: string }) {
  return (
    <Suspense fallback={<div className="h-12 w-32 bg-gray-200 rounded animate-pulse"></div>}>
      <AccountBadge data={data} type={type} />
    </Suspense>
  )
}

// Main content component that fetches data
async function DashboardContent() {
  const user = (await retrieveUser()) as RestaurantAdminDTO;

  if (!user || !user.id.includes("comp_")) {
    redirect("/login");
  }

  if (!user.company_id) {
    return notFound();
  }

  const companyId = user.company_id;
  const company = await retrieveCompany(companyId);
  const { name, deliveries, is_open } = company as any;

  console.log(companyId, company, 'Company data fetched');

  return (
    <>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <Heading level="h1" className="text-2xl">
            {name} | Company Dashboard
          </Heading>
          <Text>View and manage your company&apos;s orders.</Text>
        </div>
        <Container className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 gap-4">
          <div className="flex flex-col justify-between gap-2">
            <Text className="font-semibold">Restaurant Status</Text>
            <div className="flex gap-2 flex-wrap items-center">
              <Text>Restaurant status: </Text>{" "}
              <StatusBadge
                color={is_open ? "green" : "red"}
                className="flex pl-1 pr-2 py-1 gap-1 w-fit"
              >
                {is_open ? "Taking orders" : "Closed"}
              </StatusBadge>
              <RestaurantStatusWrapper company={company} />
            </div>
            <div className="flex gap-2 items-center">
              <Text>Connection status: </Text>{" "}
              <RealtimeClientWrapper companyId={companyId} />
            </div>
          </div>
          <div className="justify-center hidden md:flex">
            {process.env.NEXT_PUBLIC_DEMO_MODE !== "true" && (
              <div className="flex flex-col justify-between">
                <Text className="font-semibold">Quick actions</Text>
                <Link
                  href="/dashboard/company/menu"
                  className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover text-sm"
                >
                  Edit menu
                </Link>
                <Text
                  className="text-ui-fg-disabled text-sm"
                  aria-disabled={true}
                >
                  Edit settings
                </Text>
                <Text
                  className="text-ui-fg-disabled text-sm"
                  aria-disabled={true}
                >
                  Edit profile
                </Text>
              </div>
            )}
          </div>
          <div className="flex md:justify-end">
            <AccountBadgeWrapper data={company} type="company" />
          </div>
        </Container>
      </div>

      <div className="overflow-x-auto whitespace-nowrap">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-px">
          <DeliveryColumn
            title="Incoming orders"
            deliveries={deliveries}
            statusFilters={[
              DeliveryStatus.PENDING,
              DeliveryStatus.COMPANY_ACCEPTED,
            ]}
            type="company"
          />
          <DeliveryColumn
            title="Ready to prepare"
            deliveries={deliveries}
            statusFilters={[DeliveryStatus.PICKUP_CLAIMED]}
            type="company"
          />
          <DeliveryColumn
            title="Preparing"
            deliveries={deliveries}
            statusFilters={[DeliveryStatus.COMPANY_PREPARING]}
            type="company"
          />
          <DeliveryColumn
            title="In transit"
            deliveries={deliveries}
            statusFilters={[
              DeliveryStatus.READY_FOR_PICKUP,
              DeliveryStatus.IN_TRANSIT,
            ]}
            type="company"
          />
          <DeliveryColumn
            title="Completed"
            deliveries={deliveries}
            statusFilters={[
              DeliveryStatus.DELIVERED,
              DeliveryStatus.COMPANY_DECLINED,
            ]}
            type="company"
          />
        </div>
      </div>
    </>
  )
}

export default function CompanyDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}