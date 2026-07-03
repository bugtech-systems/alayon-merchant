// components/cart/cart-item.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Minus,
  Plus,
  Loader2,
  DollarSign,
  GripVertical,
  Check,
} from "lucide-react";
import { cn, getFinalPrice } from "@/lib/utils";
import { PriceInfo } from "./price-info";
import type { MedusaCartItem } from "@/types";

interface CartItemProps {
  item: MedusaCartItem;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemove: (lineId: string) => Promise<void>;
  onCustomPrice: (lineId: string, variantId: string, price: number, reason?: string) => Promise<void>;
  onRemoveCustomPrice: (lineId: string, variantId: string) => Promise<void>;
  currencyCode: string;
}

export function CartItem({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  onCustomPrice, 
  onRemoveCustomPrice, 
  currencyCode 
}: CartItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [customPrice, setCustomPrice] = useState(item.unit_price);
  const [priceReason, setPriceReason] = useState(item.metadata?.note || "");
  const [showReason, setShowReason] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(item.quantity);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const originalPrice = item.original_unit_price || getFinalPrice(item.unit_price);
  const hasCustomPrice = item.metadata?.is_custom_priced;
  const currentPrice = isEditing ? customPrice : getFinalPrice(item.unit_price);
  const itemTotal = getFinalPrice(currentPrice) * quantity;
  const savings = originalPrice - currentPrice;

  useEffect(() => {
    setQuantity(item.quantity);
    setEditingQuantity(item.quantity);
  }, [item.quantity]);

  useEffect(() => {
    setCustomPrice(getFinalPrice(item.unit_price));
  }, [item.unit_price]);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity === item.quantity) return;
    if (newQuantity <= 0) {
      await onRemove(item.id);
      return;
    }
    setIsUpdating(true);
    try {
      await onUpdateQuantity(item.id, newQuantity);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setEditingQuantity(value);
    }
  };

  const handleQuantityInputBlur = async () => {
    if (editingQuantity > 0 && editingQuantity !== item.quantity) {
      await handleQuantityChange(editingQuantity);
    } else if (editingQuantity <= 0) {
      setEditingQuantity(item.quantity || 1);
    } else {
      setEditingQuantity(item.quantity);
    }
  };

  const handleQuantityInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setEditingQuantity(item.quantity);
      e.currentTarget.blur();
    }
  };

  const handleSaveCustomPrice = async () => {
    if (customPrice <= 0) return;
    setIsUpdating(true);
    try {
      await onCustomPrice(item.id, item.variant_id, customPrice, priceReason);
      setIsEditing(false);
      setShowReason(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveCustomPrice = async () => {
    setIsUpdating(true);
    try {
      await onRemoveCustomPrice(item.id, item.variant_id);
      setCustomPrice(originalPrice);
      setIsEditing(false);
      setShowReason(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCustomPrice(getFinalPrice(item.unit_price));
    setPriceReason(item.metadata?.note || "");
    setShowReason(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setCustomPrice(getFinalPrice(item.unit_price));
    setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 100);
  };

  const hasNote = !!item.metadata?.note;

  return (
    <div className={cn(
      "flex gap-3 rounded-lg border p-3 mb-2 transition-all",
      isEditing ? "border-primary bg-primary/5" : "bg-card"
    )}>
      {item.thumbnail && (
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
            {item.metadata?.variant_title && (
              <p className="text-xs text-muted-foreground">{item.metadata.variant_title}</p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <GripVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClick}>
                <DollarSign className="mr-2 h-3 w-3" />
                {hasCustomPrice ? "Edit Custom Price" : "Set Custom Price"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onRemove(item.id)}>
                <Trash2 className="mr-2 h-3 w-3" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  {currencyCode}
                </span>
                <Input
                  ref={priceInputRef}
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="pl-8 h-8 text-sm"
                  step="0.01"
                  min="0"
                  disabled={isUpdating}
                />
              </div>
              {savings > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] whitespace-nowrap">
                  Save {currencyCode} {savings.toFixed(2)}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCustomPrice(Math.max(0, customPrice - 1))}
                disabled={isUpdating}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-12 text-center text-sm font-medium">{currencyCode}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCustomPrice(Math.max(0, customPrice + 1))}
                disabled={isUpdating}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowReason(!showReason)}
              >
                {showReason ? "Hide Reason" : "Add Reason"}
              </Button>
            </div>

            {showReason && (
              <Input
                placeholder="Reason for custom price (optional)"
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                className="h-7 text-xs"
                disabled={isUpdating}
              />
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              {hasCustomPrice && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleRemoveCustomPrice}
                  disabled={isUpdating}
                >
                  Remove
                </Button>
              )}
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSaveCustomPrice}
                disabled={isUpdating || customPrice <= 0}
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    {hasCustomPrice ? "Update" : "Apply"}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <PriceInfo
              unitPrice={getFinalPrice(item.unit_price)}
              originalPrice={item.original_unit_price}
              currencyCode={currencyCode}
              pricingStrategy={item.metadata?.pricing_strategy}
            />

            {hasNote && (
              <div className="mt-1 text-xs text-muted-foreground bg-muted/30 p-1 rounded">
                📝 {item.metadata?.note}
              </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={isUpdating}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <Input
                  ref={quantityInputRef}
                  type="number"
                  value={editingQuantity}
                  onChange={handleQuantityInputChange}
                  onBlur={handleQuantityInputBlur}
                  onKeyDown={handleQuantityInputKeyDown}
                  className="w-14 h-7 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="1"
                  disabled={isUpdating}
                />
                
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={isUpdating}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-semibold">{currencyCode} {itemTotal.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}