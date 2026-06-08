// app/(pos)/drafts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Copy,
  Archive,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  User,
  MapPin,
  ShoppingCart,
  DollarSign,
  Loader2,
  RefreshCw,
  Filter,
  Download,
  Printer,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

interface DraftItem {
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

interface DraftOrder {
  id: string;
  draft_number: number;
  items: DraftItem[];
  created_at: Date;
  updated_at: Date;
  status: "draft" | "active" | "completed" | "cancelled" | "expired";
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  placement?: {
    id: string;
    type: "table" | "section" | "takeaway" | "delivery";
    reference_id: string;
    name: string;
  };
  notes?: string;
  subtotal: number;
  tax: number;
  tax_rate: number;
  total: number;
  item_count: number;
}

// ============================================================================
// MOCK DATA - Replace with actual API calls
// ============================================================================

const mockDrafts: DraftOrder[] = [
  {
    id: "draft_1",
    draft_number: 1001,
    items: [
      { id: "item_1", product_id: "prod_1", variant_id: "var_1", title: "Classic Cheeseburger", thumbnail: null, quantity: 2, unit_price: 12.99, subtotal: 25.98, total: 25.98 },
      { id: "item_2", product_id: "prod_2", variant_id: "var_2", title: "French Fries", thumbnail: null, quantity: 1, unit_price: 4.99, subtotal: 4.99, total: 4.99 },
    ],
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    status: "active",
    customer_name: "John Doe",
    customer_email: "john@example.com",
    customer_phone: "+1234567890",
    placement: {
      id: "tbl_2",
      type: "table",
      reference_id: "tbl_2",
      name: "Table 2 - Main Dining",
    },
    notes: "Extra ketchup please",
    subtotal: 30.97,
    tax: 3.72,
    tax_rate: 0.12,
    total: 34.69,
    item_count: 3,
  },
  {
    id: "draft_2",
    draft_number: 1002,
    items: [
      { id: "item_3", product_id: "prod_3", variant_id: "var_3", title: "Margherita Pizza", thumbnail: null, quantity: 1, unit_price: 18.99, subtotal: 18.99, total: 18.99 },
      { id: "item_4", product_id: "prod_4", variant_id: "var_4", title: "Caesar Salad", thumbnail: null, quantity: 1, unit_price: 8.99, subtotal: 8.99, total: 8.99 },
      { id: "item_5", product_id: "prod_5", variant_id: "var_5", title: "Iced Tea", thumbnail: null, quantity: 2, unit_price: 3.50, subtotal: 7.00, total: 7.00 },
    ],
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: "draft",
    placement: {
      id: "tbl_6",
      type: "table",
      reference_id: "tbl_6",
      name: "Table 6 - Bar Area",
    },
    subtotal: 34.98,
    tax: 4.20,
    tax_rate: 0.12,
    total: 39.18,
    item_count: 4,
  },
  {
    id: "draft_3",
    draft_number: 1003,
    items: [
      { id: "item_6", product_id: "prod_6", variant_id: "var_6", title: "Chicken Wings", thumbnail: null, quantity: 2, unit_price: 9.99, subtotal: 19.98, total: 19.98 },
    ],
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 20 * 60 * 60 * 1000),
    status: "expired",
    customer_name: "Jane Smith",
    customer_phone: "+1234567891",
    placement: {
      id: "takeaway",
      type: "takeaway",
      reference_id: "takeaway",
      name: "Takeaway Order",
    },
    subtotal: 19.98,
    tax: 2.40,
    tax_rate: 0.12,
    total: 22.38,
    item_count: 2,
  },
];

// ============================================================================
// DRAFT CARD COMPONENT
// ============================================================================

interface DraftCardProps {
  draft: DraftOrder;
  onLoad: (draft: DraftOrder) => void;
  onEdit: (draft: DraftOrder) => void;
  onDelete: (draft: DraftOrder) => void;
  onDuplicate: (draft: DraftOrder) => void;
  onArchive: (draft: DraftOrder) => void;
  currencyCode?: string;
}

