// app/page.tsx
import { FooterModern } from "@/components/footer-modern";
import { HeroSection } from "@/components/hero-section-modern";
import { NavigationHeader } from "@/modules/layout/templates/nav/index";
import { ProductList } from "@/components/product-list";
import { getRegion } from "@/lib/actions/regions";
import { Suspense } from "react";

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Loading skeletons
function NavigationSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-16 bg-gray-200"></div>
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[500px] bg-gray-200"></div>
    </div>
  )
}

function ProductListSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FooterSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200"></div>
    </div>
  )
}

// Wrapper components with Suspense
function NavigationWrapper() {
  return (
    <Suspense fallback={<NavigationSkeleton />}>
      <NavigationHeader />
    </Suspense>
  )
}

function HeroWrapper() {
  return (
    <Suspense fallback={<HeroSkeleton />}>
      <HeroSection />
    </Suspense>
  )
}

function ProductListWrapper({ region }: { region: any }) {
  return (
    <Suspense fallback={<ProductListSkeleton />}>
      <ProductList region={region} />
    </Suspense>
  )
}

function FooterWrapper() {
  return (
    <Suspense fallback={<FooterSkeleton />}>
      <FooterModern />
    </Suspense>
  )
}

// Main content component that fetches data
async function HomeContent() {
  const region = await getRegion('ph');
  console.log(region, 'REEG')

  return (
    <>
      <NavigationWrapper />
      <HeroWrapper />
      <ProductListWrapper region={region} />
      <FooterWrapper />
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  )
}

// Complete page skeleton for initial load
function HomeSkeleton() {
  return (
    <>
      <NavigationSkeleton />
      <HeroSkeleton />
      <ProductListSkeleton />
      <FooterSkeleton />
    </>
  )
}