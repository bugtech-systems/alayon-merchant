// apps/web/components/map/popup.tsx
"use client";

import { useEffect, useRef, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

interface PopupProps {
  children: ReactNode;
}

export function Popup({ children }: PopupProps) {
  const popupRef = useRef<any>(null);

  useEffect(() => {
    // This is handled by the marker component
    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
    };
  }, []);

  return null;
}