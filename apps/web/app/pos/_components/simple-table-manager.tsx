// app/(pos)/components/simple-table-manager.tsx
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
  X,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

export interface SimpleTable {
  id: string;
  name: string;
  number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_order_id?: string;
  current_order_ids?: string[]; // Support multiple orders per table
  customer_name?: string;
  reserved_for?: Date;
  reserved_name?: string;
  reserved_phone?: string;
  occupied_since?: Date;
  notes?: string;
}

export interface SimpleOrder {
  id: string;
  order_number: number;
  table_ids: string[]; // Multiple tables per order
  customer_name?: string;
  items: any[];
  total: number;
  status: "active" | "completed" | "cancelled";
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// LOCAL STORAGE HOOK
// ============================================================================

function useTableStorage() {
  const [tables, setTables] = useState<SimpleTable[]>([]);
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const storedTables = localStorage.getItem("simple-tables");
        const storedOrders = localStorage.getItem("simple-orders");
        
        if (storedTables) {
          const parsedTables = JSON.parse(storedTables);
          // Convert date strings back to Date objects
          const tablesWithDates = parsedTables.map((table: any) => ({
            ...table,
            reserved_for: table.reserved_for ? new Date(table.reserved_for) : undefined,
            occupied_since: table.occupied_since ? new Date(table.occupied_since) : undefined,
          }));
          setTables(tablesWithDates);
        } else {
          // Initialize with default tables
          const defaultTables: SimpleTable[] = [
            { id: "1", name: "Table 1", number: "1", capacity: 4, status: "available" },
            { id: "2", name: "Table 2", number: "2", capacity: 2, status: "available" },
            { id: "3", name: "Table 3", number: "3", capacity: 6, status: "available" },
            { id: "4", name: "Table 4", number: "4", capacity: 4, status: "available" },
            { id: "5", name: "Table 5", number: "5", capacity: 8, status: "available" },
          ];
          setTables(defaultTables);
          localStorage.setItem("simple-tables", JSON.stringify(defaultTables));
        }
        
        if (storedOrders) {
          const parsedOrders = JSON.parse(storedOrders);
          const ordersWithDates = parsedOrders.map((order: any) => ({
            ...order,
            created_at: new Date(order.created_at),
            updated_at: new Date(order.updated_at),
          }));
          setOrders(ordersWithDates);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Save tables to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("simple-tables", JSON.stringify(tables));
    }
  }, [tables, isLoading]);

  // Save orders to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("simple-orders", JSON.stringify(orders));
    }
  }, [orders, isLoading]);

  const addTable = (table: Omit<SimpleTable, "id">) => {
    const newTable = {
      ...table,
      id: crypto.randomUUID(),
    };
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

  const reserveTable = (tableId: string, customerName: string, customerPhone: string, reservedFor: Date) => {
    setTables(prev => prev.map(table =>
      table.id === tableId && table.status === "available"
        ? {
            ...table,
            status: "reserved",
            reserved_name: customerName,
            reserved_phone: customerPhone,
            reserved_for: reservedFor,
          }
        : table
    ));
  };

  const clearReservation = (tableId: string) => {
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

  const occupyTable = (tableId: string, orderId: string, customerName?: string) => {
    setTables(prev => prev.map(table =>
      table.id === tableId && (table.status === "available" || table.status === "reserved")
        ? {
            ...table,
            status: "occupied",
            current_order_ids: [...(table.current_order_ids || []), orderId],
            customer_name: customerName || table.reserved_name || customerName,
            occupied_since: new Date(),
          }
        : table
    ));
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
          customer_name: undefined,
          occupied_since: undefined,
        };
      }
      
      return {
        ...table,
        current_order_ids: newOrderIds,
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

  const addOrder = (order: Omit<SimpleOrder, "id" | "order_number" | "created_at" | "updated_at">) => {
    const newOrderNumber = orders.length + 1;
    const newOrder: SimpleOrder = {
      ...order,
      id: crypto.randomUUID(),
      order_number: newOrderNumber,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    setOrders(prev => [...prev, newOrder]);
    
    // Occupy tables with this order
    order.table_ids.forEach(tableId => {
      occupyTable(tableId, newOrder.id, order.customer_name);
    });
    
    return newOrder;
  };

  const completeOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Release all tables associated with this order
    order.table_ids.forEach(tableId => {
      releaseTable(tableId, orderId);
    });
    
    // Mark order as completed
    setOrders(prev => prev.map(order =>
      order.id === orderId
        ? { ...order, status: "completed", updated_at: new Date() }
        : order
    ));
  };

  const getTablesForOrder = (orderId: string): SimpleTable[] => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return [];
    return tables.filter(table => table.current_order_ids?.includes(orderId));
  };

  return {
    tables,
    orders,
    isLoading,
    addTable,
    updateTable,
    deleteTable,
    reserveTable,
    clearReservation,
    occupyTable,
    releaseTable,
    markCleaned,
    addOrder,
    completeOrder,
    getTablesForOrder,
  };
}

