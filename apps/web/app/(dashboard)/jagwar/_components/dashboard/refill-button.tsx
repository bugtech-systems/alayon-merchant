// components/dashboard/refill-button.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Droplets, 
  AlertTriangle, 
  AlertOctagon,
  CheckCircle2, 
  Minus, 
  Plus, 
  Container, 
  Settings,
  ChevronDown,
  Package,
  Info,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Types
interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  location_id: string;
  stock_quantity?: number;
  reserved_quantity?: number;
  available_quantity?: number;
}

interface RefillButtonProps {
  backwashLimit: number;
  currentCount: number;
  onRefill: (quantity: number, containerSize: string, inventoryItem: InventoryItem) => Promise<void>;
  containerSize?: string;
  stockLocationId: string;
  defaultInventoryItemId?: string;
  onInventoryItemChange?: (item: InventoryItem) => void;
  fetchInventoryItemsFn?: (locationId: string) => Promise<InventoryItem[]>;
}

export function RefillButton({ 
  backwashLimit, 
  currentCount, 
  onRefill, 
  containerSize = '20L',
  stockLocationId,
  defaultInventoryItemId,
  onInventoryItemChange,
  fetchInventoryItemsFn
}: RefillButtonProps) {
  // State
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showOverLimitWarning, setShowOverLimitWarning] = useState(false);
  const [lastRefillTime, setLastRefillTime] = useState<Date | null>(null);
  const [refillHistory, setRefillHistory] = useState<Array<{ 
    quantity: number; 
    time: Date; 
    containerSize: string;
    inventoryItemId: string;
    inventoryItemSku: string;
    overLimit: boolean;
  }>>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  
  // Refs for animation
  const countDisplayRef = useRef<HTMLSpanElement>(null);
  const prevCountRef = useRef(currentCount);
  
  const { toast } = useToast();

  // Derived state
  const isOverLimit = currentCount >= backwashLimit;
  const willExceedLimit = currentCount + quantity > backwashLimit;
  const progressPercentage = Math.min((currentCount / backwashLimit) * 100, 100);
  const remainingCapacity = Math.max(0, backwashLimit - currentCount);
  const overBy = Math.max(0, currentCount + quantity - backwashLimit);

  // Fetch inventory on mount
  useEffect(() => {
    if (stockLocationId) {
      loadInventoryItems();
    }
  }, [stockLocationId]);

  // Set default inventory item
  useEffect(() => {
    if (inventoryItems.length > 0 && defaultInventoryItemId) {
      const defaultItem = inventoryItems.find(item => item.id === defaultInventoryItemId);
      if (defaultItem) {
        setSelectedInventoryItem(defaultItem);
        setSelectedItemId(defaultItem.id);
        onInventoryItemChange?.(defaultItem);
      }
    }
  }, [inventoryItems, defaultInventoryItemId]);

  // Animate count change
  useEffect(() => {
    if (countDisplayRef.current && prevCountRef.current !== currentCount) {
      countDisplayRef.current.classList.add('animate-bounce-in');
      const timer = setTimeout(() => {
        countDisplayRef.current?.classList.remove('animate-bounce-in');
      }, 500);
      prevCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
  }, [currentCount]);

  const loadInventoryItems = async () => {
    setIsFetching(true);
    try {
      let items: InventoryItem[] = [];
      
      if (fetchInventoryItemsFn) {
        items = await fetchInventoryItemsFn(stockLocationId);
      } else {
        const response = await fetch(`/api/inventory/items?location_id=${stockLocationId}`);
        const data = await response.json();
        items = data.items || [];
      }
      
      setInventoryItems(items);
      
      if (items.length > 0 && !selectedInventoryItem) {
        const firstItem = items[0];
        setSelectedInventoryItem(firstItem);
        setSelectedItemId(firstItem.id);
        onInventoryItemChange?.(firstItem);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory items.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleInventorySelect = (itemId: string) => {
    const selected = inventoryItems.find(item => item.id === itemId);
    if (selected) {
      setSelectedInventoryItem(selected);
      setSelectedItemId(selected.id);
      onInventoryItemChange?.(selected);
      setIsDialogOpen(false);
      toast({
        title: "Inventory Item Updated",
        description: `Using ${selected.sku || selected.title} for refills`,
      });
    }
  };

  // First click - show warning if over limit
  const handleRefill = useCallback(async () => {
    if (!selectedInventoryItem) {
      toast({
        title: "No Item Selected",
        description: "Please select an inventory item first.",
        variant: "destructive",
      });
      return;
    }

    // If will exceed limit and warning not shown, show it
    if (willExceedLimit && !showOverLimitWarning) {
      setShowOverLimitWarning(true);
      return;
    }

    // Proceed with refill
    setIsLoading(true);
    try {
      await onRefill(quantity, containerSize, selectedInventoryItem);
      
      const now = new Date();
      setLastRefillTime(now);
      setRefillHistory(prev => [
        { 
          quantity, 
          time: now, 
          containerSize,
          inventoryItemId: selectedInventoryItem.id,
          inventoryItemSku: selectedInventoryItem.sku || selectedInventoryItem.title,
          overLimit: willExceedLimit
        },
        ...prev.slice(0, 9)
      ]);
      
      setShowOverLimitWarning(false);
      
      // Toast based on status
      if (isOverLimit) {
        toast({
          title: "⚠️ Refill Recorded - Over Limit",
          description: `${quantity} containers added. Backwash urgently needed! (${currentCount + quantity}/${backwashLimit})`,
          variant: "destructive",
          duration: 6000,
        });
      } else if (willExceedLimit) {
        toast({
          title: "Refill Recorded - Limit Exceeded",
          description: `${quantity} containers added. Now at ${currentCount + quantity}/${backwashLimit}. Please backwash soon.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Refill Recorded",
          description: `+${quantity} ${containerSize} container${quantity > 1 ? 's' : ''} refilled successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record refill.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [quantity, containerSize, selectedInventoryItem, isOverLimit, willExceedLimit, showOverLimitWarning, currentCount, backwashLimit, onRefill, toast]);

  // Confirmed refill from warning dialog
  const handleConfirmedRefill = useCallback(async () => {
    setShowOverLimitWarning(false);
    setIsLoading(true);
    
    try {
      await onRefill(quantity, containerSize, selectedInventoryItem!);
      
      const now = new Date();
      setLastRefillTime(now);
      setRefillHistory(prev => [
        { 
          quantity, 
          time: now, 
          containerSize,
          inventoryItemId: selectedInventoryItem!.id,
          inventoryItemSku: selectedInventoryItem!.sku || selectedInventoryItem!.title,
          overLimit: true
        },
        ...prev.slice(0, 9)
      ]);
      
      toast({
        title: "⚠️ Over-Limit Refill Recorded",
        description: `${quantity} containers added. Now at ${currentCount + quantity}/${backwashLimit}. Backwash immediately!`,
        variant: "destructive",
        duration: 8000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record refill.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [quantity, containerSize, selectedInventoryItem, currentCount, backwashLimit, onRefill, toast]);

  const quickAdjust = (delta: number) => {
    const newQty = Math.max(1, Math.min(100, quantity + delta));
    setQuantity(newQty);
  };

  const getProgressColor = () => {
    if (progressPercentage >= 100) return "bg-red-500";
    if (progressPercentage >= 90) return "bg-red-400 animate-pulse";
    if (progressPercentage >= 70) return "bg-yellow-500";
    if (progressPercentage >= 50) return "bg-blue-500";
    return "bg-green-500";
  };

  const getProgressBgColor = () => {
    if (progressPercentage >= 100) return "bg-red-100";
    if (progressPercentage >= 80) return "bg-yellow-100";
    return "bg-blue-100";
  };

  // Render inventory selector dialog content
  const renderInventorySelector = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <Package className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-sm font-medium text-blue-700">Current Selection</p>
          {isFetching ? (
            <Skeleton className="h-5 w-48 mt-1" />
          ) : selectedInventoryItem ? (
            <p className="text-sm text-blue-600">
              {selectedInventoryItem.sku || selectedInventoryItem.title} 
              {selectedInventoryItem.available_quantity !== undefined && (
                <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded">
                  Stock: {selectedInventoryItem.available_quantity}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-500">No item selected</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inventory-select">Select Inventory Item</Label>
        <Select
          value={selectedItemId}
          onValueChange={handleInventorySelect}
          disabled={isFetching || inventoryItems.length === 0}
        >
          <SelectTrigger id="inventory-select" className="w-full">
            <SelectValue placeholder={isFetching ? "Loading..." : "Select an inventory item"} />
          </SelectTrigger>
          <SelectContent>
            {isFetching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : inventoryItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No items found</div>
            ) : (
              <ScrollArea className="h-[200px]">
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id} className="py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{item.sku || item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.title}
                        {item.available_quantity !== undefined && <> · Available: {item.available_quantity}</>}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </ScrollArea>
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedInventoryItem && (
        <div className="grid grid-cols-3 gap-2 bg-muted rounded-lg p-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Stock</div>
            <div className="text-sm font-bold">{selectedInventoryItem.stock_quantity ?? '-'}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Reserved</div>
            <div className="text-sm font-bold">{selectedInventoryItem.reserved_quantity ?? '-'}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-sm font-bold text-green-600">{selectedInventoryItem.available_quantity ?? '-'}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Animation styles */}
      <style jsx global>{`
        @keyframes bounce-in {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>

      <Card className={cn(
        "relative border-2 transition-all duration-300",
        isOverLimit 
          ? "border-red-400 bg-red-50/50 shadow-red-100 shadow-lg" 
          : willExceedLimit 
            ? "border-orange-300 bg-orange-50/30"
            : "hover:border-blue-200"
      )}>
        {/* Over Limit Banner */}
        {isOverLimit && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
            <Badge variant="destructive" className="px-4 py-1 text-sm animate-pulse gap-1">
              <ShieldAlert className="h-4 w-4" />
              BACKWASH REQUIRED - Over Limit by {currentCount - backwashLimit}
            </Badge>
          </div>
        )}

        <CardHeader className={cn("pb-4", isOverLimit && "pt-8")}>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Container className={cn(
                "h-5 w-5 transition-colors duration-300",
                isOverLimit ? "text-red-500" : "text-blue-500"
              )} />
              Container Refill Station
            </span>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isOverLimit ? "destructive" : "secondary"} 
                className="text-sm transition-all duration-300"
              >
                {containerSize} Jags
              </Badge>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1" disabled={isFetching}>
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {selectedInventoryItem ? selectedInventoryItem.sku?.slice(0, 12) || 'Item' : 'Select'}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Configure Inventory Item</DialogTitle>
                    <DialogDescription>Select the inventory item to use for refills.</DialogDescription>
                  </DialogHeader>
                  {renderInventorySelector()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => setIsDialogOpen(false)}>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-5">
          {/* Active Item Indicator */}
          <div className={cn(
            "flex items-center gap-2 rounded-lg p-2 px-3 transition-colors duration-300",
            isOverLimit ? "bg-red-100/50" : "bg-muted/50"
          )}>
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active:</span>
            {isFetching ? (
              <Skeleton className="h-4 w-32" />
            ) : selectedInventoryItem ? (
              <span className="text-sm font-medium">{selectedInventoryItem.sku || selectedInventoryItem.title}</span>
            ) : (
              <span className="text-sm text-red-500 font-medium">None selected</span>
            )}
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Container className="h-3 w-3" />
                Production Count
              </span>
              <span 
                ref={countDisplayRef}
                className={cn(
                  "font-bold transition-colors duration-300",
                  isOverLimit ? "text-red-600" : "text-foreground"
                )}
              >
                {currentCount} / {backwashLimit}
                {isOverLimit && (
                  <span className="text-red-500 ml-1">(+{currentCount - backwashLimit})</span>
                )}
              </span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className={cn("h-3 transition-all duration-500", getProgressBgColor())}
              indicatorClassName={cn("transition-all duration-500", getProgressColor())}
            />
            
            {/* Warning Messages */}
            {isOverLimit && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-100 border border-red-200 p-3 rounded-md animate-in slide-in-from-top-2">
                <AlertOctagon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold">Backwash Limit Exceeded!</p>
                  <p className="text-red-500 text-xs mt-0.5">
                    Machine is {currentCount - backwashLimit} containers over limit. 
                    You can still refill but quality may be compromised. Backwash immediately.
                  </p>
                </div>
              </div>
            )}
            
            {!isOverLimit && progressPercentage >= 80 && (
              <div className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 p-3 rounded-md animate-in slide-in-from-top-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Approaching Limit ({Math.round(progressPercentage)}%)</p>
                  <p className="text-yellow-500 text-xs mt-0.5">
                    Only {remainingCapacity} containers remaining before backwash is required.
                  </p>
                </div>
              </div>
            )}

            {willExceedLimit && !isOverLimit && (
              <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 p-3 rounded-md animate-in slide-in-from-top-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Will Exceed Limit</p>
                  <p className="text-orange-500 text-xs mt-0.5">
                    This refill will exceed backwash limit by {overBy} containers.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Container Size */}
          <div className={cn(
            "border rounded-lg p-3 text-center transition-colors duration-300",
            isOverLimit ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
          )}>
            <div className="flex items-center justify-center gap-2">
              <Container className={cn("h-5 w-5", isOverLimit ? "text-red-600" : "text-blue-600")} />
              <span className={cn("text-sm font-medium", isOverLimit ? "text-red-700" : "text-blue-700")}>
                {containerSize} Containers
              </span>
            </div>
            <p className={cn("text-xs mt-1", isOverLimit ? "text-red-500" : "text-blue-500")}>
              Standard water container jags
            </p>
          </div>

          {/* Quantity Selector */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Container className="h-4 w-4" />
              Number of Containers
            </label>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => quickAdjust(-1)}
                disabled={quantity <= 1 || isLoading}
                className="h-12 w-12"
              >
                <Minus className="h-5 w-5" />
              </Button>
              
              <div className="flex-1 text-center">
                <span className={cn(
                  "text-4xl font-bold transition-all duration-300",
                  willExceedLimit ? "text-red-600" : ""
                )}>
                  {quantity}
                </span>
                <p className="text-sm text-muted-foreground">
                  container{quantity !== 1 ? 's' : ''}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => quickAdjust(1)}
                disabled={quantity >= 100 || isLoading}
                className="h-12 w-12"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 5, 10].map((qty) => (
                <Button
                  key={qty}
                  variant={quantity === qty ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuantity(qty)}
                  disabled={isLoading}
                  className="text-sm transition-all duration-200"
                >
                  {qty}
                </Button>
              ))}
            </div>
          </div>

          {/* Volume & After Refill */}
          <div className={cn(
            "rounded-lg p-3 transition-all duration-300",
            willExceedLimit 
              ? "bg-gradient-to-r from-red-50 to-red-100" 
              : "bg-gradient-to-r from-blue-50 to-blue-100"
          )}>
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Volume:</span>
              <span className="text-lg font-bold">{quantity * 20}L</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm">After Refill:</span>
              <span className={cn(
                "text-sm font-bold flex items-center gap-1",
                willExceedLimit ? "text-red-600" : ""
              )}>
                {currentCount + quantity} / {backwashLimit}
                {willExceedLimit && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                    +{overBy}
                  </Badge>
                )}
              </span>
            </div>
          </div>

          {/* Main Refill Button */}
          <Button 
            className={cn(
              "w-full h-16 text-lg font-bold relative overflow-hidden transition-all duration-300",
              willExceedLimit && !isLoading && "animate-pulse"
            )}
            onClick={handleRefill}
            disabled={isLoading || !selectedInventoryItem}
            variant={willExceedLimit ? "destructive" : "default"}
            size="lg"
          >
            <span className="relative flex items-center gap-2">
              {isLoading ? (
                <>
                  <Droplets className="h-6 w-6 animate-bounce" />
                  Refilling...
                </>
              ) : !selectedInventoryItem ? (
                <>
                  <Package className="h-6 w-6" />
                  Select Inventory Item
                </>
              ) : willExceedLimit ? (
                <>
                  <AlertOctagon className="h-6 w-6" />
                  Refill {quantity} Container{quantity > 1 ? 's' : ''} ⚠️
                </>
              ) : (
                <>
                  <Droplets className="h-6 w-6" />
                  Refill {quantity} Container{quantity > 1 ? 's' : ''}
                </>
              )}
            </span>
          </Button>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className={cn(
                "text-lg font-bold transition-colors duration-300",
                isOverLimit ? "text-red-600" : "text-blue-600"
              )}>
                {isOverLimit ? 0 : remainingCapacity}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Capacity</div>
              <div className={cn(
                "text-lg font-bold transition-colors duration-300",
                progressPercentage >= 100 ? "text-red-600" : progressPercentage >= 80 ? "text-yellow-600" : ""
              )}>
                {Math.round(progressPercentage)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="text-lg font-bold text-blue-600">{currentCount * 20}L</div>
            </div>
          </div>

          {/* Refill History */}
          {refillHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Recent Refills</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {refillHistory.slice(0, 5).map((refill, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex justify-between text-xs rounded px-2 py-1 transition-colors",
                      refill.overLimit ? "bg-red-50 text-red-600" : "text-muted-foreground"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <Container className="h-3 w-3" />
                      {refill.quantity}x {refill.containerSize}
                      <span className="opacity-75 ml-1">({refill.inventoryItemSku})</span>
                      {refill.overLimit && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">!</Badge>
                      )}
                    </span>
                    <span>{refill.time.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Refill */}
          {lastRefillTime && (
            <div className={cn(
              "flex items-center gap-2 text-sm p-2 rounded transition-colors duration-300",
              isOverLimit ? "bg-red-100 text-red-700" : "bg-green-50 text-muted-foreground"
            )}>
              <CheckCircle2 className={cn("h-4 w-4", isOverLimit ? "text-red-500" : "text-green-500")} />
              <span>
                Last: {lastRefillTime.toLocaleTimeString()}
                {selectedInventoryItem && ` · ${selectedInventoryItem.sku || selectedInventoryItem.title}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Over Limit Warning Dialog */}
      <AlertDialog open={showOverLimitWarning} onOpenChange={setShowOverLimitWarning}>
        <AlertDialogContent className="border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Backwash Limit Will Be Exceeded
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className={cn(
                "border rounded-lg p-4 space-y-2",
                isOverLimit ? "bg-red-100 border-red-300" : "bg-orange-50 border-orange-200"
              )}>
                <div className="flex justify-between text-sm">
                  <span>Current Count:</span>
                  <span className="font-bold">{currentCount} containers</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Backwash Limit:</span>
                  <span className="font-bold">{backwashLimit} containers</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Refill:</span>
                  <span className="font-bold text-red-600">+{quantity} containers</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm">
                  <span className="font-bold">After Refill:</span>
                  <span className="font-bold text-red-600">
                    {currentCount + quantity} containers
                    <span className="text-xs ml-1">(+{overBy} over limit)</span>
                  </span>
                </div>
              </div>
              
              <div className="text-sm space-y-2">
                <p className="font-bold text-red-600 flex items-center gap-1">
                  <AlertOctagon className="h-4 w-4" />
                  Strong Warning:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Machine is {isOverLimit ? 'already' : 'about to be'} over backwash limit</li>
                  <li>Water quality may be significantly affected</li>
                  <li>This refill will be flagged in records</li>
                  <li>Backwash should be performed immediately after</li>
                  <li>Continued over-limit production may damage equipment</li>
                </ul>
              </div>

              <p className="text-sm font-bold text-center text-red-600">
                Are you sure you want to proceed with this refill?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmedRefill}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <AlertOctagon className="h-4 w-4 mr-2" />
              Refill Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}