"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardPayload } from "@/src/lib/openapi-contract";

type Snapshot = DashboardPayload["simulation"]["snapshots"][number];
type SnapshotEvent = Snapshot["events"][number];
type SnapshotLifecycle = SnapshotEvent["lifecycle"];

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

function getCardDebtTotal(snapshot: Snapshot) {
  return Object.values(snapshot.cardDebt).reduce((sum, amount) => sum + Number(amount), 0);
}

function formatLifecycle(value: SnapshotLifecycle) {
  switch (value) {
    case "planned":
      return "予定";
    case "confirmed":
      return "確定";
    case "settled":
    default:
      return "済";
  }
}

function getLifecycleSummaryRows(summary: Snapshot["eventSummary"]) {
  return [
    {
      key: "planned",
      label: "予定",
      count: summary.plannedCount,
      amount: summary.plannedAmount
    },
    {
      key: "confirmed",
      label: "確定",
      count: summary.confirmedCount,
      amount: summary.confirmedAmount
    },
    {
      key: "settled",
      label: "済",
      count: summary.settledCount,
      amount: summary.settledAmount
    }
  ] as const;
}

function groupEventsByLifecycle(events: Snapshot["events"]) {
  const order: SnapshotLifecycle[] = ["planned", "confirmed", "settled"];
  const groups = new Map<SnapshotLifecycle, SnapshotEvent[]>();

  for (const lifecycle of order) {
    groups.set(lifecycle, []);
  }

  for (const event of events) {
    groups.get(event.lifecycle)?.push(event);
  }

  return order
    .map((lifecycle) => ({
      lifecycle,
      label: formatLifecycle(lifecycle),
      events: groups.get(lifecycle) ?? []
    }))
    .filter((group) => group.events.length > 0);
}

type CashAccountColumn = DashboardPayload["simulation"]["snapshots"][number]["cashByAccount"][number];