// ============================================================================
// TABLE CARD COMPONENT
// ============================================================================

interface TableCardProps {
  table: SimpleTable;
  onEdit: (table: SimpleTable) => void;
  onDelete: (table: SimpleTable) => void;
  onReserve: (table: SimpleTable) => void;
  onClearReservation: (table: SimpleTable) => void;
  onMarkCleaned: (table: SimpleTable) => void;
  onViewOrder?: (table: SimpleTable) => void;
  onAddToOrder?: (table: SimpleTable) => void;
}

function TableCard({ 
  table, 
  onEdit, 
  onDelete, 
  onReserve, 
  onClearReservation,
  onMarkCleaned,
  onViewOrder,
  onAddToOrder 
}: TableCardProps) {
  const getStatusConfig = () => {
    switch (table.status) {
      case "available":
        return { color: "bg-green-500", text: "Available", icon: CheckCircle, bgColor: "bg-green-50" };
      case "occupied":
        return { color: "bg-red-500", text: "Occupied", icon: Users, bgColor: "bg-red-50" };
      case "reserved":
        return { color: "bg-yellow-500", text: "Reserved", icon: Calendar, bgColor: "bg-yellow-50" };
      case "cleaning":
        return { color: "bg-blue-500", text: "Cleaning", icon: Clock, bgColor: "bg-blue-50" };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const isReservationExpired = table.reserved_for && new Date(table.reserved_for) < new Date();

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-lg",
      statusConfig.bgColor
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", statusConfig.color)} />
            <span className="text-xs font-medium">{statusConfig.text}</span>
            {isReservationExpired && table.status === "reserved" && (
              <Badge variant="destructive" className="text-xs">Expired</Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(table)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(table)}
              disabled={table.status === "occupied"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-center mb-4">
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-2",
            statusConfig.color,
            "bg-opacity-20"
          )}>
            <Utensils className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold">{table.name}</h3>
          <p className="text-sm text-muted-foreground">Capacity: {table.capacity} persons</p>
        </div>

        {table.status === "occupied" && table.customer_name && (
          <div className="mb-3 p-2 rounded-lg bg-red-100/50">
            <p className="text-sm font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              {table.customer_name}
            </p>
            {table.occupied_since && (
              <p className="text-xs text-muted-foreground">
                Since: {new Date(table.occupied_since).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {table.status === "reserved" && table.reserved_name && (
          <div className="mb-3 p-2 rounded-lg bg-yellow-100/50">
            <p className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {table.reserved_name}
            </p>
            {table.reserved_for && (
              <p className="text-xs text-muted-foreground">
                For: {new Date(table.reserved_for).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-3">
          {table.status === "available" && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => onAddToOrder?.(table)}>
                <Plus className="mr-1 h-3 w-3" />
                Add to Order
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onReserve(table)}>
                <Calendar className="mr-1 h-3 w-3" />
                Reserve
              </Button>
            </div>
          )}
          
          {table.status === "occupied" && (
            <Button size="sm" variant="default" className="w-full" onClick={() => onViewOrder?.(table)}>
              View Order
            </Button>
          )}
          
          {table.status === "cleaning" && (
            <Button size="sm" className="w-full" onClick={() => onMarkCleaned(table)}>
              <CheckCircle className="mr-1 h-3 w-3" />
              Mark Cleaned
            </Button>
          )}
          
          {table.status === "reserved" && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => onAddToOrder?.(table)}>
                <Users className="mr-1 h-3 w-3" />
                Seat Guest
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onClearReservation(table)}>
                <XCircle className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </div>
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
              placeholder="e.g., Table 1, VIP Lounge, Bar Seat 5"
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
  onConfirm: (customerName: string, customerPhone: string, reservedFor: Date) => void;
}

function ReservationDialog({ open, onOpenChange, table, onConfirm }: ReservationDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [reservedFor, setReservedFor] = useState("");

  useEffect(() => {
    if (open) {
      // Default to 1 hour from now
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      setReservedFor(defaultTime.toISOString().slice(0, 16));
      setCustomerName("");
      setCustomerPhone("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!customerName || !customerPhone || !reservedFor) return;
    onConfirm(customerName, customerPhone, new Date(reservedFor));
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
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Phone Number *</Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Contact number"
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
          <Button onClick={handleSubmit} disabled={!customerName || !customerPhone || !reservedFor}>
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
}

export default function SimpleTablesManager({ 
  onTableSelect, 
  selectedTableIds = [], 
  isSelectionMode = false 
}: SimpleTablesManagerProps) {
  const { toast } = useToast();
  const {
    tables,
    orders,
    isLoading,
    addTable,
    updateTable,
    deleteTable,
    reserveTable,
    clearReservation,
    markCleaned,
    completeOrder,
  } = useTableStorage();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<SimpleTable | null>(null);

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

  const handleAddTable = (tableData: Omit<SimpleTable, "id">) => {
    addTable(tableData);
    toast({ title: "Table added", description: `${tableData.name} has been added` });
  };

  const handleEditTable = (table: SimpleTable) => {
    setSelectedTable(table);
    setEditDialogOpen(true);
  };

  const handleUpdateTable = (tableData: Omit<SimpleTable, "id">) => {
    if (selectedTable) {
      updateTable(selectedTable.id, tableData);
      toast({ title: "Table updated", description: `${tableData.name} has been updated` });
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

  const handleReserveTable = (customerName: string, customerPhone: string, reservedFor: Date) => {
    if (selectedTable) {
      reserveTable(selectedTable.id, customerName, customerPhone, reservedFor);
      toast({ title: "Table reserved", description: `${selectedTable.name} reserved for ${customerName}` });
    }
  };

  const handleClearReservation = (table: SimpleTable) => {
    clearReservation(table.id);
    toast({ title: "Reservation cancelled", description: `${table.name} is now available` });
  };

  const handleMarkCleaned = (table: SimpleTable) => {
    markCleaned(table.id);
    toast({ title: "Table cleaned", description: `${table.name} is now available` });
  };

  const handleTableClick = (table: SimpleTable) => {
    if (isSelectionMode && onTableSelect) {
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
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Table Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage tables, reservations, and seating
              </p>
            </div>
            {!isSelectionMode && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Table
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tables by name or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="px-3 py-2 rounded-md border bg-background"
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

          {/* Status Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-green-50">
              <p className="text-xs text-green-600">Available</p>
              <p className="text-xl font-bold text-green-600">{getStatusCount("available")}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-50">
              <p className="text-xs text-red-600">Occupied</p>
              <p className="text-xl font-bold text-red-600">{getStatusCount("occupied")}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-50">
              <p className="text-xs text-yellow-600">Reserved</p>
              <p className="text-xl font-bold text-yellow-600">{getStatusCount("reserved")}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-50">
              <p className="text-xs text-blue-600">Cleaning</p>
              <p className="text-xl font-bold text-blue-600">{getStatusCount("cleaning")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredTables.length === 0 ? (
            <div className="text-center py-12">
              <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No tables found</p>
              {!isSelectionMode && (
                <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first table
                </Button>
              )}
            </div>
          ) : (
            <div className={cn(
              "grid gap-4",
              isSelectionMode 
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            )}>
              {filteredTables.map((table) => (
                <div
                  key={table.id}
                  className={cn(
                    "transition-all",
                    isSelectionMode && selectedTableIds.includes(table.id) && "ring-2 ring-primary ring-offset-2 cursor-pointer",
                    isSelectionMode && "cursor-pointer"
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
                    onClearReservation={handleClearReservation}
                    onMarkCleaned={handleMarkCleaned}
                    onViewOrder={() => {
                      // Navigate to order view
                      toast({ title: "Coming Soon", description: "View order details" });
                    }}
                    onAddToOrder={(t) => {
                      if (onTableSelect) {
                        onTableSelect(t, "add");
                      }
                    }}
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