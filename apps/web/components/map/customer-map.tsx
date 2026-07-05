"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Search,
  X,
  Building2,
  Star,
  StarOff,
  Eye,
  EyeOff,
  BarChart3,
  Car,
  Bike,
  Footprints,
  Gauge,
  Fuel,
  Calendar,
  DollarSign,
  UserCircle,
  FileText,
  Info,
  Layers,
  Compass,
  LocateFixed,
  Wifi,
  WifiOff,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Shield,
  ShieldCheck,
  Timer,
  MapPinPlus,
  Navigation2,
  RefreshCw,
  Home,
  Briefcase,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Input } from "@workspace/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip";

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
  category?: string;
  rating?: number;
  visitFrequency?: "daily" | "weekly" | "monthly" | "quarterly";
  tags?: string[];
}

interface Route {
  id: string;
  customerIds: string[];
  coordinates: [number, number][];
  distance: number;
  duration: number;
  color: string;
  trafficConditions?: "light" | "moderate" | "heavy";
  estimatedTime?: number;
  routeSummary?: string;
  waypoints?: { name: string; lat: number; lng: number }[];
}

interface RouteDetails {
  from: Customer;
  to: Customer;
  distance: number;
  duration: number;
  routeId: string;
  traffic?: "light" | "moderate" | "heavy";
  estimatedArrival?: Date;
  fuelCost?: number;
  tolls?: number;
  turns?: number;
  elevationGain?: number;
}

interface RouteMetrics {
  totalDistance: number;
  totalDuration: number;
  averageDistance: number;
  averageDuration: number;
  fuelCost: number;
  tollCost: number;
  totalCustomers: number;
  activeRoutes: number;
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
    category: "Enterprise",
    rating: 4.8,
    visitFrequency: "monthly",
    tags: ["VIP", "Government", "Large Account"],
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
    category: "Trading",
    rating: 4.2,
    visitFrequency: "weekly",
    tags: ["Trading", "Regular"],
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
    category: "Manufacturing",
    rating: 4.9,
    visitFrequency: "monthly",
    tags: ["VIP", "Manufacturing", "High Revenue"],
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
    category: "Retail",
    rating: 3.8,
    visitFrequency: "quarterly",
    tags: ["Retail", "New"],
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
    category: "Real Estate",
    rating: 4.5,
    visitFrequency: "weekly",
    tags: ["Real Estate", "Property"],
  },
  {
    id: "c6",
    name: "Luzviminda Tan",
    company: "Tan & Associates",
    lat: 11.2520,
    lng: 124.9970,
    address: "Tacloban Doctors Hospital Area",
    phone: "+63 967 890 1234",
    email: "luz@tanassoc.com",
    status: "active",
    priority: "high",
    lastVisit: "2024-01-12",
    nextVisit: "2024-02-12",
    revenue: 180000,
    category: "Professional Services",
    rating: 4.7,
    visitFrequency: "monthly",
    tags: ["Professional", "Medical"],
  },
  {
    id: "c7",
    name: "Roberto Lim",
    company: "Lim Trading Co.",
    lat: 11.2350,
    lng: 125.0150,
    address: "Tacloban Port Area",
    phone: "+63 978 901 2345",
    email: "roberto@limtrading.com",
    status: "inactive",
    priority: "low",
    lastVisit: "2023-12-20",
    nextVisit: "2024-03-20",
    revenue: 30000,
    category: "Trading",
    rating: 3.5,
    visitFrequency: "quarterly",
    tags: ["Trading", "Inactive"],
  },
];

