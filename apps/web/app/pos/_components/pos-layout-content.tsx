// components/pos/pos-layout-content.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Building2,
  History,
  FileText,
  Users,
  Layers,
  Menu,
  User,
  TrendingUp,
  LogOut,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOffline } from "@/components/medusa-offline-provider";
import { PosContext, type PosContextType } from "../../../contexts/pos-context";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMedusaAuth } from "@/providers/MedusaAuthProvider";
import { format, startOfDay, endOfDay } from 'date-fns';
import { getTodayOrdersSummary } from "@/lib/data/pos";
import Link from "next/link";

// Navigation Items
const navItems: NavItem[] = [
  { icon: Building2, label: "Home", href: "/pos" },
  { icon: Layers, label: "Products", href: "/pos/products" },
  { icon: Users, label: "Customers", href: "/pos/customers", disabled: false },
  { icon: History, label: "Orders", href: "/pos/orders", disabled: false },
  { icon: FileText, label: "Transactions", href: "/pos/transactions", disabled: false },
];

interface NavItem {
  icon: any;
  label: string;
  href: string;
  badge?: number;
  disabled?: boolean;
}

// Navigation Item Component
function NavItemComponent({ 
  icon: Icon, 
  label, 
  active, 
  href, 
  disabled,
  badge,
  onClick 
}: { 
  icon: any;
  label: string;
  active?: boolean;
  href: string;
  disabled?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (disabled) return;
    if (onClick) onClick();
    router.push(href);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && badge > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {badge}
              </Badge>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{disabled ? `${label} (Coming Soon)` : label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Today's Sales Component with Actions
function TodaySales({ orderData }: { orderData: any }) {

  let salesData = orderData;


  const today = new Date();



  return (
    <div className="rounded-lg bg-muted p-4 hover:bg-muted/80 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">Today's Sales</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(today, 'MMM dd, yyyy')}
          </span>
     
          <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
        </div>
      </div>
      
      <p className="text-2xl font-bold">
        ₱{salesData.total_sales.toFixed(2)}
      </p>
      
      {salesData.order_count > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-green-600 font-medium">
            {salesData.order_count} orders today
          </span>
        </div>
      )}
      
      <div className="mt-3 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-600 flex-shrink-0" />
          <span>{salesData.completed_orders} completed</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 flex-shrink-0" />
          <span>{salesData.customer_count} customers</span>
        </div>
      </div>

      {(salesData.pending_orders > 0 || salesData.total_sales > 0) && (
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
          {salesData.pending_orders > 0 && (
            <span>{salesData.pending_orders} pending</span>
          )}
          {salesData.average_order_value > 0 && (
            <span>Avg: ₱{salesData.average_order_value.toFixed(2)}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Sidebar Content Component
function SidebarContent({ onNavClick, user, orderData }: {orderData?: any, user: any; onNavClick?: () => void }) {
  const pathname = usePathname();
  const [draftCount, setDraftCount] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { logout } = useMedusaAuth() as any;
  const { logout: authLogout } = useAuth();
  const { first_name, last_name, metadata } = user || {};

  const handleLogout = async () => {
    try {
      // 1. Clear all localStorage items related to POS/cart
      const localStorageKeys = [
        'pos_cart_id',
        'pos-drafts',
        'pos_order_history',
        'simple-tables',
        'current_order_table_ids',
        'pos-settings',
        'userLocation',
        'pos_last_sync',
        'pos_pending_orders'
      ];
      
      localStorageKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      // 2. Clear sessionStorage if used
      sessionStorage.clear();

      // 3. Clear all cookies
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i] as any;
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }

      // 4. Clear IndexedDB if used (for offline storage)
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        databases.forEach(db => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      }

      // 5. Clear any cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // 6. Call the logout function from your auth system
      logout();
      authLogout();

      // 7. Redirect to login page
      router.push('/login');
      
    } catch (error) {
      console.error('Logout error:', error);
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    }
  };

  const getActiveNav = () => {
    if (pathname?.includes("/pos/products")) return "Products";
    if (pathname?.includes("/pos/customers")) return "Customers";
    if (pathname?.includes("/pos/orders")) return "Orders";
    if (pathname?.includes("/pos/transactions")) return "Transactions";
    return "Home";
  };

  // Get draft count from localStorage for badge
  useEffect(() => {
    const getDraftCount = () => {
      const drafts = localStorage.getItem("pos-drafts");
      if (drafts) {
        try {
          const parsedDrafts = JSON.parse(drafts);
          const activeDrafts = parsedDrafts.filter((d: any) => d.status === "active").length;
          setDraftCount(activeDrafts);
        } catch (e) {
          console.error("Error parsing drafts:", e);
        }
      }
    };
    
    getDraftCount();
    
    const handleDraftUpdate = () => getDraftCount();
    
    window.addEventListener("storage", handleDraftUpdate);
    window.addEventListener("draft-updated", handleDraftUpdate);
    
    return () => {
      window.removeEventListener("storage", handleDraftUpdate);
      window.removeEventListener("draft-updated", handleDraftUpdate);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Alayon POS</span>
        </Link>
      </div>

      {/* User Info Section */}
      <div className="px-3 py-4 border-b">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-2">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{first_name || 'User'} {last_name || ''}</p>
            <p className="text-xs text-muted-foreground truncate">POS ({metadata?.role?.toUpperCase() || 'USER'})</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={getActiveNav() === item.label}
              href={item.href}
              disabled={item.disabled}
              badge={item.label === "Drafts" ? draftCount : undefined}
              onClick={onNavClick}
            />
          ))}
        </nav>

        <Separator className="my-4" />

        {/* Today's Sales - Using actions */}
        <TodaySales orderData={orderData} />
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <button 
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

// Mobile Header Component
function MobileHeader({ onMenuOpen, user }: { user: any; onMenuOpen: () => void }) {
  const { isOnline } = useOffline();
  
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuOpen}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-2 w-2 rounded-full",
          isOnline ? "bg-green-500" : "bg-yellow-500"
        )} />
        <Building2 className="h-5 w-5 text-primary" />
        <h1 className="font-semibold">Alayon POS</h1>
      </div>
      <div className="w-10" />
    </div>
  );
}

// Main Layout Content Component
export function PosLayoutContent({ children, user, orderData }: { children: React.ReactNode; user: any, orderData: any }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Listen for cart updates from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      const cart = localStorage.getItem("pos-cart");
      if (cart) {
        try {
          const items = JSON.parse(cart);
          const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartItemCount(count);
        } catch (e) {
          console.error("Error parsing cart:", e);
        }
      } else {
        setCartItemCount(0);
      }
    };

    updateCartCount();
    
    const handleCartUpdate = () => updateCartCount();
    
    window.addEventListener("storage", handleCartUpdate);
    window.addEventListener("cart-updated", handleCartUpdate);
    
    return () => {
      window.removeEventListener("storage", handleCartUpdate);
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, []);

  const openCart = () => {
    setIsCartOpen(true);
    window.dispatchEvent(new CustomEvent("open-pos-cart"));
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const contextValue: PosContextType = {
    cartItemCount,
    openCart,
    closeCart,
    isCartOpen,
  };

  return (
    <PosContext.Provider value={contextValue}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* Mobile Header */}
        <MobileHeader 
          user={user}
          onMenuOpen={() => setSidebarOpen(true)} 
        />

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-50 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavClick={() => setSidebarOpen(false)} user={user} orderData={orderData}/>
          </SheetContent>
        </Sheet>

        {/* Desktop Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
            <SidebarContent user={user} orderData={orderData}/>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </PosContext.Provider>
  );
}