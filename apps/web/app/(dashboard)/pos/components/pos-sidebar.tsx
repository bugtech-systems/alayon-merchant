"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Building2,
  Warehouse,
  Star,
  History,
  FileText,
  Settings,
  Users,
  LayoutDashboard,
  TrendingUp,
  User,
  LogOut,
  HelpCircle,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  disable?: boolean;
}

export function PosSidebar() {
  const pathname = usePathname();
  const draftCount = 3; // This would come from your state management

  const mainNavItems: NavItem[] = [
    { title: "Dashboard", href: "/pos", icon: LayoutDashboard },
    { title: "Products", href: "/pos/products", icon: Building2, disable: true },
    { title: "Tables", href: "/pos/tables", icon: Layers, disable: true },
    { title: "Customers", href: "/pos/customers", icon: Users, disable: true },
    { title: "Drafts", href: "/pos/drafts", icon: History, badge: draftCount, disable: true },
  ];

  const secondaryNavItems: NavItem[] = [
    { title: "Top Deals", href: "/pos/deals", icon: Star },
    { title: "Reports", href: "/pos/reports", icon: FileText },
    { title: "Where How's", href: "/pos/inventory", icon: Warehouse },
    { title: "Settings", href: "/pos/settings", icon: Settings },
  ];

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <Link href={item.href} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </div>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Alayon POS</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Profile Section */}
        <div className="mx-3 mt-4 mb-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 cursor-pointer hover:bg-muted transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/avatars/01.png" alt="User" />
                    <AvatarFallback>SU</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Staff User</p>
                    <p className="text-xs text-muted-foreground truncate">POS Terminal</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Staff User - POS Terminal</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItemComponent key={item.href} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <NavItemComponent key={item.href} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Today's Sales Widget */}
        <SidebarGroup>
          <div className="mx-3 mt-4">
            <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Today's Sales</p>
                <TrendingUp className="h-3 w-3 text-green-600" />
              </div>
              <p className="text-2xl font-bold">₱1,234.55</p>
              <p className="text-xs text-muted-foreground mt-1">+12% from yesterday</p>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                  <span>12 orders</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>34 customers</span>
                </div>
              </div>
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help">
              <Link href="/pos/help">
                <HelpCircle className="h-4 w-4" />
                <span>Help & Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logout">
              <button className="w-full text-destructive hover:text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}