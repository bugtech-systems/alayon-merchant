// app/(pos)/layout.tsx - Server Component
import { Suspense } from "react";
import { PosClientProvider } from "./_components/pos-client-provider";
import { PosLayoutContent } from "./_components/pos-layout-content";
import { Spinner } from "@/components/ui/spinner";
import { retrieveUser } from "@/lib/data";

// This is a Server Component by default (no "use client" directive)
export const metadata = {
  title: "Alayon POS System",
  description: "Point of Sale System for Alayon",
};

interface PosLayoutProps {
  children: React.ReactNode;
}

export default function PosLayout({ children }: PosLayoutProps) {
  return (
    <PosClientProvider>
      <Suspense fallback={<Spinner />}>
        <PosLayoutContent>
          {children}
        </PosLayoutContent>
      </Suspense>
    </PosClientProvider>
  );
}