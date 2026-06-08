"use client";

import { useState, useEffect } from "react";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Building2,
  Warehouse,
  Star,
  History,
  FileText,
  Settings,
  Users,
  Layers,
  ShoppingCart,
  Menu,
  User,
  TrendingUp,
  LogOut,
  CreditCard,
  QrCode,
  DollarSign,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOffline } from "@/components/medusa-offline-provider";
import { PosContext, type PosContextType } from "../../../contexts/pos-context";

// Navigation Items (static, can be moved to separate file)
const navItems: NavItem[] = [
  { icon: Building2, label: "Products", href: "/pos" },
  { icon: Layers, label: "Tables", href: "/pos/tables" },
  { icon: Users, label: "Customers", href: "/pos/customers", disabled: true },
  { icon: History, label: "Drafts", href: "/pos/drafts", disabled: true },
  { icon: FileText, label: "Reports", href: "/pos/reports", disabled: true },
  { icon: Settings, label: "Settings", href: "/pos/settings", disabled: true },
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

// Offline Status Bar Component
function OfflineStatusBar() {
  const { isOnline, pendingSyncCount, isSyncing, manualSync, lastSyncTime } = useOffline();

  return (
    <div className={cn(
      "sticky top-0 z-50 flex items-center justify-between px-4 py-2 text-sm border-b",
      isOnline ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
    )}>
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span className="font-medium">
          {isOnline ? 'Online Mode' : 'Offline Mode'}
        </span>
        {lastSyncTime && isOnline && (
          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {pendingSyncCount > 0 && (
          <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
            <span>{pendingSyncCount} pending {pendingSyncCount === 1 ? 'item' : 'items'}</span>
          </Badge>
        )}
        
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={manualSync}
          disabled={isSyncing || !isOnline}
          className="h-8"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          <span className="ml-2 hidden sm:inline">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </span>
        </Button>
      </div>
    </div>
  );
}

// Sidebar Content Component
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { pendingSyncCount, isOnline } = useOffline();
  const [draftCount, setDraftCount] = useState(0);
  
  const getActiveNav = () => {
    if (pathname?.includes("/pos/tables")) return "Tables";
    if (pathname?.includes("/pos/customers")) return "Customers";
    if (pathname?.includes("/pos/drafts")) return "Drafts";
    if (pathname?.includes("/pos/reports")) return "Reports";
    if (pathname?.includes("/pos/settings")) return "Settings";
    return "Products";
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
    
    window.addEventListener("storage", getDraftCount);
    window.addEventListener("draft-updated", getDraftCount);
    
    return () => {
      window.removeEventListener("storage", getDraftCount);
      window.removeEventListener("draft-updated", getDraftCount);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Alayon POS</span>
        </div>
      </div>

      {/* User Info Section */}
      <div className="px-3 py-4 border-b">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-2">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Staff User</p>
            <p className="text-xs text-muted-foreground truncate">POS Terminal</p>
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

        {/* Quick Stats */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Today's Sales</p>
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
          </div>
          <p className="text-2xl font-bold">₱ 1,234.55</p>
          <p className="text-xs text-muted-foreground mt-1">+12% from yesterday</p>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-600 flex-shrink-0" />
              <span>12 orders</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 flex-shrink-0" />
              <span>34 customers</span>
            </div>
          </div>
        </div>

        {/* Offline Status in Sidebar */}
        <div className="mt-4 px-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Sync Status</p>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  isOnline ? "bg-green-500" : "bg-yellow-500"
                )} />
                <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            {pendingSyncCount > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {pendingSyncCount} item{pendingSyncCount !== 1 ? 's' : ''} pending sync
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

// Mobile Header Component
function MobileHeader({ onMenuOpen, cartItemCount }: { onMenuOpen: () => void; cartItemCount: number }) {
  const { isOnline, pendingSyncCount } = useOffline();
  
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
        {pendingSyncCount > 0 && (
          <Badge variant="secondary" className="text-xs ml-1">
            {pendingSyncCount}
          </Badge>
        )}
      </div>
      <div className="w-10" />
    </div>
  );
}

// Main Layout Content Component
export function PosLayoutContent({ children }: { children: React.ReactNode }) {
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
    
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cart-updated", updateCartCount);
    
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cart-updated", updateCartCount);
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
    isCartOpen
  };

  return (
    <PosContext.Provider value={contextValue}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* Offline Status Bar - Shows at top */}
        <OfflineStatusBar />
        
        {/* Mobile Header */}
        <MobileHeader 
          onMenuOpen={() => setSidebarOpen(true)} 
          cartItemCount={cartItemCount}
        />

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavClick={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Desktop Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
            <SidebarContent />
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