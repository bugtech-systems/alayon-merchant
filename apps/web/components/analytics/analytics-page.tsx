import { ActionsManagerQueue } from "./analytics-actions-manager-queue";
import { ActionsRiskLedger } from "./analytics-actions-risk-ledger";
import { DriversCoverageTriage } from "./analytics-drivers-coverage-triage";
import { DriversForecastTarget } from "./analytics-drivers-forecast-target";
import { AnalyticsOverview } from "./analytics-overview";
import { CashFlowOverview } from "./cash-flow-overview";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <AnalyticsOverview />

                <CashFlowOverview />

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <DriversForecastTarget />
          <DriversCoverageTriage />
        </div>
        <ActionsManagerQueue />
      </div>

      <ActionsRiskLedger />
    </div>
  );
}
