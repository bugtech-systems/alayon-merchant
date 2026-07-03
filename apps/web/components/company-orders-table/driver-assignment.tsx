"use client";
import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Phone, RefreshCw, Truck, User, X } from "lucide-react";
import { toast } from "sonner";
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

interface DriverSelectionListProps {
  drivers: Driver[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (driver: Driver | null) => void;
  currentDriverId?: string | null;
  onRefresh: () => void;
}

function DriverSelectionList({
  drivers,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelect,
  currentDriverId,
  onRefresh,
}: DriverSelectionListProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <Command className="rounded-lg border shadow-md">
      <div className="flex items-center border-b px-3">
        <CommandInput
          placeholder="Search drivers..."
          value={searchQuery}
          onValueChange={onSearchChange}
          className="flex-1 border-0 focus:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 flex-shrink-0"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>
      
      <CommandList className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : drivers.length === 0 ? (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Truck className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No drivers available</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "All drivers are currently busy"}
              </p>
            </div>
          </CommandEmpty>
        ) : (
          <CommandGroup heading="Available Drivers">
            {/* Unassign option - only show if currently assigned */}
            {currentDriverId && (
              <CommandItem
                onSelect={() => onSelect(null)}
                className="text-destructive hover:text-destructive"
              >
                <X className="mr-2 size-4" />
                <span>Unassign driver</span>
              </CommandItem>
            )}

            {drivers.map((driver) => (
              <CommandItem
                key={driver.id}
                onSelect={() => onSelect(driver)}
                className="flex items-center justify-between py-2.5 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="size-4" />
                      </div>
                      {driver.status === "available" && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                      {driver.status === "busy" && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {driver.name}
                      </span>
                      {driver.id === currentDriverId && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      <span className="truncate">{driver.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs h-5 px-1.5">
                    {driver?.delivery_stats?.pending_deliveries} active
                  </Badge>
                  {driver?.metrics?.average_rating && (
                    <span className="text-xs text-amber-500">
                      ★ {driver?.metrics?.average_rating.toFixed(1)}
                    </span>
                  )}
                  {driver.id === currentDriverId && (
                    <Check className="size-4 text-primary" />
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}


interface DriverAssignmentProps {
  order: any;
  currentDriver: string | null;
  currentDriverId?: string | null;
  companyId: string;
  onAssign: (driverId: string | null, driverName: string | null) => void;
  onError?: (error: Error) => void;
}

export function DriverAssignment({
  order,
  currentDriver,
  currentDriverId,
  companyId,
  onAssign,
  onError,
}: DriverAssignmentProps) {
  const [open, setOpen] = React.useState(false);
  const [isChanging, setIsChanging] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const fetchRef = React.useRef<boolean>(false);
  const orderId = order?.id;
  // Fetch drivers from API - using a ref to prevent multiple calls
  const fetchDrivers = React.useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchRef.current) return;
    
    if (!companyId) return;

    fetchRef.current = true;
    setIsLoading(true);
    
    try {
      const response = await fetchAvailableDrivers({companyId});
      
      
      // Handle different response structures
      const driversList = Array.isArray(response) ? response : response || [];
      
      // Map API response to Driver type
      const mappedDrivers: any[] = driversList.map((driver: any) => ({
        id: driver.id || driver.driver_id,
        name: driver.name || driver.full_name || `${driver.first_name} ${driver.last_name}`,
        phone: driver.phone || driver.phone_number || driver.mobile,
        email: driver.email,
        activeDeliveries: driver.active_deliveries || driver.activeDeliveries || 0,
        status: driver.status || driver.availability || "available",
        rating: driver.rating,
        joinedDate: driver.joined_date || driver.created_at,
      }));

      setDrivers(mappedDrivers);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      onError?.(error instanceof Error ? error : new Error("Failed to load drivers"));
      toast.error("Failed to load available drivers");
    } finally {
      setIsLoading(false);
      fetchRef.current = false;
    }
  }, [companyId, onError]);

  // Fetch drivers when popover opens - with proper guards
  React.useEffect(() => {
    if (open && !hasLoaded && !isLoading && !fetchRef.current) {
      fetchDrivers();
    }
  }, [open, hasLoaded, isLoading, fetchDrivers]);

  // Reset hasLoaded when component unmounts or companyId changes
  React.useEffect(() => {
    fetchDrivers()
    return () => {
      setHasLoaded(false);
      fetchRef.current = false;
    };
  }, [companyId]);

  // Filter drivers based on search query
  const filteredDrivers = React.useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    
    const query = searchQuery.toLowerCase().trim();
    return drivers.filter(
      (driver) =>
        driver.name.toLowerCase().includes(query) ||
        driver.phone.includes(query) ||
        driver.id.toLowerCase().includes(query)
    );
  }, [drivers, searchQuery]);

  // Available drivers (not busy or offline)
  const availableDrivers = filteredDrivers

  const handleDriverSelect = async (driver: Driver | null) => {
    if (isChanging) return;
    setIsChanging(true);

    try {
      if (!driver) {
        // Unassign driver
        onAssign(null, null);
        toast.success(`Driver unassigned from order ${orderId}`);
      } else {
        // Assign driver
        onAssign(driver.id, driver.name);
        toast.success(`${driver.name} assigned to order ${orderId}`);
      }
    } catch (error) {
      toast.error("Failed to assign driver. Please try again.");
      onError?.(error instanceof Error ? error : new Error("Assignment failed"));
    } finally {
      setIsChanging(false);
      setOpen(false);
    }
  };


  // Get current driver info
  const currentDriverInfo = React.useMemo(() => {
    if (!currentDriverId) return null;
    return drivers.find(d => d.id === currentDriverId) || null;
  }, [drivers, currentDriverId]);

  // If driver is assigned - show with change option
  if (currentDriver) {

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="size-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {currentDriverInfo?.name}
          </span>
          {currentDriverInfo?.status === "busy" && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 border-amber-500 text-amber-600">
              Busy
            </Badge>
          )}
          {currentDriverInfo?.rating && (
            <span className="text-xs text-muted-foreground">
              ★ {currentDriverInfo.rating.toFixed(1)}
            </span>
          )}
        </div>
{order?.status_display != 'delivered' && 
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 p-0 hover:bg-muted flex-shrink-0"
              disabled={isChanging}
            >
              <ChevronsUpDown className="size-3.5" />
              <span className="sr-only">Change driver</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="end">
            <DriverSelectionList
              drivers={availableDrivers}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={handleDriverSelect}
              currentDriverId={currentDriverId}
              onRefresh={() => {
                setHasLoaded(false);
                fetchDrivers();
              }}
            />
          </PopoverContent>
        </Popover>
        }
      </div>
    );
  }

  // Unassigned - show assign button
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-36 justify-between"
          disabled={isChanging}
        >
          <span className="text-muted-foreground truncate">Assign driver</span>
          <ChevronsUpDown className="ml-2 size-3.5 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <DriverSelectionList
          drivers={availableDrivers}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={handleDriverSelect}
          currentDriverId={currentDriverId}
          onRefresh={() => {
            setHasLoaded(false);
            fetchDrivers();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}