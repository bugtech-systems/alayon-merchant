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
    <Suspense fallback={<ProductsLayoutSkeleton />}>
      <ProductsApp region={region} user={user} />
    </Suspense>
  );
}