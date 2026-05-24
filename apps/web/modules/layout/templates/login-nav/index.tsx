import { retrieveCustomer } from "@/lib/data/customer"
import AccountButton from "@/modules/account/components/account-button"
import CartButton from "@/modules/cart/components/cart-button"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import FilePlus from "@/modules/common/icons/file-plus"
import { MegaMenuWrapper } from "@/modules/layout/components/mega-menu"
import { RequestQuoteConfirmation } from "@/modules/quotes/components/request-quote-confirmation"
import { RequestQuotePrompt } from "@/modules/quotes/components/request-quote-prompt"
import SkeletonAccountButton from "@/modules/skeletons/components/skeleton-account-button"
import SkeletonCartButton from "@/modules/skeletons/components/skeleton-cart-button"
import SkeletonMegaMenu from "@/modules/skeletons/components/skeleton-mega-menu"
import { Suspense } from "react"
import { Menu, Search, User } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Navigation items
const navigation = [
  { name: "Home", href: "/" },
  { name: "Catalog", href: "/catalog" },
  { name: "Contact", href: "/contact" },
]

// Featured products for mobile menu
const featuredProducts = [
  {
    id: 1,
    title: "Acid Wash Drop Shoulder Hoodie – Vintage Streetwear Unisex Pullover",
    price: 1599.00,
    compareAtPrice: 1999.00,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=500&fit=crop",
    slug: "acid-wash-drop-shoulder-hoodie"
  },
  {
    id: 2,
    title: "Classic Black Drop Shoulder Hoodie – Essential Streetwear Staple",
    price: 1299.00,
    compareAtPrice: 1799.00,
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&h=500&fit=crop",
    slug: "classic-black-drop-shoulder-hoodie"
  },
  {
    id: 3,
    title: "Heavyweight Premium Drop Shoulder Hoodie – 480 GSM Ultra-Thick",
    price: 1899.00,
    compareAtPrice: 2499.00,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=500&fit=crop",
    slug: "heavyweight-premium-drop-shoulder-hoodie"
  },
  {
    id: 4,
    title: "Oversized Drop Shoulder Hoodie – Premium Streetwear Unisex Pullover",
    price: 1499.00,
    compareAtPrice: 1999.00,
    image: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=400&h=500&fit=crop",
    slug: "oversized-drop-shoulder-hoodie"
  },
]

// Client component for mobile menu and interactive elements
function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-md p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="text-left">Menu</SheetTitle>
          <SheetClose className="absolute right-4 top-4" />
        </SheetHeader>
        
        {/* Mobile Navigation */}
        <nav className="flex flex-col p-4">
          {navigation.map((item) => (
            <LocalizedClientLink
              key={item.name}
              href={item.href}
              className="py-3 text-base font-medium transition-colors hover:text-primary border-b border-gray-100 text-muted-foreground"
            >
              {item.name}
            </LocalizedClientLink>
          ))}
        </nav>

        {/* Featured Products */}
        <div className="mt-6 p-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Featured Products</h4>
          <div className="grid grid-cols-2 gap-4">
            {featuredProducts.map((product) => (
              <LocalizedClientLink key={product.id} href={`/product/${product.slug}`} className="group">
                <div className="aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="mt-2">
                  <p className="text-xs line-clamp-2">{product.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold">${product.price.toFixed(2)}</span>
                    {product.compareAtPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        ${product.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </LocalizedClientLink>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Client component for search modal
function SearchModal() {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for products..."
              className="flex-1 outline-none text-lg"
              autoFocus
            />
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Type to search for products
          </p>
        </div>
      </div>
    </div>
  )
}

export async function LoginNavigationHeader() {

  return (
    <>
      {/* Announcement Bar */}


      {/* Main Header */}
      <div className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
        <header className="flex justify-between items-center container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex lg:flex-1">
              <LocalizedClientLink 
                href="/" 
                className="text-xl font-semibold hover:opacity-80 transition-opacity"
              >
                Alayon
              </LocalizedClientLink>
            </div>
      <div className="text-primary-foreground py-3 text-center text-sm">
        <p className="text-primary ">Welcome to our store</p>
      </div>
      <div className="flex lg:flex-1">
        <span></span>
        </div>
        </header>
      </div>
    </>
  )
}