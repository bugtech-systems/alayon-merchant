// app/products/products-layout-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function ProductsLayoutSkeleton() {
  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar Skeleton */}
      <aside className="hidden w-64 border-r bg-muted/30 lg:block">
        <div className="p-4 space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <div className="flex justify-between">
            <div>
              <Skeleton className="h-10 w-48" />
              <Skeleton className="mt-1 h-5 w-64" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
      </main>
    </div>
  );
}