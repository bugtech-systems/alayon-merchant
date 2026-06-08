// app/(dashboard)/pos/_components/simple-table-manager.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Utensils,
  Loader2,
  Search,
  Phone,
  User,
  Coffee,
  Circle,
  CreditCard,
  Receipt,
  Printer,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { capturePayment } from "@/lib/data/cart";
import { retrieveOrder } from "@/lib/data/orders";
import { PrintDialog } from "../_components/print-dialog";

// ============================================================================
// TYPES
// ============================================================================

export interface SimpleTable {
  id: string;
  name: string;
  number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_order_ids?: string[];
  current_order_id?: string;
  customer_name?: string;
  customer_phone?: string;
  reserved_for?: Date;
  reserved_name?: string;
  reserved_phone?: string;
  occupied_since?: Date;
  notes?: string;
}

interface OrderHistoryItem {
  id: string;
  display_id: number;
  cart_id: string;
  table_ids: string[];
  customer_name?: string;
  customer_id?: string;
  total: number;
  subtotal: number;
  tax: number;
  payment?: {
    method: string;
    captured: boolean;
    captured_at?: string;
    amount?: number;
    change?: number;
  };
  created_at: string;
  items: any[];
  notes?: string;
  pricing_summary?: {
    strategy: string;
    price_list_id?: string;
    customer_group_id?: string;
    custom_prices_count: number;
    total_discount: number;
  };
}

// ============================================================================
// LOCAL STORAGE HOOK - FIXED: Initialize 12 tables
// ============================================================================

function useTableStorage() {
  const [tables, setTables] = useState<SimpleTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem("simple-tables");
        
        if (stored) {
          const parsed = JSON.parse(stored);
          const withDates = parsed.map((table: any) => ({
            ...table,
            reserved_for: table.reserved_for ? new Date(table.reserved_for) : undefined,
            occupied_since: table.occupied_since ? new Date(table.occupied_since) : undefined,
          }));
          setTables(withDates);
        } else {
          // Generate 12 default tables
          const defaultTables: SimpleTable[] = [];
          for (let i = 1; i <= 10; i++) {
            let capacity = 8;

            
            defaultTables.push({
              id: `table-${i}`,
              name: `Table ${i}`,
              number: i.toString(),
              capacity: capacity,
              status: "available",
            });
          }
          setTables(defaultTables);
          localStorage.setItem("simple-tables", JSON.stringify(defaultTables));
        }
      } catch (error) {
        console.error("Error loading tables:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("simple-tables", JSON.stringify(tables));
      window.dispatchEvent(new Event("storage"));
    }
  }, [tables, isLoading]);

  const addTable = (table: Omit<SimpleTable, "id">) => {
    const newTable = { ...table, id: crypto.randomUUID() };
    setTables(prev => [...prev, newTable]);
    return newTable;
  };

  const updateTable = (id: string, updates: Partial<SimpleTable>) => {
    setTables(prev => prev.map(table => 
      table.id === id ? { ...table, ...updates } : table
    ));
  };

  const deleteTable = (id: string) => {
    const table = tables.find(t => t.id === id);
    if (table?.status === "occupied") {
      throw new Error("Cannot delete occupied table");
    }
    setTables(prev => prev.filter(table => table.id !== id));
  };

  const reserveTable = (tableId: string, name: string, phone: string, reservedFor: Date) => {
    setTables(prev => prev.map(table =>
      table.id === tableId && table.status === "available"
        ? {
            ...table,
            status: "reserved",
            reserved_name: name,
            reserved_phone: phone,
            reserved_for: reservedFor,
          }
        : table
    ));
  };

  const cancelReservation = (tableId: string) => {
    setTables(prev => prev.map(table =>
      table.id === tableId && table.status === "reserved"
        ? {
            ...table,
            status: "available",
            reserved_name: undefined,
            reserved_phone: undefined,
            reserved_for: undefined,
          }
        : table
    ));
  };

  const occupyTable = (tableId: string, orderId: string, customerName?: string, customerPhone?: string) => {
    setTables(prev => prev.map(table => {
      if (table.id !== tableId) return table;
      if (table.status !== "available" && table.status !== "reserved") return table;
      
      return {
        ...table,
        status: "occupied",
        current_order_ids: [...(table.current_order_ids || []), orderId],
        current_order_id: orderId,
        customer_name: customerName || table.reserved_name,
        customer_phone: customerPhone || table.reserved_phone,
        occupied_since: new Date(),
      };
    }));
  };

  const releaseTable = (tableId: string, orderId?: string) => {
    setTables(prev => prev.map(table => {
      if (table.id !== tableId || table.status !== "occupied") return table;
      
      const newOrderIds = table.current_order_ids?.filter(id => id !== orderId) || [];
      
      if (newOrderIds.length === 0) {
        return {
          ...table,
          status: "cleaning",
          current_order_ids: [],
          current_order_id: undefined,
          customer_name: undefined,
          customer_phone: undefined,
          occupied_since: undefined,
        };
      }
      
      return {
        ...table,
        status: "cleaning",
        current_order_ids: newOrderIds,
        current_order_id: newOrderIds[0],
      };
    }));
  };

  const markCleaned = (tableId: string) => {
    setTables(prev => prev.map(table =>
      table.id === tableId && table.status === "cleaning"
        ? { ...table, status: "available" }
        : table
    ));
  };

  return {
    tables,
    isLoading,
    addTable,
    updateTable,
    deleteTable,
    reserveTable,
    cancelReservation,
    occupyTable,
    releaseTable,
    markCleaned,
  };
}