// ============================================================
// 3. Helper: Enhanced Route Fetching with Traffic Simulation
// ============================================================
async function fetchOSRMRouteEnhanced(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  profile: "driving" | "walking" | "cycling" = "driving"
): Promise<{ coordinates: [number, number][]; distance: number; duration: number; traffic?: "light" | "moderate" | "heavy" }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
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

    // Simulate traffic conditions based on time of day and distance
    const hour = new Date().getHours();
    let traffic: "light" | "moderate" | "heavy" = "moderate";
    if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
      traffic = "heavy";
    } else if (hour >= 10 && hour <= 16) {
      traffic = "moderate";
    } else {
      traffic = "light";
    }

    // Adjust duration based on traffic
    let trafficMultiplier = 1;
    if (traffic === "heavy") trafficMultiplier = 1.5;
    else if (traffic === "moderate") trafficMultiplier = 1.2;

    const adjustedDuration = (route.duration / 60) * trafficMultiplier;

    return {
      coordinates,
      distance: route.distance / 1000,
      duration: adjustedDuration,
      traffic,
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
      traffic: "light",
    };
  }
}

async function generateRoutesEnhanced(
  customers: Customer[],
  profile: "driving" | "walking" | "cycling" = "driving"
): Promise<Route[]> {
  const routes: Route[] = [];

  // Filter customers with valid coordinates
  const validCustomers = customers.filter(c => c.lat && c.lng);

  for (let i = 0; i < validCustomers.length - 1; i++) {
    const start = validCustomers[i];
    const end = validCustomers[i + 1];

    try {
      const result = await fetchOSRMRouteEnhanced(
        start.lat,
        start.lng,
        end.lat,
        end.lng,
        profile
      );

      // Generate waypoints based on route coordinates
      const waypoints = result.coordinates.slice(0, 3).map((coord, idx) => ({
        name: `Waypoint ${idx + 1}`,
        lat: coord[0],
        lng: coord[1],
      }));

      routes.push({
        id: `route-${i}`,
        customerIds: [start.id, end.id],
        coordinates: result.coordinates,
        distance: result.distance,
        duration: result.duration,
        color: `hsl(${(i * 60) % 360}, 70%, 50%)`,
        trafficConditions: result.traffic,
        estimatedTime: result.duration,
        routeSummary: `${profile} route from ${start.name} to ${end.name}`,
        waypoints: waypoints.slice(0, 2),
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
        trafficConditions: "light",
        estimatedTime: 0,
        routeSummary: `Route from ${start.name} to ${end.name}`,
        waypoints: [],
      });
    }
  }

  return routes;
}

