// app/page.tsx
"use client";

import { CustomerMap } from "@/components/map/customer-map";

export default function Home() {
  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Customer Mapping</h1>
        <p className="text-muted-foreground">
          Visualize customer locations and optimize routes
        </p>
      </div>
      <CustomerMap />
    </div>
  );
}