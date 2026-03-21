import { CashflowShell } from "@/src/components/cashflow-shell";
import { SimulationPageClient } from "@/src/components/simulation-page-client";
import { getDefaultRange, loadDashboardPayload } from "@/src/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function SimulationPage() {
  const { startDate, endDate } = getDefaultRange();
  const data = await loadDashboardPayload(startDate, endDate);

  return (
    <CashflowShell
      currentPath="/simulation"
      title="Simulation"
      subtitle="危険日、最低残高、イベント影響、カード引落を最初に判断するページ"
    >
      <SimulationPageClient initialData={data} />
    </CashflowShell>
  );
}
