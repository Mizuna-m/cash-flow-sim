import { CashflowShell } from "@/src/components/cashflow-shell";
import { ForecastPageClient } from "@/src/components/forecast-page-client";
import { getDefaultRange, loadDashboardPayload } from "@/src/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const { startDate, endDate } = getDefaultRange();
  const data = await loadDashboardPayload(startDate, endDate);

  return (
    <CashflowShell
      currentPath="/forecast"
      title="Forecast Table"
      subtitle="日次の時系列を表形式で読み、forecast と actual の内訳を追うページ"
    >
      <ForecastPageClient initialData={data} />
    </CashflowShell>
  );
}
