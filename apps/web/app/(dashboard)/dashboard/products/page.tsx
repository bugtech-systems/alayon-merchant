// app/products/page.tsx
import { Suspense } from "react";
import { getRegion } from "@/lib/actions/regions";
import { retrieveUser } from "@/lib/data";
import { redirect } from "next/navigation";
import { ProductsApp } from "../_components/products-app";
import { ProductsLayoutSkeleton } from "../_components/products-skeleton";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const region = await getRegion("ph");
  const user = await retrieveUser();

  if (!user) redirect("/login");

  return (
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <Suspense fallback={<ProductsLayoutSkeleton />}>
      <ProductsApp region={region} user={user} />
    </Suspense>
    </div>
  );
}