// modules/company/templates/company-profile-template.tsx
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Users, 
  Award, 
  Truck, 
  Shield, 
  Heart, 
  Share2,
  Globe,
  Briefcase,
  CheckCircle,
  Star,
  Building2,
  Package
} from "lucide-react"
import {ProductCard} from "@/components/product-card"
import { Facebook } from "@medusajs/icons"

type CompanyProfileTemplateProps = {
  company?: {
    id: string
    name: string
    description: string
    long_description?: string
    logo_url?: string
    cover_image?: string
    established_year?: number
    employees?: string
    location?: string
    address?: string
    phone?: string
    email?: string
    website?: string
    social_media?: {
      facebook?: string
      instagram?: string
      twitter?: string
    }
    certifications?: string[]
    awards?: string[]
    business_hours?: {
      monday_friday?: string
      saturday?: string
      sunday?: string
    }
  } | any
  products?: HttpTypes.StoreProduct[]
  region?: HttpTypes.StoreRegion | any
  countryCode?: string
}

const CompanyProfileTemplate: React.FC<CompanyProfileTemplateProps> = ({
  company,
  products,
  region,
  countryCode,
}: any) => {
  if (!company || !company.id) {
    return notFound()
  }

  // Featured products (first 4 or marked as featured)
  const featuredProducts = products
    .filter(p => p.metadata?.featured === "true" || p.tags?.some((t: any) => t.value === "featured"))
    .slice(0, 4)
  
  const allProducts = products
    .filter(p => !featuredProducts.includes(p))
  
  const hasMoreProducts = allProducts.length > 8

  // Statistics
  const stats = [
    { label: "Years in Business", value: new Date().getFullYear() - (company.established_year || 2020), icon: Building2 },
    { label: "Happy Customers", value: "10,000+", icon: Users },
    { label: "Products", value: products.length.toString(), icon: Briefcase },
    { label: "Customer Satisfaction", value: "98%", icon: Star },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Cover Image Section */}
      <div className="relative h-64 md:h-96 w-full bg-gradient-to-r from-primary/20 to-primary/10 overflow-hidden">
        {company.logo_url ? (
          <Image
            src={company.logo_url}
            alt={`${company.name} cover`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-pattern-dots opacity-10" />
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        
        {/* Company Logo Floating */}
      </div>

      <div className="container mx-auto px-4 pt-16 pb-8 max-w-7xl">
        {/* Company Header Info */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {company.name}
                </h1>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Verified Seller
                </Badge>
              </div>
              
              {/* Location */}
              {company.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{company.location}</span>
                </div>
              )}
              
              {/* Rating Placeholder */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">(128 reviews)</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Follow
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Company Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* About Section */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About {company.name}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {company.description}
                </p>
                {company.long_description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    {company.long_description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {company.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm">{company.phone}</p>
                      </div>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{company.email}</p>
                      </div>
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm">{company.address}</p>
                      </div>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Website</p>
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          {company.website.replace('https://', '')}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            {company.business_hours && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Business Hours
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monday - Friday</span>
                      <span>{company.business_hours.monday_friday || "9:00 AM - 6:00 PM"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saturday</span>
                      <span>{company.business_hours.saturday || "10:00 AM - 4:00 PM"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sunday</span>
                      <span>{company.business_hours.sunday || "Closed"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications & Awards */}
            {(company.certifications?.length || company.awards?.length) && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Certifications & Awards</h3>
                  {company.certifications && company.certifications.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Certifications</p>
                      <div className="flex flex-wrap gap-2">
                        {company.certifications.map((cert, idx) => (
                          <Badge key={idx} variant="outline" className="bg-emerald-50 text-emerald-700">
                            <Award className="h-3 w-3 mr-1" />
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {company.awards && company.awards.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Awards</p>
                      <div className="flex flex-wrap gap-2">
                        {company.awards.map((award, idx) => (
                          <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700">
                            <Star className="h-3 w-3 mr-1" />
                            {award}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Social Media Links */}
            {company.social_media && Object.values(company.social_media).some(Boolean) && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Follow Us</h3>
                  <div className="flex gap-3">
                    {company.social_media.facebook && (
                      <a href={company.social_media.facebook} target="_blank" rel="noopener noreferrer" 
                         className="p-2 rounded-full bg-gray-100 hover:bg-primary/10 transition-colors">
                        <Facebook className="h-5 w-5 text-[#1877f2]" />
                      </a>
                    )}
                   
                   
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Side - Products Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Products */}
            {featuredProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Featured Products</h2>
                    <p className="text-sm text-muted-foreground">Our best-selling and recommended items</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredProducts.map((product: any, index: any) => (
                    <ProductCard
                      index={index}
                      key={product.id}
                      product={product}
                      regionId={region?.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Products */}
            {allProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">All Products</h2>
                    <p className="text-sm text-muted-foreground">
                      {allProducts.length} products available
                    </p>
                  </div>
                  {hasMoreProducts && (
                    <Button variant="link" className="text-primary">
                      View All →
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(hasMoreProducts ? allProducts.slice(0, 8) : allProducts).map((product, index: any) => (
                    <ProductCard
                      index={index}
                      key={product.id}
                      product={product}
                      regionId={region?.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {products.length === 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Products Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    This company hasn't listed any products at the moment.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Trust Badges Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <Truck className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">Free Shipping</p>
                  <p className="text-[10px] text-muted-foreground">On orders ₱1,000+</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">Secure Payment</p>
                  <p className="text-[10px] text-muted-foreground">100% protected</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">Fast Delivery</p>
                  <p className="text-[10px] text-muted-foreground">3-5 business days</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <Award className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">Quality Guarantee</p>
                  <p className="text-[10px] text-muted-foreground">Authentic products</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyProfileTemplate