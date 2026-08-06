// app/(pos)/layout.tsx - Server Component
import { Suspense } from "react";
import { PosLayoutContent } from "./_components/pos-layout-content";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { retrieveUser } from "@/lib/data";
import { getTodayOrdersSummary } from "@/lib/data/pos";
import { redirect } from "next/navigation";
import { ChatButton } from "@/components/chat/chat-button";

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

    // Redirect to login if no user is found
    if (!user) {
        redirect("/login");
    }

    const data = await getTodayOrdersSummary(user);

  return (
      <Suspense fallback={<Spinner />}>
        <TooltipProvider>
        <PosLayoutContent user={user} orderData={data}>
          {children}
        </PosLayoutContent>
        </TooltipProvider>
           {user?.id && (
                <ChatButton
                  userId={user?.id}
                  userRole={user?.metadata?.role || "customer"}
                  customerId={user?.id}
                  token={user?.token}
                  serverUrl={process.env.SMS_URL}
                  defaultOpen={false}
                />
              )}
      </Suspense>
  );
}