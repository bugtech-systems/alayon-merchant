"use client";

import { useState } from "react";
import {
  Map,
  MapMarker,
  MapMarkerClusterGroup,
  MapTileLayer,
  MapLocateControl,
} from "@/components/ui/map";
import type { LatLngExpression } from "leaflet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Navigation,
  Users,
  MapPin,
  Package,
  TrendingDown,
  TrendingUp,
  Target,
  User,
  Home,
  Store,
  Building,
  Coffee,
  Briefcase,
  Star,
  Clock,
  BarChart3,
  Church,
  School,
  ShoppingBag,
  Menu,
  X
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Tacloban City Center Coordinates
const TACLOBAN_CENTER: LatLngExpression = [11.2299, 125.0022];

// Sample customer data - Tacloban Area
const CUSTOMERS = [
  // Downtown Tacloban Area
  { id: 1, name: "Maria Santos", lat: 11.2449, lng: 125.0032, group: "Downtown", address: "Real St., Tacloban City", phone: "+63 (555) 123-4567", lastOrder: "2024-01-15", status: "active", rating: 4.8 },
  { id: 2, name: "Jose Ramirez", lat: 11.2429, lng: 125.0052, group: "Downtown", address: "P. Gomez St., Tacloban", phone: "+63 (555) 234-5678", lastOrder: "2024-01-14", status: "active", rating: 4.5 },
  { id: 3, name: "Ana Reyes", lat: 11.2469, lng: 125.0012, group: "Downtown", address: "Justice Romualdez St.", phone: "+63 (555) 345-6789", lastOrder: "2024-01-16", status: "active", rating: 4.9 },
  
  // San Jose District
  { id: 4, name: "Roberto Fernandez", lat: 11.2289, lng: 124.9922, group: "San Jose", address: "San Jose District", phone: "+63 (555) 456-7890", lastOrder: "2024-01-13", status: "active", rating: 4.2 },
  { id: 5, name: "Carmen Gomez", lat: 11.2269, lng: 124.9942, group: "San Jose", address: "Brgy. 88, San Jose", phone: "+63 (555) 567-8901", lastOrder: "2024-01-12", status: "active", rating: 4.7 },
  { id: 6, name: "Antonio Cruz", lat: 11.2309, lng: 124.9902, group: "San Jose", address: "San Jose Heights", phone: "+63 (555) 678-9012", lastOrder: "2024-01-16", status: "inactive", rating: 4.6 },
  
  // Marasbaras Area
  { id: 7, name: "Luzviminda Torres", lat: 11.2149, lng: 125.0082, group: "Marasbaras", address: "Marasbaras Road", phone: "+63 (555) 789-0123", lastOrder: "2024-01-15", status: "active", rating: 5.0 },
  { id: 8, name: "Pedro Jimenez", lat: 11.2129, lng: 125.0102, group: "Marasbaras", address: "Brgy. Marasbaras", phone: "+63 (555) 890-1234", lastOrder: "2024-01-14", status: "active", rating: 4.3 },
  { id: 9, name: "Elena Vargas", lat: 11.2169, lng: 125.0062, group: "Marasbaras", address: "Marasbaras Proper", phone: "+63 (555) 901-2345", lastOrder: "2024-01-11", status: "active", rating: 4.4 },
  
  // Sagkahan District
  { id: 10, name: "Ramon Dela Cruz", lat: 11.2549, lng: 125.0122, group: "Sagkahan", address: "Sagkahan District", phone: "+63 (555) 012-3456", lastOrder: "2024-01-10", status: "active", rating: 4.1 },
  { id: 11, name: "Fe Mercado", lat: 11.2569, lng: 125.0142, group: "Sagkahan", address: "Fatima Village", phone: "+63 (555) 123-7890", lastOrder: "2024-01-15", status: "active", rating: 4.8 },
  { id: 12, name: "Gregorio Castillo", lat: 11.2529, lng: 125.0102, group: "Sagkahan", address: "Sagkahan National Road", phone: "+63 (555) 234-8901", lastOrder: "2024-01-14", status: "inactive", rating: 4.6 },
  
  // Abucay Area
  { id: 13, name: "Teresa Gonzales", lat: 11.2349, lng: 124.9982, group: "Abucay", address: "Abucay Street", phone: "+63 (555) 345-9012", lastOrder: "2024-01-13", status: "active", rating: 4.7 },
  { id: 14, name: "Manuel Ignacio", lat: 11.2369, lng: 124.9962, group: "Abucay", address: "Brgy. Abucay", phone: "+63 (555) 456-0123", lastOrder: "2024-01-12", status: "active", rating: 4.5 },
  
  // Diit
  { id: 15, name: "Nieves Aquino", lat: 11.2049, lng: 125.0152, group: "Diit", address: "Diit Road", phone: "+63 (555) 567-1234", lastOrder: "2024-01-16", status: "active", rating: 4.9 },
  { id: 16, name: "Felipe Santiago", lat: 11.2029, lng: 125.0172, group: "Diit", address: "Purok 5, Diit", phone: "+63 (555) 678-2345", lastOrder: "2024-01-15", status: "active", rating: 4.8 },
  
  // V&G Subdivision
  { id: 17, name: "Corazon Mateo", lat: 11.2489, lng: 124.9882, group: "V&G Subd.", address: "V&G Subdivision", phone: "+63 (555) 789-3456", lastOrder: "2024-01-14", status: "active", rating: 4.4 },
  { id: 18, name: "Ricardo Bautista", lat: 11.2509, lng: 124.9862, group: "V&G Subd.", address: "Phase 2, V&G Subd.", phone: "+63 (555) 890-4567", lastOrder: "2024-01-13", status: "inactive", rating: 4.2 },
];

