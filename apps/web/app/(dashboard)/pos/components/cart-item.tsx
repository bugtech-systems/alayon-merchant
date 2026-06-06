"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Edit2 } from "lucide-react";
import Image from "next/image";
import { Package } from "lucide-react";

interface CartItem {
  id: string;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  variant_title?: string;
  notes?: string;
}

interface CartItemComponentProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  region?: { currency_code: string } | null;
  onAddNote?: (id: string, note: string) => void;
}

export function CartItemComponent({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  region,
  onAddNote 
}: CartItemComponentProps) {
  return (
    <div className="flex gap-3 rounded-lg border bg-card p-3 transition-all hover:shadow-sm">
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {item.thumbnail ? (
          <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
        {item.variant_title && (
          <p className="text-xs text-muted-foreground">{item.variant_title}</p>
        )}
        {item.notes && (
          <p className="text-xs text-muted-foreground italic mt-1">Note: {item.notes}</p>
        )}
        <p className="text-sm font-semibold text-primary mt-1">
          {region?.currency_code?.toUpperCase() || "PHP"} {item.unit_price.toFixed(2)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex gap-1">
          {onAddNote && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => {
              const note = prompt("Add note to item:", item.notes || "");
              if (note !== null) onAddNote(item.id, note);
            }}>
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => onRemove(item.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}