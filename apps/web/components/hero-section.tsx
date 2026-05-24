// components/hero-section.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const HeroSection = () => {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-amber-100/80 via-teal-100/60 to-stone-200/80">
      {/* SVG Decorative Pattern - Similar to original */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1300 730"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#heroClip)">
            <path d="M1300 410H0v320h1300V410Z" fill="#5BA7B1" />
            <path d="M1300 0H0v410h1300V0Z" fill="#E8BE9E" />
            <path
              d="M474 410c28.51-39.81 73.78-89.8 142-120 113.63-50.31 194.66-3.1 266-52 41.04-28.12 81.7-89.98 80-238h338v410H474Z"
              fill="#EDAB8E"
            />
            <path
              d="M1174 0c-4.57 45.64-17.01 110.48-52 180-69.25 137.58-182.37 205.13-230 230h408V0h-126Z"
              fill="#EA9A81"
            />
            <path
              d="M126 410c124.14 0 213.59-14.83 242-66 38.93-70.13-74.2-158.33-34-262 15.92-41.06 49.03-66.82 74-82H0v410h126Z"
              fill="#EDAB8E"
            />
            <path
              d="M126 410c-68.88-117.13-69.26-250.08-2-334 36.03-44.96 83.52-65.93 116-76H0v410h126Z"
              fill="#EA9A81"
            />
            <path
              d="M576 186c35.346 0 64-28.654 64-64 0-35.346-28.654-64-64-64-35.346 0-64 28.654-64 64 0 35.346 28.654 64 64 64Z"
              fill="#EAD1C1"
            />
            <path
              d="M576 170c26.51 0 48-21.49 48-48s-21.49-48-48-48-48 21.49-48 48 21.49 48 48 48Z"
              fill="#fff"
            />
          </g>
          <defs>
            <clipPath id="heroClip">
              <path fill="#fff" d="M0 0h1300v730H0z" />
            </clipPath>
          </defs>
        </svg>
      </div>

      {/* Gradient Overlay - Similar to original overlay--solid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, #12121266 0%, rgba(18, 18, 18, 0) 100%)",
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-4 py-24 sm:py-32 lg:py-40">
        <div className="flex flex-col items-center justify-end gap-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl text-foreground">
            Browse our latest products
          </h2>
          <Link href="/catalog">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full px-8 py-6 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Shop all
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Decorative Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-12 text-background"
          preserveAspectRatio="none"
          viewBox="0 0 1440 54"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 22L60 27.3C120 32.7 240 43.3 360 43.3C480 43.3 600 32.7 720 27.3C840 21.7 960 21.7 1080 27.3C1200 32.7 1320 43.3 1380 48.7L1440 54V54H0V22Z"
            fill="currentColor"
            className="text-background"
          />
        </svg>
      </div>
    </div>
  );
};