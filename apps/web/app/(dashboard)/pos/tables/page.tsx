// app/(pos)/tables/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  User,
  Calendar,
  Phone,
  Mail,
  Utensils,
  Beer,
  Sun,
  Home,
  Building2,
  Loader2,
  RefreshCw,
  X,
  ShoppingCart,
  DollarSign,
  CreditCard,
  QrCode,
  Printer,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// ============================================================================
// TYPES
// ============================================================================

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
  total: number;
  notes?: string;
}

interface Table {
  id: string;
  number: string;
  section_id: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning" | "maintenance";
  current_order_id?: string;
  current_customer_id?: string;
  current_customer_name?: string;
  occupied_since?: Date;
  reserved_for?: Date;
  reserved_name?: string;
  reserved_phone?: string;
  reserved_email?: string;
  notes?: string;
}

interface Section {
  id: string;
  name: string;
  type: "dining" | "bar" | "patio" | "private" | "vip";
  color: string;
  icon: string;
  description?: string;
  tables?: Table[];
  is_active: boolean;
}

interface Reservation {
  id: string;
  table_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  party_size: number;
  reservation_time: Date;
  duration_minutes: number;
  status: "pending" | "confirmed" | "seated" | "completed" | "cancelled";
  notes?: string;
  created_at: Date;
}

// ============================================================================
// MOCK DATA - Replace with actual API calls
// ============================================================================

const mockSections: Section[] = [
  {
    id: "sec_1",
    name: "Main Dining",
    type: "dining",
    color: "bg-blue-500",
    icon: "🍽️",
    description: "Main restaurant area with comfortable seating",
    is_active: true,
    tables: [
      { id: "tbl_1", number: "1", section_id: "sec_1", capacity: 4, status: "available" },
      { id: "tbl_2", number: "2", section_id: "sec_1", capacity: 2, status: "occupied", current_customer_name: "John Doe", occupied_since: new Date() },
      { id: "tbl_3", number: "3", section_id: "sec_1", capacity: 6, status: "reserved", reserved_name: "Jane Smith", reserved_for: new Date(Date.now() + 3600000) },
      { id: "tbl_4", number: "4", section_id: "sec_1", capacity: 4, status: "cleaning" },
      { id: "tbl_5", number: "5", section_id: "sec_1", capacity: 8, status: "available" },
    ],
  },
  {
    id: "sec_2",
    name: "Bar Area",
    type: "bar",
    color: "bg-amber-500",
    icon: "🍺",
    description: "Bar seating with high chairs",
    is_active: true,
    tables: [
      { id: "tbl_6", number: "6", section_id: "sec_2", capacity: 2, status: "available" },
      { id: "tbl_7", number: "7", section_id: "sec_2", capacity: 2, status: "occupied", current_customer_name: "Mike Johnson", occupied_since: new Date() },
      { id: "tbl_8", number: "8", section_id: "sec_2", capacity: 4, status: "available" },
    ],
  },
  {
    id: "sec_3",
    name: "Patio",
    type: "patio",
    color: "bg-green-500",
    icon: "🌿",
    description: "Outdoor seating with garden view",
    is_active: true,
    tables: [
      { id: "tbl_9", number: "9", section_id: "sec_3", capacity: 4, status: "available" },
      { id: "tbl_10", number: "10", section_id: "sec_3", capacity: 6, status: "reserved", reserved_name: "Family Garcia", reserved_for: new Date(Date.now() + 7200000) },
    ],
  },
  {
    id: "sec_4",
    name: "VIP Room",
    type: "vip",
    color: "bg-purple-500",
    icon: "👑",
    description: "Private VIP room",
    is_active: true,
    tables: [
      { id: "tbl_11", number: "VIP1", section_id: "sec_4", capacity: 10, status: "available" },
      { id: "tbl_12", number: "VIP2", section_id: "sec_4", capacity: 8, status: "maintenance" },
    ],
  },
];

// Custom hook for localStorage
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  };

  return [storedValue, setValue];
};

// ============================================================================
// TABLE CARD COMPONENT
// ============================================================================

interface TableCardProps {
  table: Table;
  section: Section;
  onEdit: (table: Table, section: Section) => void;
  onDelete: (table: Table, section: Section) => void;
  onStatusChange: (table: Table, section: Section, status: Table["status"]) => void;
  onViewOrder: (table: Table) => void;
  onReserve: (table: Table) => void;
  onCreateOrder: (table: Table) => void;
}

