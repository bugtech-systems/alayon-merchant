"use client";

import { useState } from "react";

import { BadgeCheck, Bell, CreditCard, LogOut, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import LocalizedClientLink from "@/modules/common/components/localized-client-link";
import { redirect } from "next/navigation";
import { useMedusaAuth } from "@/providers/MedusaAuthProvider";

export function AccountSwitcher({
  users = [],
}:any) {
  const [activeUser, setActiveUser] = useState(users[0] ?? null);
  const { logout } = useMedusaAuth() as any;
  const {logout: authLogout } = useAuth()
const handleLogout = () => {
  console.log('logggout')
logout()
authLogout()
}


if(!activeUser){
return  (
   <LocalizedClientLink className="hover:text-ui-fg-base" href="/login">
      <button className="mx-3 flex gap-1.5 items-center rounded-2xl bg-none shadow-none border-none hover:bg-neutral-100 px-2 py-1">
        <User height="20"/>
        <span className="hidden small:inline-block">
           {activeUser ? activeUser?.first_name : "Log in"}
        </span>
      </button>
    </LocalizedClientLink>
)
}


let avatar = "https://robohash.org/" +
            activeUser.id +
            "?size=200x200&set=set1&bgset=bg1"
let redirection = activeUser?.metadata?.role == 'company' ? '/account/company' : '/account/driver';
return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 rounded-lg">
          <AvatarImage src={avatar || undefined} alt={activeUser?.first_name} />
          <AvatarFallback className="rounded-lg">{getInitials(activeUser.first_name + ' ' + activeUser.last_name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
          <DropdownMenuItem
            className={cn("p-0", "border-l-2 border-l-primary bg-accent/50")}
          >
            <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
              <Avatar className="size-9 rounded-lg">
                <AvatarImage src={avatar || undefined} alt={activeUser.name} />
                <AvatarFallback className="rounded-lg">{getInitials(activeUser.first_name + ' ' + activeUser.last_name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeUser.first_name + ' ' + activeUser.last_name}</span>
                <span className="truncate text-xs capitalize">{activeUser.role}</span>
              </div>
            </div>
          </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => redirect(redirection)}
          >
            <BadgeCheck />
            Account
          </DropdownMenuItem>
          {/* <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem> */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