// ============================================================================
// ORDER SUMMARY DIALOG
// ============================================================================

interface OrderSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderHistoryItem | null;
  table: SimpleTable | null;
  region?: any;
}

function OrderSummaryDialog({ open, onOpenChange, order, table, region }: OrderSummaryDialogProps) {
  const [printOpen, setPrintOpen] = useState(false);
  const [cartData, setCartData] = useState<any>(null);
  const orderTotal = order?.total ?? order?.totals?.total

  useEffect(() => {
    if (order && open) {
      // Construct cart-like object for print dialog
      const cartForPrint = {
        id: order.cart_id,
        items: order.items.map(item => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal || (item.unit_price * item.quantity),
          variant_title: item.variant_title,
          is_custom_priced: item.is_custom_priced,
          original_unit_price: item.original_unit_price,
        })),
        subtotal: order.subtotal,
        tax_total: order.tax,
        total: orderTotal,
        metadata: {
          table_ids: order.table_ids,
          customer_name: order.customer_name,
          notes: order.notes,
          pricing_strategy: order.pricing_summary?.strategy,
          price_list_id: order.pricing_summary?.price_list_id,
          custom_prices: order.pricing_summary?.custom_prices_count ? {} : undefined,
        },
        customer: order.customer_id ? {
          first_name: order.customer_name,
        } : null,
      };
      setCartData(cartForPrint);
    }
  }, [order, open]);

  if (!order) return null;

  const receiptData = {
    order_id: order.id,
    display_id: order.display_id,
    customer: order.customer_name ? { first_name: order.customer_name } : null,
    tables: order.table_ids,
    items: order.items,
    totals: {
      subtotal: order.subtotal,
      tax: order.tax,
      total: orderTotal,
      currency_code: "PHP",
    },
    payment: order.payment || {
      method: "Pending",
      amount: orderTotal,
      change: 0,
    },
    pricing_info: {
      strategy: order.pricing_summary?.strategy,
      total_discount: order.pricing_summary?.total_discount || 0,
      has_custom_prices: (order.pricing_summary?.custom_prices_count || 0) > 0,
      price_list_applied: !!order.pricing_summary?.price_list_id,
    },
    notes: order.notes,
    timestamp: order.created_at,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Order Summary - Table {table?.name || order.table_ids?.join(", ")}
            </DialogTitle>
            <DialogDescription>
              Order #{order.display_id} • {new Date(order.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Customer Info */}
            {order.customer_name && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-1">Customer</p>
                <p className="text-sm">{order.customer_name}</p>
              </div>
            )}

            {/* Order Items */}
            <div className="rounded-lg border">
              <div className="p-3 border-b bg-muted/50">
                <p className="text-sm font-medium">Order Items</p>
              </div>
              <div className="divide-y">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.variant_title && (
                          <p className="text-xs text-muted-foreground">{item.variant_title}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          ₱{item.unit_price.toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          ₱{(item.unit_price * item.quantity).toFixed(2)}
                        </p>
                        {item.is_custom_priced && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            Custom Price
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Totals */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₱{orderTotal.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>₱{order.tax.toFixed(2)}</span>
                </div>
              )}
              {order.pricing_summary?.total_discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount:</span>
                  <span>-₱{order.pricing_summary.total_discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total:</span>
                <span>₱{orderTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="rounded-lg border p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payment Status:</span>
                <Badge variant={order.payment?.captured ? "default" : "secondary"}>
                  {order.payment?.captured ? "Paid" : "Pending"}
                </Badge>
              </div>
              {order.payment?.captured && order.payment?.method && (
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span>{order.payment.method}</span>
                </div>
              )}
              {order.payment?.change && order.payment.change > 0 && (
                <div className="flex justify-between mt-2 text-sm text-green-600">
                  <span>Change:</span>
                  <span>₱{order.payment.change.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => setPrintOpen(true)}>
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        cart={cartData}
        receiptData={receiptData}
        region={region}
      />
    </>
  );
}

// ============================================================================
// PAYMENT DIALOG FOR OCCUPIED TABLES
// ============================================================================

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: SimpleTable | null;
  order: OrderHistoryItem | null;
  onPaymentComplete: (tableId: string, orderId: string, paymentData: any) => Promise<void>;
  region?: any;
}

function PaymentDialog({ open, onOpenChange, table, order, onPaymentComplete, region }: PaymentDialogProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">("cash");
  const [cashAmount, setCashAmount] = useState<number>(order?.total ?? order?.totals?.total);
  const [isProcessing, setIsProcessing] = useState(false);
  console.log(order, 'ereereer')
  const orderTotal = order?.total || order?.totals?.total || 0

  useEffect(() => {
      setCashAmount(orderTotal)
  }, [order])
  
  
  const change = cashAmount - orderTotal;
  const canComplete = paymentMethod === "cash" ? cashAmount >= orderTotal : true;

  const handlePayment = async () => {
    if (!table || !order) return;
    
    setIsProcessing(true);
    try {
      const paymentData = {
        paymentMethod,
        amount: orderTotal,
        cash_amount: paymentMethod === "cash" ? cashAmount : undefined,
        change: paymentMethod === "cash" ? change : 0,
      };

      await onPaymentComplete(table.id, order.id, paymentData);
      toast({
        title: "Payment Successful",
        description: `Payment of ₱${orderTotal.toFixed(2)} captured for ${table.name}`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };



console.log(order, 'ORDERR')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment - {table?.name}</DialogTitle>
          <DialogDescription>
            Complete payment to release the table
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Order #:</span>
              <span className="font-medium">• {order?.order_number} </span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{table?.customer_name || "Walk-in"}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span>Total Amount:</span>
              <span>₱{orderTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("cash")}
              >
                Cash
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "card" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("card")}
                disabled
              >
                Card
              </Button>
              <Button
                type="button"
                disabled
                variant={paymentMethod === "other" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("other")}
              >
                Other
              </Button>
            </div>
          </div>

          {/* Cash Amount Input */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label>Cash Amount</Label>
              <Input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(parseFloat(e.target.value))}
                className="text-lg"
              />
              {change >= 0 && (
                <div className="text-sm text-green-600">
                  Change: ₱{change.toFixed(2)}
                </div>
              )}
              {change < 0 && (
                <div className="text-sm text-red-600">
                  Insufficient: Need ₱{Math.abs(change).toFixed(2)} more
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isProcessing || !canComplete}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Payment & Release Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TABLE CARD COMPONENT
// ============================================================================

interface TableCardProps {
  table: SimpleTable;
  onEdit: (table: SimpleTable) => void;
  onDelete: (table: SimpleTable) => void;
  onReserve: (table: SimpleTable) => void;
  onCancelReservation: (table: SimpleTable) => void;
  onMarkCleaned: (table: SimpleTable) => void;
  onProcessPayment: (table: SimpleTable) => void;
  onViewOrder: (table: SimpleTable) => void;
}

function TableCard({ 
  table, 
  onEdit, 
  onDelete, 
  onReserve, 
  onCancelReservation, 
  onMarkCleaned,
  onProcessPayment,
  onViewOrder
}: TableCardProps) {
  const getStatusConfig = () => {
    switch (table.status) {
      case "available":
        return { color: "green", bg: "bg-green-50", border: "border-green-200", text: "Available", icon: Circle };
      case "occupied":
        return { color: "red", bg: "bg-red-50", border: "border-red-200", text: "Occupied", icon: Users };
      case "reserved":
        return { color: "yellow", bg: "bg-yellow-50", border: "border-yellow-200", text: "Reserved", icon: Calendar };
      case "cleaning":
        return { color: "blue", bg: "bg-blue-50", border: "border-blue-200", text: "Cleaning", icon: Coffee };
      default:
        return { color: "gray", bg: "bg-gray-50", border: "border-gray-200", text: "Unknown", icon: Utensils };
    }
  };

  const config = getStatusConfig();
  const isReservationExpired = table.reserved_for && new Date(table.reserved_for) < new Date();

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-md", config.bg, config.border, "border")}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", `bg-${config.color}-500`)} />
            <span className={cn("text-xs font-medium", `text-${config.color}-700`)}>{config.text}</span>
            {isReservationExpired && table.status === "reserved" && (
              <Badge variant="destructive" className="text-[10px]">Expired</Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(table)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(table)}
              disabled={table.status === "occupied"}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Table Info */}
        <div className="text-center mb-3">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-full mx-auto mb-2", config.bg)}>
            <Utensils className={cn("h-6 w-6", `text-${config.color}-600`)} />
          </div>
          <h3 className="text-lg font-bold">{table.name}</h3>
          <p className="text-xs text-muted-foreground">
            <Users className="inline h-3 w-3 mr-1" />
            Capacity: {table.capacity} pax
          </p>
        </div>

        {/* Status Details */}
        {table.status === "occupied" && table.customer_name && (
          <div className="mb-3 p-2 rounded-lg bg-white/50 text-xs space-y-1">
            <p className="font-medium flex items-center gap-1">
              <User className="h-3 w-3" />
              {table.customer_name}
            </p>
            {table.customer_phone && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {table.customer_phone}
              </p>
            )}
            {table.occupied_since && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Since: {new Date(table.occupied_since).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {table.status === "reserved" && table.reserved_name && (
          <div className="mb-3 p-2 rounded-lg bg-white/50 text-xs space-y-1">
            <p className="font-medium flex items-center gap-1">
              <User className="h-3 w-3" />
              {table.reserved_name}
            </p>
            {table.reserved_phone && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {table.reserved_phone}
              </p>
            )}
            {table.reserved_for && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(table.reserved_for).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-3">
          {table.status === "available" && (
            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => onReserve(table)}>
              <Calendar className="mr-1 h-3 w-3" />
              Reserve
            </Button>
          )}
          
          {table.status === "occupied" && (
            <>
              <Button 
                size="sm" 
                className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => onProcessPayment(table)}
              >
                <CreditCard className="mr-1 h-3 w-3" />
                Process Payment
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-8 text-xs"
                onClick={() => onViewOrder(table)}
              >
                <Eye className="mr-1 h-3 w-3" />
                View Order
              </Button>
            </>
          )}
          
          {table.status === "cleaning" && (
            <Button size="sm" className="w-full h-8 text-xs" onClick={() => onMarkCleaned(table)}>
              <CheckCircle className="mr-1 h-3 w-3" />
              Mark Cleaned
            </Button>
          )}
          
          {table.status === "reserved" && (
            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => onCancelReservation(table)}>
              <XCircle className="mr-1 h-3 w-3" />
              Cancel Reservation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ADD/EDIT TABLE DIALOG
// ============================================================================

interface TableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (table: Omit<SimpleTable, "id">) => void;
  initialData?: SimpleTable;
}

function TableFormDialog({ open, onOpenChange, onSave, initialData }: TableFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    capacity: 4,
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        number: initialData.number,
        capacity: initialData.capacity,
        notes: initialData.notes || "",
      });
    } else {
      setFormData({
        name: "",
        number: "",
        capacity: 4,
        notes: "",
      });
    }
  }, [initialData, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.number) return;
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Table" : "Add New Table"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update table information" : "Enter the details for the new table"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Table Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Table 1, VIP Lounge"
            />
          </div>
          <div>
            <Label>Table Number *</Label>
            <Input
              value={formData.number}
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              placeholder="e.g., 1, 2, VIP1"
            />
          </div>
          <div>
            <Label>Capacity (persons)</Label>
            <Input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
              min={1}
              max={20}
            />
          </div>
          <div>
            <Label>Notes (Optional)</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Special notes about this table..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.number}>
            {initialData ? "Save Changes" : "Add Table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// RESERVATION DIALOG
// ============================================================================

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: SimpleTable | null;
  onConfirm: (name: string, phone: string, reservedFor: Date) => void;
}

function ReservationDialog({ open, onOpenChange, table, onConfirm }: ReservationDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reservedFor, setReservedFor] = useState("");

  useEffect(() => {
    if (open) {
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      setReservedFor(defaultTime.toISOString().slice(0, 16));
      setName("");
      setPhone("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!name || !phone || !reservedFor) return;
    onConfirm(name, phone, new Date(reservedFor));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve {table?.name}</DialogTitle>
          <DialogDescription>Enter customer information for the reservation</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Customer Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Phone Number *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contact number"
              type="tel"
            />
          </div>
          <div>
            <Label>Reservation Time *</Label>
            <Input
              type="datetime-local"
              value={reservedFor}
              onChange={(e) => setReservedFor(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name || !phone || !reservedFor}>
            Confirm Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN TABLES COMPONENT
// ============================================================================

interface SimpleTablesManagerProps {
  onTableSelect?: (table: SimpleTable, action: "add" | "remove") => void;
  selectedTableIds?: string[];
  isSelectionMode?: boolean;
  region?: any;
}

export default function SimpleTablesManager({ 
  onTableSelect, 
  selectedTableIds = [], 
  isSelectionMode = false,
  region
}: SimpleTablesManagerProps) {
  const { toast } = useToast();
  const {
    tables,
    isLoading,
    addTable,
    updateTable,
    deleteTable,
    reserveTable,
    cancelReservation,
    releaseTable,
    markCleaned,
  } = useTableStorage();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<SimpleTable | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryItem | null>(null);

  // Filter tables
  const filteredTables = tables.filter(table => {
    if (statusFilter !== "all" && table.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        table.name.toLowerCase().includes(query) ||
        table.number.toLowerCase().includes(query) ||
        table.customer_name?.toLowerCase().includes(query) ||
        table.reserved_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusCount = (status: SimpleTable["status"]) => {
    return tables.filter(t => t.status === status).length;
  };

  // Get order details for a table
  const getOrderForTable = (table: SimpleTable): OrderHistoryItem | null => {
    const orderId = table.current_order_id || table.current_order_ids?.[0];
    if (!orderId) return null;
    
    const orders = JSON.parse(localStorage.getItem("pos_order_history") || "[]");
    return orders.find((order: any) => order.id === orderId) || null;
  };

  // Handle payment completion
  const handlePaymentComplete = async (tableId: string, orderId: string, paymentData: any) => {
    try {
      // Update order history with payment status
      const orders = JSON.parse(localStorage.getItem("pos_order_history") || "[]");
      const updatedOrders = orders.map((order: any) => {
        if (order.id === orderId) {
          return {
            ...order,
            payment: {
              ...order.payment,
              method: paymentData.paymentMethod,
              amount: paymentData.amount,
              change: paymentData.change,
              captured: true,
              captured_at: new Date().toISOString(),
            },
          };
        }
        return order;
      });
      localStorage.setItem("pos_order_history", JSON.stringify(updatedOrders));
      

      await capturePayment({
          order_id: orderId,
          payment_data: paymentData,
          payment_method: paymentData.paymentMethod
      })
      // Release the table (set to cleaning)
      releaseTable(tableId, orderId);
      
      toast({
        title: "Payment Successful",
        description: `Payment completed and table released for cleaning`,
      });
    } catch (error) {
      console.error("Error completing payment:", error);
      throw error;
    }
  };

  const handleProcessPayment = async (table: SimpleTable) => {
    const order = getOrderForTable(table);
    if (!order) {
      toast({
        title: "No Order Found",
        description: "No active order found for this table",
        variant: "destructive",
      });
      return;
    }
    setSelectedTable(table);
    setSelectedOrder(order);
    setPaymentDialogOpen(true);
  };

  const handleViewOrder = (table: SimpleTable) => {
    const order = getOrderForTable(table);
    if (!order) {
      toast({
        title: "No Order Found",
        description: "No order found for this table",
        variant: "destructive",
      });
      return;
    }
    setSelectedTable(table);
    setSelectedOrder(order);
    setOrderSummaryOpen(true);
  };

  const handleAddTable = (data: Omit<SimpleTable, "id">) => {
    addTable(data);
    toast({ title: "Table added", description: `${data.name} has been added` });
  };

  const handleEditTable = (table: SimpleTable) => {
    setSelectedTable(table);
    setEditDialogOpen(true);
  };

  const handleUpdateTable = (data: Omit<SimpleTable, "id">) => {
    if (selectedTable) {
      updateTable(selectedTable.id, data);
      toast({ title: "Table updated", description: `${data.name} has been updated` });
    }
  };

  const handleDeleteTable = () => {
    if (selectedTable) {
      try {
        deleteTable(selectedTable.id);
        toast({ title: "Table deleted", description: `${selectedTable.name} has been removed` });
      } catch (error: any) {
        toast({ title: "Cannot delete", description: error.message, variant: "destructive" });
      }
    }
    setDeleteDialogOpen(false);
  };

  const handleReserveTable = (name: string, phone: string, reservedFor: Date) => {
    if (selectedTable) {
      reserveTable(selectedTable.id, name, phone, reservedFor);
      toast({ title: "Table reserved", description: `${selectedTable.name} reserved for ${name}` });
    }
  };

  const handleCancelReservation = (table: SimpleTable) => {
    cancelReservation(table.id);
    toast({ title: "Reservation cancelled", description: `${table.name} is now available` });
  };

  const handleMarkCleaned = (table: SimpleTable) => {
    markCleaned(table.id);
    toast({ title: "Table cleaned", description: `${table.name} is now available` });
  };

  const handleTableClick = (table: SimpleTable) => {
    if (isSelectionMode && onTableSelect && table.status === "available") {
      const isSelected = selectedTableIds.includes(table.id);
      onTableSelect(table, isSelected ? "remove" : "add");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Table Management</h1>
              <p className="text-xs text-muted-foreground">Manage tables, process payments, and release tables</p>
            </div>
            {!isSelectionMode && (
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-1 h-3 w-3" />
                Add Table
              </Button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tables or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>
            <select
              className="px-2 py-1 rounded-md border bg-background text-sm h-8"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All ({tables.length})</option>
              <option value="available">Available ({getStatusCount("available")})</option>
              <option value="occupied">Occupied ({getStatusCount("occupied")})</option>
              <option value="reserved">Reserved ({getStatusCount("reserved")})</option>
              <option value="cleaning">Cleaning ({getStatusCount("cleaning")})</option>
            </select>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-1 rounded bg-green-50">
              <p className="text-[10px] text-green-600">Available</p>
              <p className="text-sm font-bold text-green-600">{getStatusCount("available")}</p>
            </div>
            <div className="text-center p-1 rounded bg-red-50">
              <p className="text-[10px] text-red-600">Occupied</p>
              <p className="text-sm font-bold text-red-600">{getStatusCount("occupied")}</p>
            </div>
            <div className="text-center p-1 rounded bg-yellow-50">
              <p className="text-[10px] text-yellow-600">Reserved</p>
              <p className="text-sm font-bold text-yellow-600">{getStatusCount("reserved")}</p>
            </div>
            <div className="text-center p-1 rounded bg-blue-50">
              <p className="text-[10px] text-blue-600">Cleaning</p>
              <p className="text-sm font-bold text-blue-600">{getStatusCount("cleaning")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredTables.length === 0 ? (
            <div className="text-center py-12">
              <Utensils className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tables found</p>
              {!isSelectionMode && searchQuery === "" && statusFilter === "all" && (
                <Button variant="link" size="sm" className="mt-2" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add your first table
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredTables.map((table) => (
                <div
                  key={table.id}
                  className={cn(
                    "transition-all",
                    isSelectionMode && table.status === "available" && "cursor-pointer",
                    isSelectionMode && selectedTableIds.includes(table.id) && "ring-2 ring-primary ring-offset-2 rounded-lg"
                  )}
                  onClick={() => handleTableClick(table)}
                >
                  <TableCard
                    table={table}
                    onEdit={handleEditTable}
                    onDelete={(t) => {
                      setSelectedTable(t);
                      setDeleteDialogOpen(true);
                    }}
                    onReserve={(t) => {
                      setSelectedTable(t);
                      setReserveDialogOpen(true);
                    }}
                    onCancelReservation={handleCancelReservation}
                    onMarkCleaned={handleMarkCleaned}
                    onProcessPayment={handleProcessPayment}
                    onViewOrder={handleViewOrder}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <TableFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddTable}
      />

      <TableFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdateTable}
        initialData={selectedTable || undefined}
      />

      <ReservationDialog
        open={reserveDialogOpen}
        onOpenChange={setReserveDialogOpen}
        table={selectedTable}
        onConfirm={handleReserveTable}
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        table={selectedTable}
        order={selectedOrder}
        onPaymentComplete={handlePaymentComplete}
        region={region}
      />

      <OrderSummaryDialog
        open={orderSummaryOpen}
        onOpenChange={setOrderSummaryOpen}
        order={selectedOrder}
        table={selectedTable}
        region={region}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTable?.name}? This action cannot be undone.
              {selectedTable?.status === "occupied" && (
                <span className="block mt-2 text-red-600">This table is currently occupied and cannot be deleted.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}