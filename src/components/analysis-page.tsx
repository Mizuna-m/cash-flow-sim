import type { AnalysisSummary, AnalysisRow } from "@/src/application/services/build-analysis-summary";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatSignedCurrency(value: string) {
  const amount = Number(value);
  return `${amount > 0 ? "+" : ""}${formatCurrency(amount)}`;
}

function SummaryTable({
  label,
  rows,
  months
}: {
  label: string;
  rows: AnalysisRow[];
  months: string[];
}) {
  return (
    <section className="wire-box wire-analysis-box">
      <div className="wire-box-head">
        <span className="wire-label">{label}</span>
        <span className="wire-inline-chip">{rows.length} rows</span>
      </div>
      <div className="wire-table-scroll-shell has-right-fade">
        <div className="wire-table-scroll">
          <table className="wire-forecast-table wire-analysis-table">
            <thead>
              <tr>
                <th>name</th>
                <th>income</th>
                <th>expense</th>
                <th>net</th>
                <th>count</th>
                {months.map((month) => (
                  <th key={month}>{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <span className="wire-table-emphasis">{row.label}</span>
                  </td>
                  <td className="wire-table-cell-balance">{formatCurrency(row.income)}</td>
                  <td className="wire-table-cell-balance">{formatCurrency(row.expense)}</td>
                  <td className="wire-table-cell-balance">
                    <span className={Number(row.net) < 0 ? "danger" : ""}>{formatSignedCurrency(row.net)}</span>
                  </td>
                  <td className="wire-table-cell-balance">{row.count}</td>
                  {row.monthly.map((month) => (
                    <td key={month.month} className="wire-table-cell-balance">
                      <span className={Number(month.net) < 0 ? "danger" : ""}>
                        {formatSignedCurrency(month.net)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function AnalysisPage({ summary }: { summary: AnalysisSummary }) {
  return (
    <section className="wire-section wire-analysis-page">
      <div className="wire-kpi-grid wire-analysis-kpis">
        <article className="wire-stat">
          <div className="wire-stat-k">income</div>
          <div className="wire-stat-v">{formatCurrency(summary.totals.income)}</div>
          <div className="wire-stat-m">
            {summary.startDate} - {summary.endDate}
          </div>
        </article>
        <article className="wire-stat">
          <div className="wire-stat-k">expense</div>
          <div className="wire-stat-v">{formatCurrency(summary.totals.expense)}</div>
          <div className="wire-stat-m">{summary.totals.count}件</div>
        </article>
        <article className="wire-stat">
          <div className="wire-stat-k">net</div>
          <div className="wire-stat-v">{formatSignedCurrency(summary.totals.net)}</div>
          <div className="wire-stat-m">{summary.months.join(" / ")}</div>
        </article>
      </div>

      <div className="wire-analysis-layout">
        <SummaryTable label="Project" rows={summary.projects} months={summary.months} />
        <SummaryTable label="Category" rows={summary.categories} months={summary.months} />
        <SummaryTable label="Group" rows={summary.groups} months={summary.months} />
      </div>
    </section>
  );
}
