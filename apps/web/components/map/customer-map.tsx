"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Map,
  MapTileLayer,
  MapZoomControl,
  MapMarker,
  MapPopup,
  MapPolyline,
  MapLayers,
  MapLocateControl,
} from "@/components/ui/map";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui/components/sheet";
import {
  Users,
  MapPin,
  Navigation,
  Clock,
  Phone,
  Mail,
  TrendingUp,
  Route,
  Satellite,
  Map as MapIcon,
  LoaderCircle,
  Menu,
  Maximize,
  Minimize,
  ArrowRight,
  Target,
  AlertCircle,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// ============================================================
// 1. Types
// ============================================================
interface Customer {
  id: string;
  name: string;
  company: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "pending";
  priority: "high" | "medium" | "low";
  lastVisit: string;
  nextVisit: string;
  revenue: number;
  notes?: string;
}

interface Route {
  id: string;
  customerIds: string[];
  coordinates: [number, number][];
  distance: number;
  duration: number;
  color: string;
}

interface RouteDetails {
  from: Customer;
  to: Customer;
  distance: number;
  duration: number;
  routeId: string;
}

// ============================================================
// 2. Sample Data (Tacloban City Customers)
// ============================================================
const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Juan Dela Cruz",
    company: "Dela Cruz Enterprises",
    lat: 11.2445,
    lng: 125.0040,
    address: "Tacloban City Hall, Tacloban City",
    phone: "+63 912 345 6789",
    email: "juan@delacruz.com",
    status: "active",
    priority: "high",
    lastVisit: "2024-01-15",
    nextVisit: "2024-02-15",
    revenue: 150000,
    notes: "Key account - monthly visit required",
  },
  {
    id: "c2",
    name: "Maria Santos",
    company: "Santos Trading",
    lat: 11.2274,
    lng: 125.0277,
    address: "Daniel Z. Romualdez Airport Area, Tacloban",
    phone: "+63 923 456 7890",
    email: "maria@santostrading.com",
    status: "active",
    priority: "medium",
    lastVisit: "2024-01-20",
    nextVisit: "2024-02-20",
    revenue: 85000,
  },
  {
    id: "c3",
    name: "Pedro Reyes",
    company: "Reyes Manufacturing",
    lat: 11.3047,
    lng: 124.9799,
    address: "San Juanico Bridge Area, Tacloban",
    phone: "+63 934 567 8901",
    email: "pedro@reyesmfg.com",
    status: "active",
    priority: "high",
    lastVisit: "2024-01-10",
    nextVisit: "2024-02-10",
    revenue: 220000,
    notes: "VIP customer - needs special attention",
  },
  {
    id: "c4",
    name: "Ana Martinez",
    company: "Martinez & Sons",
    lat: 11.2437,
    lng: 125.0033,
    address: "Downtown Tacloban",
    phone: "+63 945 678 9012",
    email: "ana@martinezsons.com",
    status: "pending",
    priority: "low",
    lastVisit: "2024-01-25",
    nextVisit: "2024-02-25",
    revenue: 45000,
  },
  {
    id: "c5",
    name: "Ramon Garcia",
    company: "Garcia Properties",
    lat: 11.2379,
    lng: 125.0123,
    address: "Robinsons Place Tacloban",
    phone: "+63 956 789 0123",
    email: "ramon@garciaprops.com",
    status: "active",
    priority: "medium",
    lastVisit: "2024-01-18",
    nextVisit: "2024-02-18",
    revenue: 120000,
  },
];

// ============================================================
// 3. Helper: Fetch OSRM Route
// ============================================================
async function fetchOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  profile: "driving" | "walking" | "cycling" = "driving"
): Promise<{ coordinates: [number, number][]; distance: number; duration: number }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );

    return {
      coordinates,
      distance: route.distance / 1000,
      duration: route.duration / 60,
    };
  } catch (error) {
    console.error("OSRM fetch error:", error);
    return {
      coordinates: [
        [startLat, startLng],
        [endLat, endLng],
      ],
      distance: 0,
      duration: 0,
    };
  }
}

