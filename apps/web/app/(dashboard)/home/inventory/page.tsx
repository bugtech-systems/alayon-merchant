// app/products/page.tsx
import { Suspense } from "react";
import { getRegion } from "@/lib/actions/regions";
import { retrieveUser } from "@/lib/data";
import { redirect } from "next/navigation";
import { ProductsLayoutSkeleton } from "../_components/products-skeleton";
import InventoryTable from "../_components/inventory-items";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const region = await getRegion("ph");
  const user = await retrieveUser();

  if (!user) redirect("/login");

  return (
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <Suspense fallback={<ProductsLayoutSkeleton />}>
      <InventoryTable region={region} user={user} />
    </Suspense>
    </div>
  );
}