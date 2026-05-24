// components/navigation-header.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, User, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LocationDialog } from "@/components/location/LocationDialog";
import { useLocation } from "@/lib/context/LocationContext";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Catalog", href: "/catalog" },
  // { name: "Products", href: "/products" },
  { name: "Contact", href: "/contact" },
];

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
];

// Create a wrapper component to use the location context
function LocationDialogWrapper() {
  const { showLocationDialog, setShowLocationDialog } = useLocation();
  
  return (
    <LocationDialog 
      open={showLocationDialog} 
      onOpenChange={setShowLocationDialog}
    />
  );
}

export function NavigationHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <>
    <LocationDialogWrapper/>
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground py-3 text-center text-sm">
        <p>Welcome to our store</p>
      </div>

      {/* Main Header */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-200 bg-white border-b",
          isScrolled ? "shadow-sm" : "border-gray-100"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left section - Mobile menu + Search */}
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
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
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "py-3 text-base font-medium transition-colors hover:text-primary border-b border-gray-100",
                          pathname === item.href
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>

                  {/* Featured Products */}
                  <div className="mt-6 p-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">Featured Products</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {featuredProducts.map((product) => (
                        <Link key={product.id} href={`/product/${product.slug}`} className="group">
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
                        </Link>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Mobile Search Button */}

            </div>

            {/* Logo */}
            <div className="flex lg:flex-1">
              <Link href="/" className="text-xl font-semibold hover:opacity-80 transition-opacity">
                Alayon
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:gap-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary relative py-2",
                    pathname === item.href
                      ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right section - Actions */}
            <div className="flex items-center gap-1 lg:gap-2">
              {/* Desktop Search */}
    

              {/* Account Button */}
              <Button variant="ghost" size="icon" className="h-9 w-9 relative group">
                <User className="h-5 w-5" />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Account
                </span>
              </Button>

              {/* Cart Button with Badge */}
           {/* <Suspense fallback={<SkeletonCartButton />}>
              <CartButton />
            </Suspense> */}
              {/* <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 relative"
                onClick={openCart}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    {cartQuantity > 99 ? "99+" : cartQuantity}
                  </span>
                )}
              </Button> */}
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="flex-1 outline-none text-lg"
                  autoFocus
                />
                <Button variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
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
      )}


    </>
  );
}