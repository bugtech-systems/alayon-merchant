import { Suspense } from "react";
import { getRegion } from "@/lib/actions/regions";
import PosApp from "./_components/pos-app";
import { Skeleton } from "@/components/ui/skeleton";
import { retrieveUser } from "@/lib/data";
import { listPriceListProducts } from "@/lib/data/products";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const region = await getRegion('ph');
  const user = await retrieveUser();

  if(!user) return redirect('/login');

      let priceListId = user?.metadata.role == 'company' ? user.employee?.company?.price_list_id : user?.driver?.price_list_id as any;

  let products = await listPriceListProducts({countryCode: 'ph',priceListId: priceListId});
  return (
    <Suspense fallback={<PosSkeleton />}>
      <PosApp region={region} user={user}/>
    </Suspense>
  );
}

function PosSkeleton() {
  return (
    <div className="flex h-[90vh]">
      {/* Categories Skeleton */}
      <div className="sticky top-0 z-10 bg-background/95 border-b">
        <div className="p-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[130px]" />
            <Skeleton className="h-10 w-10" />
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[70px] w-[70px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Products Grid Skeleton */}
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}