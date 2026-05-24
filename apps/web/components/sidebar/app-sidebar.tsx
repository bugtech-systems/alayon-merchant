"use client";

import Link from "next/link";
import { CircleHelp, ClipboardList, Command, Database, File, Search, Settings } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { companySidebarItems, riderSidebarItems } from "@/data/sidebar/company-sidebar-items";
import { AccountSwitcher } from "./account-switcher";
import { NavUser } from "./nav-user";



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar> | any) {
  
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;
  const user = props.user;
  const isCompany = user?.metadata?.role == 'company' ? true : false

  console.log(user, 'ussssaa')
  return (
    <Sidebar variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/">
                <Command />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={isCompany ? companySidebarItems : riderSidebarItems} />
        {/* <NavDocuments items={_data.documents} /> */}
        {/* <NavSecondary items={_data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        {/* Uncomment when SidebarSupportCard is fixed */}
        {/* <SidebarSupportCard /> */}
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}