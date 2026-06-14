// components/products-table.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface ProductsTableProps {
  products: any[];
  isLoading: boolean;
  onEditPricing: (product: any) => void;
}

export function ProductsTable({ products, isLoading, onEditPricing }: ProductsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const getProductPriceRange = (product: any) => {
    if (!product.variants?.length) return "N/A";
    const prices = product.variants.flatMap((v: any) => 
      v.prices?.filter((p: any) => p.currency_code === "php").map((p: any) => p.amount) || []
    );
    if (!prices.length) return "N/A";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Thumbnail</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead>Price Range</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No products found
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.thumbnail ? (
                    <Image
                      src={product.thumbnail}
                      alt={product.title}
                      width={40}
                      height={40}
                      className="rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/pos/products/${product.id}`}
                    className="hover:underline hover:text-primary"
                  >
                    {product.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {product.categories?.map((cat: any) => (
                      <Badge key={cat.id} variant="secondary">
                        {cat.name}
                      </Badge>
                    )) || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={product.status === "published" ? "default" : "secondary"}>
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>{product.variants?.length || 0}</TableCell>
                <TableCell>{getProductPriceRange(product)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditPricing(product)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Pricing
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}