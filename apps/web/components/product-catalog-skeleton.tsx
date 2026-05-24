// components/product-catalog-skeleton.tsx
export function ProductCatalogSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:block w-64 shrink-0">
        <div className="space-y-6">
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded mt-2 w-3/4" />
              <div className="h-4 bg-gray-200 rounded mt-1 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}