"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Package } from "lucide-react";
import Image from "next/image";

interface ProductCardProps {
  product: any;
  onAddToCart: (variant: any) => void;
  isLoading?: boolean;
  region?: { currency_code: string } | null;
}

export function ProductCard({ product, onAddToCart, isLoading = false, region }: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<any | null>(
    product.variants?.[0] || null
  );
  

  console.log(product, 'prroo', selectedVariant)
  const getPrice = () => {
    if (selectedVariant?.calculated_price) {
      return selectedVariant.calculated_price.calculated_amount;
    }
    if (selectedVariant?.prices?.[0]) {
      return selectedVariant.prices[0].amount;
    }
    return 0;
  };

  const price = getPrice();
  const hasVariants = product.variants && product.variants.length > 1;

  return (
    <Card className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {product.discountable && (
            <Badge variant="secondary" className="absolute left-2 top-2">Sale</Badge>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold line-clamp-1">{product.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {product.description || "Delicious item"}
          </p>
          
          {hasVariants && (
            <Select
              value={selectedVariant?.id}
              onValueChange={(value) => {
                const variant = product.variants.find(v => v.id === value);
                setSelectedVariant(variant || null);
              }}
            >
              <SelectTrigger className="mt-2 h-8 text-xs">
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                {product.variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {region?.currency_code?.toUpperCase() || "PHP"} {price.toFixed(2)}
            </span>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedVariant) onAddToCart(selectedVariant);
              }}
              disabled={isLoading}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}