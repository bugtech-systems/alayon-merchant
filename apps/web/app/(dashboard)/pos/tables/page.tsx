// app/(pos)/tables/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  User,
  Calendar,
  Phone,
  Mail,
  Utensils,
  Coffee,
  Beer,
  Sun,
  Moon,
  Home,
  Building2,
  Loader2,
  MoreVertical,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

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

interface Order {
  id: string;
  order_number: string;
  table_id?: string;
  customer_name?: string;
  items_count: number;
  total_amount: number;
  status: string;
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

const mockReservations: Reservation[] = [
  {
    id: "res_1",
    table_id: "tbl_3",
    customer_name: "Jane Smith",
    customer_phone: "+1234567890",
    customer_email: "jane@example.com",
    party_size: 4,
    reservation_time: new Date(Date.now() + 3600000),
    duration_minutes: 120,
    status: "confirmed",
    created_at: new Date(),
  },
  {
    id: "res_2",
    table_id: "tbl_10",
    customer_name: "Family Garcia",
    customer_phone: "+1234567891",
    party_size: 6,
    reservation_time: new Date(Date.now() + 7200000),
    duration_minutes: 120,
    status: "confirmed",
    created_at: new Date(),
  },
];

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
}

function TableCard({ table, section, onEdit, onDelete, onStatusChange, onViewOrder, onReserve }: TableCardProps) {
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

  const getStatusIcon = (status: Table["status"]) => {
    switch (status) {
      case "available": return <CheckCircle className="h-4 w-4" />;
      case "occupied": return <Users className="h-4 w-4" />;
      case "reserved": return <Calendar className="h-4 w-4" />;
      case "cleaning": return <RefreshCw className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-lg",
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
              onClick={() => onEdit(table, section)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(table, section)}
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
              <Button size="sm" className="flex-1" onClick={() => onStatusChange(table, section, "occupied")}>
                Occupy
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onReserve(table)}>
                Reserve
              </Button>
            </>
          )}
          {table.status === "occupied" && (
            <Button size="sm" variant="destructive" className="flex-1" onClick={() => onViewOrder(table)}>
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

// ============================================================================
// MAIN TABLES PAGE COMPONENT
// ============================================================================

export default function TablesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<Section[]>(mockSections);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<{ table: Table; section: Section } | null>(null);
  const [editingTable, setEditingTable] = useState<Partial<Table>>({});
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

  const getSectionIcon = (type: Section["type"]) => {
    switch (type) {
      case "dining": return <Utensils className="h-4 w-4" />;
      case "bar": return <Beer className="h-4 w-4" />;
      case "patio": return <Sun className="h-4 w-4" />;
      case "private": return <Home className="h-4 w-4" />;
      case "vip": return <Building2 className="h-4 w-4" />;
      default: return <Utensils className="h-4 w-4" />;
    }
  };

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
    
    const newReservation: Reservation = {
      id: `res_${Date.now()}`,
      table_id: selectedTable.table.id,
      customer_name: reservationData.customer_name,
      customer_phone: reservationData.customer_phone,
      customer_email: reservationData.customer_email,
      party_size: reservationData.party_size,
      reservation_time: reservationData.reservation_time,
      duration_minutes: reservationData.duration_minutes,
      status: "confirmed",
      notes: reservationData.notes,
      created_at: new Date(),
    };
    
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

  const handleViewOrder = (table: Table) => {
    // Navigate to order details or open order modal
    toast({ title: "View Order", description: `Viewing order for Table ${table.number}` });
  };

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
              // Add new table logic
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border-b">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tables</p>
                <p className="text-2xl font-bold">
                  {sections.reduce((sum, s) => sum + (s.tables?.length || 0), 0)}
                </p>
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
                <p className="text-2xl font-bold text-green-600">
                  {sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "available").length || 0), 0)}
                </p>
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
                <p className="text-2xl font-bold text-red-600">
                  {sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "occupied").length || 0), 0)}
                </p>
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
                <p className="text-2xl font-bold text-yellow-600">
                  {sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "reserved").length || 0), 0)}
                </p>
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
                <p className="text-2xl font-bold text-blue-600">
                  {sections.reduce((sum, s) => sum + (s.tables?.filter(t => t.status === "cleaning").length || 0), 0)}
                </p>
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
                      onViewOrder={handleViewOrder}
                      onReserve={(table) => {
                        setSelectedTable({ table, section });
                        setReserveDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Edit Table Dialog */}
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

      {/* Delete Confirmation Dialog */}
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

      {/* Reservation Dialog */}
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
    </div>
  );
}