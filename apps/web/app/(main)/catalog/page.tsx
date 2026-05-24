// app/catalog/page.tsx
import { Suspense } from "react";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductCatalogSkeleton } from "@/components/product-catalog-skeleton";
import { retrieveCart } from "@/lib/data/cart";
import { getRegion } from "@/lib/actions/regions";

export const metadata = {
  title: "Product Catalog | My Grocery Store",
  description: "Browse our wide selection of fresh groceries and everyday essentials",
};

export default async function CatalogPage() {
  const region = await getRegion('ph');
  return (
          <>
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-2">Fresh groceries delivered to your doorstep</p>
        </div>

        {/* Product Catalog with Suspense */}
        <Suspense fallback={<ProductCatalogSkeleton />}>
          <ProductCatalog regionId={region?.id}/>
        </Suspense>
      </div>
    </main>
    </>
  );
}