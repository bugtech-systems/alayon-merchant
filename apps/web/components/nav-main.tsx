"use client";

import { useState } from "react";
import Link from "next/link";
import { CirclePlusIcon, MailIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

// Import the Dialog components
import { CreateTransactionDialog } from "./CreateTransactionDialog";
import { CreateBettingsDialog } from "./CreateBettingsDialog";
import { CreateUserDialog } from "./CreateUserDialog";
import { SendMessageDialog } from "./SendMessageDialog";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
  }[];
}) {
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isBettingsDialogOpen, setIsBettingsDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Quick Create"
                    className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                  >
                    <CirclePlusIcon />
                    <span>Quick Create</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onSelect={() => setIsTransactionDialogOpen(true)}>
                    Create Transaction
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setIsUserDialogOpen(true)}>
                    Create Member
                  </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setIsUserDialogOpen(true)}>
                    Create Customer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="icon"
                className="size-8 group-data-[collapsible=icon]:opacity-0"
                variant="outline"
                onClick={() => setMessageOpen(!messageOpen)}
              >
                <MailIcon />
                <span className="sr-only">Inbox</span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <Link prefetch={false} href={item.url}>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Dialogs */}
      <CreateTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
      />
      <CreateBettingsDialog
        open={isBettingsDialogOpen}
        onOpenChange={setIsBettingsDialogOpen}
      />
      <CreateUserDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
      />
      <SendMessageDialog
          open={messageOpen}
          onOpenChange={setMessageOpen}
      />
    </>
  );
}