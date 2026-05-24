import { HeroSection } from "@/components/home/hero-section"
import { LocationDialogWrapper } from "@/components/location/location-dialog-wrapper"
import { getRegion } from "@/lib/actions/regions"
import FeaturedProducts from "@/modules/home/components/featured-products"
import SkeletonFeaturedProducts from "@/modules/skeletons/templates/skeleton-featured-products"
import { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Medusa Next.js Starter Template",
  description:
    "A performant frontend ecommerce starter template with Next.js 14 and Medusa.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {

  return (
    <div className="flex flex-col gap-y-2 m-2">
      <HeroSection />
      <Suspense fallback={<SkeletonFeaturedProducts />}>
        <FeaturedProducts countryCode={"ph"} />
      </Suspense>
    </div>
  )
}
