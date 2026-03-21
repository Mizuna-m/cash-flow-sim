"use client";

import type { DashboardPayload } from "@/src/lib/openapi-contract";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatDate(value: string) {
  return value;
}

type LiquidAccountColumn = DashboardPayload["simulation"]["snapshots"][number]["liquidAccountBalances"][number];

export function ForecastPageClient({ initialData }: { initialData: DashboardPayload }) {
  const rows = initialData.simulation.snapshots;
  const accountColumns = rows.reduce<LiquidAccountColumn[]>((columns, row) => {
    row.liquidAccountBalances.forEach((account) => {
      if (!columns.some((column) => column.accountId === account.accountId)) {
        columns.push(account);
      }
    });

    return columns;
  }, []);
  const forecastTableColumns = [
    "106px",
    "128px",
    "128px",
    ...accountColumns.map(() => "150px"),
    "minmax(360px, 1.5fr)",
    "92px"
  ].join(" ");
  const forecastTableMinWidth = 800 + accountColumns.length * 150;

  return (
    <section className="wire-panel wire-section">
      <div className="wire-section-head">
        <div>
          <h2 className="wire-section-title">日次一覧テーブル</h2>
          <p className="wire-section-meta">
            選択して右で掘る形はやめて、日次の残高、forecast、口座別残高、イベント根拠を全部表で流し見できる構成にする。
          </p>
        </div>
        <div className="wire-actions">
          <div className="wire-pill">
            予測開始 {initialData.simulation.forecastSummary.firstForecastDate ?? "-"}
          </div>
          <div className="wire-pill">
            日常支出 {initialData.simulation.forecastSummary.dailySpendForecastCount}件
          </div>
          <div className="wire-pill">
            カード引落 {initialData.simulation.forecastSummary.cardPaymentForecastCount}件
          </div>
        </div>
      </div>

      <div className="wire-box wire-form-panel">
        <div className="wire-box-head">
          <span className="wire-label">Forecast Table</span>
          <span className="wire-inline-chip">
            average {formatCurrency(initialData.simulation.forecastSummary.dailySpendForecastAverageAmount)}
          </span>
        </div>
        <div className="wire-table-scroll">
          <div
            className="wire-table-header wire-table-header-forecast-full wire-table-header-forecast-dense"
            style={{ gridTemplateColumns: forecastTableColumns }}
          >
            <div>日付</div>
            <div>理論</div>
            <div>現実</div>
            {accountColumns.map((account) => (
              <div key={account.accountId}>
                {account.name}
                <div className="wire-row-sub">{account.type === "bank" ? "銀行" : "現金"}</div>
              </div>
            ))}
            <div>イベント / 根拠</div>
            <div>状態</div>
          </div>
          <div className="wire-table wire-table-spacious wire-table-forecast-dense" style={{ minWidth: `${forecastTableMinWidth}px` }}>
            {rows.map((row) => {
              const accountBalanceMap = new Map(
                row.liquidAccountBalances.map((account) => [account.accountId, account])
              );

              return (
                <div
                  key={row.date}
                  className="wire-table-row wire-table-row-forecast-full wire-table-row-forecast-dense"
                  style={{ gridTemplateColumns: forecastTableColumns }}
                >
                  <div>
                    <span className="wire-table-emphasis">{formatDate(row.date)}</span>
                  </div>
                  <div className="wire-table-cell-balance">
                    <span className="wire-table-emphasis">{formatCurrency(row.theoreticalBalance)}</span>
                  </div>
                  <div className="wire-table-cell-balance">
                    <span className="wire-table-emphasis">{formatCurrency(row.actualBalance)}</span>
                  </div>
                  {accountColumns.map((accountColumn) => {
                    const account = accountBalanceMap.get(accountColumn.accountId);

                    return (
                      <div key={accountColumn.accountId} className="wire-table-cell-balance">
                        {account ? (
                          <span
                            className={`wire-table-emphasis ${Number(account.balance) < 0 ? "danger" : ""}`.trim()}
                          >
                            {formatCurrency(account.balance)}
                          </span>
                        ) : (
                          <span className="wire-row-note">-</span>
                        )}
                      </div>
                    );
                  })}
                  <div className="wire-stack wire-stack-compact">
                    {row.events.length === 0 ? (
                      <div className="wire-row-note">イベントなし</div>
                    ) : (
                      row.events.map((event) => (
                        <div key={event.id} className="wire-row-note wire-event-note">
                          <div>
                            <span className="wire-table-emphasis">{event.label}</span> {formatCurrency(event.amount)}
                          </div>
                          <div>{event.source} / {event.detail || event.kind}</div>
                          {event.basis ? (
                            <div>根拠: {event.basis.summary} / source {event.basis.sourceEventIds.length}件</div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    {row.negativeLiquidAccountIds.length > 0 ? (
                      <div className="danger">口座不足 {row.negativeLiquidAccountIds.length}件</div>
                    ) : row.short ? (
                      <div className="danger">short</div>
                    ) : row.eventSummary.forecastCount > 0 ? (
                      <div className="wire-row-note">forecast mixed</div>
                    ) : (
                      <div className="ok">safe</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
