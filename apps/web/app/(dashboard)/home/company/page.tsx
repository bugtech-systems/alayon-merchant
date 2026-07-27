import { DeliveryActivityPipeline } from "@/components/pipeline-activity";
import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import {waterDeliveryData} from "@/data/water-delivery-table";
import { WaterDeliveryTable } from "./_components/proposal-sections-table/table";
import { DeliverySectionCards } from "./_components/section-cards";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DeliverySectionCards />
      {/* <ChartAreaInteractive /> */}
      <DeliveryActivityPipeline/>
      <WaterDeliveryTable data={waterDeliveryData} />
    </div>
  );
}