function TableCard({ table, section, onEdit, onDelete, onStatusChange, onViewOrder, onReserve, onCreateOrder }: TableCardProps) {
  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "occupied": return "bg-red-500";
      case "reserved": return "bg-yellow-500";
      case "cleaning": return "bg-blue-400";
      case "maintenance": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status: Table["status"]) => {
    switch (status) {
      case "available": return "Available";
      case "occupied": return "Occupied";
      case "reserved": return "Reserved";
      case "cleaning": return "Cleaning";
      case "maintenance": return "Maintenance";
      default: return "Unknown";
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer",
      table.status === "occupied" && "border-red-200 bg-red-50/50",
      table.status === "reserved" && "border-yellow-200 bg-yellow-50/50",
      table.status === "cleaning" && "border-blue-200 bg-blue-50/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", getStatusColor(table.status))} />
            <span className="text-xs font-medium text-muted-foreground">
              {getStatusText(table.status)}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onEdit(table, section); }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(table, section); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-center mb-4">
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-2",
            getStatusColor(table.status),
            "bg-opacity-20"
          )}>
            <Utensils className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold">Table {table.number}</h3>
          <p className="text-sm text-muted-foreground">Capacity: {table.capacity} persons</p>
        </div>

        {table.status === "occupied" && table.current_customer_name && (
          <div className="mb-3 p-2 rounded-lg bg-red-100/50">
            <p className="text-sm font-medium flex items-center gap-1">
              <User className="h-3 w-3" />
              {table.current_customer_name}
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
              <User className="h-3 w-3" />
              {table.reserved_name}
            </p>
            {table.reserved_for && (
              <p className="text-xs text-muted-foreground">
                For: {new Date(table.reserved_for).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {table.status === "available" && (
            <>
              <Button size="sm" className="flex-1" onClick={() => onCreateOrder(table)}>
                <ShoppingCart className="mr-1 h-3 w-3" />
                Order
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onReserve(table)}>
                <Calendar className="mr-1 h-3 w-3" />
                Reserve
              </Button>
            </>
          )}
          {table.status === "occupied" && (
            <Button size="sm" variant="default" className="flex-1" onClick={() => onViewOrder(table)}>
              View Order
            </Button>
          )}
          {table.status === "cleaning" && (
            <Button size="sm" className="flex-1" onClick={() => onStatusChange(table, section, "available")}>
              Mark Available
            </Button>
          )}
          {table.status === "reserved" && (
            <Button size="sm" className="flex-1" onClick={() => onStatusChange(table, section, "occupied")}>
              Seat Guest
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile Table Card Component
function MobileTableCard({ table, section, onPress }: { table: Table; section: Section; onPress: () => void }) {
  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "occupied": return "bg-red-500";
      case "reserved": return "bg-yellow-500";
      case "cleaning": return "bg-blue-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status: Table["status"]) => {
    switch (status) {
      case "available": return "Available";
      case "occupied": return "Occupied";
      case "reserved": return "Reserved";
      case "cleaning": return "Cleaning";
      default: return "Unknown";
    }
  };

  return (
    <button
      onClick={onPress}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all w-full",
        table.status === "available" && "hover:bg-green-50",
        table.status === "occupied" && "bg-red-50 border-red-200",
        table.status === "reserved" && "bg-yellow-50 border-yellow-200"
      )}
    >
      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", getStatusColor(table.status), "bg-opacity-20")}>
        <Utensils className="h-5 w-5" />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Table {table.number}</span>
          <Badge variant="outline" className="text-xs">{table.capacity}pax</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{getStatusText(table.status)}</p>
        {table.status === "occupied" && table.current_customer_name && (
          <p className="text-xs text-muted-foreground mt-1">{table.current_customer_name}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// Mobile Table Actions Sheet
function MobileTableActionsSheet({ 
  open, 
  onOpenChange, 
  table, 
  section,
  onOccupy,
  onReserve,
  onEdit,
  onDelete,
  onViewOrder,
  onCreateOrder
}: any) {
  if (!table) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Table {table.number} - {section?.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Capacity: {table.capacity} persons</p>
            {table.status === "occupied" && table.current_customer_name && (
              <p className="text-sm mt-1">Customer: {table.current_customer_name}</p>
            )}
            {table.status === "reserved" && table.reserved_name && (
              <p className="text-sm mt-1">Reserved for: {table.reserved_name}</p>
            )}
          </div>
          
          {table.status === "available" && (
            <>
              <Button className="w-full" onClick={() => { onCreateOrder(); onOpenChange(false); }}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Create Order
              </Button>
              <Button variant="outline" className="w-full" onClick={() => { onReserve(); onOpenChange(false); }}>
                <Calendar className="mr-2 h-4 w-4" />
                Make Reservation
              </Button>
            </>
          )}
          
          {table.status === "occupied" && (
            <Button className="w-full" onClick={() => { onViewOrder(); onOpenChange(false); }}>
              View Order
            </Button>
          )}
          
          {table.status === "cleaning" && (
            <Button className="w-full" onClick={() => { onOccupy(); onOpenChange(false); }}>
              Mark Available
            </Button>
          )}
          
          {table.status === "reserved" && (
            <Button className="w-full" onClick={() => { onOccupy(); onOpenChange(false); }}>
              Seat Guest
            </Button>
          )}
          
          <Separator />
          
          <Button variant="outline" className="w-full" onClick={() => { onEdit(); onOpenChange(false); }}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Table
          </Button>
          
          <Button variant="destructive" className="w-full" onClick={() => { onDelete(); onOpenChange(false); }}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Table
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Import Separator
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";

// ============================================================================
// MAIN TABLES PAGE COMPONENT
// ============================================================================

export default function TablesPage() {
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [sections, setSections] = useState<Section[]>(mockSections);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<{ table: Table; section: Section } | null>(null);
  const [editingTable, setEditingTable] = useState<Partial<Table>>({});
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [cartItems, setCartItems] = useLocalStorage<CartItem[]>("pos-cart", []);
  const [reservationData, setReservationData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    party_size: 2,
    reservation_time: new Date(),
    duration_minutes: 120,
    notes: "",
  });

  // Filter tables based on section and search
  const filteredSections = sections.filter(section => {
    if (selectedSection !== "all" && section.id !== selectedSection) return false;
    if (!searchQuery) return true;
    
    const hasMatchingTable = section.tables?.some(table =>
      table.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.current_customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.reserved_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return hasMatchingTable;
  });

  const getStatusCount = (section: Section) => {
    const tables = section.tables || [];
    return {
      total: tables.length,
      available: tables.filter(t => t.status === "available").length,
      occupied: tables.filter(t => t.status === "occupied").length,
      reserved: tables.filter(t => t.status === "reserved").length,
      cleaning: tables.filter(t => t.status === "cleaning").length,
    };
  };

  const handleEditTable = (table: Table, section: Section) => {
    setSelectedTable({ table, section });
    setEditingTable({ ...table });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTable) return;
    
    setSections(prev => prev.map(section => {
      if (section.id === selectedTable.section.id) {
        return {
          ...section,
          tables: section.tables?.map(table =>
            table.id === selectedTable.table.id
              ? { ...table, ...editingTable }
              : table
          ),
        };
      }
      return section;
    }));
    
    setEditDialogOpen(false);
    toast({ title: "Table updated", description: `Table ${editingTable.number} has been updated` });
  };

  const handleDeleteTable = () => {
    if (!selectedTable) return;
    
    setSections(prev => prev.map(section => {
      if (section.id === selectedTable.section.id) {
        return {
          ...section,
          tables: section.tables?.filter(table => table.id !== selectedTable.table.id),
        };
      }
      return section;
    }));
    
    setDeleteDialogOpen(false);
    toast({ title: "Table deleted", description: `Table ${selectedTable.table.number} has been removed` });
  };

  const handleStatusChange = (table: Table, section: Section, newStatus: Table["status"]) => {
    setSections(prev => prev.map(s => {
      if (s.id === section.id) {
        return {
          ...s,
          tables: s.tables?.map(t =>
            t.id === table.id
              ? { ...t, status: newStatus, occupied_since: newStatus === "occupied" ? new Date() : undefined }
              : t
          ),
        };
      }
      return s;
    }));
    
    toast({
      title: "Status updated",
      description: `Table ${table.number} is now ${newStatus}`,
    });
  };

  const handleReserve = () => {
    if (!selectedTable) return;
    
    // Update table status
    setSections(prev => prev.map(section => {
      if (section.id === selectedTable.section.id) {
        return {
          ...section,
          tables: section.tables?.map(table =>
            table.id === selectedTable.table.id
              ? {
                  ...table,
                  status: "reserved",
                  reserved_name: reservationData.customer_name,
                  reserved_phone: reservationData.customer_phone,
                  reserved_email: reservationData.customer_email,
                  reserved_for: reservationData.reservation_time,
                }
              : table
          ),
        };
      }
      return section;
    }));
    
    setReserveDialogOpen(false);
    setReservationData({
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      party_size: 2,
      reservation_time: new Date(),
      duration_minutes: 120,
      notes: "",
    });
    
    toast({ title: "Table reserved", description: `Table ${selectedTable.table.number} reserved for ${reservationData.customer_name}` });
  };

  const handleCreateOrder = (table: Table) => {
    // Store table assignment in localStorage
    const placement = {
      id: crypto.randomUUID(),
      type: "table" as const,
      reference_id: table.id,
      name: `Table ${table.number}`,
      status: "active" as const,
    };
    localStorage.setItem("current_table_placement", JSON.stringify(placement));
    
    // Navigate to POS page
    window.location.href = "/pos";
    
    toast({ title: "Creating order", description: `Starting new order for Table ${table.number}` });
  };

  const handleViewOrder = (table: Table) => {
    // Check if there's an active order for this table in localStorage
    const drafts = localStorage.getItem("pos-drafts");
    if (drafts) {
      const parsedDrafts = JSON.parse(drafts);
      const existingDraft = parsedDrafts.find((draft: any) => 
        draft.placement?.reference_id === table.id && draft.status === "active"
      );
      
      if (existingDraft) {
        localStorage.setItem("current_draft_id", existingDraft.id);
        localStorage.setItem("pos-cart", JSON.stringify(existingDraft.items));
        window.location.href = "/pos";
        toast({ title: "Loading order", description: `Continuing order for Table ${table.number}` });
        return;
      }
    }
    
    // If no existing order, create new one
    handleCreateOrder(table);
  };

  const totalStats = {
    total: sections.reduce((sum, s) => sum + (s.tables?.length || 0), 0),
    available: sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "available").length || 0), 0),
    occupied: sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "occupied").length || 0), 0),
    reserved: sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "reserved").length || 0), 0),
    cleaning: sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "cleaning").length || 0), 0),
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-xl font-bold">Tables</h1>
              <p className="text-xs text-muted-foreground">Manage tables and seating</p>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[120px] h-10">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.icon} {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-2 p-3 border-b">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{totalStats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-green-600">Available</p>
            <p className="text-lg font-bold text-green-600">{totalStats.available}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-red-600">Occupied</p>
            <p className="text-lg font-bold text-red-600">{totalStats.occupied}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-yellow-600">Reserved</p>
            <p className="text-lg font-bold text-yellow-600">{totalStats.reserved}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-blue-600">Cleaning</p>
            <p className="text-lg font-bold text-blue-600">{totalStats.cleaning}</p>
          </div>
        </div>

        {/* Tables List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {filteredSections.map((section) => {
              const filteredTables = section.tables?.filter(table =>
                !searchQuery ||
                table.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                table.current_customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                table.reserved_name?.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredTables?.length === 0) return null;

              return (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-lg">{section.icon}</span>
                    <h3 className="font-semibold">{section.name}</h3>
                  </div>
                  <div className="space-y-2">
                    {filteredTables?.map((table) => (
                      <MobileTableCard
                        key={table.id}
                        table={table}
                        section={section}
                        onPress={() => {
                          setSelectedTable({ table, section });
                          setMobileActionsOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Mobile Actions Sheet */}
        <MobileTableActionsSheet
          open={mobileActionsOpen}
          onOpenChange={setMobileActionsOpen}
          table={selectedTable?.table}
          section={selectedTable?.section}
          onOccupy={() => selectedTable && handleStatusChange(selectedTable.table, selectedTable.section, "occupied")}
          onReserve={() => {
            setReserveDialogOpen(true);
          }}
          onEdit={() => selectedTable && handleEditTable(selectedTable.table, selectedTable.section)}
          onDelete={() => {
            setDeleteDialogOpen(true);
          }}
          onViewOrder={() => selectedTable && handleViewOrder(selectedTable.table)}
          onCreateOrder={() => selectedTable && handleCreateOrder(selectedTable.table)}
        />

        {/* Dialogs */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Table</DialogTitle>
              <DialogDescription>Update table information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Table Number</Label>
                <Input
                  value={editingTable.number || ""}
                  onChange={(e) => setEditingTable(prev => ({ ...prev, number: e.target.value }))}
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={editingTable.capacity || 2}
                  onChange={(e) => setEditingTable(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editingTable.status}
                  onValueChange={(v: any) => setEditingTable(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingTable.notes || ""}
                  onChange={(e) => setEditingTable(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special notes about this table..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reserve Table {selectedTable?.table.number}</DialogTitle>
              <DialogDescription>Enter customer information for the reservation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={reservationData.customer_name}
                  onChange={(e) => setReservationData(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={reservationData.customer_phone}
                  onChange={(e) => setReservationData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="Contact number"
                />
              </div>
              <div>
                <Label>Party Size</Label>
                <Input
                  type="number"
                  value={reservationData.party_size}
                  onChange={(e) => setReservationData(prev => ({ ...prev, party_size: parseInt(e.target.value) }))}
                  min={1}
                  max={selectedTable?.table.capacity || 10}
                />
              </div>
              <div>
                <Label>Reservation Time</Label>
                <Input
                  type="datetime-local"
                  value={new Date(reservationData.reservation_time.getTime() - reservationData.reservation_time.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setReservationData(prev => ({ ...prev, reservation_time: new Date(e.target.value) }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReserveDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleReserve} disabled={!reservationData.customer_name || !reservationData.customer_phone}>
                Confirm Reservation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Table</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete Table {selectedTable?.table.number}? This action cannot be undone.
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

  // Desktop Layout
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Table Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage restaurant tables, reservations, and seating
              </p>
            </div>
            <Button onClick={() => {
              toast({ title: "Coming Soon", description: "Add new table feature" });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Table
            </Button>
          </div>
          
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tables by number or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.icon} {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => {
              setSearchQuery("");
              setSelectedSection("all");
            }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tables</p>
                <p className="text-2xl font-bold">{totalStats.total}</p>
              </div>
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">{totalStats.available}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-red-600">{totalStats.occupied}</p>
              </div>
              <Users className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reserved</p>
                <p className="text-2xl font-bold text-yellow-600">{totalStats.reserved}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cleaning</p>
                <p className="text-2xl font-bold text-blue-600">{totalStats.cleaning}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections and Tables Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {filteredSections.map((section) => {
            const statusCount = getStatusCount(section);
            const filteredTables = section.tables?.filter(table =>
              !searchQuery ||
              table.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
              table.current_customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              table.reserved_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredTables?.length === 0) return null;

            return (
              <div key={section.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", section.color, "bg-opacity-20")}>
                      <span className="text-xl">{section.icon}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{section.name}</h2>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {statusCount.available} Available
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3 text-red-500" />
                      {statusCount.occupied} Occupied
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3 text-yellow-500" />
                      {statusCount.reserved} Reserved
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredTables?.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      section={section}
                      onEdit={handleEditTable}
                      onDelete={(table, section) => {
                        setSelectedTable({ table, section });
                        setDeleteDialogOpen(true);
                      }}
                      onStatusChange={handleStatusChange}
                      onViewOrder={() => handleViewOrder(table)}
                      onReserve={(table) => {
                        setSelectedTable({ table, section });
                        setReserveDialogOpen(true);
                      }}
                      onCreateOrder={() => handleCreateOrder(table)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Dialogs - Desktop */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>Update table information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Table Number</Label>
              <Input
                value={editingTable.number || ""}
                onChange={(e) => setEditingTable(prev => ({ ...prev, number: e.target.value }))}
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={editingTable.capacity || 2}
                onChange={(e) => setEditingTable(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={editingTable.status}
                onValueChange={(v: any) => setEditingTable(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editingTable.notes || ""}
                onChange={(e) => setEditingTable(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Special notes about this table..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reserve Table {selectedTable?.table.number}</DialogTitle>
            <DialogDescription>Enter customer information for the reservation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer Name *</Label>
              <Input
                value={reservationData.customer_name}
                onChange={(e) => setReservationData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={reservationData.customer_phone}
                onChange={(e) => setReservationData(prev => ({ ...prev, customer_phone: e.target.value }))}
                placeholder="Contact number"
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={reservationData.customer_email}
                onChange={(e) => setReservationData(prev => ({ ...prev, customer_email: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            <div>
              <Label>Party Size</Label>
              <Input
                type="number"
                value={reservationData.party_size}
                onChange={(e) => setReservationData(prev => ({ ...prev, party_size: parseInt(e.target.value) }))}
                min={1}
                max={selectedTable?.table.capacity || 10}
              />
            </div>
            <div>
              <Label>Reservation Time</Label>
              <Input
                type="datetime-local"
                value={new Date(reservationData.reservation_time.getTime() - reservationData.reservation_time.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => setReservationData(prev => ({ ...prev, reservation_time: new Date(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Select
                value={reservationData.duration_minutes.toString()}
                onValueChange={(v) => setReservationData(prev => ({ ...prev, duration_minutes: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Special Notes</Label>
              <Textarea
                value={reservationData.notes}
                onChange={(e) => setReservationData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requests or notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReserve} disabled={!reservationData.customer_name || !reservationData.customer_phone}>
              Confirm Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Table {selectedTable?.table.number}? This action cannot be undone.
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