// ============================================================
// 4. Enhanced Status & Priority Badges
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
// 5. Traffic Indicator Component
// ============================================================
function TrafficIndicator({ traffic }: { traffic?: "light" | "moderate" | "heavy" }) {
  if (!traffic) return null;

  const config = {
    light: { color: "text-green-500", icon: SignalLow, label: "Light" },
    moderate: { color: "text-yellow-500", icon: SignalMedium, label: "Moderate" },
    heavy: { color: "text-red-500", icon: SignalHigh, label: "Heavy" },
  };

  const { color, icon: Icon, label } = config[traffic];

  return (
    <div className="flex items-center gap-1">
      <Icon className={cn("size-3", color)} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ============================================================
// 6. Enhanced Route Details Component
// ============================================================
function RouteDetailsCardEnhanced({ routeDetails }: { routeDetails: RouteDetails | null }) {
  if (!routeDetails) return null;

  const priorityColor = 
    routeDetails.from.priority === "high" ? "#ef4444" : 
    routeDetails.from.priority === "medium" ? "#eab308" : "#3b82f6";

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-2xl pointer-events-none">
      <Card className="pointer-events-auto shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                <Route className="size-3 sm:size-4" />
                <span>Route Details</span>
                {routeDetails.traffic && (
                  <TrafficIndicator traffic={routeDetails.traffic} />
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[150px]">
                  {routeDetails.from.name}
                </span>
                <ArrowRight className="size-3 sm:size-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[150px]">
                  {routeDetails.to.name}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <Navigation className="size-3 sm:size-4 text-muted-foreground" />
                  <span className="font-medium">{routeDetails.distance.toFixed(2)} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-3 sm:size-4 text-muted-foreground" />
                  <span className="font-medium">{Math.round(routeDetails.duration)} min</span>
                </div>
                {routeDetails.fuelCost && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="size-3 sm:size-4 text-muted-foreground" />
                    <span className="font-medium">₱{routeDetails.fuelCost.toFixed(2)}</span>
                  </div>
                )}
                {routeDetails.estimatedArrival && (
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3 sm:size-4 text-muted-foreground" />
                    <span className="text-xs">
                      {routeDetails.estimatedArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <div 
                className="size-2 sm:size-3 rounded-full" 
                style={{ backgroundColor: priorityColor }} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 7. Route Metrics Dashboard
// ============================================================
function RouteMetricsDashboard({ metrics }: { metrics: RouteMetrics }) {
  return (
    <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-[1000] pointer-events-none">
      <Card className="pointer-events-auto bg-background/90 backdrop-blur-sm shadow-lg w-[180px] sm:w-[220px]">
        <CardContent className="p-2 sm:p-3">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Route className="size-3" />
                Routes
              </span>
              <span className="font-medium">{metrics.activeRoutes}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="size-3" />
                Customers
              </span>
              <span className="font-medium">{metrics.totalCustomers}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Navigation className="size-3" />
                Distance
              </span>
              <span className="font-medium">{metrics.totalDistance.toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                Duration
              </span>
              <span className="font-medium">{Math.round(metrics.totalDuration)} min</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="size-3" />
                Fuel Cost
              </span>
              <span className="font-medium">₱{metrics.fuelCost.toFixed(2)}</span>
            </div>
            {metrics.tollCost > 0 && (
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  Tolls
                </span>
                <span className="font-medium">₱{metrics.tollCost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 8. Customer List Item with Enhanced Info
// ============================================================
function CustomerListItemEnhanced({
  customer,
  isSelected,
  onSelect,
  showInfo = false,
}: {
  customer: Customer;
  isSelected: boolean;
  onSelect: (customer: Customer) => void;
  showInfo?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-2 sm:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "hover:border-primary/50"
      )}
      onClick={() => onSelect(customer)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <p className="font-medium text-sm sm:text-base truncate">
              {customer.name}
            </p>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate flex items-center gap-1">
            <Building2 className="size-3" />
            {customer.company}
          </p>
          {customer.rating && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="size-3 fill-yellow-500 text-yellow-500" />
              <span className="text-xs font-medium">{customer.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({customer.visitFrequency})</span>
            </div>
          )}
        </div>
        <CustomerPriorityBadge priority={customer.priority} />
      </div>

      <div className="mt-1 sm:mt-2 grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1 text-muted-foreground min-w-0">
          <MapPin className="size-3 flex-shrink-0" />
          <span className="truncate">{customer.address.split(",")[0]}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground min-w-0">
          <Phone className="size-3 flex-shrink-0" />
          <span className="truncate">{customer.phone}</span>
        </div>
      </div>

      {customer.tags && customer.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {customer.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[8px] sm:text-[10px] px-1 py-0">
              {tag}
            </Badge>
          ))}
          {customer.tags.length > 2 && (
            <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 py-0">
              +{customer.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {showInfo && (
        <div className="mt-1 sm:mt-2 grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground border-t pt-1 sm:pt-2">
          <div>
            <span className="font-medium">Revenue:</span> ₱
            {customer?.revenue?.toLocaleString()}
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
  );
}

// ============================================================
// 9. Enhanced Customer List Desktop
// ============================================================
function CustomerListDesktopEnhanced({
  customers,
  selectedCustomer,
  onSelectCustomer,
  showCustomerInfo,
  totalCustomers,
  searchQuery,
  onSearchChange,
  filterPriority,
  onFilterPriorityChange,
  filterStatus,
  onFilterStatusChange,
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  showCustomerInfo: boolean;
  totalCustomers: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (priority: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
}) {
  return (
    <Card className="w-72 sm:w-80 flex-shrink-0 overflow-hidden hidden lg:flex lg:flex-col h-full max-h-full">
      {/* Fixed Header */}
      <CardHeader className="border-b p-3 sm:p-4 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Users className="size-4 sm:size-5" />
            Customers
            <Badge variant="secondary" className="text-xs">
              {totalCustomers}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7"
                    onClick={() => onFilterPriorityChange(filterPriority === "high" ? "all" : "high")}
                  >
                    <Star className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filter high priority</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7"
                    onClick={() => onFilterStatusChange(filterStatus === "active" ? "all" : "active")}
                  >
                    <ShieldCheck className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filter active customers</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <Tabs value={filterPriority} onValueChange={onFilterPriorityChange} className="w-full">
            <TabsList className="h-7 w-full">
              <TabsTrigger value="all" className="text-xs h-6 flex-1">All</TabsTrigger>
              <TabsTrigger value="high" className="text-xs h-6 flex-1">High</TabsTrigger>
              <TabsTrigger value="medium" className="text-xs h-6 flex-1">Med</TabsTrigger>
              <TabsTrigger value="low" className="text-xs h-6 flex-1">Low</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 h-full min-h-0">
        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No customers found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search</p>
            </div>
          ) : (
            customers.map((customer) => (
              <CustomerListItemEnhanced
                key={customer.id}
                customer={customer}
                isSelected={selectedCustomer?.id === customer.id}
                onSelect={onSelectCustomer}
                showInfo={showCustomerInfo}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ============================================================
// 10. Main Enhanced Customer Map Component
// ============================================================
interface CustomerMapProps {
  customers?: Customer[];
  initialProfile?: "driving" | "walking" | "cycling";
  className?: string;
  user?: any;
}

export function CustomerMapEnhanced({
  customers = SAMPLE_CUSTOMERS,
  initialProfile = "driving",
  className,
  user
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showMetrics, setShowMetrics] = useState(true);
  const [animateMarkers, setAnimateMarkers] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<"driving" | "walking" | "cycling">(initialProfile);

  // Filter customers based on search query and filters
  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          c.address.toLowerCase().includes(query)
      );
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter(c => c.priority === filterPriority);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    return filtered;
  }, [customers, searchQuery, filterPriority, filterStatus]);

  // Calculate metrics
  const metrics = useMemo<RouteMetrics>(() => {
    const totalDistance = routes.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = routes.reduce((sum, r) => sum + r.duration, 0);
    const activeRoutes = routes.filter(r => r.distance > 0).length;
    
    // Simulate fuel and toll costs
    const fuelCost = totalDistance * 0.15; // ₱0.15 per km
    const tollCost = Math.floor(totalDistance / 20) * 50; // ₱50 per 20km

    return {
      totalDistance,
      totalDuration,
      averageDistance: activeRoutes > 0 ? totalDistance / activeRoutes : 0,
      averageDuration: activeRoutes > 0 ? totalDuration / activeRoutes : 0,
      fuelCost,
      tollCost,
      totalCustomers: filteredCustomers.length,
      activeRoutes,
    };
  }, [routes, filteredCustomers]);

  // Map center
  const center = useMemo(() => {
    if (filteredCustomers.length === 0) return [11.2445, 125.0040] as [number, number];
    const avgLat = filteredCustomers.reduce((sum, c) => sum + c.lat, 0) / filteredCustomers.length;
    const avgLng = filteredCustomers.reduce((sum, c) => sum + c.lng, 0) / filteredCustomers.length;
    return [avgLat, avgLng] as [number, number];
  }, [filteredCustomers]);

  // Fetch routes
  useEffect(() => {
    async function loadRoutes() {
      setLoading(true);
      try {
        const customerRoutes = filteredCustomers.filter(a => (a?.lat && a?.lng));
        const generatedRoutes = await generateRoutesEnhanced(customerRoutes, profile);
        setRoutes(generatedRoutes);
      } catch (error) {
        console.error("Failed to generate routes:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRoutes();
  }, [filteredCustomers, profile]);

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
      const from = filteredCustomers.find(c => c.id === route.customerIds[0]);
      const to = filteredCustomers.find(c => c.id === route.customerIds[1]);
      
      if (from && to) {
        const estimatedArrival = new Date();
        estimatedArrival.setMinutes(estimatedArrival.getMinutes() + route.duration);
        
        setRouteDetails({
          from,
          to,
          distance: route.distance,
          duration: route.duration,
          routeId: route.id,
          traffic: route.trafficConditions,
          estimatedArrival,
          fuelCost: route.distance * 0.15,
          tolls: Math.floor(route.distance / 20) * 50,
          turns: Math.floor(route.coordinates.length * 0.1),
          elevationGain: Math.floor(route.distance * 2),
        });
        setHighlightedRoute(route.id);
      }
    } else {
      setRouteDetails(null);
      setHighlightedRoute(null);
    }
  }, [selectedCustomer, routes, filteredCustomers]);

  // Handle map type change
  const handleMapTypeChange = (type: "street" | "satellite") => {
    if (type === mapType) return;
    setIsSwitchingView(true);
    setMapType(type);
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
    <div className={cn("flex flex-col lg:flex-row h-[calc(100vh-120px)] min-h-[500px] sm:min-h-[600px] w-full gap-2 sm:gap-4", className)}>
      {/* Desktop Customer List */}
      <CustomerListDesktopEnhanced
        customers={filteredCustomers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        showCustomerInfo={showCustomerInfo}
        totalCustomers={filteredCustomers.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterPriority={filterPriority}
        onFilterPriorityChange={setFilterPriority}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
      />

      {/* Mobile Customer List */}
      <CustomerListMobileEnhanced
        customers={filteredCustomers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        showCustomerInfo={showCustomerInfo}
        totalCustomers={filteredCustomers.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-[1000] flex flex-wrap gap-1 sm:gap-2 pointer-events-none">
            <div className="pointer-events-auto bg-background/90 backdrop-blur-sm border rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Users className="size-3 sm:size-4 text-muted-foreground" />
                <span className="font-medium">{filteredCustomers.length}</span>
                <span className="text-muted-foreground hidden sm:inline">customers</span>
              </div>
              <Separator orientation="vertical" className="h-3 sm:h-4" />
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Route className="size-3 sm:size-4 text-muted-foreground" />
                <span className="font-medium">{metrics.activeRoutes}</span>
                <span className="text-muted-foreground hidden sm:inline">routes</span>
              </div>
              <Separator orientation="vertical" className="h-3 sm:h-4" />
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Navigation className="size-3 sm:size-4 text-muted-foreground" />
                <span className="font-medium">{metrics.totalDistance.toFixed(1)} km</span>
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
              <Button
                size="icon-sm"
                variant={showMetrics ? "default" : "secondary"}
                onClick={() => setShowMetrics(!showMetrics)}
                title="Show metrics"
                className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
              >
                <BarChart3 className="size-3 sm:size-4" />
              </Button>
            </div>

            {/* Route Profile Controls */}
            {filteredCustomers.length >= 2 && (
              <div className="pointer-events-auto flex gap-1">
                <Button
                  size="icon-sm"
                  variant={profile === "driving" ? "default" : "secondary"}
                  onClick={() => setProfile("driving")}
                  title="Driving"
                  className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
                >
                  <Car className="size-3 sm:size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant={profile === "walking" ? "default" : "secondary"}
                  onClick={() => setProfile("walking")}
                  title="Walking"
                  className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
                >
                  <Footprints className="size-3 sm:size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant={profile === "cycling" ? "default" : "secondary"}
                  onClick={() => setProfile("cycling")}
                  title="Cycling"
                  className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
                >
                  <Bike className="size-3 sm:size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant={showRoutes ? "default" : "secondary"}
                  onClick={() => setShowRoutes(!showRoutes)}
                  title="Toggle routes"
                  className="shadow-sm h-7 w-7 sm:h-8 sm:w-8"
                >
                  <Layers className="size-3 sm:size-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Route Details Card */}
          <RouteDetailsCardEnhanced routeDetails={routeDetails} />

          {/* Route Metrics Dashboard */}
          {showMetrics && (
            <RouteMetricsDashboard metrics={metrics} />
          )}

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
              {mapType === 'satellite' ? (
                <MapTileLayer
                  name="Satellite"
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
                />
              ) : (
                <>
                  <MapTileLayer
                    name="Street"
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <MapTileLayer
                    name="Satellite (Fallback)"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  />
                </>
              )}

              <MapZoomControl position="top-1 left-1" />
              <MapLocateControl position="right-1 bottom-1" />

              {/* Routes */}
              {showRoutes && routes.length > 0 && filteredCustomers.length >= 2 && (
                <>
                  {routes.map((route) => (
                    <MapPolyline
                      key={route.id}
                      positions={route.coordinates}
                      color={highlightedRoute === route.id ? "#2563eb" : route.color}
                      weight={highlightedRoute === route.id ? 6 : 3}
                      opacity={highlightedRoute === route.id ? 1 : 0.4}
                      lineJoin="round"
                      lineCap="round"
                      smoothFactor={0}
                      dashArray={highlightedRoute === route.id ? undefined : "5, 5"}
                    />
                  ))}
                </>
              )}

              {/* Customer Markers with Enhanced Info */}
              {filteredCustomers.map((customer) => {
                const isSelected = selectedCustomer?.id === customer.id;

                return (
                  <MapMarker
                    key={customer.id}
                    position={[customer.lat, customer.lng]}
                    onClick={() => setSelectedCustomer(customer)}
                    animation={animateMarkers ? "bounce" : undefined}
                  >
                    <MapPopup>
                      <div className="space-y-2 p-1 min-w-[200px] max-w-[280px]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm sm:text-base truncate">
                            {customer.name}
                          </div>
                          <CustomerStatusBadge status={customer.status} />
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3" />
                          {customer.company}
                        </div>
                        {customer.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="size-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs font-medium">{customer.rating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({customer.visitFrequency})
                            </span>
                          </div>
                        )}
                        <Separator />
                        <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                          <div>
                            <span className="text-muted-foreground">Revenue:</span>{" "}
                            <span className="font-medium">₱{customer?.revenue?.toLocaleString()}</span>
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
                        {customer.tags && customer.tags.length > 0 && (
                          <>
                            <Separator />
                            <div className="flex flex-wrap gap-1">
                              {customer.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[10px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </>
                        )}
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

          {/* No Customers Message */}
          {!loading && filteredCustomers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000] pointer-events-none">
              <div className="flex flex-col items-center gap-3 bg-background/90 p-4 sm:p-6 rounded-lg shadow-lg max-w-sm text-center">
                <AlertCircle className="size-8 sm:size-10 text-muted-foreground" />
                <h3 className="font-semibold text-sm sm:text-base">No Customers Found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {searchQuery || filterPriority !== "all" || filterStatus !== "all"
                    ? "No customers match your filters. Try adjusting your search criteria."
                    : "No customers have been added to this company yet."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 11. Mobile Customer List Component
// ============================================================
function CustomerListMobileEnhanced({
  customers,
  selectedCustomer,
  onSelectCustomer,
  showCustomerInfo,
  totalCustomers,
  searchQuery,
  onSearchChange,
  isOpen,
  onOpenChange,
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  showCustomerInfo: boolean;
  totalCustomers: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="lg:hidden fixed bottom-4 right-4 z-[1000] shadow-lg rounded-full size-12 sm:size-14"
        >
          <Menu className="size-5 sm:size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[90vw] sm:w-[400px] p-0">
        <Card className="h-full border-0 rounded-none flex flex-col">
          {/* Fixed Header */}
          <CardHeader className="border-b p-4 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="size-5" />
                Customers
                <Badge variant="secondary">{totalCustomers}</Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-7 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </CardHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 h-full min-h-0">
            <div className="p-3 sm:p-4 space-y-3">
              {customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="size-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No customers found</p>
                </div>
              ) : (
                customers.map((customer) => (
                  <CustomerListItemEnhanced
                    key={customer.id}
                    customer={customer}
                    isSelected={selectedCustomer?.id === customer.id}
                    onSelect={(c) => {
                      onSelectCustomer(c);
                      onOpenChange(false);
                    }}
                    showInfo={showCustomerInfo}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// 12. Export
// ============================================================
export default CustomerMapEnhanced;