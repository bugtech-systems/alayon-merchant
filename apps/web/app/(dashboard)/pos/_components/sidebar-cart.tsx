// app/(pos)/components/cart-sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  Calendar,
  Clock,
  Printer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/data/cookies";
import { sdk } from "@/lib/config";
import { SimpleTable } from "./pos-app";

// Types
interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  variant_title?: string;
  subtotal: number;
}

interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

interface Customer {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
}

// Multi-Table Selector Component
function MultiTableSelector({ 
  selectedTableIds, 
  onTablesChange,
  disabledTables = []
}: { 
  selectedTableIds: string[];
  onTablesChange: (tableIds: string[]) => void;
  disabledTables?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTables, setAvailableTables] = useState<SimpleTable[]>([]);

  useEffect(() => {
    const loadTables = () => {
      const stored = localStorage.getItem("simple-tables");
      if (stored) {
        setAvailableTables(JSON.parse(stored));
      }
    };
    
    loadTables();
    
    // Listen for table updates
    window.addEventListener("storage", loadTables);
    return () => window.removeEventListener("storage", loadTables);
  }, []);

  const getTableName = (id: string) => {
    const table = availableTables.find(t => t.id === id);
    return table?.name || id;
  };

  const toggleTable = (tableId: string) => {
    if (selectedTableIds.includes(tableId)) {
      onTablesChange(selectedTableIds.filter(id => id !== tableId));
    } else {
      onTablesChange([...selectedTableIds, tableId]);
    }
  };

  const isTableDisabled = (table: SimpleTable) => {
    // Disable if table is occupied or reserved (unless already selected)
    if (disabledTables.includes(table.id)) return true;
    if (table.status === "occupied" && !selectedTableIds.includes(table.id)) return true;
    if (table.status === "reserved" && !selectedTableIds.includes(table.id)) return true;
    return false;
  };

  const getTableStatusBadge = (table: SimpleTable) => {
    if (table.status === "occupied") return { text: "Occupied", className: "bg-red-100 text-red-700" };
    if (table.status === "reserved") return { text: "Reserved", className: "bg-yellow-100 text-yellow-700" };
    if (table.status === "cleaning") return { text: "Cleaning", className: "bg-blue-100 text-blue-700" };
    return { text: "Available", className: "bg-green-100 text-green-700" };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">Tables ({selectedTableIds.length})</label>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsOpen(true)}>
          <MapPin className="mr-1 h-3 w-3" />
          {selectedTableIds.length > 0 ? "Change" : "Select"}
        </Button>
      </div>

      {selectedTableIds.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedTableIds.map(id => (
            <Badge key={id} variant="secondary" className="gap-1 text-xs">
              <MapPin className="h-2 w-2" />
              {getTableName(id)}
              <button onClick={() => onTablesChange(selectedTableIds.filter(tid => tid !== id))} className="ml-1 hover:text-destructive">
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No tables assigned</div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Tables</DialogTitle>
            <DialogDescription>Choose one or more tables for this order</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-2">
              {availableTables.map(table => {
                const isSelected = selectedTableIds.includes(table.id);
                const isDisabled = isTableDisabled(table);
                const statusBadge = getTableStatusBadge(table);
                
                return (
                  <button
                    key={table.id}
                    onClick={() => !isDisabled && toggleTable(table.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      isSelected && "border-primary bg-primary/5",
                      isDisabled && "opacity-50 cursor-not-allowed bg-muted",
                      !isDisabled && !isSelected && "hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{table.name}</span>
                          <Badge className={cn("text-[10px]", statusBadge.className)}>
                            {statusBadge.text}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Capacity: {table.capacity} pax
                        </div>
                        {table.status === "occupied" && table.customer_name && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Customer: {table.customer_name}
                          </div>
                        )}
                        {table.status === "reserved" && table.reserved_name && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-2 w-2" />
                            Reserved for: {table.reserved_name}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Customer Selector Component (same as before)
function CustomerSelector({ selectedCustomer, onSelectCustomer, onClear }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchCustomers = async () => {
    if (!searchTerm) return;
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await sdk.client.fetch(`/store/customers?q=${searchTerm}`, {
        method: "GET",
        headers,
      });
      setCustomers(response.customers || []);
    } catch (error) {
      console.error("Error searching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomer = async () => {
    if (!searchTerm) return;
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await sdk.client.fetch("/store/customers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: `${searchTerm.toLowerCase().replace(/\s/g, "")}@temp.com`,
          first_name: searchTerm,
          last_name: "",
        }),
      });
      if (response.customer) {
        onSelectCustomer({
          id: response.customer.id,
          first_name: response.customer.first_name,
          email: response.customer.email,
          phone: response.customer.phone,
        });
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error creating customer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">Customer</label>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsOpen(true)}>
          <UserPlus className="mr-1 h-3 w-3" />
          {selectedCustomer ? "Change" : "Add"}
        </Button>
      </div>

      {selectedCustomer ? (
        <Badge variant="secondary" className="gap-1 text-xs">
          <User className="h-3 w-3" />
          {selectedCustomer.first_name}
          <button onClick={onClear} className="ml-1 hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ) : (
        <div className="text-xs text-muted-foreground">No customer selected</div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>Search for an existing customer or create a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={searchCustomers} disabled={isLoading} size="sm">
                Search
              </Button>
            </div>
            {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
            {customers.length > 0 && (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        onSelectCustomer(customer);
                        setIsOpen(false);
                      }}
                      className="w-full p-3 rounded-lg border text-left hover:bg-accent"
                    >
                      <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {searchTerm && customers.length === 0 && !isLoading && (
              <Button variant="outline" onClick={createCustomer} className="w-full">
                Create "{searchTerm}" as new customer
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Cart Item Component
const CartItemComponent = ({ item, onUpdateQuantity, onRemove, region }: any) => (
  <div className="flex gap-2 rounded-lg border bg-card p-2">
    <div className="flex-1 min-w-0">
      <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
      {item.variant_title && <p className="text-xs text-muted-foreground">{item.variant_title}</p>}
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs font-semibold text-primary">
          {region?.currency_code?.toUpperCase() || "PHP"} {item.unit_price?.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
      </div>
    </div>
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-6 text-center text-xs">{item.quantity}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => onRemove(item.id)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  </div>
);

// Main Cart Sidebar Component
interface CartSidebarProps {
  cartItems: CartItem[];
  cartTotal: number;
  isLoading: boolean;
  region?: Region;
  selectedTableIds: string[];
  selectedCustomer: Customer | null;
  orderNotes: string;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemoveFromCart: (lineId: string) => Promise<void>;
  onClearCart: () => Promise<void>;
  onTablesChange: (tableIds: string[]) => void;
  onCustomerChange: (customer: Customer | null) => void;
  onNotesChange: (notes: string) => void;
  onCheckout: () => void;
  onSaveDraft: () => Promise<void>;
  onPrint?: any
}

export function CartSidebar({
  cartItems,
  cartTotal,
  isLoading,
  region,
  selectedTableIds,
  selectedCustomer,
  orderNotes,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onTablesChange,
  onCustomerChange,
  onNotesChange,
  onCheckout,
  onSaveDraft,
  onPrint
}: CartSidebarProps) {
  // Get occupied tables to disable them in selection
  const [occupiedTableIds, setOccupiedTableIds] = useState<string[]>([]);
  
  useEffect(() => {
    const loadOccupiedTables = () => {
      const stored = localStorage.getItem("simple-tables");
      if (stored) {
        const tables = JSON.parse(stored);
        const occupied = tables
          .filter((t: any) => t.status === "occupied" || t.status === "reserved")
          .map((t: any) => t.id);
        setOccupiedTableIds(occupied);
      }
    };
    
    loadOccupiedTables();
    window.addEventListener("storage", loadOccupiedTables);
    return () => window.removeEventListener("storage", loadOccupiedTables);
  }, []);

  return (
    <>
      <div className="border-b p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <h2 className="font-semibold text-sm">Current Order</h2>
          </div>
          <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7" onClick={onPrint}>
              <Printer className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={onSaveDraft}>
              <Save className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={onClearCart}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <MultiTableSelector 
          selectedTableIds={selectedTableIds}
          onTablesChange={onTablesChange}
          disabledTables={occupiedTableIds.filter(id => !selectedTableIds.includes(id))}
        />
        
        <div className="mt-3">
          <CustomerSelector 
            selectedCustomer={selectedCustomer}
            onSelectCustomer={onCustomerChange}
            onClear={() => onCustomerChange(null)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-2 p-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Cart is empty</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <CartItemComponent
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveFromCart}
                  region={region}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      
      <div className="border-t p-3 flex-shrink-0">
        <div className="flex justify-between text-sm font-bold mb-3">
          <span>Total</span>
          <span>{region?.currency_code?.toUpperCase() || "PHP"} {cartTotal.toFixed(2)}</span>
        </div>
        
        <Input
          placeholder="Order notes..."
          value={orderNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="text-xs h-8 mb-3"
        />
        
        <Button 
          size="sm" 
          className="w-full" 
          onClick={onCheckout} 
          disabled={cartItems.length === 0}
        >
          <CreditCard className="mr-1 h-3 w-3" />
          Checkout
        </Button>
      </div>
    </>
  );
}