// Get group color
const getGroupColor = (group: string) => {
  const colors: Record<string, string> = {
    Downtown: "#ef4444",
    "San Jose": "#3b82f6",
    Marasbaras: "#10b981",
    Sagkahan: "#f59e0b",
    Abucay: "#8b5cf6",
    Diit: "#ec489a",
    "V&G Subd.": "#06b6d4",
  };
  return colors[group] || "#6b7280";
};

// Get group icon
const getGroupIcon = (group: string, className: string = "h-4 w-4") => {
  const icons: Record<string, React.ReactNode> = {
    Downtown: <Building className={className} />,
    "San Jose": <Church className={className} />,
    Marasbaras: <Home className={className} />,
    Sagkahan: <School className={className} />,
    Abucay: <Store className={className} />,
    Diit: <ShoppingBag className={className} />,
    "V&G Subd.": <Coffee className={className} />,
  };
  return icons[group] || <MapPin className={className} />;
};

// Customer marker component
const CustomerMarker = ({ 
  customer, 
  isSelected,
  onClick 
}: { 
  customer: typeof CUSTOMERS[0]; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  const groupColor = getGroupColor(customer.group);
  
  return (
    <button
      onClick={onClick}
      className="relative group transition-transform duration-200 hover:scale-110"
    >
      {/* Pulsing ring for active customers */}
      {customer.status === "active" && (
        <div className="absolute -inset-1 rounded-full animate-ping opacity-75" 
             style={{ backgroundColor: groupColor }} />
      )}
      
      {/* Main marker */}
      <div 
        className={`relative rounded-full p-2 shadow-lg border-2 transition-all duration-200 bg-white ${
          isSelected ? "border-primary scale-110 ring-2 ring-primary/50" : "border-white"
        }`}
        style={{ 
          boxShadow: `0 0 0 2px ${groupColor}`,
        }}
      >
        {getGroupIcon(customer.group, "h-4 w-4")}
      </div>
      
      {/* Tooltip on hover - only on desktop */}
      <div className="hidden lg:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <div className="bg-popover text-popover-foreground rounded-md px-2 py-1 text-xs shadow-lg border">
          {customer.name}
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-2 w-2 fill-yellow-500 text-yellow-500" />
            <span className="text-[10px]">{customer.rating}</span>
          </div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover rotate-45 border-r border-b" />
        </div>
      </div>
    </button>
  );
};

// Custom cluster icon component
const ClusterIcon = ({ count }: { count: number }) => {
  const getClusterColor = () => {
    if (count >= 8) return "bg-red-500";
    if (count >= 4) return "bg-orange-500";
    return "bg-blue-500";
  };

  return (
    <div className="relative group cursor-pointer">
      <div className={`${getClusterColor()} rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center shadow-lg border-2 border-white`}>
        <span className="text-white font-bold text-xs lg:text-sm">{count}</span>
      </div>
      <div className={`${getClusterColor()} rounded-full w-8 h-8 lg:w-10 lg:h-10 absolute top-0 left-0 animate-ping opacity-75`} />
    </div>
  );
};

// Mobile Bottom Sheet for Customer Details
function CustomerBottomSheet({ customer, onClose, distance }: { customer: any; onClose: () => void; distance: number | null }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t rounded-t-2xl shadow-xl z-[2000] animate-in slide-in-from-bottom-5 lg:hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: customer.status === "active" ? "#22c55e" : "#9ca3af" }}
            />
            <h3 className="font-semibold">{customer.name}</h3>
            <Badge style={{ borderColor: getGroupColor(customer.group) }} variant="outline">
              {customer.group}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">{customer.address}</p>
        
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            <span className="text-sm font-medium">{customer.rating}</span>
          </div>
          {distance && (
            <div className="flex items-center gap-1">
              <Navigation className="h-3 w-3 text-green-500" />
              <span className="text-xs">{distance.toFixed(1)} miles away</span>
            </div>
          )}
        </div>
        
        <Separator className="my-3" />
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone:</span>
            <span>{customer.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Order:</span>
            <span>{customer.lastOrder}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RiderMap() {
  const [selectedCustomer, setSelectedCustomer] = useState<typeof CUSTOMERS[0] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [riderPosition, setRiderPosition] = useState<LatLngExpression | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1024px)");

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: typeof CUSTOMERS[0]) => {
    setSelectedCustomer(customer);
    if (isMobile) {
      setDrawerOpen(false); // Close drawer on mobile when customer is selected
    }
  };

  // Handle locate event from MapLocateControl
  const handleLocate = (e: any) => {
    if (e.latlng) {
      setRiderPosition([e.latlng.lat, e.latlng.lng]);
    }
  };

  // Filter customers by group
  const filteredCustomers = selectedGroup 
    ? CUSTOMERS.filter(c => c.group === selectedGroup)
    : CUSTOMERS;

  // Get unique groups
  const groups = Array.from(new Set(CUSTOMERS.map(c => c.group)));

  // Calculate stats
  const totalCustomers = filteredCustomers.length;
  const activeCustomers = filteredCustomers.filter(c => c.status === "active").length;
  const avgRating = filteredCustomers.reduce((sum, c) => sum + c.rating, 0) / filteredCustomers.length;
  const avgDistance = riderPosition && Array.isArray(riderPosition)
    ? filteredCustomers.reduce((sum, c) => sum + calculateDistance(riderPosition[0], riderPosition[1], c.lat, c.lng), 0) / filteredCustomers.length
    : 0;

  // Sidebar Content Component (reused for both desktop and mobile)
  const SidebarContent = () => (
    <>
      <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Rider Dashboard
          </h2>
          <Badge variant="outline" className="text-xs">
            Tacloban City
          </Badge>
        </div>
        <p className="text-xs lg:text-sm text-muted-foreground">
          Real-time customer tracking & intelligent routing
        </p>
      </div>

      <Tabs defaultValue="customers" className="flex-1">
        <TabsList className="w-full rounded-none">
          <TabsTrigger value="customers" className="flex-1 text-xs lg:text-sm">
            <Users className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 text-xs lg:text-sm">
            <Target className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-xs lg:text-sm">
            <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="m-0">
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Customer Directory</p>
              <Badge variant="outline">{filteredCustomers.length} total</Badge>
            </div>
            {selectedGroup && (
              <Badge 
                variant="secondary"
                className="cursor-pointer gap-1 text-xs"
                onClick={() => setSelectedGroup(null)}
              >
                Filter: {selectedGroup}
                <span className="ml-1">✕</span>
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[calc(90vh-280px)] pb-5">
            <div className="p-3 space-y-2 mb-10">
              {filteredCustomers.map(customer => {
                const distance = riderPosition && Array.isArray(riderPosition)
                  ? calculateDistance(riderPosition[0], riderPosition[1], customer.lat, customer.lng)
                  : null;
                
                return (
                  <Card 
                    key={customer.id}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                      selectedCustomer?.id === customer.id ? "ring-2 ring-primary shadow-lg bg-primary/5" : ""
                    }`}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <div className="relative">
                            <div 
                              className="w-2 h-2 rounded-full absolute -top-1 -right-1"
                              style={{ 
                                backgroundColor: customer.status === "active" ? "#22c55e" : "#9ca3af",
                              }}
                            />
                            <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center bg-white shadow-sm border"
                                 style={{ borderColor: getGroupColor(customer.group) }}>
                              {getGroupIcon(customer.group, "h-2.5 w-2.5 lg:h-3 lg:w-3")}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-xs lg:text-sm">{customer.name}</p>
                            <div className="flex items-center gap-1">
                              <Star className="h-2.5 w-2.5 lg:h-3 lg:w-3 fill-yellow-500 text-yellow-500" />
                              <span className="text-xs text-muted-foreground">{customer.rating}</span>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ borderColor: getGroupColor(customer.group) }}
                          >
                            {customer.group}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{customer.address}</p>
                        {distance && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Navigation className="h-3 w-3" />
                            <span>{distance.toFixed(1)} miles away</span>
                            <Clock className="h-3 w-3 ml-2" />
                            <span>Est. {Math.round(distance * 3)} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="groups" className="m-0 p-3 lg:p-4">
          <p className="text-sm font-medium mb-3">Customer Groups by Area</p>
          <div className="space-y-2">
            <Card 
              className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                !selectedGroup ? "ring-2 ring-primary bg-primary/5" : ""
              }`}
              onClick={() => setSelectedGroup(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">All Tacloban Areas</span>
                </div>
                <Badge variant="default">{CUSTOMERS.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                View all customer groups across Tacloban City
              </p>
            </Card>

            <ScrollArea className="h-[calc(80vh-300px)]">
              {groups.map(group => {
                const count = CUSTOMERS.filter(c => c.group === group).length;
                const activeCount = CUSTOMERS.filter(c => c.group === group && c.status === "active").length;
                const avgGroupRating = CUSTOMERS.filter(c => c.group === group).reduce((sum, c) => sum + c.rating, 0) / count;
                
                return (
                  <Card 
                    key={group}
                    className={`p-3 mt-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedGroup === group ? "ring-2 ring-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center bg-white shadow-sm"
                          style={{ border: `2px solid ${getGroupColor(group)}` }}
                        >
                          {getGroupIcon(group, "h-3 w-3 lg:h-4 lg:w-4")}
                        </div>
                        <div>
                          <span className="font-medium text-sm">{group}</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs text-muted-foreground">{avgGroupRating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Active: {activeCount}</span>
                      <span className="text-muted-foreground">
                        {Math.round((count / CUSTOMERS.length) * 100)}% of total
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(count / CUSTOMERS.length) * 100}%`, backgroundColor: getGroupColor(group) }}
                      />
                    </div>
                  </Card>
                );
              })}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="m-0 p-3 lg:p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <Card className="p-2 lg:p-3 text-center hover:shadow-md transition-shadow">
              <Users className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-primary" />
              <p className="text-xl lg:text-2xl font-bold">{totalCustomers}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground">Total Customers</p>
            </Card>
            <Card className="p-2 lg:p-3 text-center hover:shadow-md transition-shadow">
              <User className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-green-500" />
              <p className="text-xl lg:text-2xl font-bold">{activeCustomers}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground">Active Now</p>
            </Card>
            <Card className="p-2 lg:p-3 text-center hover:shadow-md transition-shadow">
              <Star className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-yellow-500" />
              <p className="text-xl lg:text-2xl font-bold">{avgRating.toFixed(1)}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground">Avg Rating</p>
            </Card>
            <Card className="p-2 lg:p-3 text-center hover:shadow-md transition-shadow">
              <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 mx-auto mb-1 lg:mb-2 text-blue-500" />
              <p className="text-xl lg:text-2xl font-bold">{avgDistance.toFixed(1)}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground">Avg Distance</p>
            </Card>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3">Area Distribution</p>
            <div className="space-y-2 lg:space-y-3">
              {groups.map(group => {
                const count = CUSTOMERS.filter(c => c.group === group).length;
                const percentage = (count / CUSTOMERS.length) * 100;
                return (
                  <div key={group}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: getGroupColor(group) }}
                        />
                        <span className="text-xs">{group}</span>
                      </span>
                      <span className="font-mono text-xs">{count} customers</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: getGroupColor(group) 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Top Rated Customers</p>
            <div className="space-y-2">
              {[...CUSTOMERS].sort((a, b) => b.rating - a.rating).slice(0, 3).map(customer => (
                <div key={customer.id} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                    </div>
                    <span className="font-medium text-xs">{customer.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>{customer.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <div className="relative h-[85vh] w-full bg-background">
      {/* Map - Full screen */}
      <div className="absolute inset-0">
        <Map 
          center={TACLOBAN_CENTER} 
          zoom={13}
          className="h-full w-full"
        >
          <MapTileLayer />
          
          {/* Built-in Locate Control */}
          <MapLocateControl 
            position="bottom-1 right-1"
            onLocate={handleLocate}
            options={{
              setView: true,
              keepCurrentZoomLevel: false,
              enableHighAccuracy: true,
              showPopup: true,
              popupContent: "You are here!",
              drawCircle: true,
              drawMarker: true,
              circleStyle: {
                color: '#22c55e',
                weight: 2,
                fillColor: '#22c55e',
                fillOpacity: 0.15
              }
            }}
          />

          {/* Customer Markers with Built-in Clustering */}
          <MapMarkerClusterGroup
            showCoverageOnHover={false}
            icon={(markerCount) => <ClusterIcon count={markerCount} />}
          >
            {filteredCustomers.map((customer) => (
              <MapMarker
                key={customer.id}
                position={[customer.lat, customer.lng]}
              >
                <CustomerMarker
                  customer={customer}
                  isSelected={selectedCustomer?.id === customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                />
              </MapMarker>
            ))}
          </MapMarkerClusterGroup>
        </Map>
      </div>

      {/* Desktop Sidebar - always visible */}
      <div className="hidden lg:block absolute left-3 top-3 bottom-4 z-100">
        <Card className="w-96 h-[85vh] overflow-hidden shadow-xl pb-5 mb-5">
          <SidebarContent />
        </Card>
      </div>

      {/* Mobile Drawer Button and Sheet */}
      <div className="lg:hidden absolute top-4 left-4 z-100 pb-5">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            {!drawerOpen && 
            
            <Button size="icon" variant="default" className="shadow-lg bg-primary">
              <Menu className="h-5 w-5" />
            </Button>
            }
          </SheetTrigger>

          <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Rider Dashboard</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100vh-60px)] overflow-y-auto pb-5">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile Bottom Sheet for Customer Details */}
      {selectedCustomer && (
        <CustomerBottomSheet
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          distance={riderPosition && Array.isArray(riderPosition) 
            ? calculateDistance(riderPosition[0], riderPosition[1], selectedCustomer.lat, selectedCustomer.lng)
            : null
          }
        />
      )}

      {/* Desktop Selected Customer Info Card */}
      {selectedCustomer && riderPosition && Array.isArray(riderPosition) && (
        <Card className="hidden lg:block absolute bottom-4 left-1/2 transform -translate-x-1/2 p-3 bg-background/95 backdrop-blur-sm shadow-lg z-[1000] min-w-[320px]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Selected Customer</p>
              <p className="font-semibold text-sm flex items-center gap-1">
                {selectedCustomer.name}
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <Navigation className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-mono">
                    {calculateDistance(riderPosition[0], riderPosition[1], selectedCustomer.lat, selectedCustomer.lng).toFixed(2)} miles
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span className="text-xs font-mono">
                    ~{Math.round(calculateDistance(riderPosition[0], riderPosition[1], selectedCustomer.lat, selectedCustomer.lng) * 3)} min
                  </span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCustomer(null)}
            >
              Close
            </Button>
          </div>
        </Card>
      )}

      {/* Desktop Rider Status Info Card */}
      {/* <Card className="hidden lg:block absolute bottom-4 left-4 p-3 bg-background/95 backdrop-blur-sm shadow-lg z-[1000] min-w-[220px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-sm font-semibold">Rider Status</p>
        </div>
        {riderPosition && Array.isArray(riderPosition) ? (
          <>
            <p className="text-xs text-muted-foreground">📍 Location detected</p>
            <p className="text-xs font-mono mt-1">
              {riderPosition[0].toFixed(4)}°, {riderPosition[1].toFixed(4)}°
            </p>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-xs">
              <span>Nearby (&lt;2mi):</span>
              <Badge variant="secondary">
                {filteredCustomers.filter(c => 
                  calculateDistance(riderPosition[0], riderPosition[1], c.lat, c.lng) < 2
                ).length}
              </Badge>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">📍 Click locate button to find your position</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the locate control on the map
            </p>
          </>
        )}
      </Card> */}

      {/* Tacloban Area Info - Desktop only */}
      <Card className="hidden lg:block absolute top-3 right-3 p-3 bg-background/95 backdrop-blur-sm shadow-lg z-[1000] min-w-[180px]">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Tacloban City</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Eastern Visayas, Philippines
        </p>
        <Separator className="my-2" />
        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Service Areas:</span>
            <span className="font-mono">{groups.length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Active Riders:</span>
            <span className="font-mono">8</span>
          </div>
        </div>
      </Card>

      {/* Legend - Desktop only */}
      {/* <Card className="hidden lg:block absolute top-4 right-4 p-3 bg-background/95 backdrop-blur-sm shadow-lg z-[1000]">
        <div className="text-xs space-y-2">
          <p className="font-semibold mb-1">Map Legend</p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <span>User Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
              <span>3</span>
            </div>
            <span>Customer Cluster</span>
          </div>
          {groups.slice(0, 3).map(group => (
            <div key={group} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: getGroupColor(group) }}
              />
              <span>{group}</span>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Active Customer</span>
          </div>
        </div>
      </Card> */}

      {/* Mobile Location Indicator */}
      {riderPosition && Array.isArray(riderPosition) && (
        <div className="lg:hidden absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg p-2 shadow-lg z-10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Location active</span>
            </div>
            <span className="font-mono text-[10px]">
              {riderPosition[0].toFixed(4)}°, {riderPosition[1].toFixed(4)}°
            </span>
          </div>
        </div>
      )}
    </div>
  );
}