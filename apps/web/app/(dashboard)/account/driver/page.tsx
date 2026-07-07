import AccountBadge from "@/components/dashboard/account-badge";
import DeliveryPipeline from "@/components/dashboard/delivery-pipeline";
import RealtimeClient from "@/components/dashboard/realtime-client";
import { listDeliveries, retrieveDriver, retrieveUser } from "@/lib/data";
import { DeliveryStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  MapPin, 
  Calendar, 
  Truck,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Package
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function DriverDashboardPage() {
  const userData = await retrieveUser();
  if (!userData) {
    redirect("/login");
  }

  const driver = await retrieveDriver(userData?.driver?.id);
  const deliveries = await listDeliveries({
    driver_id: driver.id,
    delivery_status: 'company_accepted'
  });

  // Calculate statistics
  const totalDeliveries = deliveries?.length || 0;
  const completedDeliveries = deliveries?.filter(
    d => d.delivery_status === DeliveryStatus.DELIVERED
  ).length || 0;
  const inProgressDeliveries = deliveries?.filter(
    d => d.delivery_status !== DeliveryStatus.DELIVERED && 
         d.delivery_status !== DeliveryStatus.COMPANY_ACCEPTED
  ).length || 0;
  const availableJobs = deliveries?.filter(
    d => d.delivery_status === DeliveryStatus.COMPANY_ACCEPTED
  ).length || 0;

  const completionRate = totalDeliveries > 0 
    ? Math.round((completedDeliveries / totalDeliveries) * 100) 
    : 0;

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description,
    trend 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ElementType;
    description?: string;
    trend?: string;
  }) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {trend}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <Card className="shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <User className="h-8 w-8 text-primary" />
                {driver.first_name} {driver.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className="gap-1">
                  <Truck className="h-3 w-3" />
                  Driver
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {driver.location || "Location not set"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  Active since {new Date(driver.created_at).toLocaleDateString()}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {completionRate}% completion
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RealtimeClient driverId={driver.id} />
              <AccountBadge data={driver} type="driver" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available Jobs"
          value={availableJobs}
          icon={Package}
          description="Ready for pickup"
          trend="+12% this week"
        />
        <StatCard
          title="In Progress"
          value={inProgressDeliveries}
          icon={Clock}
          description="Active deliveries"
          trend="5 in transit"
        />
        <StatCard
          title="Completed"
          value={completedDeliveries}
          icon={CheckCircle}
          description="Total deliveries done"
          trend={`${completionRate}% completion rate`}
        />
        <StatCard
          title="Total Deliveries"
          value={totalDeliveries}
          icon={TrendingUp}
          description="All time deliveries"
          trend={`${totalDeliveries} total`}
        />
      </div>

      {/* Delivery Pipeline with View Toggle */}
      <DeliveryPipeline
        deliveries={deliveries}
        type="driver"
        driver={driver}
      />
    </div>
  );
}