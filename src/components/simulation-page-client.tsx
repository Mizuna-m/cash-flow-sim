"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  CardPayment,
  DashboardPayload,
  ScheduledEvent,
  SimulationComparisonResponse,
  SimulationComparisonScenarioRequest,
  SimulationResponse
} from "@/src/lib/openapi-contract";

type SimulationState = DashboardPayload & {
  range: {
    startDate: string;
    endDate: string;
  };
};

type SimulationChartRow = {
  label: string;
  date: string;
  theoretical: number;
  actual: number;
  comparisonTheoretical: number | null;
};

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

function getLowestSnapshot(simulation: SimulationResponse) {
  return simulation.snapshots.reduce<typeof simulation.snapshots[number] | null>((lowest, snapshot) => {
    if (!lowest) {
      return snapshot;
    }

    return Number(snapshot.actualBalance) < Number(lowest.actualBalance) ? snapshot : lowest;
  }, null);
}

function getChartData(simulation: SimulationResponse) {
  return simulation.snapshots.map((snapshot) => ({
    label: formatDate(snapshot.date),
    date: snapshot.date,
    theoretical: Number(snapshot.theoreticalBalance),
    actual: Number(snapshot.actualBalance),
    comparisonTheoretical: null as number | null
  }));
}

function getComparisonChartData(
  baseSimulation: SimulationResponse,
  scenarioSimulation: SimulationResponse
) {
  const scenarioByDate = new Map(
    scenarioSimulation.snapshots.map((snapshot) => [snapshot.date, snapshot])
  );

  return baseSimulation.snapshots.map((baseSnapshot) => {
    const scenarioSnapshot = scenarioByDate.get(baseSnapshot.date);

    return {
      label: formatDate(baseSnapshot.date),
      date: baseSnapshot.date,
      theoretical: Number(baseSnapshot.theoreticalBalance),
      actual: Number(baseSnapshot.actualBalance),
      comparisonTheoretical: Number(
        scenarioSnapshot?.theoreticalBalance ?? baseSnapshot.theoreticalBalance
      )
    };
  });
}

function getYAxisDomain(data: SimulationChartRow[]) {
  if (data.length === 0) {
    return [0, 100000];
  }

  const values = data.flatMap((item) => [item.theoretical, item.actual]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.14, 20000);
  const lower = Math.floor((min - padding) / 10000) * 10000;
  const upper = Math.ceil((max + padding) / 10000) * 10000;

  return [lower, upper];
}

function getNumericYAxisDomain(values: number[]) {
  if (values.length === 0) {
    return [0, 100000];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.14, 20000);
  const lower = Math.floor((min - padding) / 10000) * 10000;
  const upper = Math.ceil((max + padding) / 10000) * 10000;

  return [lower, upper];
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload;
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload;
}

async function refreshSimulation(range: { startDate: string; endDate: string }) {
  const query = new URLSearchParams(range).toString();

  const [simulation, scheduledEvents, cardPayments] = await Promise.all([
    fetchJson<SimulationResponse>(`/api/simulation?${query}`),
    fetchJson<{ scheduledEvents: ScheduledEvent[] }>(`/api/scheduled-events?${query}`),
    fetchJson<{ cardPayments: CardPayment[] }>(`/api/card-payments?${query}`)
  ]);

  return {
    simulation,
    scheduledEvents: scheduledEvents.scheduledEvents,
    cardPayments: cardPayments.cardPayments
  };
}

function buildScenarioCandidates(events: ScheduledEvent[]): SimulationComparisonScenarioRequest[] {
  return events
    .filter((event) => event.isActive && Number(event.amount) < 0)
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      label: `${event.name} を外した場合`,
      detail: "この予定を無効化",
      excludedEventIds: [event.id]
    }));
}

