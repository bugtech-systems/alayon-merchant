// components/DriverAssignment.tsx

"use client";

import { Check, ChevronsUpDown, Loader2, Phone, Truck, User, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { 
  fetchAvailableDrivers, 
  assignDriverToOrder, 
  fetchDriverById,
  type Driver 
} from "@/lib/data";

// Props for the DriverAssignment component
interface DriverAssignmentProps {
  orderId: string;
  currentDriverId: string | null;
  locationId?: string;
  onDriverChange?: (orderId: string, driverId: string | null, driverName: string | null) => void;
}

export function DriverAssignment({ 
  orderId, 
  currentDriverId, 
  locationId,
  onDriverChange 
}: DriverAssignmentProps) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  // Fetch available drivers
  const { 
    data: drivers = [], 
    isLoading: isLoadingDrivers,
    error: driversError 
  } = useQuery({
    queryKey: ['drivers', 'available', locationId],
    queryFn: () => fetchAvailableDrivers(locationId),
    enabled: true,
    staleTime: 30000,
  });

  // Fetch current driver details if driverId exists
  const { data: currentDriver, isLoading: isLoadingCurrentDriver } = useQuery({
    queryKey: ['driver', currentDriverId],
    queryFn: () => currentDriverId ? fetchDriverById(currentDriverId) : null,
    enabled: !!currentDriverId,
    staleTime: 60000,
  });

  // Assign driver mutation
  const assignMutation = useMutation({
    mutationFn: ({ driverId }: { driverId: string | null }) => 
      assignDriverToOrder(orderId, driverId),
    onSuccess: (response, variables) => {
      if (response.success) {
        const driver = drivers.find(d => d.id === variables.driverId);
        toast.success(
          variables.driverId 
            ? `${driver?.name || 'Driver'} assigned to order ${orderId}`
            : `Driver unassigned from order ${orderId}`
        );
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        
        onDriverChange?.(
          orderId, 
          variables.driverId || null, 
          driver?.name || null
        );
        setOpen(false);
      } else {
        toast.error(response.message || "Failed to assign driver");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign driver. Please try again.");
    },
  });

  const handleDriverSelect = async (driverId: string | null) => {
    if (assignMutation.isPending) return;
    assignMutation.mutate({ driverId });
  };

  const isAssigned = !!currentDriverId && !!currentDriver;
  const isLoading = isLoadingDrivers || isLoadingCurrentDriver || assignMutation.isPending;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Error state
  if (driversError) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-500">Error loading drivers</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 p-0 hover:bg-muted"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['drivers'] })}
        >
          <Loader2 className="size-3.5" />
        </Button>
      </div>
    );
  }

  // For assigned driver - show with change button
  if (isAssigned && currentDriver) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Truck className="size-3 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[100px]">
            {currentDriver.name}
          </span>
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {currentDriver.activeDeliveries} active
          </Badge>
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 p-0 hover:bg-muted"
              disabled={assignMutation.isPending}
            >
              <ChevronsUpDown className="size-3.5" />
              <span className="sr-only">Change driver</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search drivers..." />
              <CommandList>
                <CommandEmpty>No drivers found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleDriverSelect(null)}
                    className="text-destructive cursor-pointer"
                  >
                    <X className="mr-2 size-4" />
                    <span>Unassign driver</span>
                  </CommandItem>
                  {drivers.map((driver) => (
                    <CommandItem
                      key={driver.id}
                      onSelect={() => handleDriverSelect(driver.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          currentDriver.id === driver.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-1 flex-col min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{driver.name}</span>
                          <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                            {driver.activeDeliveries} active
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {driver.phone}
                          </span>
                          <span>•</span>
                          <span>{driver.location}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // For unassigned - show assign dropdown
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-36 justify-between"
          disabled={assignMutation.isPending || drivers.length === 0}
        >
          {assignMutation.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Assigning...</span>
            </>
          ) : drivers.length === 0 ? (
            <span className="text-muted-foreground">No drivers</span>
          ) : (
            <>
              <span className="text-muted-foreground">Assign driver</span>
              <ChevronsUpDown className="ml-2 size-3.5 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search drivers..." />
          <CommandList>
            <CommandEmpty>No drivers found.</CommandEmpty>
            <CommandGroup>
              {drivers.map((driver) => (
                <CommandItem
                  key={driver.id}
                  onSelect={() => handleDriverSelect(driver.id)}
                  className="cursor-pointer"
                >
                  <Truck className="mr-2 size-4 shrink-0" />
                  <div className="flex flex-1 flex-col min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{driver.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                        {driver.activeDeliveries} active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {driver.phone}
                      </span>
                      <span>•</span>
                      <span>{driver.location}</span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}