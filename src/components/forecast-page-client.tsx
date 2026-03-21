"use client";

import { useMemo, useState } from "react";
import type { DashboardPayload, DailySimulationSnapshot } from "@/src/lib/openapi-contract";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
}

export function ForecastPageClient({ initialData }: { initialData: DashboardPayload }) {
  const [selectedDate, setSelectedDate] = useState(
    initialData.simulation.snapshots.find((snapshot) => snapshot.short)?.date ??
      initialData.simulation.snapshots[0]?.date ??
      ""
  );

  const rows = initialData.simulation.snapshots;
  const selected = useMemo(
    () => rows.find((snapshot) => snapshot.date === selectedDate) ?? rows[0] ?? null,
    [rows, selectedDate]
  );

  return (
    <section className="wire-panel wire-section">
      <div className="wire-section-head">
        <div>
          <h2 className="wire-section-title">日次テーブル</h2>
          <p className="wire-section-meta">
            データ量が多い前提なので、時系列はカードではなく表中心。選択行の詳細だけ右で掘る。
          </p>
        </div>
        <div className="wire-actions">
          <div className="wire-pill">表示: 日次</div>
          <div className="wire-pill">種別: ALL</div>
          <div className="wire-pill">危険日ハイライト</div>
        </div>
      </div>

      <div className="wire-forecast-layout">
        <div>
          <div className="wire-table-header wire-table-header-forecast">
            <div>日付</div>
            <div>理論残高</div>
            <div>現実残高</div>
            <div>event</div>
            <div>forecast</div>
            <div>actual</div>
            <div>status</div>
          </div>
          <div className="wire-table">
            {rows.map((row) => (
              <button
                key={row.date}
                type="button"
                onClick={() => setSelectedDate(row.date)}
                className={`wire-table-row wire-table-row-forecast ${
                  selectedDate === row.date ? "active" : ""
                }`}
              >
                <div>{formatDate(row.date)}</div>
                <div>{formatCurrency(row.theoreticalBalance)}</div>
                <div>{formatCurrency(row.actualBalance)}</div>
                <div>{row.eventSummary.totalCount}件</div>
                <div>{row.eventSummary.forecastCount}件</div>
                <div>{row.eventSummary.actualCount}件</div>
                <div>{row.short ? "short" : "safe"}</div>
              </button>
            ))}
          </div>
        </div>

        <aside className="wire-right-sticky">
          <SelectedDayPanel snapshot={selected} />
          <div className="wire-box wire-summary-panel">
            <div className="wire-box-head">
              <span className="wire-label">Forecast Summary</span>
            </div>
            <div className="wire-stack">
              <div className="wire-summary-row">
                <b>予測開始日</b>
                <div className="wire-row-note">
                  {initialData.simulation.forecastSummary.firstForecastDate ?? "-"}
                </div>
              </div>
              <div className="wire-summary-row">
                <b>日常支出 forecast</b>
                <div className="wire-row-note">
                  {initialData.simulation.forecastSummary.dailySpendForecastCount}件 / 平均{" "}
                  {formatCurrency(initialData.simulation.forecastSummary.dailySpendForecastAverageAmount)}
                </div>
              </div>
              <div className="wire-summary-row">
                <b>カード引落 forecast</b>
                <div className="wire-row-note">
                  {initialData.simulation.forecastSummary.cardPaymentForecastCount}件 / 合計{" "}
                  {formatCurrency(initialData.simulation.forecastSummary.cardPaymentForecastTotalAmount)}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SelectedDayPanel({ snapshot }: { snapshot: DailySimulationSnapshot | null }) {
  return (
    <div className="wire-box wire-summary-panel">
      <div className="wire-box-head">
        <span className="wire-label">Selected Day</span>
      </div>
      {!snapshot ? (
        <div className="wire-row-note">対象日がありません</div>
      ) : (
        <div className="wire-stack">
          <div className="wire-summary-row">
            <b>{snapshot.date}</b>
            <div className="wire-row-note">
              理論 {formatCurrency(snapshot.theoreticalBalance)} / 現実{" "}
              {formatCurrency(snapshot.actualBalance)}
            </div>
          </div>
          <div className="wire-summary-row">
            <b>イベント一覧</b>
            <div className="wire-list">
              {snapshot.events.length === 0 ? (
                <div className="wire-row-note">イベントなし</div>
              ) : (
                snapshot.events.map((event) => (
                  <div key={event.id} className="wire-mini-event">
                    <strong>{event.label}</strong>
                    <div className="wire-row-note">
                      {event.source} / {event.detail || event.kind} / {formatCurrency(event.amount)}
                    </div>
                    {event.basis ? (
                      <div className="wire-row-note">
                        根拠: {event.basis.summary} / source {event.basis.sourceEventIds.length}件
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