export function SimulationPageClient({ initialData }: { initialData: DashboardPayload }) {
  const [state, setState] = useState<SimulationState>({
    ...initialData,
    range: {
      startDate: initialData.simulation.startDate,
      endDate: initialData.simulation.endDate
    }
  });
  const [comparison, setComparison] = useState<SimulationComparisonResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const baseChartData = useMemo(() => getChartData(state.simulation), [state.simulation]);
  const lowest = useMemo(() => getLowestSnapshot(state.simulation), [state.simulation]);
  const shortCount = state.simulation.snapshots.filter((snapshot) => snapshot.short).length;
  const nextCardPayment = [...state.cardPayments].sort((a, b) => a.date.localeCompare(b.date))[0];
  const scenarioCandidates = useMemo(
    () => buildScenarioCandidates(state.scheduledEvents),
    [state.scheduledEvents]
  );
  const selectableScheduledEvents = useMemo(
    () =>
      state.scheduledEvents
        .filter((event) => event.isActive && Number(event.amount) < 0)
        .sort((left, right) => left.startDate.localeCompare(right.startDate)),
    [state.scheduledEvents]
  );
  const selectedScenarioEvents = useMemo(
    () => selectableScheduledEvents.filter((event) => selectedScenarioIds.includes(event.id)),
    [selectableScheduledEvents, selectedScenarioIds]
  );
  const firstComparisonScenario = comparison?.scenarios[0] ?? null;
  const chartData = useMemo(
    () =>
      firstComparisonScenario
        ? getComparisonChartData(state.simulation, firstComparisonScenario.simulation)
        : baseChartData,
    [baseChartData, firstComparisonScenario, state.simulation]
  );
  const yDomain = useMemo(
    () =>
      chartData.some((item) => item.comparisonTheoretical !== null)
        ? getNumericYAxisDomain(
            chartData.flatMap((item) => [
              item.theoretical,
              item.actual,
              item.comparisonTheoretical ?? item.theoretical
            ])
          )
        : getYAxisDomain(chartData),
    [chartData]
  );

  const kpis = [
    { label: "最低残高", value: lowest ? formatCurrency(lowest.actualBalance) : "-", meta: lowest ? lowest.date : "-" },
    { label: "ショート", value: `${shortCount}日`, meta: "現状判定" },
    {
      label: "次の引落",
      value: nextCardPayment ? formatCurrency(nextCardPayment.amount) : "-",
      meta: nextCardPayment ? nextCardPayment.date : "-"
    },
    {
      label: "予測開始",
      value: state.simulation.forecastSummary.firstForecastDate ?? "-",
      meta: "actual以降"
    },
    {
      label: "予測日数",
      value: `${state.simulation.forecastSummary.forecastDays}日`,
      meta: `${state.simulation.forecastSummary.dailySpendForecastCount}件`
    },
    {
      label: "日常支出予測",
      value: formatCurrency(state.simulation.forecastSummary.dailySpendForecastAverageAmount),
      meta: "平均/日"
    }
  ];

  async function handleRangeSubmit(formData: FormData) {
    const range = {
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? "")
    };

    setLoading(true);
    setMessage("");

    try {
      const refreshed = await refreshSimulation(range);
      setState((current) => ({
        ...current,
        simulation: refreshed.simulation,
        scheduledEvents: refreshed.scheduledEvents,
        cardPayments: refreshed.cardPayments,
        range
      }));
      setComparison(null);
      setSelectedScenarioIds([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "再計算に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare(scenario: SimulationComparisonScenarioRequest) {
    setLoading(true);
    setMessage("");

    try {
      const payload = await postJson<SimulationComparisonResponse>("/api/simulation/compare", {
        startDate: state.range.startDate,
        endDate: state.range.endDate,
        scenarios: [scenario]
      });
      setComparison(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "比較に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectedCompare() {
    if (selectedScenarioEvents.length === 0) {
      setMessage("比較する予定イベントを1件以上選んでください");
      return;
    }

    await handleCompare({
      id: `manual-${selectedScenarioEvents.map((event) => event.id).join("-")}`,
      label:
        selectedScenarioEvents.length === 1
          ? `${selectedScenarioEvents[0]?.name ?? "予定"} を外した場合`
          : `${selectedScenarioEvents.length}件の予定を外した場合`,
      detail: selectedScenarioEvents.map((event) => event.name).join(" / "),
      excludedEventIds: selectedScenarioEvents.map((event) => event.id)
    });
  }

  function toggleScenarioSelection(eventId: string) {
    setSelectedScenarioIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId]
    );
  }

  return (
    <section className="wire-panel wire-section">
      <div className="wire-section-head">
        <div>
          <h2 className="wire-section-title">判断ビュー</h2>
          <p className="wire-section-meta">
            グラフは大きめ。KPI は判断に使う数だけ残し、比較シナリオ API があるところは実データで返す。
          </p>
        </div>
        <form action={handleRangeSubmit} className="wire-actions">
          <input name="startDate" type="date" defaultValue={state.range.startDate} className="wire-pill-field" />
          <input name="endDate" type="date" defaultValue={state.range.endDate} className="wire-pill-field" />
          <button className="wire-button" type="submit">{loading ? "更新中..." : "再計算"}</button>
        </form>
      </div>

      <div className="wire-kpi-grid wire-kpi-grid-six">
        {kpis.map((item) => (
          <div key={item.label} className="wire-stat">
            <div className="wire-stat-k">{item.label}</div>
            <div className="wire-stat-v">{item.value}</div>
            <div className="wire-stat-m">{item.meta}</div>
          </div>
        ))}
      </div>

      <div className="wire-sim-layout-large">
        <div className="wire-box wire-chart-box">
          <div className="wire-box-head">
            <span className="wire-label">Balance Chart</span>
            {lowest ? <span className="wire-inline-chip">最低残高 {formatDate(lowest.date)}</span> : null}
            {firstComparisonScenario ? (
              <span className="wire-inline-chip">{firstComparisonScenario.label}</span>
            ) : null}
          </div>
          <div className="wire-chart-area-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgba(23,33,43,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6d7780", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={20}
                />
                <YAxis
                  domain={yDomain as [number, number]}
                  tick={{ fill: "#6d7780", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={86}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #d7d0c4",
                    background: "rgba(255,253,249,0.98)"
                  }}
                />
                {lowest ? (
                  <ReferenceLine
                    x={formatDate(lowest.date)}
                    stroke="#c65b4d"
                    strokeDasharray="7 7"
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="theoretical"
                  name="base theoretical"
                  stroke={firstComparisonScenario ? "#8a99ab" : "#376ed4"}
                  strokeWidth={firstComparisonScenario ? 2 : 3}
                  dot={false}
                />
                {firstComparisonScenario ? (
                  <Line
                    type="monotone"
                    dataKey="comparisonTheoretical"
                    name="scenario theoretical"
                    stroke="#c65b4d"
                    strokeWidth={3}
                    dot={false}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="actual"
                  stroke="#4f7d60"
                  strokeWidth={3}
                  strokeDasharray={firstComparisonScenario ? "6 6" : undefined}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="wire-box wire-summary-panel">
          <div className="wire-box-head">
            <span className="wire-label">Summary</span>
          </div>
          <div className="wire-stack">
            <div className="wire-summary-row">
              <b>actuals 反映最終日</b>
              <div className="wire-row-note">
                {state.simulation.forecastSummary.actualsThroughDate ?? "-"}
              </div>
            </div>
            <div className="wire-summary-row">
              <b>カード引落予測</b>
              <div className="wire-row-note">
                {state.simulation.forecastSummary.cardPaymentForecastCount}件 /{" "}
                {formatCurrency(state.simulation.forecastSummary.cardPaymentForecastTotalAmount)}
              </div>
            </div>
            <div className="wire-summary-row">
              <b>比較API</b>
              <div className="wire-row-note">
                {comparison ? "比較結果あり" : "候補を選ぶと差分を返す"}
              </div>
            </div>
          </div>
        </div>

        <div className="wire-box wire-risk-panel">
          <div className="wire-box-head">
            <span className="wire-label">Risk / Compare</span>
          </div>
          <div className="wire-list">
            {scenarioCandidates.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => void handleCompare(scenario)}
                className="wire-list-item wire-list-item-button"
              >
                <div className="wire-list-top">
                  <div className="wire-row-title">{scenario.label}</div>
                  <div className="wire-row-action">比較</div>
                </div>
                <div className="wire-row-sub">{scenario.detail}</div>
              </button>
            ))}
            <div className="wire-list-item">
              <div className="wire-list-top">
                <div className="wire-row-title">手動シナリオ選択</div>
                <div className="wire-row-action">{selectedScenarioIds.length}件選択中</div>
              </div>
              <div className="wire-select-list">
                {selectableScheduledEvents.length === 0 ? (
                  <div className="wire-row-sub">比較対象になる予定イベントがありません</div>
                ) : (
                  selectableScheduledEvents.map((event) => (
                    <label key={event.id} className="wire-select-item">
                      <input
                        type="checkbox"
                        checked={selectedScenarioIds.includes(event.id)}
                        onChange={() => toggleScenarioSelection(event.id)}
                      />
                      <span>
                        <strong>{event.name}</strong>
                        <span className="wire-row-sub">
                          {event.startDate} / {formatCurrency(event.amount)}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="wire-inline-actions">
                <button
                  type="button"
                  className="wire-small-button"
                  onClick={() => void handleSelectedCompare()}
                  disabled={selectedScenarioIds.length === 0 || loading}
                >
                  選択中の予定で比較
                </button>
                <button
                  type="button"
                  className="wire-small-button wire-small-button-ghost"
                  onClick={() => setSelectedScenarioIds([])}
                  disabled={selectedScenarioIds.length === 0 || loading}
                >
                  選択解除
                </button>
              </div>
            </div>
            {comparison ? (
              comparison.scenarios.map((scenario) => (
                <div key={scenario.id} className="wire-list-item">
                  <div className="wire-list-top">
                    <div className="wire-row-title">{scenario.label}</div>
                    <div
                      className={
                        Number(scenario.diff.lowestTheoreticalBalanceDelta) >= 0 ? "ok" : "danger"
                      }
                    >
                      {formatCurrency(scenario.diff.lowestTheoreticalBalanceDelta)}
                    </div>
                  </div>
                  <div className="wire-row-sub">
                    projected short {scenario.diff.projectedShortCountDelta >= 0 ? "+" : ""}
                    {scenario.diff.projectedShortCountDelta} / ending{" "}
                    {formatCurrency(scenario.diff.endingTheoreticalBalanceDelta)}
                  </div>
                  <div className="wire-row-sub">
                    actual short {scenario.diff.shortCountDelta >= 0 ? "+" : ""}
                    {scenario.diff.shortCountDelta} / actual ending{" "}
                    {formatCurrency(scenario.diff.endingActualBalanceDelta)}
                  </div>
                </div>
              ))
            ) : (
              <div className="wire-list-item">
                <div className="wire-list-top">
                  <div className="wire-row-title">追加で欲しい UI</div>
                  <div className="wire-badge-mock">Mock</div>
                </div>
                <div className="wire-row-sub">
                  複数比較の保存、比較履歴、ベース切替は API 未整備のため後続
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {message ? <div className="wire-flash">{message}</div> : null}
    </section>
  );
}
