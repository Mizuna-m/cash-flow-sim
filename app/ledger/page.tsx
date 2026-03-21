import { CashflowShell } from "@/src/components/cashflow-shell";
import { LedgerPageClient } from "@/src/components/ledger-page-client";
import { getDefaultRange, loadDashboardPayload } from "@/src/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const { startDate, endDate } = getDefaultRange();
  const data = await loadDashboardPayload(startDate, endDate);

  return (
    <CashflowShell
      currentPath="/ledger"
      title="Ledger & Entry"
      subtitle="左に台帳、右に入力。大量データを表で追いながらキーボード中心で登録するページ"
    >
      <LedgerPageClient initialData={data} />
    </CashflowShell>
  );
}
