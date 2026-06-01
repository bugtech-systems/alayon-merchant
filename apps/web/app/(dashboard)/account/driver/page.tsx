import AccountBadge from "@/components/dashboard/account-badge";
import DeliveryColumn from "@/components/dashboard/delivery-column";
import RealtimeClient from "@/components/dashboard/realtime-client";
import {
  listDeliveries,
  retrieveDriver,
  retrieveUser,
} from "@/lib/data";
import { DeliveryStatus } from "@/lib/types";
import { Container, Heading, Text } from "@medusajs/ui";
import { redirect } from "next/navigation";

export default async function DriverDashboardPage() {
  const userData = await retrieveUser();
  if (!userData) {
    redirect("/login");
  }
console.log(userData, 'USSR')
  const driver = await retrieveDriver(userData?.driver?.id);

  const deliveries = await listDeliveries({
    driver_id: driver.id,
    delivery_status: 'company_accepted'
  });
  console.log(deliveries, 'DRVVVR DDD')

  return (
    <div className="flex flex-col gap-20">
      <Container className="flex flex-col md:flex-row gap-4 justify-between p-8">
        <div className="flex flex-col justify-between">
          <Heading level="h1" className="text-2xl">
            {driver.first_name} {driver.last_name} | Driver Dashboard
          </Heading>
          <Text>View and manage your Medusa Eats deliveries.</Text>
          <RealtimeClient driverId={driver.id} />
        </div>
        <AccountBadge data={driver} type="driver" />
      </Container>
      <div className="overflow-x-auto whitespace-nowrap ">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-px">
          <DeliveryColumn
            title="Available jobs"
            deliveries={deliveries}
            statusFilters={[DeliveryStatus.COMPANY_ACCEPTED]}
            type="driver"
            driver={driver}
          />
          <DeliveryColumn
            title="Claimed jobs"
            deliveries={deliveries}
            statusFilters={[
              DeliveryStatus.PICKUP_CLAIMED,
              DeliveryStatus.COMPANY_PREPARING,
            ]}
            type="driver"
            driver={driver}
          />
          <DeliveryColumn
            title="Ready for pickup"
            deliveries={deliveries}
            statusFilters={[DeliveryStatus.READY_FOR_PICKUP]}
            type="driver"
            driver={driver}
          />
          <DeliveryColumn
            title="In transit"
            deliveries={deliveries}
            statusFilters={[DeliveryStatus.IN_TRANSIT]}
            type="driver"
            driver={driver}
          />
          <DeliveryColumn
            title="Completed"
            deliveries={deliveries}
            statusFilters={[DeliveryStatus.DELIVERED]}
            type="driver"
            driver={driver}
          />
        </div>
      </div>
    </div>
  );
}
