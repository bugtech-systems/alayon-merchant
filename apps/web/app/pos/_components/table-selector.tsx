// components/cart/table-selector.tsx

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  X,
  Check,
  AlertCircle,
  Clock,
  Users,
  RefreshCw,
  Circle,
  MoreVertical,
  Edit2,
  Trash2,
  Plus,
  Search,
  LayoutGrid,
  List,
  UserCheck,
  UserX,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimpleTable } from "./types";

interface TableSelectorProps {
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  disabledIds?: string[];
  onClear?: () => void;
  onOccupy?: (tableId: string, customerName?: string) => Promise<void>;
  onClearTable?: (tableId: string) => Promise<void>;
  onReserve?: (tableId: string) => Promise<void>;
  occupiedTableIds?: string[];
  currentOrderTableIds?: string[];
}

interface TableWithStatus extends SimpleTable {
  status: 'available' | 'occupied' | 'reserved' | 'selected' | 'disabled';
  customerName?: string;
}

// Simplified Table Management Dialog
function TableManagementDialog({ 
  table, 
  onClose, 
  onOccupy, 
  onClearTable, 
  onReserve,
}: {
  table: TableWithStatus;
  onClose: () => void;
  onOccupy: (tableId: string, customerName?: string) => Promise<void>;
  onClearTable: (tableId: string) => Promise<void>;
  onReserve: (tableId: string) => Promise<void>;
}) {
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOccupy = async () => {
    setIsLoading(true);
    try {
      await onOccupy(table.id, customerName || undefined);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    try {
      await onClearTable(table.id);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserve = async () => {
    setIsLoading(true);
    try {
      await onReserve(table.id);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{table.name}</span>
            <Badge variant="outline" className={cn(
              table.status === 'occupied' && 'border-destructive text-destructive',
              table.status === 'reserved' && 'border-yellow-500 text-yellow-600',
              table.status === 'selected' && 'border-primary text-primary'
            )}>
              {table.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Beeper #{table.number} • Capacity: {table.capacity}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status Info */}
          <div className="p-3 rounded-md bg-muted/30 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{table.status}</span>
            </div>
            {table.customerName && (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{table.customerName}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {table.status === 'available' && (
            <div className="space-y-3">
              <Input
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8"
              />
              <div className="flex gap-2">
                <Button onClick={handleOccupy} disabled={isLoading} className="flex-1">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Occupy
                </Button>
                <Button variant="outline" onClick={handleReserve} disabled={isLoading} className="flex-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Reserve
                </Button>
              </div>
            </div>
          )}

          {table.status === 'occupied' && (
            <div className="space-y-3">
              <div className="p-2 bg-destructive/5 rounded border border-destructive/20 text-sm text-destructive">
                Currently occupied {table.customerName && `by ${table.customerName}`}
              </div>
              <Button variant="destructive" onClick={handleClear} disabled={isLoading} className="w-full">
                <UserX className="h-3 w-3 mr-1" />
                Vacate Beeper
              </Button>
            </div>
          )}

          {table.status === 'reserved' && (
            <div className="space-y-3">
              <div className="p-2 bg-yellow-500/5 rounded border border-yellow-500/20 text-sm text-yellow-600">
                Reserved beeper
              </div>
              <div className="flex gap-2">
                <Button onClick={handleOccupy} disabled={isLoading} className="flex-1">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Seat Guest
                </Button>
                <Button variant="outline" onClick={handleClear} disabled={isLoading} className="flex-1">
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TableSelector({ 
  selectedIds, 
  onSelect, 
  disabledIds = [],
  onClear,
  onOccupy,
  onClearTable,
  onReserve,
  occupiedTableIds = [],
  currentOrderTableIds = []
}: TableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tables, setTables] = useState<SimpleTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableWithStatus | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');

  // Load tables from localStorage
  useEffect(() => {
    const loadTables = () => {
      try {
        const stored = localStorage.getItem("simple-tables");
        if (stored) {
          setTables(JSON.parse(stored));
        } else {
          const defaultTables = Array.from({ length: 16 }, (_, i) => ({
            id: `table-${i + 1}`,
            name: `Beeper ${i + 1}`,
            number: (i + 1).toString(),
            capacity: i >= 8 ? 8 : i >= 6 ? 6 : 4,
            status: "available" as const,
          }));
          setTables(defaultTables);
          localStorage.setItem("simple-tables", JSON.stringify(defaultTables));
        }
      } catch (err) {
        console.error("Error loading tables:", err);
      }
    };
    
    loadTables();
    window.addEventListener("storage", loadTables);
    return () => window.removeEventListener("storage", loadTables);
  }, []);

  // Update table status
  const updateTableStatus = useCallback(async (tableId: string, status: 'available' | 'occupied' | 'reserved') => {
    try {
      setLoading(true);
      const updated = tables.map(t => t.id === tableId ? { ...t, status } : t);
      setTables(updated);
      localStorage.setItem("simple-tables", JSON.stringify(updated));
      setLoading(false);
    } catch (err) {
      console.error("Error updating table:", err);
      setLoading(false);
    }
  }, [tables]);

  // Handle actions
  const handleOccupy = useCallback(async (tableId: string, customerName?: string) => {
    await updateTableStatus(tableId, 'occupied');
    if (onOccupy) await onOccupy(tableId, customerName);
  }, [updateTableStatus, onOccupy]);

  const handleClearTable = useCallback(async (tableId: string) => {
    await updateTableStatus(tableId, 'available');
    if (onClearTable) await onClearTable(tableId);
    if (selectedIds.includes(tableId)) {
      onSelect(selectedIds.filter(id => id !== tableId));
    }
  }, [updateTableStatus, onClearTable, selectedIds, onSelect]);

  const handleReserve = useCallback(async (tableId: string) => {
    await updateTableStatus(tableId, 'reserved');
    if (onReserve) await onReserve(tableId);
  }, [updateTableStatus, onReserve]);

  // Toggle table selection
  const toggleTable = useCallback(async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const isOccupied = table.status === 'occupied' && !selectedIds.includes(tableId);
    const isReserved = table.status === 'reserved' && !selectedIds.includes(tableId);
    
    if (isOccupied || isReserved) return;

    if (selectedIds.includes(tableId)) {
      onSelect(selectedIds.filter(id => id !== tableId));
    } else {
      onSelect([...selectedIds, tableId]);
      if (table.status === 'available' && onOccupy) {
        await handleOccupy(tableId);
      }
    }
  }, [tables, selectedIds, onSelect, handleOccupy]);

  // Get table status with context
  const getTableStatus = useCallback((table: SimpleTable): TableWithStatus => {
    const isSelected = selectedIds.includes(table.id);
    const isInCurrentOrder = currentOrderTableIds.includes(table.id);
    const isDisabled = disabledIds.includes(table.id) && !isSelected;

    let status: TableWithStatus['status'] = 'available';
    
    if (isSelected) status = 'selected';
    else if (isDisabled) status = 'disabled';
    else if (table.status === 'occupied') status = 'occupied';
    else if (table.status === 'reserved') status = 'reserved';

    return { ...table, status };
  }, [selectedIds, currentOrderTableIds, disabledIds]);

  // Get status styles
  const getStatusStyles = (status: TableWithStatus['status']) => {
    switch (status) {
      case 'selected':
        return { bg: 'bg-primary/5', border: 'border-primary', text: 'text-primary' };
      case 'occupied':
        return { bg: 'bg-destructive/5', border: 'border-destructive/50', text: 'text-destructive' };
      case 'reserved':
        return { bg: 'bg-yellow-500/5', border: 'border-yellow-500/50', text: 'text-yellow-600' };
      default:
        return { bg: '', border: 'border-border', text: '' };
    }
  };

  // Get status icon
  const getStatusIcon = (status: TableWithStatus['status']) => {
    switch (status) {
      case 'selected': return <Check className="h-4 w-4 text-primary" />;
      case 'occupied': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'reserved': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground/30" />;
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const reserved = tables.filter(t => t.status === 'reserved').length;
    const available = total - occupied - reserved;
    return { total, occupied, reserved, available };
  }, [tables]);

  // Filter tables
  const filteredTables = useMemo(() => {
    let filtered = tables;
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.number.includes(searchQuery)
      );
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    return filtered;
  }, [tables, searchQuery, filterStatus]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">
            Beepers {selectedIds.length > 0 && `(${selectedIds.length})`}
          </label>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => setIsOpen(true)}
          >
            <MapPin className="h-3 w-3 mr-1" />
            {selectedIds.length > 0 ? "Change" : "Select"}
          </Button>
          {selectedIds.length > 0 && onClear && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs text-destructive"
              onClick={() => {
                selectedIds.forEach(id => handleClearTable(id));
                onSelect([]);
                onClear();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Selected tables */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map(id => {
            const table = tables.find(t => t.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 text-xs">
                <MapPin className="h-2 w-2" />
                {table?.name || id}
                <button onClick={() => toggleTable(id)} className="ml-1 hover:text-destructive">
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Quick stats */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>🟢 {stats.available}</span>
        <span>🔴 {stats.occupied}</span>
        <span>🟡 {stats.reserved}</span>
      </div>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Beepers</DialogTitle>
            <DialogDescription>
              Select beepers for your order or manage table status
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-3">
            {/* Search & Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-8"
                />
              </div>
              <select
                className="h-8 px-2 text-sm border rounded-md bg-background"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </select>
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-2 py-1 text-xs",
                    viewMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <LayoutGrid className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-2 py-1 text-xs",
                    viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <List className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary"></div> Selected
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive"></div> Occupied
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Reserved
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div> Available
              </span>
            </div>

            {/* Table Grid/List */}
            <ScrollArea className="h-[50vh] pr-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No beepers found</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredTables.map(table => {
                    const status = getTableStatus(table);
                    const styles = getStatusStyles(status.status);
                    const isDisabled = status.status === 'occupied' || status.status === 'reserved';
                    
                    return (
                      <div key={table.id} className="relative group">
                        <button
                          onClick={() => toggleTable(table.id)}
                          disabled={isDisabled && !selectedIds.includes(table.id)}
                          className={cn(
                            "w-full p-3 rounded-lg border text-left transition-all",
                            styles.border,
                            styles.bg,
                            status.status === 'selected' && "ring-1 ring-primary",
                            !isDisabled && "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{table.name}</div>
                              <div className="text-xs text-muted-foreground">
                                #{table.number} • Cap: {table.capacity}
                              </div>
                            </div>
                            {getStatusIcon(status.status)}
                          </div>
                          {status.status === 'selected' && (
                            <Badge variant="default" className="text-[10px] mt-1">
                              Selected
                            </Badge>
                          )}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(status);
                          }}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTables.map(table => {
                    const status = getTableStatus(table);
                    const styles = getStatusStyles(status.status);
                    const isDisabled = status.status === 'occupied' || status.status === 'reserved';
                    
                    return (
                      <div
                        key={table.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border transition-all",
                          styles.border,
                          styles.bg
                        )}
                      >
                        <button
                          onClick={() => toggleTable(table.id)}
                          disabled={isDisabled && !selectedIds.includes(table.id)}
                          className="flex items-center gap-3 flex-1"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{table.name}</span>
                              <span className="text-xs text-muted-foreground">#{table.number}</span>
                              <span className="text-xs text-muted-foreground">• {table.capacity} seats</span>
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">{status.status}</div>
                          </div>
                          {getStatusIcon(status.status)}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedTable(status)}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer Stats */}
            <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
              <div className="flex gap-4">
                <span>🟢 {stats.available}</span>
                <span>🔴 {stats.occupied}</span>
                <span>🟡 {stats.reserved}</span>
              </div>
              <span>Total: {stats.total}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Management Dialog */}
      {selectedTable && (
        <TableManagementDialog
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onOccupy={handleOccupy}
          onClearTable={handleClearTable}
          onReserve={handleReserve}
        />
      )}
    </div>
  );
}