function DraftCard({ draft, onLoad, onEdit, onDelete, onDuplicate, onArchive, currencyCode = "PHP" }: DraftCardProps) {
  const getStatusColor = (status: DraftOrder["status"]) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "draft": return "bg-yellow-500";
      case "completed": return "bg-blue-500";
      case "cancelled": return "bg-red-500";
      case "expired": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status: DraftOrder["status"]) => {
    switch (status) {
      case "active": return "Active";
      case "draft": return "Draft";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      case "expired": return "Expired";
      default: return "Unknown";
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-lg",
      draft.status === "active" && "border-green-200 bg-green-50/30",
      draft.status === "draft" && "border-yellow-200 bg-yellow-50/30",
      draft.status === "expired" && "border-gray-200 bg-gray-50/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", getStatusColor(draft.status))} />
            <span className="text-xs font-medium text-muted-foreground">
              {getStatusText(draft.status)}
            </span>
            <Badge variant="outline" className="text-xs">
              Draft #{draft.draft_number}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(draft)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDuplicate(draft)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(draft)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {draft.placement && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{draft.placement.name}</span>
            </div>
          )}
          {draft.customer_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{draft.customer_name}</span>
              {draft.customer_phone && (
                <span className="text-xs text-muted-foreground">({draft.customer_phone})</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Updated: {format(new Date(draft.updated_at), "MMM d, h:mm a")}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-sm">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span>{draft.item_count} items</span>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-primary">
              {currencyCode} {draft.total.toFixed(2)}
            </p>
          </div>
        </div>

        {draft.notes && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            📝 {draft.notes}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onLoad(draft)}>
            Load Order
          </Button>
          {draft.status === "active" && (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onArchive(draft)}>
              <Archive className="mr-1 h-3 w-3" />
              Archive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DRAFTS PAGE COMPONENT
// ============================================================================

export default function DraftsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<DraftOrder[]>(mockDrafts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDraft, setSelectedDraft] = useState<DraftOrder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState("");

  // Filter drafts
  const filteredDrafts = drafts.filter(draft => {
    if (statusFilter !== "all" && draft.status !== statusFilter) return false;
    if (typeFilter !== "all") {
      if (typeFilter === "dine-in" && !draft.placement) return false;
      if (typeFilter === "takeaway" && draft.placement?.type !== "takeaway") return false;
      if (typeFilter === "delivery" && draft.placement?.type !== "delivery") return false;
    }
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        draft.draft_number.toString().includes(searchLower) ||
        draft.customer_name?.toLowerCase().includes(searchLower) ||
        draft.placement?.name.toLowerCase().includes(searchLower) ||
        draft.items.some(item => item.title.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const stats = {
    total: drafts.length,
    active: drafts.filter(d => d.status === "active").length,
    draft: drafts.filter(d => d.status === "draft").length,
    completed: drafts.filter(d => d.status === "completed").length,
    totalValue: drafts.reduce((sum, d) => sum + d.total, 0),
  };

  const handleLoadDraft = (draft: DraftOrder) => {
    // Store in localStorage and redirect to POS
    localStorage.setItem("current_draft_id", draft.id);
    localStorage.setItem("pos_cart", JSON.stringify(draft.items));
    window.location.href = "/pos";
    toast({ title: "Draft loaded", description: `Draft #${draft.draft_number} is ready` });
  };

  const handleDeleteDraft = () => {
    if (!selectedDraft) return;
    setDrafts(prev => prev.filter(d => d.id !== selectedDraft.id));
    setDeleteDialogOpen(false);
    toast({ title: "Draft deleted", description: `Draft #${selectedDraft.draft_number} has been removed` });
  };

  const handleDuplicateDraft = (draft: DraftOrder) => {
    const newDraft: DraftOrder = {
      ...draft,
      id: `draft_${Date.now()}`,
      draft_number: Math.max(...drafts.map(d => d.draft_number), 0) + 1,
      created_at: new Date(),
      updated_at: new Date(),
      status: "draft",
    };
    setDrafts(prev => [newDraft, ...prev]);
    toast({ title: "Draft duplicated", description: `Created copy of Draft #${draft.draft_number}` });
  };

  const handleArchiveDraft = (draft: DraftOrder) => {
    setDrafts(prev => prev.map(d => 
      d.id === draft.id ? { ...d, status: "completed" as const } : d
    ));
    toast({ title: "Draft archived", description: `Draft #${draft.draft_number} has been archived` });
  };

  const handleUpdateNotes = () => {
    if (!selectedDraft) return;
    setDrafts(prev => prev.map(d =>
      d.id === selectedDraft.id ? { ...d, notes: editingNotes, updated_at: new Date() } : d
    ));
    setEditDialogOpen(false);
    toast({ title: "Notes updated", description: "Draft notes have been saved" });
  };

  const getStatusCount = (status: string) => {
    return drafts.filter(d => d.status === status).length;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Draft Orders</h1>
              <p className="text-sm text-muted-foreground">
                Manage and continue incomplete orders
              </p>
            </div>
            <Button onClick={() => window.location.href = "/pos"}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by draft number, customer name, table, or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({stats.total})</SelectItem>
                <SelectItem value="active">Active ({getStatusCount("active")})</SelectItem>
                <SelectItem value="draft">Draft ({getStatusCount("draft")})</SelectItem>
                <SelectItem value="completed">Completed ({getStatusCount("completed")})</SelectItem>
                <SelectItem value="expired">Expired ({getStatusCount("expired")})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dine-in">Dine In</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setTypeFilter("all");
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
                <p className="text-sm text-muted-foreground">Total Drafts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
              </div>
              <Edit2 className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <Archive className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-primary">₱{stats.totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drafts Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No drafts found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first order to see drafts here"}
              </p>
              {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onLoad={handleLoadDraft}
                  onEdit={(draft) => {
                    setSelectedDraft(draft);
                    setEditingNotes(draft.notes || "");
                    setEditDialogOpen(true);
                  }}
                  onDelete={(draft) => {
                    setSelectedDraft(draft);
                    setDeleteDialogOpen(true);
                  }}
                  onDuplicate={handleDuplicateDraft}
                  onArchive={handleArchiveDraft}
                  currencyCode="₱"
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Draft #{selectedDraft?.draft_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDraft} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Notes Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft Notes</DialogTitle>
            <DialogDescription>
              Update notes for Draft #{selectedDraft?.draft_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Order Notes</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add special instructions, notes for the kitchen, etc..."
              />
            </div>
            {selectedDraft?.placement && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium mb-1">Order Details</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDraft.placement.name} · {selectedDraft.item_count} items · 
                  ₱{selectedDraft.total.toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper imports
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";