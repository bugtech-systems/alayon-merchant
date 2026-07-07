import { DeliveryDTO, DeliveryStatus, DriverDTO } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, AlertCircle } from "lucide-react";
import DeliveryCard from "./delivery-card";

export default async function DeliveryColumn({
  title,
  deliveries,
  statusFilters,
  driver,
  type,
  icon: Icon,
  color,
}: {
  title: string;
  deliveries: DeliveryDTO[];
  statusFilters?: DeliveryStatus[];
  driver?: DriverDTO;
  type: "company" | "driver";
  icon?: React.ElementType;
  color?: string;
}) {
  const columnDeliveries = deliveries?.filter(
    (d) => d && statusFilters?.includes(d.delivery_status)
  );

  const getStatusColor = () => {
    if (!color) {
      switch (title) {
        case "Available jobs":
          return "border-blue-500 bg-blue-50 dark:bg-blue-950/20";
        case "Claimed jobs":
          return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
        case "Ready for pickup":
          return "border-green-500 bg-green-50 dark:bg-green-950/20";
        case "In transit":
          return "border-purple-500 bg-purple-50 dark:bg-purple-950/20";
        case "Completed":
          return "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
        default:
          return "border-gray-200 bg-gray-50 dark:bg-gray-800/20";
      }
    }
    return color;
  };

  const getBadgeVariant = () => {
    switch (title) {
      case "Available jobs":
        return "default";
      case "Claimed jobs":
        return "secondary";
      case "Ready for pickup":
        return "success";
      case "In transit":
        return "warning";
      case "Completed":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <Card className={`h-full border-t-4 ${getStatusColor()} shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          <Badge variant={getBadgeVariant()} className="ml-2">
            {columnDeliveries?.length || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {columnDeliveries?.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px] pr-4">
            <div className="space-y-3">
              {columnDeliveries.map((delivery) => (
                <DeliveryCard
                  delivery={delivery}
                  type={type}
                  driver={driver}
                  key={delivery.id}
                  compact={true}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-2">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Deliveries will appear here when available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}