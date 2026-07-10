// app/thermal-print/page.jsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the printer component with no SSR
const ThermalPrinterComponent = dynamic(
  () => import('./ThermalPrinter'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading Printer Interface...</p>
        </div>
      </div>
    )
  }
);

export default function ThermalPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ThermalPrinterComponent />
    </Suspense>
  );
}