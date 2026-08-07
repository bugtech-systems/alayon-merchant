// components/cart/jag-container-handler.tsx
"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  X,
  Plus,
  Minus,
  Save,
  RefreshCw,
  Building2,
  Store,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateCartMetadata } from "@/lib/actions";

// Types
interface JagContainerEntry {
  id?: string;
  totalOwnBrand: number;
  totalOtherBrand: number;
  totalContainers: number;
  returnedAt: Date;
  orderId?: string;
  cartId?: string;
  customerId?: string;
  customerName?: string;
  notes?: string;
}

interface JagContainerHandlerProps {
  onSave?: (data: JagContainerEntry) => void;
  onClose?: () => void;
  initialData?: Partial<JagContainerEntry>;
  productName?: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  cartId?: string;
  readOnly?: boolean;
  initialReturnedOwn?: number;
  initialReturnedOther?: number;
  cart?: any;
}

export function JagContainerHandler({
  onSave,
  onClose,
  initialData,
  customerId,
  customerName,
  orderId,
  cartId,
  cart,
  readOnly = false,
  initialReturnedOwn = 0,
  initialReturnedOther = 0,
}: JagContainerHandlerProps) {
  const { toast } = useToast();

  // State
  const [returnedOwn, setReturnedOwn] = useState(() => 
    initialData?.totalOwnBrand ?? initialReturnedOwn
  );
  const [returnedOther, setReturnedOther] = useState(() => 
    initialData?.totalOtherBrand ?? initialReturnedOther
  );
  const [customerNameInput, setCustomerNameInput] = useState(
    customerName || initialData?.customerName || ''
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialData?.notes || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if cart is completed
  const isCartCompleted = cart?.status === 'completed' || cart?.status === 'ordered';

  // Stats calculation
  const stats = useMemo(() => ({
    totalOwnBrand: returnedOwn,
    totalOtherBrand: returnedOther,
    totalContainers: returnedOwn + returnedOther,
  }), [returnedOwn, returnedOther]);

  // Handle save - updates order or cart metadata
  const handleSave = useCallback(async () => {
    if (stats.totalContainers === 0) {
      toast({
        title: "No Containers",
        description: "Please enter at least one container count before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const entry: JagContainerEntry = {
        id: initialData?.id || `entry-${Date.now()}`,
        totalOwnBrand: returnedOwn,
        totalOtherBrand: returnedOther,
        totalContainers: stats.totalContainers,
        returnedAt: new Date(),
        orderId: orderId || initialData?.orderId,
        cartId: cartId || initialData?.cartId,
        customerId: customerId || initialData?.customerId,
        customerName: customerNameInput || initialData?.customerName,
        notes: additionalNotes || initialData?.notes,
      };


      console.log(orderId, entry, 'EENTT')
   
      // If we have a cart ID and it's not completed
      if (cartId && !isCartCompleted) {
        await updateCartMetadata(cartId, entry);
        toast({
          title: "Saved",
          description: "Container return saved to cart.",
        });
      } 
      // If we have a cart but it's completed
      else if (cartId && isCartCompleted) {
        setError("This cart has already been converted to an order. Container information has been saved to the order.");
        toast({
          title: "Cart Completed",
          description: "Container information saved to order instead.",
          variant: "default",
        });
        // Still call onSave to let parent handle it
        onSave?.(entry);
        if (onClose) onClose();
        return;
      }
      // Fallback: just call onSave
      else {
        onSave?.(entry);
        toast({
          title: "Saved",
          description: `${stats.totalContainers} container${stats.totalContainers > 1 ? 's' : ''} recorded.`,
        });
      }

      if (onClose) onClose();
    } catch (error: any) {
      console.error("Error saving container record:", error);
      setError(error.message || "Failed to save. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [returnedOwn, returnedOther, stats, customerNameInput, additionalNotes, 
      orderId, cartId, customerId, initialData, onSave, onClose, toast, isCartCompleted]);

  // Update order metadata
  const updateOrderMetadata = async (orderId: string, entry: JagContainerEntry) => {
    try {
      const response = await updateCartMetadata(orderId, entry);


        console.log(response, ":RESSSP")


      return response;
    } catch (error) {
      throw error;
    }
  };

  



  // Reset counts
  const resetCounts = useCallback(() => {
    setReturnedOwn(0);
    setReturnedOther(0);
  }, []);

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Warning if cart is completed */}
      {isCartCompleted && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            This cart has already been converted to an order. Container information will be saved to the order.
          </AlertDescription>
        </Alert>
      )}


      {/* Stats Display */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <div className="text-xs font-medium text-blue-600">Own Brand</div>
          </div>
          <div className="text-2xl font-bold text-blue-700">{returnedOwn}</div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-purple-600" />
            <div className="text-xs font-medium text-purple-600">Other Brand</div>
          </div>
          <div className="text-2xl font-bold text-purple-700">{returnedOther}</div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <div className="text-xs font-medium text-emerald-600">Total</div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.totalContainers}</div>
        </div>
      </div>

      {/* Input Fields */}
      {!readOnly && (
        <div className="p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Return Counts</h4>
            <Badge variant="secondary" className="text-[10px]">
              {isCartCompleted ? 'Order Update' : 'Current values'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Returned Own Brand */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-blue-600" />
                Returned Own Brand
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setReturnedOwn(prev => Math.max(0, prev - 1))}
                  disabled={returnedOwn <= 0 || isSubmitting}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={returnedOwn}
                  onChange={(e) => setReturnedOwn(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 text-center text-lg font-semibold w-24"
                  min={0}
                  disabled={isSubmitting}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setReturnedOwn(prev => prev + 1)}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Returned Other Brand */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Store className="h-4 w-4 text-purple-600" />
                Returned Other Brand
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setReturnedOther(prev => Math.max(0, prev - 1))}
                  disabled={returnedOther <= 0 || isSubmitting}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={returnedOther}
                  onChange={(e) => setReturnedOther(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 text-center text-lg font-semibold w-24"
                  min={0}
                  disabled={isSubmitting}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setReturnedOther(prev => prev + 1)}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={resetCounts}
              className="gap-1"
              disabled={stats.totalContainers === 0 || isSubmitting}
            >
              <RefreshCw className="h-3 w-3" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReturnedOwn(prev => prev + 1)}
              disabled={isSubmitting}
              className="gap-1"
            >
              <Building2 className="h-3 w-3" />
              +1 Own
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReturnedOther(prev => prev + 1)}
              disabled={isSubmitting}
              className="gap-1"
            >
              <Store className="h-3 w-3" />
              +1 Other
            </Button>
          </div>
        </div>
      )}


      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex gap-2 justify-end pt-2 border-t">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting || stats.totalContainers === 0}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {initialData?.id ? 'Update' : isCartCompleted ? 'Save to Order' : 'Save'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default JagContainerHandler;