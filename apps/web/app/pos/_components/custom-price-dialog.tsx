// app/(pos)/components/custom-price-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle,
  ShoppingBag,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail?: string;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  metadata?: {
    variant_title?: string;
    is_custom_priced?: boolean;
    custom_price_applied_by?: string;
    custom_price_applied_at?: string;
    custom_price_reason?: string;
  };
}

interface CustomPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartItem | null;
  onApplyCustomPrice: any;
  onRemoveCustomPrice?: (itemId: string, variantId: string) => Promise<void>;
  currency_code?: string;
  region?: any;
  userId?: string;
  userName?: string;
}

export function CustomPriceDialog({
  open,
  onOpenChange,
  item,
  onApplyCustomPrice,
  onRemoveCustomPrice,
  currency_code,
  userId,
  userName,
}: CustomPriceDialogProps) {
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [priceReason, setPriceReason] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (item && open) {
      setCustomPrice(item.unit_price);
      setPriceReason(item.metadata?.custom_price_reason || "");
      setQuantity(item.quantity);
      setShowSuccess(false);
    }
  }, [item, open]);

  if (!item) return null;

  const originalPrice = item.original_unit_price || item.unit_price;
  const hasCustomPrice = item.metadata?.is_custom_priced;
  const savings = originalPrice - customPrice;
  const savingsPercent = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
  const currencyCode = currency_code?.toUpperCase() || "PHP";
  const totalOriginal = originalPrice * quantity;
  const totalNew = customPrice * quantity;
  const totalSavings = totalOriginal - totalNew;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= item.quantity) {
      setQuantity(newQuantity);
    }
  };

  const handleApplyCustomPrice = async () => {
    if (customPrice <= 0) {
      return;
    }
    
    setIsApplying(true);
    try {
      await onApplyCustomPrice(item.id, item.variant_id, customPrice, quantity, priceReason);
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Error applying custom price:", error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCustomPrice = async () => {
    if (!onRemoveCustomPrice) return;
    
    setIsRemoving(true);
    try {
      await onRemoveCustomPrice(item.id, item.variant_id);
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Error removing custom price:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  // Quick price presets
  const pricePresets = [
    { label: "Free", value: 0 },
    { label: "50% off", value: originalPrice * 0.5 },
    { label: "25% off", value: originalPrice * 0.75 },
    { label: "10% off", value: originalPrice * 0.9 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {hasCustomPrice ? "Edit Custom Price" : "Set Custom Price"}
          </DialogTitle>
          <DialogDescription>
            {hasCustomPrice ? "Update the custom price for this item" : "Override the price for this item"}
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {hasCustomPrice ? "Price Updated!" : "Custom Price Applied!"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasCustomPrice 
                  ? "The custom price has been updated successfully." 
                  : "The custom price has been applied to the item."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Item Information */}
            <div className="flex gap-3 p-3 bg-muted rounded-lg">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-12 w-12 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                {item.metadata?.variant_title && (
                  <p className="text-xs text-muted-foreground">{item.metadata.variant_title}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    Available: {item.quantity}
                  </Badge>
                  {hasCustomPrice && (
                    <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700">
                      Custom Priced
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Price Information */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Original Price:</span>
                <span className="text-sm line-through">
                  {currencyCode} {originalPrice.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Custom Price:</span>
                <div className="relative w-32">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {currencyCode}
                  </span>
                  <Input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="pl-8 text-right"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {savings > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-sm">Customer saves:</span>
                  <span className="text-sm font-semibold">
                    {currencyCode} {savings.toFixed(2)} ({savingsPercent.toFixed(0)}% off)
                  </span>
                </div>
              )}
            </div>

            {/* Quick Price Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick Presets</Label>
              <div className="grid grid-cols-4 gap-2">
                {pricePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomPrice(preset.value)}
                    className="text-xs h-8"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <Label className="text-sm">Quantity to Apply</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= item.quantity}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  of {item.quantity} available
                </span>
              </div>
            </div>

            {/* Reason for Custom Price */}
            <div className="space-y-2">
              <Label className="text-sm">Reason (Optional)</Label>
              <Textarea
                placeholder="Why is this price being changed? (e.g., Loyalty discount, Promo, etc.)"
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Total Preview */}
            <div className="p-3 bg-primary/5 rounded-lg">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Total:</span>
                  <span className="line-through text-muted-foreground">
                    {currencyCode} {totalOriginal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>New Total:</span>
                  <span className="text-primary">
                    {currencyCode} {totalNew.toFixed(2)}
                  </span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total Savings:</span>
                    <span>{currencyCode} {totalSavings.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning */}
            {!hasCustomPrice && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-700">
                  <p className="font-medium">Custom pricing will override standard pricing.</p>
                  <p className="mt-1">This price will be applied regardless of price lists or customer group pricing.</p>
                </div>
              </div>
            )}

            {/* Custom Price Info */}
            {hasCustomPrice && item.metadata?.custom_price_applied_at && (
              <div className="p-2 bg-blue-50 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-2 text-blue-700">
                  <span>Previously applied custom price</span>
                </div>
                {item.metadata.custom_price_applied_by && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span>Applied by: {item.metadata.custom_price_applied_by}</span>
                  </div>
                )}
                {item.metadata.custom_price_applied_at && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span>Applied on: {new Date(item.metadata.custom_price_applied_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              {hasCustomPrice && onRemoveCustomPrice && (
                <Button
                  variant="destructive"
                  onClick={handleRemoveCustomPrice}
                  disabled={isApplying || isRemoving}
                  className="flex-1 sm:flex-none"
                >
                  {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Remove
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCustomPrice}
                disabled={isApplying || customPrice <= 0}
                className="flex-1 sm:flex-none"
              >
                {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasCustomPrice ? "Update" : "Apply"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}