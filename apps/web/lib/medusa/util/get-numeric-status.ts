import { DeliveryStatus } from "@/lib/types";

export const getNumericStatus = (status: DeliveryStatus) => {
  switch (status) {
    case DeliveryStatus.PENDING:
      return 0;
    case DeliveryStatus.COMPANY_ACCEPTED:
      return 1;
    case DeliveryStatus.PICKUP_CLAIMED:
      return 2;
    case DeliveryStatus.COMPANY_PREPARING:
      return 3;
    case DeliveryStatus.READY_FOR_PICKUP:
      return 4;
    case DeliveryStatus.IN_TRANSIT:
      return 5;
    case DeliveryStatus.DELIVERED:
      return 6;
    default:
      return 0;
  }
};
