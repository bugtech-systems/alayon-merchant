"use client";

import { DeliveryDTO, DeliveryStatus, DriverDTO } from "@/lib/types";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  AlertCircle,
  LayoutGrid,
  List,
  Briefcase,
  Clock,
  Truck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DeliveryCard from "./delivery-card";

interface ColumnConfig {
  title: string;
  statusFilters: DeliveryStatus[];
  icon: React.ElementType;
  color: string;
  description: string;
}

export default function DeliveryPipeline({
  deliveries,
  driver,
  type,
}: {
  deliveries: DeliveryDTO[];
  driver?: DriverDTO;
  type: "company" | "driver";
}) {
  const [viewMode, setViewMode] = useState<"columns" | "list">("columns");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const columns: ColumnConfig[] = [
    {
      title: "Available jobs",
      statusFilters: [DeliveryStatus.COMPANY_ACCEPTED],
      icon: Briefcase,
      color: "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
      description: "Ready for pickup",
    },
    {
      title: "Claimed jobs",
      statusFilters: [
        DeliveryStatus.PICKUP_CLAIMED,
        DeliveryStatus.COMPANY_PREPARING,
      ],
      icon: Clock,
      color: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
      description: "In progress",
    },
    {
      title: "Ready for pickup",
      statusFilters: [DeliveryStatus.READY_FOR_PICKUP],
      icon: Package,
      color: "border-green-500 bg-green-50 dark:bg-green-950/20",
      description: "Awaiting collection",
    },
    {
      title: "In transit",
      statusFilters: [DeliveryStatus.IN_TRANSIT],
      icon: Truck,
      color: "border-purple-500 bg-purple-50 dark:bg-purple-950/20",
      description: "On the way",
    },
    {
      title: "Completed",
      statusFilters: [DeliveryStatus.DELIVERED],
      icon: CheckCircle,
      color: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
      description: "Delivered",
    },
  ];

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const getColumnDeliveries = (statusFilters: DeliveryStatus[]) => {
    return deliveries?.filter(
      (d) => d && statusFilters?.includes(d.delivery_status)
    ) || [];
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.COMPANY_ACCEPTED:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case DeliveryStatus.PICKUP_CLAIMED:
      case DeliveryStatus.COMPANY_PREPARING:
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case DeliveryStatus.READY_FOR_PICKUP:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case DeliveryStatus.IN_TRANSIT:
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case DeliveryStatus.DELIVERED:
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300";
    }
  };

  const totalDeliveries = deliveries?.length || 0;
  const completedDeliveries = getColumnDeliveries([DeliveryStatus.DELIVERED]).length;
  const inProgressDeliveries = totalDeliveries - completedDeliveries;

  // List view grouped by status
  const ListView = () => (
    <div className="space-y-4">
      {columns.map((column) => {
        const columnDeliveries = getColumnDeliveries(column.statusFilters);
        const isExpanded = expandedSections.includes(column.title);

        if (columnDeliveries.length === 0 && !isExpanded) return null;

        return (
          <Card key={column.title} className={`border-l-4 ${column.color}`}>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection(column.title)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <column.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">
                    {column.title}
                  </CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    {columnDeliveries.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {column.description}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                {columnDeliveries.length > 0 ? (
                  <div className="space-y-3">
                    {columnDeliveries.map((delivery) => (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        type={type}
                        driver={driver}
                        compact={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No deliveries in this stage
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );

  // Columns view
  const ColumnsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {columns.map((column) => (
        <Card key={column.title} className={`border-t-4 ${column.color} h-full`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <column.icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-semibold truncate">
                  {column.title}
                </CardTitle>
              </div>
              <Badge variant="secondary" className="ml-2">
                {getColumnDeliveries(column.statusFilters).length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {column.description}
            </p>
          </CardHeader>
          <CardContent className="p-3">
            <ScrollArea className="h-[calc(100vh-350px)] min-h-[200px] pr-4">
              <div className="space-y-3">
                {getColumnDeliveries(column.statusFilters).map((delivery) => (
                  <DeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    type={type}
                    driver={driver}
                    compact={true}
                  />
                ))}
                {getColumnDeliveries(column.statusFilters).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="rounded-full bg-muted p-2 mb-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">No deliveries</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with stats and view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Delivery Pipeline
            </h2>
            <p className="text-sm text-muted-foreground">
              Track and manage your deliveries across different stages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="gap-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{totalDeliveries}</span>
            </Badge>
            <Badge variant="outline" className="gap-1 border-green-500/30">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {completedDeliveries}
              </span>
            </Badge>
            <Badge variant="outline" className="gap-1 border-blue-500/30">
              <span className="text-muted-foreground">In Progress:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {inProgressDeliveries}
              </span>
            </Badge>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "columns" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("columns")}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Columns view</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === "columns" ? <ColumnsView /> : <ListView />}
    </div>
  );
}