// ============================================================
// 4. Route Generation
// ============================================================
async function generateRoutes(
  customers: Customer[],
  profile: "driving" | "walking" | "cycling" = "driving"
): Promise<Route[]> {
  const routes: Route[] = [];

  for (let i = 0; i < customers.length - 1; i++) {
    const start = customers[i];
    const end = customers[i + 1];

    try {
      const result = await fetchOSRMRoute(
        start.lat,
        start.lng,
        end.lat,
        end.lng,
        profile
      );

      routes.push({
        id: `route-${i}`,
        customerIds: [start.id, end.id],
        coordinates: result.coordinates,
        distance: result.distance,
        duration: result.duration,
        color: `hsl(${(i * 60) % 360}, 70%, 50%)`,
      });
    } catch (error) {
      console.error(`Failed to fetch route ${i}:`, error);
      routes.push({
        id: `route-${i}`,
        customerIds: [start.id, end.id],
        coordinates: [
          [start.lat, start.lng],
          [end.lat, end.lng],
        ],
        distance: 0,
        duration: 0,
        color: `hsl(${(i * 60) % 360}, 70%, 50%)`,
      });
    }
  }

  return routes;
}

// ============================================================
// 5. Status & Priority Badges
// ============================================================
function CustomerStatusBadge({ status }: { status: Customer["status"] }) {
  const variants = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    inactive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  };

  return (
    <Badge variant="outline" className={cn("capitalize", variants[status])}>
      {status}
    </Badge>
  );
}

function CustomerPriorityBadge({ priority }: { priority: Customer["priority"] }) {
  const variants = {
    high: "bg-red-500/10 text-red-500 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <Badge variant="outline" className={cn("capitalize", variants[priority])}>
      {priority}
    </Badge>
  );
}

