// components/cart/beeper-selector.tsx

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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Radio,
  X,
  Check,
  AlertCircle,
  Clock,
  Users,
  Search,
  LayoutGrid,
  List,
  Link,
  Unlink,
  Package,
  Circle,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface Beeper {
  id: string;
  name: string;
  number: string;
  status: 'available' | 'assigned' | 'reserved' | 'maintenance';
  orderIds: string[];
  location?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  status: 'active' | 'completed' | 'cancelled';
}

interface BeeperSelectorProps {
  selectedBeeperIds: string[];
  onSelect: (ids: string[]) => void;
  disabledIds?: string[];
  onClear?: () => void;
  onAttachOrder?: (beeperId: string, orderId: string) => Promise<void>;
  onDetachOrder?: (beeperId: string, orderId: string) => Promise<void>;
  currentOrder?: Order;
}

// Simple Beeper Card
function BeeperCard({
  beeper,
  isSelected,
  isDisabled,
  isCurrentOrderAttached,
  onToggle,
  onManage,
}: {
  beeper: Beeper;
  isSelected: boolean;
  isDisabled: boolean;
  isCurrentOrderAttached: boolean;
  onToggle: () => void;
  onManage: () => void;
}) {
  const getStatusConfig = () => {
    if (isSelected) return { color: 'border-primary bg-primary/5', icon: <Check className="h-4 w-4 text-primary" /> };
    if (isDisabled) return { color: 'border-gray-300 bg-gray-50 opacity-50', icon: <AlertCircle className="h-4 w-4 text-gray-400" /> };
    if (beeper.status === 'assigned') return { color: 'border-destructive/50 bg-destructive/5', icon: <Bell className="h-4 w-4 text-destructive" /> };
    if (beeper.status === 'reserved') return { color: 'border-yellow-500/50 bg-yellow-500/5', icon: <Clock className="h-4 w-4 text-yellow-500" /> };
    if (beeper.status === 'maintenance') return { color: 'border-gray-300 bg-gray-100', icon: <AlertCircle className="h-4 w-4 text-gray-500" /> };
    return { color: 'border-border hover:border-primary/50', icon: <Circle className="h-4 w-4 text-muted-foreground/30" /> };
  };

  const statusConfig = getStatusConfig();
  const orderCount = beeper.orderIds.length;

  return (
    <div
      className={cn(
        "relative p-3 rounded-lg border transition-all cursor-pointer group",
        statusConfig.color,
        isSelected && "ring-2 ring-primary",
        isCurrentOrderAttached && "ring-1 ring-primary/30",
        !isDisabled && "hover:shadow-md hover:scale-[1.02]"
      )}
      onClick={!isDisabled ? onToggle : undefined}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{beeper.name}</span>
            {isCurrentOrderAttached && (
              <Link className="h-3 w-3 text-primary flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            #{beeper.number}
            {orderCount > 0 && ` • ${orderCount} order${orderCount !== 1 ? 's' : ''}`}
            {beeper.location && ` • ${beeper.location}`}
          </div>
          <div className="flex gap-1 mt-1.5">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] capitalize",
                isSelected && "border-primary text-primary",
                beeper.status === 'assigned' && "border-destructive/50 text-destructive",
                beeper.status === 'reserved' && "border-yellow-500/50 text-yellow-600",
                beeper.status === 'maintenance' && "border-gray-400 text-gray-500"
              )}
            >
              {isSelected ? 'Selected' : beeper.status}
            </Badge>
            {isCurrentOrderAttached && (
              <Badge variant="default" className="text-[10px]">
                Current Order
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {statusConfig.icon}
          {!isDisabled && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onManage();
              }}
            >
              <Users className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Management Dialog (simplified)
function BeeperManagementDialog({
  beeper,
  onClose,
  onAttachOrder,
  onDetachOrder,
  currentOrder,
}: {
  beeper: Beeper;
  onClose: () => void;
  onAttachOrder?: (beeperId: string, orderId: string) => Promise<void>;
  onDetachOrder?: (beeperId: string, orderId: string) => Promise<void>;
  currentOrder?: Order;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const isCurrentOrderAttached = currentOrder?.id && beeper.orderIds.includes(currentOrder.id);

  const handleAttach = async () => {
    if (!currentOrder || !onAttachOrder) return;
    setIsLoading(true);
    try {
      await onAttachOrder(beeper.id, currentOrder.id);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetach = async () => {
    if (!currentOrder || !onDetachOrder) return;
    setIsLoading(true);
    try {
      await onDetachOrder(beeper.id, currentOrder.id);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const otherOrders = beeper.orderIds.filter(id => id !== currentOrder?.id);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            {beeper.name}
          </DialogTitle>
          <DialogDescription>
            #{beeper.number} • {beeper.orderIds.length} order{beeper.orderIds.length !== 1 ? 's' : ''} attached
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline" className="capitalize">
              {beeper.status}
            </Badge>
          </div>

          {/* Current Order Action */}
          {currentOrder && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-medium">{currentOrder.orderNumber}</span>
                  {currentOrder.customerName && (
                    <span className="text-muted-foreground">• {currentOrder.customerName}</span>
                  )}
                </div>
                {isCurrentOrderAttached ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDetach}
                    disabled={isLoading}
                    className="h-7 text-xs"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    Detach
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleAttach}
                    disabled={isLoading || beeper.status === 'maintenance'}
                    className="h-7 text-xs"
                  >
                    <Link className="h-3 w-3 mr-1" />
                    Attach
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Other Attached Orders */}
          {otherOrders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Other Attached Orders</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {otherOrders.map(orderId => (
                  <div key={orderId} className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm">
                    <span className="font-mono text-xs">{orderId.slice(0, 8)}</span>
                    {onDetachOrder && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={async () => {
                          setIsLoading(true);
                          try {
                            await onDetachOrder(beeper.id, orderId);
                            onClose();
                          } catch (error) {
                            console.error(error);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      >
                        <Unlink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            {beeper.status === 'available' && 'Beeper is available for assignment'}
            {beeper.status === 'assigned' && `Beeper is assigned with ${beeper.orderIds.length} orders`}
            {beeper.status === 'reserved' && 'Beeper is reserved'}
            {beeper.status === 'maintenance' && 'Beeper is under maintenance'}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export function BeeperSelector({
  selectedBeeperIds,
  onSelect,
  disabledIds = [],
  onClear,
  onAttachOrder,
  onDetachOrder,
  currentOrder,
}: BeeperSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [beepers, setBeepers] = useState<Beeper[]>([]);
  const [loading, setLoading] = useState(false);
  const [managingBeeper, setManagingBeeper] = useState<Beeper | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState("");

  // Load beepers from localStorage
  useEffect(() => {
    const loadBeepers = () => {
      try {
        const stored = localStorage.getItem("simple-beepers");
        if (stored) {
          setBeepers(JSON.parse(stored));
        } else {
          const defaultBeepers = Array.from({ length: 16 }, (_, i) => ({
            id: `beeper-${i + 1}`,
            name: `Beeper ${i + 1}`,
            number: (i + 1).toString(),
            status: 'available' as const,
            orderIds: [],
            location: i < 8 ? 'Main Floor' : 'Upper Level',
          }));
          setBeepers(defaultBeepers);
          localStorage.setItem("simple-beepers", JSON.stringify(defaultBeepers));
        }
      } catch (err) {
        console.error("Error loading beepers:", err);
      }
    };
    
    loadBeepers();
    window.addEventListener("storage", loadBeepers);
    return () => window.removeEventListener("storage", loadBeepers);
  }, []);

  // Update beeper status
  const updateBeeper = useCallback(async (beeperId: string, updates: Partial<Beeper>) => {
    try {
      setLoading(true);
      const updated = beepers.map(b => 
        b.id === beeperId ? { ...b, ...updates } : b
      );
      setBeepers(updated);
      localStorage.setItem("simple-beepers", JSON.stringify(updated));
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error updating beeper:", err);
      setLoading(false);
      return false;
    }
  }, [beepers]);

  // Toggle beeper selection (only one beeper allowed)
  const toggleBeeper = useCallback(async (beeperId: string) => {
    const beeper = beepers.find(b => b.id === beeperId);
    if (!beeper) return;

    // Can't select disabled beepers
    if (disabledIds.includes(beeperId) && !selectedBeeperIds.includes(beeperId)) return;
    if (beeper.status === 'maintenance') return;

    // If the beeper is already selected, deselect it
    if (selectedBeeperIds.includes(beeperId)) {
      onSelect([]);
      if (onClear) onClear();
      return;
    }

    // Only allow selecting one beeper
    // First, detach current order from any beeper that has it attached
    if (currentOrder && onDetachOrder) {
      // Find any beeper that has this order attached
      const beepersWithOrder = beepers.filter(b => 
        b.orderIds.includes(currentOrder.id) && b.id !== beeperId
      );
      
      // Detach from all other beepers
      for (const b of beepersWithOrder) {
        await onDetachOrder(b.id, currentOrder.id);
        await updateBeeper(b.id, { 
          orderIds: b.orderIds.filter(id => id !== currentOrder.id) 
        });
      }
    }

    // Select the new beeper
    if (beeper.status === 'available') {
      await updateBeeper(beeperId, { status: 'assigned' });
    }
    
    onSelect([beeperId]);
    
    // Auto-close the dialog when a beeper is selected
    setIsOpen(false);
  }, [beepers, selectedBeeperIds, disabledIds, currentOrder, onSelect, onClear, updateBeeper, onDetachOrder]);

  // Quick attach/detach current order to the selected beeper
  const handleQuickAttach = useCallback(async (beeperId: string) => {
    if (!currentOrder || !onAttachOrder || !onDetachOrder) return;
    
    const beeper = beepers.find(b => b.id === beeperId);
    if (!beeper) return;

    // If current order is already attached to this beeper, detach it
    if (beeper.orderIds.includes(currentOrder.id)) {
      await onDetachOrder(beeperId, currentOrder.id);
      await updateBeeper(beeperId, { 
        orderIds: beeper.orderIds.filter(id => id !== currentOrder.id) 
      });
      // If no orders left, mark as available
      if (beeper.orderIds.length === 1) {
        await updateBeeper(beeperId, { status: 'available' });
      }
      return;
    }

    // Otherwise, detach from any other beeper first
    const beepersWithOrder = beepers.filter(b => 
      b.orderIds.includes(currentOrder.id) && b.id !== beeperId
    );
    
    for (const b of beepersWithOrder) {
      await onDetachOrder(b.id, currentOrder.id);
      const updatedOrderIds = b.orderIds.filter(id => id !== currentOrder.id);
      await updateBeeper(b.id, { 
        orderIds: updatedOrderIds,
        status: updatedOrderIds.length === 0 ? 'available' : 'assigned'
      });
    }

    // Attach to the selected beeper
    await onAttachOrder(beeperId, currentOrder.id);
    await updateBeeper(beeperId, { 
      orderIds: [...beeper.orderIds, currentOrder.id],
      status: 'assigned'
    });
  }, [beepers, currentOrder, onAttachOrder, onDetachOrder, updateBeeper]);

  // Filter beepers
  const filteredBeepers = useMemo(() => {
    let filtered = beepers;
    if (searchQuery) {
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.number.includes(searchQuery) ||
        (b.location && b.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return filtered;
  }, [beepers, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = beepers.length;
    const assigned = beepers.filter(b => b.status === 'assigned').length;
    const reserved = beepers.filter(b => b.status === 'reserved').length;
    const maintenance = beepers.filter(b => b.status === 'maintenance').length;
    const available = total - assigned - reserved - maintenance;
    const totalAttachedOrders = beepers.reduce((sum, b) => sum + b.orderIds.length, 0);
    return { total, assigned, reserved, maintenance, available, totalAttachedOrders };
  }, [beepers]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">
            Beeper {selectedBeeperIds.length > 0 && `(${selectedBeeperIds.length})`}
          </label>
          {currentOrder && (
            <Badge variant="outline" className="text-xs">
              <Package className="h-3 w-3 mr-1" />
              {currentOrder.orderNumber}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => setIsOpen(true)}
          >
            <Radio className="h-3 w-3 mr-1" />
            {selectedBeeperIds.length > 0 ? "Change" : "Select"}
          </Button>
          {selectedBeeperIds.length > 0 && onClear && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-destructive"
              onClick={() => {
                onSelect([]);
                onClear();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Selected beeper */}
      {selectedBeeperIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedBeeperIds.map(id => {
            const beeper = beepers.find(b => b.id === id);
            const isCurrentAttached = currentOrder?.id && beeper?.orderIds.includes(currentOrder.id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 text-xs">
                <Radio className="h-2 w-2" />
                {beeper?.name || id}
                {isCurrentAttached && (
                  <Link className="h-2 w-2 ml-1 text-primary" />
                )}
                <button 
                  onClick={() => toggleBeeper(id)} 
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>🟢 {stats.available} available</span>
        <span>🔴 {stats.assigned} assigned</span>
        <span>🟡 {stats.reserved} reserved</span>
        <span>⚙️ {stats.maintenance} maintenance</span>
        <span>📦 {stats.totalAttachedOrders} orders</span>
      </div>

      {/* Main Dialog - Simplified */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Select a Beeper
            </DialogTitle>
            <DialogDescription>
              Choose one beeper for this order. Only one beeper can be selected per order.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-3">
            {/* Search & View */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search beepers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-8"
                />
              </div>
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

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-xs text-blue-600">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                <span>Only one beeper can be assigned to an order. Selecting a new beeper will replace the current one.</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary"></div> Selected
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive"></div> Assigned
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Reserved
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Available
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div> Maintenance
              </span>
              <span className="flex items-center gap-1">
                <Link className="h-3 w-3" /> Current order
              </span>
            </div>

            {/* Beeper Grid/List */}
            <ScrollArea className="h-[50vh] pr-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : filteredBeepers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No beepers found</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredBeepers.map(beeper => {
                    const isSelected = selectedBeeperIds.includes(beeper.id);
                    const isDisabled = disabledIds.includes(beeper.id) && !isSelected;
                    const isCurrentOrderAttached = currentOrder?.id && beeper.orderIds.includes(currentOrder.id);
                    
                    return (
                      <BeeperCard
                        key={beeper.id}
                        beeper={beeper}
                        isSelected={isSelected}
                        isDisabled={isDisabled}
                        isCurrentOrderAttached={isCurrentOrderAttached}
                        onToggle={() => toggleBeeper(beeper.id)}
                        onManage={() => setManagingBeeper(beeper)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredBeepers.map(beeper => {
                    const isSelected = selectedBeeperIds.includes(beeper.id);
                    const isDisabled = disabledIds.includes(beeper.id) && !isSelected;
                    const isCurrentOrderAttached = currentOrder?.id && beeper.orderIds.includes(currentOrder.id);
                    
                    return (
                      <div
                        key={beeper.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer",
                          isSelected && "border-primary bg-primary/5 ring-2 ring-primary",
                          isCurrentOrderAttached && "ring-1 ring-primary/30",
                          !isDisabled && "hover:bg-muted/50",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => toggleBeeper(beeper.id)}
                      >
                        <Radio className={cn(
                          "h-4 w-4",
                          isSelected ? "text-primary" : "text-muted-foreground/30"
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{beeper.name}</span>
                            <span className="text-xs text-muted-foreground">#{beeper.number}</span>
                            {isCurrentOrderAttached && (
                              <Link className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{beeper.status}</span>
                            {beeper.orderIds.length > 0 && (
                              <span>• {beeper.orderIds.length} orders</span>
                            )}
                            {beeper.location && <span>• {beeper.location}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManagingBeeper(beeper);
                          }}
                        >
                          <Users className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
              <div className="flex gap-4">
                <span>Selected: {selectedBeeperIds.length}</span>
                <span>Total: {stats.total}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Management Dialog */}
      {managingBeeper && (
        <BeeperManagementDialog
          beeper={managingBeeper}
          onClose={() => setManagingBeeper(null)}
          onAttachOrder={onAttachOrder}
          onDetachOrder={onDetachOrder}
          currentOrder={currentOrder}
        />
      )}
    </div>
  );
}