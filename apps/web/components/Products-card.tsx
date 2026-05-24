// components/product-card.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasSale = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <Card className="group overflow-hidden border-0 shadow-none">
      <Link href={`/product/${product.slug}`}>
        <div
          className="relative overflow-hidden rounded-lg bg-muted"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="aspect-[4/5] relative">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className={cn(
                "object-cover transition-opacity duration-300",
                isHovered && product.hoverImage ? "opacity-0" : "opacity-100"
              )}
            />
            {product.hoverImage && (
              <Image
                src={product.hoverImage}
                alt={product.title}
                fill
                className={cn(
                  "object-cover transition-opacity duration-300",
                  isHovered ? "opacity-100" : "opacity-0"
                )}
              />
            )}
          </div>
          {hasSale && (
            <div className="absolute top-2 right-2 bg-white px-2 py-1 text-xs font-semibold rounded-full">
              Sale
            </div>
          )}
        </div>
        <CardContent className="p-0 mt-4 space-y-1">
          <h3 className="font-medium text-sm line-clamp-2">{product.title}</h3>
          <div className="flex items-center gap-2">
            <span className="font-semibold">${product.price.toFixed(2)}</span>
            {hasSale && (
              <span className="text-muted-foreground line-through text-sm">
                ${product.compareAtPrice?.toFixed(2)}
              </span>
            )}
          </div>
        </CardContent>
      </Link>
      <Button
        className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
        variant="outline"
      >
        Add to Cart
      </Button>
    </Card>
  );
}