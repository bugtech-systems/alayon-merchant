// components/cart/cart-sidebar.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Loader2,
  CreditCard,
  Printer,
  Trash2,
  Save,
  Tag,
  Users,
  AlertCircle,
} from "lucide-react";
import { cn, getFinalPrice } from "@/lib/utils";
import { PrintDialog } from "./print-dialog";
import { CartItem } from "./cart-item";
import { TableSelector } from "./table-selector";
import { CustomerSelector } from "./customer-selector";
import type { 
  MedusaCart, 
  Region, 
  Customer,
  DraftOrder 
} from "@/types";
import { createQuickCustomer } from "@/lib/actions";


interface CartSidebarProps {
  user?: any;
  cart: MedusaCart | null;
  region?: Region;
  selectedTableIds: string[];
  selectedCustomer: Customer | null;
  orderNotes: string;
  isLoading: boolean;
  drafts?: DraftOrder[]; // Make drafts optional with default empty array
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemoveFromCart: (lineId: string) => Promise<void>;
  onClearCart: () => Promise<void>;
  onTablesChange: (tableIds: string[]) => void;
  onCustomerChange: (customer: Customer | null) => Promise<void>;
  onNotesChange: (notes: string) => void;
  onCheckout: () => Promise<void>;
  onSaveDraft: (draftName: string) => Promise<void>;
  onLoadDraft: (draftId: string) => Promise<void>;
  onDeleteDraft: (draftId: string) => Promise<void>;
  onApplyCustomPrice: (lineId: string, variantId: string, price: number, reason?: string) => Promise<void>;
  onRemoveCustomPrice: (lineId: string, variantId: string) => Promise<void>;
}

