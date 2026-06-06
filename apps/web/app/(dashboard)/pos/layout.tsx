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
  Home,
  LogOut,
  HelpCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  icon: any;
  label: string;
  href: string;
  badge?: number;
  active?: boolean;
  disable?: boolean;
}

const navItems: NavItem[] = [
  { icon: Building2, label: "Products", href: "/pos" },
  { icon: Layers, label: "Tables", href: "/pos/tables", disable: true },
  { icon: Users, label: "Customers", href: "/pos/customers", disable: true },
  { icon: History, label: "Drafts", href: "/pos/drafts", disable: true },
  { icon: FileText, label: "Reports", href: "/pos/reports", disable: true },
  { icon: Settings, label: "Settings", href: "/pos/settings", disable: true },
];

interface PosLayoutProps {
  children: React.ReactNode;
  cartItemCount?: number;
  onCartClick?: () => void;
}

function NavItemComponent({ icon: Icon, label, active, onClick, badge, disable }: {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
  disable?: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disable}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden lg:inline">{label}</span>
            {badge !== undefined && badge > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {badge}
              </Badge>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function PosLayout({ children, cartItemCount = 0, onCartClick }: PosLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("products");
  const pathname = usePathname();

  // Update active nav based on pathname
  useEffect(() => {
    if (pathname?.includes("/pos/tables")) setActiveNav("tables");
    else if (pathname?.includes("/pos/customers")) setActiveNav("customers");
    else if (pathname?.includes("/pos/drafts")) setActiveNav("drafts");
    else if (pathname?.includes("/pos/reports")) setActiveNav("reports");
    else if (pathname?.includes("/pos/settings")) setActiveNav("settings");
    else setActiveNav("products");
  }, [pathname]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Alayon POS</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 py-4">
        <div className="mb-4 px-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted p-2">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Staff User</p>
              <p className="text-xs text-muted-foreground">POS Terminal</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.label.toLowerCase()}
              onClick={() => {
                setActiveNav(item.label.toLowerCase());
                setSidebarOpen(false);
                // Handle navigation
                if (item.href) {
                  window.location.href = item.href;
                }
              }}
              badge={item.badge}
              disable={item.disable}
            />
          ))}
        </nav>
        <Separator className="my-4" />
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Today's Sales</p>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold">PHP 1,234.55</p>
          <p className="text-xs text-muted-foreground mt-1">+12% from yesterday</p>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-600" />
              <span>12 orders</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>34 customers</span>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <LogOut className="h-4 w-4" />
          <span className="hidden lg:inline">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[90vh] flex-col overflow-hidden bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3 lg:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold">Alayon POS</h1>
        <Button variant="ghost" size="icon" className="relative" onClick={onCartClick}>
          <ShoppingCart className="h-5 w-5" />
          {cartItemCount > 0 && (
            <Badge className="absolute -right-1 -top-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
              {cartItemCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Desktop Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}