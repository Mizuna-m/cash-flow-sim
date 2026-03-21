import { CashflowShell } from "@/src/components/cashflow-shell";
import { SettingsPageClient } from "@/src/components/settings-page-client";
import { getDefaultRange, loadDashboardPayload } from "@/src/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { startDate, endDate } = getDefaultRange();
  const data = await loadDashboardPayload(startDate, endDate);

  return (
    <CashflowShell
      currentPath="/settings"
      title="Settings"
      subtitle="口座、カード、初期条件などのマスタ管理。口座追加はここに寄せる"
    >
      <SettingsPageClient initialData={data} />
    </CashflowShell>
  );
}
