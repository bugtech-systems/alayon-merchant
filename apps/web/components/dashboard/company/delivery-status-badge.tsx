import { DeliveryDTO, DeliveryStatus } from "@/lib/types";
import { CircleQuarterSolid } from "@medusajs/icons";
import { Badge } from "@medusajs/ui";

export async function CompanyDeliveryBadgeStatus({
  delivery,
}: {
  delivery: DeliveryDTO;
}) {
  switch (delivery.delivery_status) {
    case DeliveryStatus.PENDING:
      return <Badge color="green">New order</Badge>;
    case DeliveryStatus.COMPANY_ACCEPTED:
      return (
        <Badge color="purple" className="flex gap-1">
          <CircleQuarterSolid className="animate-spin" />
          Looking for driver
        </Badge>
      );
    case DeliveryStatus.PICKUP_CLAIMED:
      return (
        <Badge size="small" color="blue">
          Driver found
        </Badge>
      );
    case DeliveryStatus.COMPANY_PREPARING:
      return (
        <Badge color="purple" className="flex gap-1">
          <CircleQuarterSolid className="animate-spin" />
          Preparing
        </Badge>
      );
    case DeliveryStatus.READY_FOR_PICKUP:
      return (
        <Badge color="purple" className="flex gap-1">
          <CircleQuarterSolid className="animate-spin" />
          Waiting for pickup
        </Badge>
      );
    case DeliveryStatus.IN_TRANSIT:
      return (
        <Badge color="purple" className="flex gap-1">
          <CircleQuarterSolid className="animate-spin" />
          Out for delivery
        </Badge>
      );
    case DeliveryStatus.DELIVERED:
      return <Badge color="green">Delivered</Badge>;
    case DeliveryStatus.COMPANY_DECLINED:
      return <Badge color="red">Declined by company</Badge>;
    default:
      return <Badge>{delivery.delivery_status}</Badge>;
  }
}