export function CartSidebar({
  customerGroupId,
  cart,
  region,
  selectedTableIds,
  selectedCustomer,
  orderNotes,
  isLoading,
  drafts = [], // Default to empty array
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onTablesChange,
  onCustomerChange,
  onNotesChange,
  onCheckout,
  onSaveDraft,
  onLoadDraft,
  onDeleteDraft,
  onApplyCustomPrice,
  onRemoveCustomPrice,
}: any) {
  const [printOpen, setPrintOpen] = useState(false);
  const [occupiedTables, setOccupiedTables] = useState<string[]>([]);
  const [currentOrderTables, setCurrentOrderTables] = useState<string[]>([]);
   

// Update current order tables when selection changes
const handleTablesChange = (ids: string[]) => {
  localStorage.setItem("current_order_table_ids", JSON.stringify(ids));
  setCurrentOrderTables(ids)
  onTablesChange(ids)
  // Update table status in localStorage
  const stored = localStorage.getItem("simple-tables");
  if (stored) {
    const tables = JSON.parse(stored);
    const updated = tables.map((table: any) => ({
      ...table,
      status: ids.includes(table.id) ? 'occupied' : 
              table.status === 'occupied' ? 'available' : table.status
    }));
    localStorage.setItem("simple-tables", JSON.stringify(updated));
  }
};



  useEffect(() => {
    const loadOccupied = () => {
      const stored = localStorage.getItem("simple-tables");
      if (stored) {
        const tables = JSON.parse(stored);
        const occupied = tables
          .filter((t: any) => t.status === "occupied")
          .map((t: any) => t.id);
        setOccupiedTables(occupied);
      }
    };
    loadOccupied();
    window.addEventListener("storage", loadOccupied);
    return () => window.removeEventListener("storage", loadOccupied);
  }, []);

  const subtotal = cart?.items?.reduce(
    (sum, item) => sum + (getFinalPrice(item.unit_price) * item.quantity), 
    0
  ) || 0;
  
  const taxRate = region?.tax_rate || 0;
  const taxTotal = subtotal * (taxRate / 100);
  const serviceCharge = cart?.metadata?.service_charge || 0;
  const discountAmount = cart?.metadata?.discount_amount || 0;
  const total = subtotal + taxTotal + serviceCharge - discountAmount;
  const currencyCode = region?.currency_code?.toUpperCase() || "PHP";
  const itemCount = cart?.items?.length || 0;

  const customPricedItems = cart?.items?.filter(i => i.metadata?.is_custom_priced) || [];
  const regularItems = cart?.items?.filter(i => !i.metadata?.is_custom_priced) || [];

  // Group items by pricing strategy for better organization
  const groupedItems = {
    custom: customPricedItems,
    priceList: regularItems.filter(i => i.metadata?.pricing_strategy === 'price_list'),
    customerGroup: regularItems.filter(i => i.metadata?.pricing_strategy === 'customer_group'),
    default: regularItems.filter(i => !i.metadata?.pricing_strategy || i.metadata?.pricing_strategy === 'default'),
  };

  const hasItemsWithSpecialPricing = customPricedItems.length > 0 || 
    groupedItems.priceList.length > 0 || 
    groupedItems.customerGroup.length > 0;

  return (
    <>
      <PrintDialog open={printOpen} onOpenChange={setPrintOpen} cart={cart} />

      <div className="flex flex-col h-[85vh]">
        {/* Header */}
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 md:h-8"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              {/* <DraftsManager
                drafts={drafts}
                onLoadDraft={onLoadDraft}
                onDeleteDraft={onDeleteDraft}
                onSaveCurrentCart={onSaveDraft}
              /> */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 md:h-8 text-destructive hover:text-destructive"
                onClick={onClearCart}
              >
                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <TableSelector
              selectedIds={selectedTableIds}
              onSelect={handleTablesChange}
              currentOrderTableIds={currentOrderTables}
              occupiedTableIds={occupiedTables}
              onClear={() => {
                onTablesChange([]);
                localStorage.removeItem("current_order_table_ids");
                // Update all selected tables back to available
              }}
              onOccupy={async (tableId) => {
                // Mark table as occupied
              }}
              onClearTable={async (tableId) => {
                // Clear table occupancy
              }}
              onReserve={async (tableId) => {
                // Reserve table
              }}
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
                {hasItemsWithSpecialPricing && (
                  <div className="text-muted-foreground mt-1">
                    {customPricedItems.length > 0 && (
                      <span>{customPricedItems.length} custom priced</span>
                    )}
                    {groupedItems.priceList.length > 0 && (
                      <span className={customPricedItems.length > 0 ? 'ml-2' : ''}>
                        {groupedItems.priceList.length} promo
                      </span>
                    )}
                    {groupedItems.customerGroup.length > 0 && (
                      <span className={(customPricedItems.length > 0 || groupedItems.priceList.length > 0) ? 'ml-2' : ''}>
                        {groupedItems.customerGroup.length} group priced
                      </span>
                    )}
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

        {/* Scrollable cart items */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3 md:p-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : itemCount === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs md:text-sm text-muted-foreground">Cart is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Add items to get started</p>
              </div>
            ) : (
              <>
                {/* Custom priced items */}
                {groupedItems.custom.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] bg-purple-50">
                        Custom Prices
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                    {groupedItems.custom.map(item => (
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
                  </div>
                )}

                {/* Price list items */}
                {groupedItems.priceList.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] bg-blue-50">
                        Promo Items
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                    {groupedItems.priceList.map(item => (
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
                  </div>
                )}

                {/* Customer group items */}
                {groupedItems.customerGroup.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] bg-green-50">
                        <Users className="h-2 w-2 mr-1" />
                        Group Prices
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                    {groupedItems.customerGroup.map(item => (
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
                  </div>
                )}

                {/* Default items */}
                {groupedItems.default.map(item => (
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

        {/* Footer with totals and checkout */}
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

            <div className="flex gap-2">
              <Button
                className="flex-1 h-10 md:h-11 text-sm md:text-base"
                onClick={onCheckout}
                disabled={!itemCount || isLoading}
                size="lg"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Checkout
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-10 md:h-11 px-4"
                onClick={() => onSaveDraft("Draft - " + new Date().toLocaleString())}
                disabled={!itemCount || isLoading}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>

            {cart?.metadata?.is_draft && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center bg-muted/30 p-1.5 rounded-md">
                <AlertCircle className="h-3 w-3" />
                <span>Draft order — Complete checkout to finalize</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}