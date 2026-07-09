// app/(pos)/layout.tsx - Server Component
import { Suspense } from "react";
import { PosLayoutContent } from "./_components/pos-layout-content";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { retrieveUser } from "@/lib/data";
import { getTodayOrdersSummary } from "@/lib/data/pos";

// This is a Server Component by default (no "use client" directive)
export const metadata = {
  title: "Alayon POS System",
  description: "Point of Sale System for Alayon",
};

interface PosLayoutProps {
  children: React.ReactNode;
}

export default async function PosLayout({ children }: PosLayoutProps) {
    const user = await retrieveUser();

    const data = await getTodayOrdersSummary(user);

    console.log(data, 'dadada')
  return (
      <Suspense fallback={<Spinner />}>
        <TooltipProvider>
        <PosLayoutContent user={user} orderData={data}>
          {children}
        </PosLayoutContent>
        </TooltipProvider>
      </Suspense>
  );
}