// ============================================================
// 6. Route Details Card Component
// ============================================================
function RouteDetailsCard({ routeDetails }: { routeDetails: RouteDetails | null }) {
  if (!routeDetails) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-2xl pointer-events-none">
      <Card className="pointer-events-auto shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Route className="size-4" />
                <span>Route Details</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{routeDetails.from.name}</span>
                <ArrowRight className="size-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm truncate">{routeDetails.to.name}</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <div className="flex items-center gap-1">
                  <Navigation className="size-4 text-muted-foreground" />
                  <span className="font-medium">{routeDetails.distance.toFixed(2)} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="font-medium">{Math.round(routeDetails.duration)} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">via {routeDetails.routeId}</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="size-2 rounded-full" style={{ backgroundColor: routeDetails.from.priority === "high" ? "#ef4444" : routeDetails.from.priority === "medium" ? "#eab308" : "#3b82f6" }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 7. Customer List Component (Desktop)
// ============================================================
function CustomerListDesktop({
  customers,
  selectedCustomer,
  onSelectCustomer,
  showCustomerInfo,
  totalCustomers,
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  showCustomerInfo: boolean;
  totalCustomers: number;
}) {
  return (
    <Card className="w-80 flex-shrink-0 overflow-hidden hidden lg:flex lg:flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Users className="size-4 sm:size-5" />
            Customers
            <Badge variant="secondary" className="text-xs">
              {totalCustomers}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className={cn(
                "p-2 sm:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                selectedCustomer?.id === customer.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              )}
              onClick={() => onSelectCustomer(customer)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <p className="font-medium text-sm sm:text-base truncate">{customer.name}</p>
                    <CustomerStatusBadge status={customer.status} />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {customer.company}
                  </p>
                </div>
                <CustomerPriorityBadge priority={customer.priority} />
              </div>

              <div className="mt-1 sm:mt-2 grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3" />
                  <span className="truncate">{customer.address.split(",")[0]}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="size-3" />
                  <span className="truncate">{customer.phone}</span>
                </div>
              </div>

              {showCustomerInfo && (
                <div className="mt-1 sm:mt-2 grid grid-cols-2 gap-1 sm:gap-2 text-xs text-muted-foreground border-t pt-1 sm:pt-2">
                  <div>
                    <span className="font-medium">Revenue:</span> ₱
                    {customer.revenue.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Visit:</span>{" "}
                    {new Date(customer.lastVisit).toLocaleDateString()}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Next Visit:</span>{" "}
                    {new Date(customer.nextVisit).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ============================================================
// 8. Customer List Component (Mobile)
// ============================================================
function CustomerListMobile({
  customers,
  selectedCustomer,
  onSelectCustomer,
  showCustomerInfo,
  totalCustomers,
  isOpen,
  onOpenChange,
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  showCustomerInfo: boolean;
  totalCustomers: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="lg:hidden fixed bottom-4 right-4 z-[1000] shadow-lg rounded-full size-12"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[90vw] sm:w-[400px] p-0">
        <Card className="h-full border-0 rounded-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Customers
                <Badge variant="secondary">{totalCustomers}</Badge>
              </CardTitle>
            </div>
          </CardHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                    selectedCustomer?.id === customer.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => {
                    onSelectCustomer(customer);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{customer.name}</p>
                        <CustomerStatusBadge status={customer.status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {customer.company}
                      </p>
                    </div>
                    <CustomerPriorityBadge priority={customer.priority} />
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3" />
                      <span className="truncate">{customer.address.split(",")[0]}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="size-3" />
                      <span className="truncate">{customer.phone}</span>
                    </div>
                  </div>

                  {showCustomerInfo && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2">
                      <div>
                        <span className="font-medium">Revenue:</span> ₱
                        {customer.revenue.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Last Visit:</span>{" "}
                        {new Date(customer.lastVisit).toLocaleDateString()}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Next Visit:</span>{" "}
                        {new Date(customer.nextVisit).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// 9. Main Customer Map Component
// ============================================================
interface CustomerMapProps {
  customers?: Customer[];
  initialProfile?: "driving" | "walking" | "cycling";
  className?: string;
}

export function CustomerMap({
  customers = SAMPLE_CUSTOMERS,
  initialProfile = "driving",
  className,
}: CustomerMapProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<"driving" | "walking" | "cycling">(initialProfile);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);
  const [mapType, setMapType] = useState<"street" | "satellite">("satellite");
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null);
  const [isSwitchingView, setIsSwitchingView] = useState(false);

  // Calculate total metrics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === "active").length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);
  const avgRevenue = totalRevenue / totalCustomers;

  // Map center
  const center = useMemo(() => {
    if (customers.length === 0) return [11.2445, 125.0040] as [number, number];
    const avgLat = customers.reduce((sum, c) => sum + c.lat, 0) / customers.length;
    const avgLng = customers.reduce((sum, c) => sum + c.lng, 0) / customers.length;
    return [avgLat, avgLng] as [number, number];
  }, [customers]);

  // Fetch routes
  useEffect(() => {
    async function loadRoutes() {
      setLoading(true);
      try {
        const generatedRoutes = await generateRoutes(customers, profile);
        setRoutes(generatedRoutes);
      } catch (error) {
        console.error("Failed to generate routes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRoutes();
  }, [customers, profile]);

  // Find route details when a customer is selected
  useEffect(() => {
    if (!selectedCustomer) {
      setRouteDetails(null);
      setHighlightedRoute(null);
      return;
    }

    const route = routes.find(r => 
      r.customerIds.includes(selectedCustomer.id)
    );

    if (route) {
      const from = customers.find(c => c.id === route.customerIds[0]);
      const to = customers.find(c => c.id === route.customerIds[1]);
      
      if (from && to) {
        setRouteDetails({
          from,
          to,
          distance: route.distance,
          duration: route.duration,
          routeId: route.id,
        });
        setHighlightedRoute(route.id);
      }
    } else {
      setRouteDetails(null);
      setHighlightedRoute(null);
    }
  }, [selectedCustomer, routes, customers]);

  // Calculate route stats
  const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0);
  const totalDuration = routes.reduce((sum, r) => sum + r.duration, 0);

  // Handle map type change
  const handleMapTypeChange = (type: "street" | "satellite") => {
    if (type === mapType) return;
    setIsSwitchingView(true);
    setMapType(type);
    // Reset loading state after tiles have time to load
    setTimeout(() => {
      setIsSwitchingView(false);
    }, 800);
  };

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const element = document.getElementById('map-container');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={cn("flex flex-col lg:flex-row h-[calc(100vh-120px)] min-h-[600px] w-full gap-2 sm:gap-4", className)}>
      {/* Desktop Customer List */}
      <CustomerListDesktop
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        showCustomerInfo={showCustomerInfo}
        totalCustomers={totalCustomers}
      />

      {/* Mobile Customer List (Sheet) */}
      <CustomerListMobile
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        showCustomerInfo={showCustomerInfo}
        totalCustomers={totalCustomers}
        isOpen={isMobileListOpen}
        onOpenChange={setIsMobileListOpen}
      />

      {/* Map Container */}
      <Card 
        id="map-container"
        className="flex-1 overflow-hidden relative"
      >
        <CardContent className="p-0 h-full relative">
          {/* Stats Bar - Responsive */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-[1000] flex flex-wrap gap-1 sm:gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-background/90 backdrop-blur-sm border rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Users className="size-3 sm:size-4 text-muted-foreground" />
                <span className="font-medium">{totalCustomers}</span>
                <span className="text-muted-foreground hidden sm:inline">total</span>
              </div>
              <Separator orientation="vertical" className="h-3 sm:h-4" />
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="size-1.5 sm:size-2 rounded-full bg-green-500" />
                <span className="font-medium">{activeCustomers}</span>
                <span className="text-muted-foreground hidden sm:inline">active</span>
              </div>
              <Separator orientation="vertical" className="h-3 sm:h-4 hidden sm:block" />
              <div className="flex items-center gap-1 sm:gap-1.5 hidden sm:flex">
                <TrendingUp className="size-3 sm:size-4 text-green-500" />
                <span className="font-medium">₱{avgRevenue.toLocaleString()}</span>
                <span className="text-muted-foreground hidden lg:inline">avg revenue</span>
              </div>
            </div>

            {/* Map Type Controls */}
            <div className="pointer-events-auto flex gap-1">
              <Button
                size="icon-sm"
                variant={mapType === "street" ? "default" : "secondary"}
                onClick={() => handleMapTypeChange("street")}
                title="Street map"
                className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
                disabled={isSwitchingView}
              >
                <MapIcon className="size-3 sm:size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant={mapType === "satellite" ? "default" : "secondary"}
                onClick={() => handleMapTypeChange("satellite")}
                title="Satellite view"
                className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
                disabled={isSwitchingView}
              >
                <Satellite className="size-3 sm:size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="secondary"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
              >
                {isFullscreen ? (
                  <Minimize className="size-3 sm:size-4" />
                ) : (
                  <Maximize className="size-3 sm:size-4" />
                )}
              </Button>
            </div>

            {/* Route Profile Controls */}
            <div className="pointer-events-auto flex gap-1 hidden xs:flex">
              <Button
                size="icon-sm"
                variant={profile === "driving" ? "default" : "secondary"}
                onClick={() => setProfile("driving")}
                title="Driving"
                className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
              >
                <Navigation className="size-3 sm:size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant={profile === "walking" ? "default" : "secondary"}
                onClick={() => setProfile("walking")}
                title="Walking"
                className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
              >
                <Users className="size-3 sm:size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant={profile === "cycling" ? "default" : "secondary"}
                onClick={() => setProfile("cycling")}
                title="Cycling"
                className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
              >
                <Route className="size-3 sm:size-4" />
              </Button>
            </div>

            {/* Route Stats */}
            {!loading && routes.length > 0 && totalDistance > 0 && (
              <div className="pointer-events-auto bg-background/90 backdrop-blur-sm border rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm hidden md:flex">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Route className="size-3 sm:size-4 text-muted-foreground" />
                  <span className="font-medium">{totalDistance.toFixed(1)} km</span>
                </div>
                <Separator orientation="vertical" className="h-3 sm:h-4" />
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Clock className="size-3 sm:size-4 text-muted-foreground" />
                  <span className="font-medium">{Math.round(totalDuration)} min</span>
                </div>
              </div>
            )}
          </div>

          {/* Route Details Card */}
          <RouteDetailsCard routeDetails={routeDetails} />

          {/* View Switching Loading Overlay */}
          {isSwitchingView && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1000] pointer-events-none">
              <div className="flex flex-col items-center gap-3 bg-background/90 p-4 sm:p-6 rounded-lg shadow-lg">
                <LoaderCircle className="size-6 sm:size-8 animate-spin text-primary" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Loading {mapType === "satellite" ? "satellite" : "street"} view...
                </p>
              </div>
            </div>
          )}

          {/* The Map */}
          <div className="h-full w-full">
            <Map center={center} zoom={12} className="h-full w-full">
                {/* ALWAYS RENDER BOTH LAYERS - Let MapLayers handle visibility */}
                
                {/* Street View Layer */}
            

                {/* Satellite View Layer - Multiple reliable sources */}
               {mapType == 'satellite' ?  

               <MapTileLayer
                  name="Satellite"
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
                /> 

                :

                <>
                  <MapTileLayer
                  name="Satellite (Fallback)"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                />
                  <MapTileLayer
                  name="Street"
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
                /> 
              
                </>


               }



                <MapZoomControl position="top-1 left-1" />
                <MapLocateControl position="right-1 bottom-1" />

                {/* Routes */}
                {showRoutes &&
                  routes.map((route) => (
                    <MapPolyline
                      key={route.id}
                      positions={route.coordinates}
                      color={highlightedRoute === route.id ? route.color : route.color}
                      weight={highlightedRoute === route.id ? 6 : 3}
                      opacity={highlightedRoute === route.id ? 1 : 0.5}
                      lineJoin="round"
                      lineCap="round"
                      smoothFactor={0}
                    />
                  ))}

                {/* Customer Markers */}
                {customers.map((customer) => {
                  const isSelected = selectedCustomer?.id === customer.id;
                  const isHighlighted = highlightedRoute && routes.some(r => 
                    r.id === highlightedRoute && r.customerIds.includes(customer.id)
                  );

                  return (
                    <MapMarker
                      key={customer.id}
                      position={[customer.lat, customer.lng]}
                    >
                      <MapPopup>
                        <div className="space-y-2 p-1 min-w-[200px] max-w-[280px]">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm sm:text-base">{customer.name}</div>
                            <CustomerStatusBadge status={customer.status} />
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {customer.company}
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                            <div>
                              <span className="text-muted-foreground">Revenue:</span>{" "}
                              <span className="font-medium">₱{customer.revenue.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Priority:</span>{" "}
                              <span className="font-medium capitalize">{customer.priority}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Address:</span>{" "}
                              <span className="text-xs">{customer.address}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Phone:</span>{" "}
                              <span className="text-xs">{customer.phone}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Email:</span>{" "}
                              <span className="text-xs break-all">{customer.email}</span>
                            </div>
                          </div>
                          {customer.notes && (
                            <>
                              <Separator />
                              <div className="text-xs sm:text-sm">
                                <span className="text-muted-foreground">Notes:</span>{" "}
                                {customer.notes}
                              </div>
                            </>
                          )}
                        </div>
                      </MapPopup>
                    </MapMarker>
                  );
                })}
            </Map>
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-[1000] pointer-events-none">
              <div className="flex flex-col items-center gap-3 bg-background/90 p-4 sm:p-6 rounded-lg shadow-lg">
                <LoaderCircle className="size-6 sm:size-8 animate-spin text-primary" />
                <p className="text-xs sm:text-sm text-muted-foreground">Calculating routes...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 10. Export
// ============================================================
export default CustomerMap;