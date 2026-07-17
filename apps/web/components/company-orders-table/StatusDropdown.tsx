// components/orders/StatusDropdown.tsx
"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Banknote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, OrderStatusBadge } from "./OrderStatusBadge";

// ==================== Types ====================

export type OrderStatus =
  | "pending"
  | "company_accepted"
  | "driver_accepted"
  | "preparing"
  | "ready_for_pickup"
  | "in_transit"
  | "delivered"
  | "completed"
  | "declined";

interface StatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => Promise<void> | void;
  disabled?: boolean;
  paymentStatus?: string;
  canCapturePayment?: boolean;
  onCapturePayment?: () => Promise<void> | void;
  isMobile?: boolean;
}

// ==================== Status Flow Configuration ====================

// Define the allowed status transitions
const STATUS_FLOW: Record<string, string[]> = {
  pending: ["company_accepted", "declined"],
  company_accepted: ["driver_accepted", "preparing", "declined"],
  driver_accepted: ["preparing", "declined"],
  preparing: ["ready_for_pickup", "declined"],
  ready_for_pickup: ["in_transit", "delivered", "declined"],
  in_transit: ["delivered", "declined"],
  delivered: ["completed"],
  completed: [],
  declined: ["pending"], // Allow retry from declined
};

// Statuses that are considered "active" (not final)
const ACTIVE_STATUSES = [
  "pending",
  "company_accepted",
  "driver_accepted",
  "preparing",
  "ready_for_pickup",
  "in_transit",
];

// Statuses that are final
const FINAL_STATUSES = ["delivered", "completed", "declined"];

// ==================== Component ====================

export function StatusDropdown({
  currentStatus,
  onStatusChange,
  disabled = false,
  paymentStatus,
  canCapturePayment = false,
  onCapturePayment,
  isMobile = false,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const normalizedStatus = currentStatus?.toLowerCase() || "pending";
  const currentConfig = ORDER_STATUS_CONFIG[normalizedStatus];
  const availableTransitions = STATUS_FLOW[normalizedStatus] || [];
  const isFinalStatus = FINAL_STATUSES.includes(normalizedStatus);

  const handleStatusChange = async (status: string) => {
    if (isUpdating || status === normalizedStatus) return;

    setIsUpdating(true);
    try {
      await onStatusChange(status);
      setIsOpen(false);
      toast.success(`Status updated to ${ORDER_STATUS_CONFIG[status]?.label || status}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCapturePayment = async () => {
    if (!onCapturePayment || isUpdating) return;

    setIsUpdating(true);
    try {
      await onCapturePayment();
      setIsOpen(false);
      toast.success("Payment captured successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to capture payment");
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't show dropdown for final statuses unless there's a capture payment action
  if (isFinalStatus && !canCapturePayment) {
    return <OrderStatusBadge status={normalizedStatus} />;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={isMobile ? "default" : "sm"}
          className={cn(
            "h-8 px-2 hover:bg-transparent gap-1.5",
            isMobile && "h-10 w-full justify-start",
            isUpdating && "opacity-50 pointer-events-none"
          )}
          disabled={disabled || isUpdating}
        >
          <OrderStatusBadge status={normalizedStatus} showLabel />
          <ChevronDown
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
          {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isMobile ? "center" : "start"}
        className={cn("w-56", isMobile && "w-[calc(100vw-2rem)] max-w-[320px]")}
        sideOffset={5}
      >
        {/* Current status header */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <span>Current:</span>
          <OrderStatusBadge status={normalizedStatus} />
        </DropdownMenuLabel>

        {/* Payment section */}
        {paymentStatus && (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Payment:{" "}
              <span className="font-medium capitalize">{paymentStatus}</span>
            </div>
            {canCapturePayment && paymentStatus === "authorized" && (
              <DropdownMenuItem
                onClick={handleCapturePayment}
                className="gap-2 text-blue-600 cursor-pointer font-medium"
                disabled={isUpdating}
              >
                <Banknote className="h-4 w-4" />
                Capture Payment
                {isUpdating && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />

        {/* Available status transitions */}
        {availableTransitions.length > 0 ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Available transitions
            </DropdownMenuLabel>
            {availableTransitions.map((status) => {
              const config = ORDER_STATUS_CONFIG[status];
              const isCurrentStatus = normalizedStatus === status;

              return (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "gap-2 cursor-pointer py-2",
                    isCurrentStatus && "bg-muted",
                    isUpdating && "opacity-50 pointer-events-none",
                    status === "declined" && "text-destructive hover:text-destructive"
                  )}
                  disabled={isUpdating}
                >
                  <span className="flex items-center gap-2 flex-1">
                    {config?.icon && <span className="text-muted-foreground">{config.icon}</span>}
                    <span className="capitalize">{config?.label || status}</span>
                  </span>
                  {isCurrentStatus && <Check className="h-3 w-3 text-primary shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </>
        ) : (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No status changes available
          </div>
        )}

        {/* All statuses (for admin override) */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          All statuses (admin)
        </DropdownMenuLabel>
        <div className="max-h-[200px] overflow-y-auto">
          {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => {
            const isCurrentStatus = normalizedStatus === status;
            const isInFlow = availableTransitions.includes(status);

            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status)}
                className={cn(
                  "gap-2 cursor-pointer py-1.5",
                  isCurrentStatus && "bg-muted",
                  !isInFlow && "text-muted-foreground",
                  isUpdating && "opacity-50 pointer-events-none",
                  status === "declined" && "text-destructive hover:text-destructive"
                )}
                disabled={isUpdating}
              >
                <span className="flex items-center gap-2 flex-1">
                  {config?.icon && <span>{config.icon}</span>}
                  <span className="capitalize text-sm">{config?.label || status}</span>
                </span>
                {isCurrentStatus && <Check className="h-3 w-3 text-primary shrink-0" />}
                {!isInFlow && !isCurrentStatus && (
                  <span className="text-[10px] text-muted-foreground">override</span>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}