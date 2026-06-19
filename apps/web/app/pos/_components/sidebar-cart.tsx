// app/(pos)/components/sidebar-cart.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  ShoppingCart,
  Minus,
  Plus,
  Loader2,
  MapPin,
  User,
  UserPlus,
  X,
  CreditCard,
  Save,
  Check,
  Printer,
  DollarSign,
  Tag,
  Percent,
  Receipt,
  GripVertical,
  AlertCircle,
  Edit2,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getFinalPrice } from "@/lib/utils";
import { PrintDialog } from "./print-dialog";
import { Separator } from "@/components/ui/separator";
import { CustomerSelector } from "./customer-selector";

// ============================================
// TYPES
// ============================================

interface MedusaCartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail?: string;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  subtotal: number;
  metadata?: {
    variant_title?: string;
    variant_sku?: string;
    is_custom_priced?: boolean;
    custom_price_applied_by?: string;
    original_price?: number;
    pricing_strategy?: 'price_list' | 'customer_group' | 'custom' | 'default';
    discount_percentage?: number;
    discount_amount?: number;
    note?: string;
    price_list_id?: string;
  };
}

interface MedusaCart {
  id: string;
  region_id: string;
  customer_id?: string;
  email?: string;
  currency_code: string;
  items: MedusaCartItem[];
  metadata?: {
    table_ids?: string[];
    pricing_strategy?: string;
    price_list_id?: string;
    customer_group_id?: string;
    custom_prices?: Record<string, any>;
    is_draft?: boolean;
    draft_name?: string;
    notes?: string;
    discount_amount?: number;
    service_charge?: number;
  };
}

interface Customer {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  customer_group_id?: string;
}

interface SimpleTable {
  id: string;
  name: string;
  number: string;
  capacity: number;
  status: string;
}

interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

// ============================================
// PRICE INFO COMPONENT
// ============================================

const PriceInfo = ({ 
  unitPrice, 
  originalPrice, 
  currencyCode, 
  pricingStrategy 
}: { 
  unitPrice: number; 
  originalPrice?: number; 
  currencyCode: string;
  pricingStrategy?: string;
}) => {
  const hasDiscount = originalPrice && originalPrice > unitPrice;
  const discountPercent = hasDiscount 
    ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100) 
    : 0;

  const finalPrice = getFinalPrice(unitPrice);


  
  const getStrategyBadge = () => {
    switch (pricingStrategy) {
      case 'price_list': return { text: 'Promo', color: 'bg-blue-100 text-blue-700' };
      case 'customer_group': return { text: 'Group Price', color: 'bg-green-100 text-green-700' };
      case 'custom': return { text: 'Custom', color: 'bg-purple-100 text-purple-700' };
      default: return null;
    }
  };

  const strategyBadge = getStrategyBadge();
console.log(finalPrice, 'FINAL', )
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-semibold text-primary">
          {currencyCode} {finalPrice.toFixed(2)}
        </span>
        {hasDiscount && (
          <span className="text-xs text-muted-foreground line-through">
            {currencyCode} {originalPrice.toFixed(2)}
          </span>
        )}
      </div>
      {hasDiscount && discountPercent > 0 && (
        <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">
          -{discountPercent}%
        </Badge>
      )}
      {strategyBadge && (
        <Badge className={cn("text-[10px]", strategyBadge.color)}>
          <Tag className="h-2 w-2 mr-1" />
          {strategyBadge.text}
        </Badge>
      )}
    </div>
  );
};

// ============================================
// CART ITEM COMPONENT WITH INLINE EDITING
// ============================================

interface CartItemProps {
  item: MedusaCartItem;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemove: (lineId: string) => Promise<void>;
  onCustomPrice: (lineId: string, variantId: string, price: number, reason?: string) => Promise<void>;
  onRemoveCustomPrice: (lineId: string, variantId: string) => Promise<void>;
  currencyCode: string;
}

