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
  projectedCash: number;
  cash: number;
  comparisonProjectedCash: number | null;
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatSignedCurrency(value: number | string) {
  const numeric = Number(value);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${formatCurrency(numeric)}`;
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

    return Number(snapshot.cash) < Number(lowest.cash) ? snapshot : lowest;
  }, null);
}

function getLowestProjectedSnapshot(simulation: SimulationResponse) {
  return simulation.snapshots.reduce<typeof simulation.snapshots[number] | null>((lowest, snapshot) => {
    if (!lowest) {
      return snapshot;
    }

    return Number(snapshot.projectedCash) < Number(lowest.projectedCash) ? snapshot : lowest;
  }, null);
}

function getCardDebtTotal(snapshot: SimulationResponse["snapshots"][number] | undefined) {
  if (!snapshot) {
    return 0;
  }

  return Object.values(snapshot.cardDebt).reduce((sum, amount) => sum + Number(amount), 0);
}

function getChartData(simulation: SimulationResponse) {
  return simulation.snapshots.map((snapshot) => ({
    label: formatDate(snapshot.date),
    date: snapshot.date,
    projectedCash: Number(snapshot.projectedCash),
    cash: Number(snapshot.cash),
    comparisonProjectedCash: null as number | null
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
      projectedCash: Number(baseSnapshot.projectedCash),
      cash: Number(baseSnapshot.cash),
      comparisonProjectedCash: Number(
        scenarioSnapshot?.projectedCash ?? baseSnapshot.projectedCash
      )
    };
  });
}

function getYAxisDomain(data: SimulationChartRow[]) {
  if (data.length === 0) {
    return [0, 100000];
  }

  const values = data.flatMap((item) => [item.projectedCash, item.cash]);
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
      label: `${event.name} を外す`,
      detail: "この予定を除いた比較",
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
  const [activeComparisonScenarioId, setActiveComparisonScenarioId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const baseChartData = useMemo(() => getChartData(state.simulation), [state.simulation]);
  const lowestCash = useMemo(() => getLowestSnapshot(state.simulation), [state.simulation]);
  const lowestProjected = useMemo(
    () => getLowestProjectedSnapshot(state.simulation),
    [state.simulation]
  );
  const shortCount = state.simulation.snapshots.filter((snapshot) => snapshot.short).length;
  const latestSnapshot = state.simulation.snapshots.at(-1);
  const latestCardDebtTotal = getCardDebtTotal(latestSnapshot);
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
  const firstComparisonScenario =
    comparison?.scenarios.find((scenario) => scenario.id === activeComparisonScenarioId) ??
    comparison?.scenarios[0] ??
    null;
  const chartData = useMemo(
    () =>
      firstComparisonScenario
        ? getComparisonChartData(state.simulation, firstComparisonScenario.simulation)
        : baseChartData,
    [baseChartData, firstComparisonScenario, state.simulation]
  );
  const yDomain = useMemo(
    () =>
      chartData.some((item) => item.comparisonProjectedCash !== null)
        ? getNumericYAxisDomain(
            chartData.flatMap((item) => [
              item.projectedCash,
              item.cash,
              item.comparisonProjectedCash ?? item.projectedCash
            ])
          )
        : getYAxisDomain(chartData),
    [chartData]
  );

  const kpis = [
    {
      label: "latest projected cash",
      value: latestSnapshot ? formatCurrency(latestSnapshot.projectedCash) : "-",
      meta: latestSnapshot?.date ?? "-"
    },
    {
      label: "latest cash",
      value: latestSnapshot ? formatCurrency(latestSnapshot.cash) : "-",
      meta: latestSnapshot?.date ?? "-"
    },
    {
      label: "latest planned outflow",
      value: formatCurrency(latestSnapshot?.plannedOutflow ?? "0"),
      meta: "未決済ぶん"
    },
    {
      label: "latest card debt",
      value: formatCurrency(latestCardDebtTotal),
      meta: `${Object.keys(latestSnapshot?.cardDebt ?? {}).length}枚`
    },
    {
      label: "lowest projected cash",
      value: lowestProjected ? formatCurrency(lowestProjected.projectedCash) : "-",
      meta: lowestProjected?.date ?? "-"
    },
    {
      label: "lowest cash",
      value: lowestCash ? formatCurrency(lowestCash.cash) : "-",
      meta: lowestCash?.date ?? "-"
    },
    {
      label: "next card payment",
      value: nextCardPayment ? formatCurrency(nextCardPayment.amount) : "-",
      meta: nextCardPayment ? nextCardPayment.date : "-"
    },
    {
      label: "account shortage days",
      value: `${shortCount}日`,
      meta: "補助指標"
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
      setActiveComparisonScenarioId(null);
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
      const scenarios = comparison?.scenarios ?? [];
      const nextScenarios = [
        ...scenarios
          .filter((existingScenario) => existingScenario.id !== scenario.id)
          .map((existingScenario) => ({
            id: existingScenario.id,
            label: existingScenario.label,
            detail: existingScenario.detail,
            excludedEventIds: existingScenario.excludedEventIds
          })),
        scenario
      ];
      const payload = await postJson<SimulationComparisonResponse>("/api/simulation/compare", {
        startDate: state.range.startDate,
        endDate: state.range.endDate,
        scenarios: nextScenarios
      });
      setComparison(payload);
      setActiveComparisonScenarioId(scenario.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "比較に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveComparisonScenario(scenarioId: string) {
    if (!comparison) {
      return;
    }

    const remainingScenarios = comparison.scenarios
      .filter((scenario) => scenario.id !== scenarioId)
      .map((scenario) => ({
        id: scenario.id,
        label: scenario.label,
        detail: scenario.detail,
        excludedEventIds: scenario.excludedEventIds
      }));

    if (remainingScenarios.length === 0) {
      setComparison(null);
      setActiveComparisonScenarioId(null);
      setMessage("比較表示を解除しました。");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = await postJson<SimulationComparisonResponse>("/api/simulation/compare", {
        startDate: state.range.startDate,
        endDate: state.range.endDate,
        scenarios: remainingScenarios
      });
      setComparison(payload);
      setActiveComparisonScenarioId((current) => {
        if (current && current !== scenarioId) {
          return current;
        }

        return payload.scenarios[0]?.id ?? null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "比較更新に失敗しました");
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
          ? `${selectedScenarioEvents[0]?.name ?? "予定"} を外す`
          : `${selectedScenarioEvents.length}件の予定を外す`,
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
    <section className="wire-panel wire-section wire-simulation-refined">
      <div className="wire-section-head">
        <div>
          <h2 className="wire-section-title">Simulation</h2>
          <p className="wire-section-meta">cash / projected cash / planned outflow / card debt</p>
        </div>
        <form action={handleRangeSubmit} className="wire-actions">
          <input name="startDate" type="date" defaultValue={state.range.startDate} className="wire-pill-field" />
          <input name="endDate" type="date" defaultValue={state.range.endDate} className="wire-pill-field" />
          <button className="wire-button" type="submit">{loading ? "更新中..." : "再計算"}</button>
        </form>
      </div>

      <div className="wire-kpi-grid wire-kpi-grid-six wire-simulation-kpis">
        {kpis.map((item) => (
          <div key={item.label} className="wire-stat wire-simulation-kpi">
            <div className="wire-stat-k">{item.label}</div>
            <div className="wire-stat-v">{item.value}</div>
            <div className="wire-stat-m">{item.meta}</div>
          </div>
        ))}
      </div>

      <div className="wire-sim-layout-split">
        <div className="wire-sim-main-column">
          <div className="wire-box wire-chart-box">
            <div className="wire-box-head">
              <span className="wire-label">Balance Chart</span>
              <div className="wire-inline-actions">
                {lowestProjected ? (
                  <span className="wire-inline-chip">最低 projected {formatDate(lowestProjected.date)}</span>
                ) : null}
                {lowestCash ? (
                  <span className="wire-inline-chip">最低 cash {formatDate(lowestCash.date)}</span>
                ) : null}
                {firstComparisonScenario ? (
                  <>
                    <span className="wire-inline-chip">{firstComparisonScenario.label}</span>
                    <button
                      type="button"
                      className="wire-small-button wire-small-button-ghost"
                      onClick={() => {
                        setComparison(null);
                        setActiveComparisonScenarioId(null);
                        setMessage("比較表示を解除しました。");
                      }}
                    >
                      比較解除
                    </button>
                  </>
                ) : null}
              </div>
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
                  {lowestProjected ? (
                    <ReferenceLine
                      x={formatDate(lowestProjected.date)}
                      stroke="#c65b4d"
                      strokeDasharray="7 7"
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey="projectedCash"
                    name="base projected cash"
                    stroke={firstComparisonScenario ? "#8a99ab" : "#376ed4"}
                    strokeWidth={firstComparisonScenario ? 2 : 3}
                    dot={false}
                  />
                  {firstComparisonScenario ? (
                    <Line
                      type="monotone"
                      dataKey="comparisonProjectedCash"
                      name="scenario projected cash"
                      stroke="#c65b4d"
                      strokeWidth={3}
                      dot={false}
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey="cash"
                    name="cash"
                    stroke="#4f7d60"
                    strokeWidth={3}
                    strokeDasharray={firstComparisonScenario ? "6 6" : undefined}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="wire-inline-actions wire-chart-notes">
              <span className="wire-row-sub">
                実績反映最終日 {state.simulation.forecastSummary.settledThroughDate ?? "-"}
              </span>
              {comparison ? (
                <span className="wire-row-sub">{comparison.scenarios.length}件比較中</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="wire-box wire-risk-panel">
          <div className="wire-box-head">
            <span className="wire-label">Compare Facts</span>
          </div>
          <div className="wire-list wire-risk-panel-list">
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
            <div className="wire-list-item wire-manual-compare">
              <div className="wire-list-top wire-manual-compare-head">
                <div className="wire-row-title">手動比較</div>
                <div className="wire-row-action">{selectedScenarioIds.length}件選択</div>
              </div>
              <div className="wire-select-list">
                {selectableScheduledEvents.length === 0 ? (
                  <div className="wire-row-sub">対象なし</div>
                ) : (
                  selectableScheduledEvents.map((event) => (
                    <label key={event.id} className="wire-select-item">
                      <input
                        type="checkbox"
                        checked={selectedScenarioIds.includes(event.id)}
                        onChange={() => toggleScenarioSelection(event.id)}
                      />
                      <div className="wire-select-copy">
                        <div className="wire-select-title">{event.name}</div>
                        <div className="wire-row-sub wire-select-meta">
                          {event.startDate} / {formatCurrency(event.amount)}
                        </div>
                      </div>
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
                  選択で比較
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
                <div
                  key={scenario.id}
                  className={`wire-list-item ${firstComparisonScenario?.id === scenario.id ? "wire-list-item-selected" : ""}`}
                >
                  <div className="wire-list-top">
                    <div className="wire-row-title">{scenario.label}</div>
                    <div className="wire-row-action">
                      projected {formatSignedCurrency(scenario.diff.endingProjectedCashDelta)}
                    </div>
                  </div>
                  <div className="wire-row-sub">
                    ending projected {formatSignedCurrency(scenario.diff.endingProjectedCashDelta)}
                  </div>
                  <div className="wire-row-sub">
                    ending cash {formatSignedCurrency(scenario.diff.endingCashDelta)}
                  </div>
                  <div className="wire-row-sub">
                    ending planned outflow {formatSignedCurrency(scenario.diff.endingPlannedOutflowDelta)}
                  </div>
                  <div className="wire-row-sub">
                    lowest projected {formatSignedCurrency(scenario.diff.lowestProjectedCashDelta)} / lowest cash{" "}
                    {formatSignedCurrency(scenario.diff.lowestCashDelta)}
                  </div>
                  <div className="wire-row-sub">
                    negative days {scenario.diff.projectedNegativeDaysDelta >= 0 ? "+" : ""}
                    {scenario.diff.projectedNegativeDaysDelta} / account shortage {scenario.diff.shortCountDelta >= 0 ? "+" : ""}
                    {scenario.diff.shortCountDelta}
                  </div>
                  <div className="wire-inline-actions">
                    <button
                      type="button"
                      className="wire-small-button"
                      onClick={() => setActiveComparisonScenarioId(scenario.id)}
                    >
                      この比較を表示
                    </button>
                    <button
                      type="button"
                      className="wire-small-button wire-small-button-ghost"
                      onClick={() => void handleRemoveComparisonScenario(scenario.id)}
                    >
                      比較から外す
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="wire-list-item">
                <div className="wire-list-top">
                  <div className="wire-row-title">比較なし</div>
                  <div className="wire-badge-mock">Mock</div>
                </div>
                <div className="wire-row-sub">保存機能は後続</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {message ? <div className="wire-flash">{message}</div> : null}
    </section>
  );
}