export function ForecastPageClient({ initialData }: { initialData: DashboardPayload }) {
  const rows = initialData.simulation.snapshots;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const allAccountColumns = useMemo(
    () =>
      rows.reduce<CashAccountColumn[]>((columns, row) => {
        row.cashByAccount.forEach((account) => {
          if (!columns.some((column) => column.accountId === account.accountId)) {
            columns.push(account);
          }
        });

        return columns;
      }, []),
    [rows]
  );
  const [visibleAccountIds, setVisibleAccountIds] = useState<string[]>([]);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const accountColumns = useMemo(() => {
    return allAccountColumns.filter((account) => visibleAccountIds.includes(account.accountId));
  }, [allAccountColumns, visibleAccountIds]);

  function toggleAccountColumn(accountId: string) {
    setVisibleAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  }

  const forecastTableMinWidth = 1252 + accountColumns.length * 150;

  useEffect(() => {
    function updateScrollHints() {
      const node = scrollRef.current;

      if (!node) {
        setShowLeftFade(false);
        setShowRightFade(false);
        return;
      }

      const maxScrollLeft = node.scrollWidth - node.clientWidth;
      setShowLeftFade(node.scrollLeft > 2);
      setShowRightFade(maxScrollLeft > 2 && node.scrollLeft < maxScrollLeft - 2);
    }

    updateScrollHints();
    window.addEventListener("resize", updateScrollHints);

    return () => {
      window.removeEventListener("resize", updateScrollHints);
    };
  }, [forecastTableMinWidth, rows.length]);

  return (
    <section className="wire-panel wire-section wire-forecast-refined">
      <div className="wire-section-head">
        <div>
          <h2 className="wire-section-title">日次一覧テーブル</h2>
          <p className="wire-section-meta">cash / projected cash / planned outflow / card debt</p>
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

      <div className="wire-inline-actions wire-forecast-account-picker">
        <span className="wire-row-sub">口座列</span>
        {allAccountColumns.map((account) => {
          const active = accountColumns.some((column) => column.accountId === account.accountId);

          return (
            <button
              key={account.accountId}
              type="button"
              className={`wire-small-button ${active ? "" : "wire-small-button-ghost"}`.trim()}
              onClick={() => toggleAccountColumn(account.accountId)}
            >
              {account.name}
            </button>
          );
        })}
        {visibleAccountIds.length > 0 ? (
          <button
            type="button"
            className="wire-small-button wire-small-button-ghost"
            onClick={() => setVisibleAccountIds([])}
          >
            クリア
          </button>
        ) : null}
      </div>

      <div className="wire-box wire-form-panel">
        <div className="wire-box-head">
          <span className="wire-label">Forecast Table</span>
          <span className="wire-inline-chip">
            average {formatCurrency(initialData.simulation.forecastSummary.dailySpendForecastAverageAmount)}
          </span>
        </div>
        <div
          className={[
            "wire-table-scroll-shell",
            showLeftFade ? "has-left-fade" : "",
            showRightFade ? "has-right-fade" : ""
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="wire-table-scroll" ref={scrollRef} onScroll={() => {
            const node = scrollRef.current;

            if (!node) {
              return;
            }

            const maxScrollLeft = node.scrollWidth - node.clientWidth;
            setShowLeftFade(node.scrollLeft > 2);
            setShowRightFade(maxScrollLeft > 2 && node.scrollLeft < maxScrollLeft - 2);
          }}>
            <table className="wire-forecast-table" style={{ minWidth: `${forecastTableMinWidth}px` }}>
            <thead>
              <tr>
                <th>日付</th>
                <th>projected cash</th>
                <th>cash</th>
                <th>planned outflow</th>
                <th>card debt</th>
                {accountColumns.map((account) => (
                  <th key={account.accountId}>
                    <div>{account.name}</div>
                    <div className="wire-row-sub">{account.type === "bank" ? "銀行" : "現金"}</div>
                  </th>
                ))}
                <th className="wire-forecast-summary-col">summary</th>
                <th>events</th>
                <th className="wire-forecast-flags-col">flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const accountBalanceMap = new Map(
                  row.cashByAccount.map((account) => [account.accountId, account])
                );
                const lifecycleSummaryRows = getLifecycleSummaryRows(row.eventSummary);
                const lifecycleGroups = groupEventsByLifecycle(row.events);

                return (
                  <tr key={row.date}>
                    <td>
                      <span className="wire-table-emphasis">{formatDate(row.date)}</span>
                    </td>
                    <td className="wire-table-cell-balance">
                      <span className="wire-table-emphasis">{formatCurrency(row.projectedCash)}</span>
                    </td>
                    <td className="wire-table-cell-balance">
                      <span className="wire-table-emphasis">{formatCurrency(row.cash)}</span>
                    </td>
                    <td className="wire-table-cell-balance">
                      <span className="wire-table-emphasis">{formatCurrency(row.plannedOutflow)}</span>
                    </td>
                    <td className="wire-table-cell-balance">
                      <span className="wire-table-emphasis">{formatCurrency(getCardDebtTotal(row))}</span>
                    </td>
                    {accountColumns.map((accountColumn) => {
                      const account = accountBalanceMap.get(accountColumn.accountId);

                      return (
                        <td key={accountColumn.accountId} className="wire-table-cell-balance">
                          {account ? (
                            <span
                              className={`wire-table-emphasis ${Number(account.balance) < 0 ? "danger" : ""}`.trim()}
                            >
                              {formatCurrency(account.balance)}
                            </span>
                          ) : (
                            <span className="wire-row-note">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="wire-forecast-summary-col">
                      <div className="wire-stack wire-stack-compact wire-lifecycle-summary">
                        {lifecycleSummaryRows.map((item) => (
                          <div key={item.key} className="wire-lifecycle-summary-row">
                            <span className="wire-lifecycle-label">{item.label}</span>
                            <span className="wire-lifecycle-summary-values">
                              <span className="wire-lifecycle-meta">{item.count}</span>
                              <span className="wire-table-cell-balance wire-lifecycle-amount">
                                {formatCurrency(item.amount)}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="wire-forecast-events-col">
                      <div className="wire-stack wire-stack-compact wire-forecast-events-stack">
                        {lifecycleGroups.length === 0 ? (
                          <div className="wire-row-note">イベントなし</div>
                        ) : (
                          lifecycleGroups.map((group) => (
                            <div key={group.lifecycle} className="wire-event-group">
                              <div className="wire-event-group-head">{group.label}</div>
                              <div className="wire-stack wire-stack-compact">
                                {group.events.map((event) => (
                                  <div key={event.id} className="wire-row-note wire-event-note">
                                    <div>
                                      <span className="wire-table-emphasis">{event.label}</span> {formatCurrency(event.amount)}
                                    </div>
                                    <div className="wire-forecast-event-detail">{event.detail || event.kind}</div>
                                    {event.basis ? (
                                      <div className="wire-forecast-event-basis">
                                        根拠: {event.basis.summary} / source {event.basis.sourceEventIds.length}件
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="wire-forecast-flags-col">
                      {row.negativeCashAccountIds.length > 0 ? (
                        <div className="danger">口座不足 {row.negativeCashAccountIds.length}件</div>
                      ) : row.short ? (
                        <div className="danger">short</div>
                      ) : Number(row.plannedOutflow) > 0 ? (
                        <div className="wire-row-note">未決済予定あり</div>
                      ) : (
                        <div className="ok">safe</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </section>
  );
}
