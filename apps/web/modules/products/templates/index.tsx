// modules/products/templates/product-template.tsx
import { HttpTypes } from "@medusajs/types"
import ImageGallery from "@/modules/products/components/image-gallery"
import ProductActions from "@/modules/products/components/product-actions"
import ProductTabs from "@/modules/products/components/product-tabs"
import RelatedProducts from "@/modules/products/components/related-products"
import ProductInfo from "@/modules/products/templates/product-info"
import SkeletonRelatedProducts from "@/modules/skeletons/templates/skeleton-related-products"
import React, { Suspense } from "react"
import ProductActionsWrapper from "./product-actions-wrapper"
import ProductFacts from "../components/product-facts"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { 
  Home, 
  Package, 
  Tag, 
  Shield, 
  Truck, 
  RotateCcw,
  Building2,
  MapPin,
  Clock,
  Star,
  Award,
  Mail,
  Phone,
  ExternalLink,
  ExternalLinkIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct | any
  region: HttpTypes.StoreRegion
  countryCode: string
}

// Mock company data - In production, fetch from your API
interface Company {
  id: string
  name: string
  slug: string
  logo?: string
  coverImage?: string
  description: string
  rating: number
  totalReviews: number
  location: string
  foundedYear: number
  productsCount: number
  isVerified: boolean
  email: string
  phone?: string
  website?: string
  socialMedia?: {
    facebook?: string
    instagram?: string
    twitter?: string
  }
  badges?: string[]
}

const getCompanyFromProduct = (product: any): Company | null => {
  // Extract company info from product metadata or product collection
  // This should come from your backend
  const metadata = product.metadata || {}
  const company = Array.isArray(product.company) ? product.company[0] : product.company;

  if(!company) return null

  return {
    ...company,
    id: company.id as string || "company_123",
    name: company.name as string || "The Urban Collective",
    slug: company.id as string || "urban-collective",
    logo: company.logo_url as string || "/images/default-company-logo.png",
    coverImage: company.banner_url as string,
    description: company.company_description as string || 
      "Premium lifestyle brand offering carefully curated products that blend functionality with aesthetic appeal. We're committed to sustainable practices and exceptional customer service.",
    rating: 4.8,
    totalReviews: 1247,
    location: company.company_location as string || "Manila, Philippines",
    foundedYear: 2019,
    productsCount: 156,
    isVerified: true,
    email: company.email as string || "hello@theurbancollective.com",
    phone: company.phone as string,
    website: company.website as string,
    badges: ["Top Rated", "Eco-Friendly", "Trusted Merchant"]
  }
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const company = getCompanyFromProduct(product)

  // Check if product is on sale
  const isOnSale = product.variants?.some(variant => 
    variant.calculated_price?.calculated_amount < variant.calculated_price?.original_amount
  )

  // Check if product is new (e.g., within last 30 days)
  const isNew = product.created_at 
    ? new Date(product.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : false

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="d-flex w-full">
                <Home className="h-3 w-3 mr-1" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/catalog">Catalog</BreadcrumbLink>
            </BreadcrumbItem>
            {company && 
            <>
                <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/catalog?company=${company?.handle}`}>
                {company?.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            </>
            }
        
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[200px]">
                {product.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Product Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isNew && (
              <span className="bg-emerald-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                New Arrival
              </span>
            )}
            {isOnSale && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                On Sale
              </span>
            )}
            {product.tags?.map((tag, index) => (
              <span key={index} className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {tag.value}
              </span>
            ))}
          </div>
        </div>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-10">
          {/* Image Gallery */}
          <div className="relative">
            <ImageGallery product={product} />
          </div>

          {/* Product Info Card */}
          <div className="space-y-6">
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <CardContent className="p-6 md:p-8">
                {/* Product Info */}
                <ProductInfo product={product} />
                
                <Separator className="my-6" />
                
                {/* Product Actions */}
                <div className="space-y-6">
                  <Suspense
                    fallback={<ProductActions product={product} region={region} />}
                  >
                    <ProductActionsWrapper id={product.id} region={region} company={product?.company}/>
                  </Suspense>
                  
                  {/* Product Facts */}
                  <ProductFacts product={product} />
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium">Free Shipping ₱1,000+</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <RotateCcw className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium">30-Day Returns</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium">Bulk Orders</span>
              </div>
            </div>
          </div>
        </div>

    
        {/* Product Details Section */}
        <div className="mb-10">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <ProductTabs product={product} />
            </CardContent>
          </Card>
        </div>

        {/* Related Products Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">You May Also Like</h2>
              <p className="text-sm text-muted-foreground mt-1">
                More from {company?.name} and other top merchants
              </p>
            </div>
            <div className="h-px flex-1 bg-gray-200 ml-4 hidden md:block" />
          </div>
          
          <div data-testid="related-products-container">
            <Suspense fallback={<SkeletonRelatedProducts />}>
              <RelatedProducts product={product} countryCode={countryCode} />
            </Suspense>
          </div>
        </div>
    {/* Company Info Section - Clickable Card */}
    {company && 
        <div className="mb-10">
          <Link href={`/${company?.handle}`}>
            <Card className="border-2 border-primary/20 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden">
              {/* Company Cover Image */}
              {company?.coverImage && (
                <div className="relative h-32 md:h-40 bg-gradient-to-r from-primary/20 to-purple-500/20">
                  <Image
                    src={company?.coverImage}
                    alt={`${company.name} cover`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}
              
              <CardContent className="p-6 relative">
                {/* Company Logo */}
                <div className="flex items-start gap-4">
                  <div className="relative -mt-12">
                    <div className="h-20 w-20 rounded-xl bg-white shadow-lg border-2 border-white overflow-hidden">
                      {company?.logo_url ? (
                        <Image
                          src={company.logo_url}
                          alt={company.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                          <Building2 className="h-10 w-10 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                        {company?.name}
                      </h3>
                      {company?.isVerified && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <Award className="h-3 w-3 mr-1" />
                          Verified Merchant
                        </Badge>
                      )}
                      <ExternalLink href="/bellybytes" className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    </div>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i < Math.floor(company?.rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : i < company?.rating
                                ? "fill-yellow-400 text-yellow-400 opacity-50"
                                : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{company?.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({company?.totalReviews.toLocaleString()} reviews)
                      </span>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {company?.badges?.map((badge, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Company Description */}
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {company?.description}
                  </p>
                </div>
                
                {/* Company Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{company?.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Since {company?.foundedYear}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{company?.productsCount} Products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">{company?.email}</span>
                  </div>
                </div>
                
                {/* View Profile Button */}
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary group-hover:bg-primary/10"
                  >
                    View Company Profile
                    <ExternalLinkIcon className="h-3 w-3 ml-1"/>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
}
        {/* Wholesale Banner for Retail Customers */}
        {!product.metadata?.wholesale_only && (
          <div className="mt-10 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Interested in bulk orders?</p>
                  <p className="text-xs text-muted-foreground">Contact {company?.name} directly for wholesale pricing</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${company?.handle}#contact`}>
                  Contact Merchant →
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductTemplate