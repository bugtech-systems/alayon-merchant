"use client";

import { MedusaOfflineProvider } from "@/components/medusa-offline-provider";

interface PosClientProviderProps {
  children: React.ReactNode;
}

export function PosClientProvider({ children }: PosClientProviderProps) {
  return (
    <MedusaOfflineProvider>
      {children}
    </MedusaOfflineProvider>
  );
}