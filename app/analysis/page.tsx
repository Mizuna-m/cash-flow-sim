import { buildAnalysisSummary } from "@/src/application/services/build-analysis-summary";
import { AnalysisPage } from "@/src/components/analysis-page";
import { CashflowShell } from "@/src/components/cashflow-shell";
import { getDefaultRange } from "@/src/lib/dashboard-data";
import { listTransactions } from "@/src/infrastructure/repositories/transaction-repository";

export const dynamic = "force-dynamic";

export default async function AnalysisRoutePage() {
  const { startDate, endDate } = getDefaultRange();
  const transactions = await listTransactions({ startDate, endDate }).catch(() => []);
  const summary = buildAnalysisSummary({ startDate, endDate, transactions });

  return (
    <CashflowShell
      currentPath="/analysis"
      title="Analysis"
      subtitle="project / category / group ごとの収支を同じ期間で読むページ"
    >
      <AnalysisPage summary={summary} />
    </CashflowShell>
  );
}