function CartItem({ 
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
  const savingsPercent = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;

  // Update local state when props change
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
      // State will update via props
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
          // Inline Edit Mode
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
                  onChange={(e) => setCustomPrice(Math.max(0, parseFloat(e.target.value)))}
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
          // View Mode
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

// ============================================
// TABLE SELECTOR (Simplified)
// ============================================

function TableSelector({ selectedIds, onSelect, disabledIds = [] }: { 
  selectedIds: string[]; 
  onSelect: (ids: string[]) => void;
  disabledIds?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tables, setTables] = useState<SimpleTable[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("simple-tables");
    if (stored) {
      setTables(JSON.parse(stored));
    } else {
      const defaultTables = Array.from({ length: 10 }, (_, i) => ({
        id: `table-${i + 1}`,
        name: `Table ${i + 1}`,
        number: (i + 1).toString(),
        capacity: i >= 8 ? 8 : i >= 6 ? 6 : 4,
        status: "available",
      }));
      setTables(defaultTables);
    }
  }, []);

  const toggleTable = (tableId: string) => {
    if (selectedIds.includes(tableId)) {
      onSelect(selectedIds.filter(id => id !== tableId));
    } else {
      onSelect([...selectedIds, tableId]);
    }
  };

  const getTableName = (id: string) => tables.find(t => t.id === id)?.name || id;

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-xs font-medium">Tables ({selectedIds.length})</label>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsOpen(true)}>
          <MapPin className="mr-1 h-3 w-3" />
          {selectedIds.length > 0 ? "Change" : "Select"}
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map(id => (
            <Badge key={id} variant="secondary" className="gap-1 text-xs">
              <MapPin className="h-2 w-2" />
              {getTableName(id)}
              <button onClick={() => onSelect(selectedIds.filter(tid => tid !== id))}>
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Tables</DialogTitle>
            <DialogDescription>Choose tables for this order</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {tables.map(table => {
                const isSelected = selectedIds.includes(table.id);
                const isDisabled = disabledIds.includes(table.id) && !isSelected;
                
                return (
                  <button
                    key={table.id}
                    onClick={() => !isDisabled && toggleTable(table.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      isSelected && "border-primary bg-primary/5",
                      isDisabled && "opacity-50 cursor-not-allowed bg-muted"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{table.name}</div>
                        <div className="text-xs text-muted-foreground">Capacity: {table.capacity}</div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ============================================
// MAIN CART SIDEBAR
// ============================================

interface CartSidebarProps {
  cart: MedusaCart | null;
  customerGroupId?: any;
  region?: Region;
  selectedTableIds: string[];
  selectedCustomer: Customer | null;
  orderNotes: string;
  isLoading: boolean;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemoveFromCart: (lineId: string) => Promise<void>;
  onClearCart: () => Promise<void>;
  onTablesChange: (tableIds: string[]) => void;
  onCustomerChange: (customer: Customer | null) => Promise<void>;
  onNotesChange: (notes: string) => void;
  onCheckout: () => Promise<void>;
  onSaveDraft: (draftName: string) => Promise<void>;
  onApplyCustomPrice: (lineId: string, variantId: string, price: number, reason?: string) => Promise<void>;
  onRemoveCustomPrice: (lineId: string, variantId: string) => Promise<void>;
  onLoadDraft?: (draftId: string) => Promise<void>;
}

export function CartSidebar({
  customerGroupId,
  cart,
  region,
  selectedTableIds,
  selectedCustomer,
  orderNotes,
  isLoading,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onTablesChange,
  onCustomerChange,
  onNotesChange,
  onCheckout,
  onSaveDraft,
  onApplyCustomPrice,
  onRemoveCustomPrice,
  onLoadDraft,
}: CartSidebarProps) {
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem("simple-tables");
      if (stored) {
        const tables = JSON.parse(stored);
        const occupied = tables.filter((t: any) => t.status === "occupied").map((t: any) => t.id);
        setOccupiedTables(occupied);
      }
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  const subtotal = cart?.items?.reduce((sum, item) => sum + (getFinalPrice(item.unit_price) * item.quantity), 0) || 0;
  const taxRate = region?.tax_rate || 0;
  const taxTotal = subtotal * (taxRate / 100);
  const serviceCharge = cart?.metadata?.service_charge || 0;
  const discountAmount = cart?.metadata?.discount_amount || 0;
  const total = subtotal + taxTotal + serviceCharge - discountAmount;
  const currencyCode = region?.currency_code?.toUpperCase() || "PHP";
  const itemCount = cart?.items?.length || 0;

  const customPricedItems = cart?.items?.filter(i => i.metadata?.is_custom_priced) || [];
  const regularItems = cart?.items?.filter(i => !i.metadata?.is_custom_priced) || [];

  return (
    <>
      <PrintDialog open={printOpen} onOpenChange={setPrintOpen} cart={cart} />

      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Draft Order</DialogTitle>
            <DialogDescription>Name this draft for easy access later</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g., Walk-in - Table 5"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDraftDialog(false)}>Cancel</Button>
            <Button onClick={() => { onSaveDraft(draftName); setShowDraftDialog(false); setDraftName(""); }}>
              Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main container - full height flex column */}
      <div className="flex flex-col h-full">
        {/* Header - fixed at top */}
        <div className="border-b p-3 md:p-4 flex-shrink-0 bg-background">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
              <h2 className="font-semibold text-sm md:text-base">Current Order</h2>
              {itemCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 md:h-8" onClick={() => setPrintOpen(true)}>
                <Printer className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 md:h-8" onClick={() => setShowDraftDialog(true)}>
                <Save className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 md:h-8 text-destructive" onClick={onClearCart}>
                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <TableSelector
              selectedIds={selectedTableIds}
              onSelect={onTablesChange}
              disabledIds={occupiedTables}
            />

            <CustomerSelector
              selected={selectedCustomer}
              onSelect={onCustomerChange}
              onClear={() => onCustomerChange(null)}
              customerGroupId={customerGroupId}
              
            />

            {cart?.metadata?.pricing_strategy && cart.metadata.pricing_strategy !== 'default' && (
              <div className="p-2 bg-muted rounded-md text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  <span className="font-medium">Pricing:</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {cart.metadata.pricing_strategy}
                  </Badge>
                </div>
                {customPricedItems.length > 0 && (
                  <div className="text-muted-foreground mt-1">
                    {customPricedItems.length} item(s) have custom prices
                  </div>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs">Order Notes</Label>
              <Input
                placeholder="Special instructions..."
                value={orderNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="text-xs h-8 md:h-9 mt-1"
              />
            </div>
          </div>
        </div>

        {/* Scrollable cart items area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3 md:p-4">
            { itemCount === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs md:text-sm text-muted-foreground">Cart is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Add items to get started</p>
              </div>
            ) : (
              <>
                {customPricedItems.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveFromCart}
                    onCustomPrice={onApplyCustomPrice}
                    onRemoveCustomPrice={onRemoveCustomPrice}
                    currencyCode={currencyCode}
                  />
                ))}
                
                {regularItems.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveFromCart}
                    onCustomPrice={onApplyCustomPrice}
                    onRemoveCustomPrice={onRemoveCustomPrice}
                    currencyCode={currencyCode}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Footer with sticky checkout button */}
        <div className="border-t p-3 md:p-4 flex-shrink-0 bg-background">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{currencyCode} {subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{currencyCode} {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span className="font-medium">{currencyCode} {taxTotal.toFixed(2)}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span className="font-medium">{currencyCode} {serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base md:text-lg">
                <span>Total</span>
                <span className="text-primary">{currencyCode} {total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full h-10 md:h-11 text-sm md:text-base"
              onClick={onCheckout}
              disabled={!itemCount || isLoading}
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Checkout • {currencyCode} {total.toFixed(2)}
            </Button>

            {cart?.metadata?.is_draft && (
              <p className="text-xs text-muted-foreground text-center">
                Draft order - Complete checkout to finalize
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}