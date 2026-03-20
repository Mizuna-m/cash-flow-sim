"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  Account,
  AccountCreateRequest,
  AccountType,
  BalanceEvent,
  BalanceEventCreateRequest,
  CardPayment,
  CardPaymentCreateRequest,
  CreditCard,
  DailySimulationSnapshot,
  DashboardPayload,
  JsonTags,
  ScheduledEvent,
  ScheduledEventCreateRequest,
  SimulationResponse,
  Transaction,
  TransactionCreateRequest
} from "@/src/lib/openapi-contract";

type ComposerTab = "scheduled" | "transaction" | "payment" | "balance" | "account";

type RangeState = {
  startDate: string;
  endDate: string;
};

type DashboardState = DashboardPayload & {
  range: RangeState;
};

type SubmissionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

type LedgerItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
  kind: "transaction" | "scheduled" | "card" | "balance";
  amount: string;
  actionHint: string;
};

type SimulationHighlight = {
  id: string;
  date: string;
  title: string;
  detail: string;
  theoreticalBalance: string;
  actualBalance: string;
  short: boolean;
  forecastCount: number;
};

const composerTabs: Array<{
  id: ComposerTab;
  label: string;
  description: string;
}> = [
  { id: "scheduled", label: "イベント追加", description: "影響確認向け" },
  { id: "transaction", label: "実績入力", description: "日常支出・収入" },
  { id: "payment", label: "引落入力", description: "カード引落" },
  { id: "balance", label: "資金移動", description: "現実残高調整" },
  { id: "account", label: "口座追加", description: "初期設定" }
];

const accountTypeOptions: Array<{ value: AccountType; label: string }> = [
  { value: "bank", label: "銀行" },
  { value: "cash", label: "現金" },
  { value: "credit", label: "クレジット" },
  { value: "loan", label: "借入" },
  { value: "investment", label: "投資" }
];

const emptySubmissionState: SubmissionState = {
  tone: "idle",
  message: ""
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
}

function parseTagField(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTags(category: string, project: string): JsonTags {
  const tags: JsonTags = {};

  if (category.trim()) {
    tags.category = parseTagField(category);
  }

  if (project.trim()) {
    tags.project = parseTagField(project);
  }

  return tags;
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

async function refreshDashboard(
  range: RangeState,
  creditCards: CreditCard[]
): Promise<DashboardPayload> {
  const query = new URLSearchParams(range).toString();
  const [health, accounts, transactions, scheduledEvents, balanceEvents, cardPayments, simulation] =
    await Promise.all([
      fetchJson<{ status: "ok"; baseCurrency: string; defaultCardId: string }>("/api/health"),
      fetchJson<{ accounts: Account[] }>("/api/accounts"),
      fetchJson<{ transactions: Transaction[] }>(`/api/transactions?${query}`),
      fetchJson<{ scheduledEvents: ScheduledEvent[] }>(`/api/scheduled-events?${query}`),
      fetchJson<{ balanceEvents: BalanceEvent[] }>(`/api/balance-events?${query}`),
      fetchJson<{ cardPayments: CardPayment[] }>(`/api/card-payments?${query}`),
      fetchJson<SimulationResponse>(`/api/simulation?${query}`)
    ]);

  return {
    health,
    accounts: accounts.accounts,
    creditCards,
    transactions: transactions.transactions,
    scheduledEvents: scheduledEvents.scheduledEvents,
    balanceEvents: balanceEvents.balanceEvents,
    cardPayments: cardPayments.cardPayments,
    simulation
  };
}

function getLowestSnapshot(snapshots: DailySimulationSnapshot[]) {
  return snapshots.reduce<DailySimulationSnapshot | null>((lowest, snapshot) => {
    if (!lowest) {
      return snapshot;
    }

    return Number(snapshot.actualBalance) < Number(lowest.actualBalance) ? snapshot : lowest;
  }, null);
}

function getProjectionSummary(simulation: SimulationResponse) {
  const latest = simulation.snapshots.at(-1) ?? null;
  const lowest = getLowestSnapshot(simulation.snapshots);
  const shortCount = simulation.snapshots.filter((snapshot) => snapshot.short).length;
  const forecastCount = simulation.snapshots.filter(
    (snapshot) => snapshot.eventSummary.forecastCount > 0
  ).length;

  return { latest, lowest, shortCount, forecastCount };
}

function getNegativeScheduledEvents(events: ScheduledEvent[]) {
  return [...events]
    .filter((event) => event.isActive && Number(event.amount) < 0)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

function buildRiskQueue(
  simulation: SimulationResponse,
  scheduledEvents: ScheduledEvent[],
  cardPayments: CardPayment[],
  creditCards: CreditCard[]
) {
  const projection = getProjectionSummary(simulation);
  const negativeEvents = getNegativeScheduledEvents(scheduledEvents);
  const cardById = new Map(creditCards.map((card) => [card.id, card.name]));
  const nextCardPayment = [...cardPayments].sort((left, right) => left.date.localeCompare(right.date))[0];
  const queue: Array<{
    id: string;
    tone: "risk" | "safe";
    title: string;
    detail: string;
    amount: string;
  }> = [];

  if (projection.lowest) {
    queue.push({
      id: `lowest-${projection.lowest.date}`,
      tone: projection.shortCount > 0 ? "risk" : "safe",
      title: `${projection.lowest.date} 最低残高`,
      detail:
        projection.lowest.eventSummary.forecastCount > 0
          ? "forecast を含む最低残高日"
          : projection.shortCount > 0
            ? "ショート判定の中心日"
            : "現状で一番低い現実残高",
      amount: projection.lowest.actualBalance
    });
  }

  if (nextCardPayment) {
    queue.push({
      id: nextCardPayment.id,
      tone: "risk",
      title: `${nextCardPayment.date} カード引落`,
      detail: cardById.get(nextCardPayment.creditCardId) ?? "カード引落",
      amount: `-${Math.abs(Number(nextCardPayment.amount)).toFixed(0)}`
    });
  }

  if (negativeEvents[0]) {
    queue.push({
      id: negativeEvents[0].id,
      tone: "risk",
      title: `${negativeEvents[0].startDate} ${negativeEvents[0].name}`,
      detail: "予定イベント",
      amount: negativeEvents[0].amount
    });
  }

  return queue.slice(0, 3);
}

function buildMockScenarios(scheduledEvents: ScheduledEvent[]) {
  const primary = getNegativeScheduledEvents(scheduledEvents)[0];

  return [
    {
      id: "mock-primary",
      label: primary ? `${primary.name} を比較へ追加` : "旅行イベントを比較へ追加",
      detail: "比較シナリオ API 未実装のためモック表示",
      value: primary ? formatCurrency(primary.amount) : formatCurrency(-120000)
    },
    {
      id: "mock-shift",
      label: primary ? `${primary.name} を給料後へ移動` : "旅行を給料後へ移動",
      detail: "差分再計算 API 未実装のためモック表示",
      value: "安全側"
    }
  ];
}

function getTagLabel(tags: JsonTags, key: string) {
  const values = tags[key];

  if (!Array.isArray(values) || values.length === 0) {
    return "-";
  }

  return values.filter((value): value is string => typeof value === "string").join(", ");
}

function buildLedgerItems(
  transactions: Transaction[],
  scheduledEvents: ScheduledEvent[],
  balanceEvents: BalanceEvent[],
  cardPayments: CardPayment[],
  accounts: Account[],
  creditCards: CreditCard[]
) {
  const accountById = new Map(accounts.map((account) => [account.id, account.name]));
  const cardById = new Map(creditCards.map((card) => [card.id, card.name]));

  const items: LedgerItem[] = [
    ...transactions.map((item) => ({
      id: item.id,
      date: item.date,
      title: item.memo || "実績",
      detail: [getTagLabel(item.tags, "project"), getTagLabel(item.tags, "category")]
        .filter((value) => value !== "-")
        .join(" / ") || "transaction",
      kind: "transaction" as const,
      amount: item.amount,
      actionHint: "Enter"
    })),
    ...scheduledEvents.map((item) => ({
      id: item.id,
      date: item.startDate,
      title: item.name,
      detail: item.recurrenceRule || getTagLabel(item.tags, "project") || "scheduled event",
      kind: "scheduled" as const,
      amount: item.amount,
      actionHint: "Space"
    })),
    ...cardPayments.map((item) => ({
      id: item.id,
      date: item.date,
      title: "カード引落",
      detail: `${cardById.get(item.creditCardId) ?? "card"} / ${
        accountById.get(item.sourceAccountId ?? "") ?? "口座未設定"
      }`,
      kind: "card" as const,
      amount: item.amount,
      actionHint: "Enter"
    })),
    ...balanceEvents.map((item) => ({
      id: item.id,
      date: item.date,
      title: item.memo || "資金移動",
      detail: `${accountById.get(item.fromAccountId ?? "") ?? "外部"} -> ${
        accountById.get(item.toAccountId ?? "") ?? "外部"
      }`,
      kind: "balance" as const,
      amount: item.amount,
      actionHint: "Enter"
    }))
  ];

  return items.sort((left, right) => {
    if (left.date === right.date) {
      return right.id.localeCompare(left.id);
    }

    return right.date.localeCompare(left.date);
  });
}

function buildChartData(snapshots: DailySimulationSnapshot[]) {
  return snapshots.map((snapshot) => ({
    ...snapshot,
    shortLabel: snapshot.short ? "危険日" : "",
    label: formatShortDate(snapshot.date),
    theoretical: Number(snapshot.theoreticalBalance),
    actual: Number(snapshot.actualBalance)
  }));
}

function buildForecastSummaryItems(simulation: SimulationResponse) {
  return [
    {
      label: "実績反映最終日",
      value: simulation.forecastSummary.actualsThroughDate
        ? formatShortDate(simulation.forecastSummary.actualsThroughDate)
        : "-"
    },
    {
      label: "予測開始日",
      value: simulation.forecastSummary.firstForecastDate
        ? formatShortDate(simulation.forecastSummary.firstForecastDate)
        : "-"
    },
    {
      label: "予測日数",
      value: `${simulation.forecastSummary.forecastDays}日`
    },
    {
      label: "日常支出予測",
      value:
        simulation.forecastSummary.dailySpendForecastCount > 0
          ? `${simulation.forecastSummary.dailySpendForecastCount}件 / ${formatCurrency(
              simulation.forecastSummary.dailySpendForecastAverageAmount
            )}`
          : "なし"
    },
    {
      label: "カード引落予測",
      value:
        simulation.forecastSummary.cardPaymentForecastCount > 0
          ? `${simulation.forecastSummary.cardPaymentForecastCount}件 / ${formatCurrency(
              simulation.forecastSummary.cardPaymentForecastTotalAmount
            )}`
          : "なし"
    }
  ];
}

function buildSimulationHighlights(simulation: SimulationResponse): SimulationHighlight[] {
  const flagged = simulation.snapshots.filter(
    (snapshot) => snapshot.short || snapshot.eventSummary.forecastCount > 0
  );
  const base =
    flagged.length > 0
      ? flagged
      : simulation.snapshots.filter((snapshot) => snapshot.eventSummary.actualCount > 0);

  return base.slice(0, 8).map((snapshot) => ({
    id: snapshot.date,
    date: snapshot.date,
    title: snapshot.short
      ? "危険化した日"
      : snapshot.eventSummary.forecastCount > 0
        ? "予測が入った日"
        : "実績の反映日",
    detail:
      snapshot.eventSummary.forecastCount > 0
        ? `forecast ${snapshot.eventSummary.forecastCount}件 / 実績 ${snapshot.eventSummary.actualCount}件`
        : `実績 ${snapshot.eventSummary.actualCount}件`,
    theoreticalBalance: snapshot.theoreticalBalance,
    actualBalance: snapshot.actualBalance,
    short: snapshot.short,
    forecastCount: snapshot.eventSummary.forecastCount
  }));
}

export function CashflowWorkspaceClient({ initialData }: { initialData: DashboardPayload }) {
  const creditCards = initialData.creditCards;
  const [dashboard, setDashboard] = useState<DashboardState>({
    ...initialData,
    range: {
      startDate: initialData.simulation.startDate,
      endDate: initialData.simulation.endDate
    }
  });
  const [composerTab, setComposerTab] = useState<ComposerTab>("scheduled");
  const [submissionState, setSubmissionState] = useState<SubmissionState>(emptySubmissionState);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const projection = useMemo(
    () => getProjectionSummary(dashboard.simulation),
    [dashboard.simulation]
  );
  const riskQueue = useMemo(
    () =>
      buildRiskQueue(
        dashboard.simulation,
        dashboard.scheduledEvents,
        dashboard.cardPayments,
        creditCards
      ),
    [creditCards, dashboard.cardPayments, dashboard.scheduledEvents, dashboard.simulation]
  );
  const mockScenarios = useMemo(
    () => buildMockScenarios(dashboard.scheduledEvents),
    [dashboard.scheduledEvents]
  );
  const ledgerItems = useMemo(
    () =>
      buildLedgerItems(
        dashboard.transactions,
        dashboard.scheduledEvents,
        dashboard.balanceEvents,
        dashboard.cardPayments,
        dashboard.accounts,
        creditCards
      ),
    [
      creditCards,
      dashboard.accounts,
      dashboard.balanceEvents,
      dashboard.cardPayments,
      dashboard.scheduledEvents,
      dashboard.transactions
    ]
  );
  const filteredLedgerItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return ledgerItems;
    }

    return ledgerItems.filter((item) =>
      `${item.date} ${item.title} ${item.detail} ${item.kind}`.toLowerCase().includes(query)
    );
  }, [ledgerItems, searchText]);

  const chartData = useMemo(
    () => buildChartData(dashboard.simulation.snapshots),
    [dashboard.simulation.snapshots]
  );
  const forecastSummaryItems = useMemo(
    () => buildForecastSummaryItems(dashboard.simulation),
    [dashboard.simulation]
  );
  const simulationHighlights = useMemo(
    () => buildSimulationHighlights(dashboard.simulation),
    [dashboard.simulation]
  );

  async function reload(range = dashboard.range) {
    setIsRefreshing(true);

    try {
      const refreshed = await refreshDashboard(range, creditCards);
      setDashboard({
        ...refreshed,
        range
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function submitWithFeedback(
    action: (formData: FormData) => Promise<void>,
    formData: FormData
  ) {
    setSubmissionState(emptySubmissionState);

    try {
      await action(formData);
      await reload();
      setSubmissionState({
        tone: "success",
        message: "保存しました。シミュレーションと台帳を更新しています。"
      });
      return true;
    } catch (error) {
      setSubmissionState({
        tone: "error",
        message: error instanceof Error ? error.message : "保存に失敗しました"
      });
      return false;
    }
  }

  async function handleRangeSubmit(formData: FormData) {
    const range = {
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? "")
    };

    await reload(range);
  }

  async function handleScheduledSubmit(formData: FormData) {
    const payload: ScheduledEventCreateRequest = {
      name: String(formData.get("name") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? "") || null,
      recurrenceRule: String(formData.get("recurrenceRule") ?? "") || null,
      amount: String(formData.get("amount") ?? ""),
      orderIndex: Number(formData.get("orderIndex") ?? 0),
      cardId: String(formData.get("cardId") ?? "") || null,
      isActive: formData.get("isActive") === "on",
      tags: buildTags(
        String(formData.get("category") ?? ""),
        String(formData.get("project") ?? "")
      )
    };

    await postJson<{ scheduledEvent: ScheduledEvent }>("/api/scheduled-events", payload);
  }

  async function handleTransactionSubmit(formData: FormData) {
    const payload: TransactionCreateRequest = {
      date: String(formData.get("date") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      memo: String(formData.get("memo") ?? ""),
      orderIndex: Number(formData.get("orderIndex") ?? 0),
      cardId: String(formData.get("cardId") ?? "") || null,
      tags: buildTags(
        String(formData.get("category") ?? ""),
        String(formData.get("project") ?? "")
      )
    };

    await postJson<{ transaction: Transaction }>("/api/transactions", payload);
  }

  async function handleCardPaymentSubmit(formData: FormData) {
    const payload: CardPaymentCreateRequest = {
      creditCardId: String(formData.get("creditCardId") ?? ""),
      sourceAccountId: String(formData.get("sourceAccountId") ?? "") || null,
      date: String(formData.get("date") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      memo: String(formData.get("memo") ?? ""),
      orderIndex: Number(formData.get("orderIndex") ?? 0)
    };

    await postJson<{ cardPayment: CardPayment }>("/api/card-payments", payload);
  }

  async function handleBalanceSubmit(formData: FormData) {
    const payload: BalanceEventCreateRequest = {
      date: String(formData.get("date") ?? ""),
      fromAccountId: String(formData.get("fromAccountId") ?? "") || null,
      toAccountId: String(formData.get("toAccountId") ?? "") || null,
      amount: String(formData.get("amount") ?? ""),
      memo: String(formData.get("memo") ?? ""),
      orderIndex: Number(formData.get("orderIndex") ?? 0)
    };

    await postJson<{ balanceEvent: BalanceEvent }>("/api/balance-events", payload);
  }

  async function handleAccountSubmit(formData: FormData) {
    const payload: AccountCreateRequest = {
      name: String(formData.get("name") ?? ""),
      type: String(formData.get("type") ?? "bank") as AccountType,
      currency: String(formData.get("currency") ?? "JPY"),
      initialBalance: String(formData.get("initialBalance") ?? "0")
    };

    await postJson<{ account: Account }>("/api/accounts", payload);
  }

  const nextScheduled = getNegativeScheduledEvents(dashboard.scheduledEvents)[0];
  const nextCardPayment = [...dashboard.cardPayments].sort((left, right) =>
    left.date.localeCompare(right.date)
  )[0];

  return (
    <main className="cash-ui-page">
      <section className="cash-panel cash-topbar">
        <div>
          <h1 className="cash-page-title">MVP の判断と入力を、キーボード主体で回す画面</h1>
          <p className="cash-subtitle">
            目的: 日次残高、カード引落、予定差分、実績入力、資金移動を最短で確認・登録する
          </p>
        </div>

        <div className="cash-status-grid">
          <StatusCard
            label="最低残高"
            value={projection.lowest ? formatCurrency(projection.lowest.actualBalance) : "-"}
            meta={projection.lowest ? formatShortDate(projection.lowest.date) : "未計算"}
          />
          <StatusCard label="ショート" value={`${projection.shortCount}日`} meta="現状判定" />
          <StatusCard
            label="次の引落"
            value={nextCardPayment ? formatCurrency(nextCardPayment.amount) : "-"}
            meta={nextCardPayment ? formatShortDate(nextCardPayment.date) : "データなし"}
          />
          <StatusCard
            label="予測日"
            value={`${projection.forecastCount}日`}
            meta={
              dashboard.simulation.forecastSummary.firstForecastDate
                ? `${formatShortDate(dashboard.simulation.forecastSummary.firstForecastDate)} から`
                : "予測なし"
            }
          />
        </div>
      </section>

      <section className="cash-main-grid">
        <section className="cash-panel cash-panel-body">
          <div className="cash-head">
            <div>
              <h2 className="cash-section-title">シミュレーション</h2>
              <p className="cash-meta">
                MVP中心: 日次残高、危険日、カード引落日、比較シナリオ
              </p>
            </div>
            <form
              action={(formData) => void submitWithFeedback(handleRangeSubmit, formData)}
              className="cash-toolbar"
            >
              <input
                name="startDate"
                type="date"
                defaultValue={dashboard.range.startDate}
                className="cash-pill-field"
              />
              <input
                name="endDate"
                type="date"
                defaultValue={dashboard.range.endDate}
                className="cash-pill-field"
              />
              <button type="submit" className="cash-btn">
                {isRefreshing ? "更新中..." : "再計算"}
              </button>
            </form>
          </div>

          <div className="cash-sim-grid">
            <div className="cash-chart-shell">
              <div className="cash-legend">
                <span className="theoretical">理論残高</span>
                <span className="actual">現実残高</span>
                <span className="forecast">forecast 開始</span>
                <span className="risk">危険日</span>
              </div>

              <div className="cash-chart">
                {dashboard.simulation.snapshots.length === 0 ? (
                  <div className="cash-empty-state">シミュレーション結果がありません</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 20, bottom: 8, left: 4 }}
                      >
                        <CartesianGrid stroke="rgba(21, 32, 42, 0.08)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#66717b", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={20}
                        />
                        <YAxis
                          tick={{ fill: "#66717b", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCurrency(value)}
                          width={96}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value ?? 0))}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.date ?? ""
                          }
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #d8d0c1",
                            background: "rgba(255, 253, 250, 0.98)"
                          }}
                        />
                        {projection.lowest ? (
                          <ReferenceLine
                            x={formatShortDate(projection.lowest.date)}
                            stroke="#b84b3d"
                            strokeDasharray="6 6"
                          />
                        ) : null}
                        {dashboard.simulation.forecastSummary.firstForecastDate ? (
                          <ReferenceLine
                            x={formatShortDate(
                              dashboard.simulation.forecastSummary.firstForecastDate
                            )}
                            stroke="#c69214"
                            strokeDasharray="4 4"
                          />
                        ) : null}
                        <Line
                          type="monotone"
                          dataKey="theoretical"
                          stroke="#0d6efd"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#2f7256"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 4 }}
                        >
                          <LabelList
                            dataKey="shortLabel"
                            position="top"
                            fill="#b84b3d"
                            fontSize={11}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                    {projection.lowest ? (
                      <div className="cash-risk-note">
                        {formatShortDate(projection.lowest.date)} 最低残高
                        <br />
                        {formatCurrency(projection.lowest.actualBalance)}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="cash-forecast-grid">
                {forecastSummaryItems.map((item) => (
                  <div key={item.label} className="cash-forecast-card">
                    <div className="cash-status-label">{item.label}</div>
                    <div className="cash-item-value">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="cash-snapshot-list">
                {simulationHighlights.length === 0 ? (
                  <div className="cash-empty-box">変化のある日がまだありません</div>
                ) : (
                  simulationHighlights.map((item) => (
                    <div key={item.id} className="cash-snapshot-card">
                      <div className="cash-title-row">
                        <div>
                          <div className="cash-item-title">
                            {formatShortDate(item.date)} {item.title}
                          </div>
                          <div className="cash-desc">{item.detail}</div>
                        </div>
                        <div className="cash-snapshot-badges">
                          {item.forecastCount > 0 ? (
                            <span className="cash-badge cash-badge-forecast">
                              forecast {item.forecastCount}
                            </span>
                          ) : null}
                          {item.short ? (
                            <span className="cash-badge cash-badge-risk">危険</span>
                          ) : (
                            <span className="cash-badge cash-badge-safe">実績追従</span>
                          )}
                        </div>
                      </div>
                      <div className="cash-snapshot-metrics">
                        <span>理論 {formatCurrency(item.theoreticalBalance)}</span>
                        <span>現実 {formatCurrency(item.actualBalance)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="cash-decision-card">
              <DecisionLine label="ベース案" value={projection.shortCount > 0 ? "危険" : "安全"} strong />
              <DecisionLine
                label="最低現実残高"
                value={projection.lowest ? formatCurrency(projection.lowest.actualBalance) : "-"}
              />
              <DecisionLine
                label="危険イベント"
                value={
                  nextCardPayment
                    ? `${formatShortDate(nextCardPayment.date)} 引落`
                    : nextScheduled
                      ? `${formatShortDate(nextScheduled.startDate)} ${nextScheduled.name}`
                      : "-"
                }
              />
              <div className="cash-divider" />
              <DecisionLine
                label="実績最終日"
                value={dashboard.simulation.forecastSummary.actualsThroughDate ?? "-"}
                strong
              />
              <DecisionLine
                label="予測開始"
                value={dashboard.simulation.forecastSummary.firstForecastDate ?? "-"}
              />
              <DecisionLine
                label="予測内訳"
                value={`${dashboard.simulation.forecastSummary.dailySpendForecastCount} / ${dashboard.simulation.forecastSummary.cardPaymentForecastCount}`}
              />
              <div className="cash-action-row">
                <span className="cash-badge cash-badge-forecast">Forecast</span>
                <span className="cash-inline-note">
                  左の縦線から先が予測寄りの期間です
                </span>
              </div>
            </div>
          </div>
        </section>

        <aside className="cash-side-stack">
          <section className="cash-panel cash-panel-body">
            <div className="cash-head cash-head-tight">
              <div>
                <h2 className="cash-section-title cash-section-title-sm">危険キュー</h2>
                <p className="cash-meta">見る順を固定する</p>
              </div>
            </div>

            <div className="cash-list">
              {riskQueue.length === 0 ? (
                <div className="cash-empty-box">危険点はまだありません</div>
              ) : (
                riskQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`cash-queue-item ${item.tone === "risk" ? "risk" : "safe"}`}
                  >
                    <div className="cash-title-row">
                      <div className="cash-item-title">{item.title}</div>
                      <div
                        className={`cash-item-value ${
                          item.tone === "risk" ? "risk-text" : "safe-text"
                        }`}
                      >
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                    <div className="cash-desc">{item.detail}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="cash-panel cash-panel-body">
            <div className="cash-head cash-head-tight">
              <div>
                <h2 className="cash-section-title cash-section-title-sm">比較候補</h2>
                <p className="cash-meta">イベント影響評価用</p>
              </div>
              <span className="cash-badge cash-badge-mock">Mock</span>
            </div>

            <div className="cash-list">
              {mockScenarios.map((item) => (
                <div key={item.id} className="cash-scenario-item">
                  <div className="cash-title-row">
                    <div className="cash-item-title">{item.label}</div>
                    <div className="cash-item-value">{item.value}</div>
                  </div>
                  <div className="cash-desc">{item.detail}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="cash-lower-grid">
        <section className="cash-panel cash-panel-body">
          <div className="cash-input-top">
            <div>
              <h2 className="cash-section-title">入力</h2>
              <p className="cash-meta">大量入力を前提に、Tab と Enter で流せる構造</p>
            </div>
            <div className="cash-tab-row">
              {composerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setComposerTab(tab.id)}
                  className={`cash-tab ${composerTab === tab.id ? "active" : ""}`}
                  title={tab.description}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cash-form-shell">
            {composerTab === "scheduled" ? (
              <KeyboardForm
                action={(formData) => submitWithFeedback(handleScheduledSubmit, formData)}
              >
                <div className="cash-input-grid">
                  <input
                    name="name"
                    className="cash-input-card cash-input-focus"
                    placeholder="イベント名"
                    autoFocus
                  />
                  <input name="amount" type="number" step="0.01" className="cash-input-card" placeholder="金額" />
                  <input
                    name="startDate"
                    type="date"
                    className="cash-input-card"
                    defaultValue={dashboard.range.startDate}
                  />
                  <input name="project" className="cash-input-card" placeholder="Project" />
                  <input name="category" className="cash-input-card" placeholder="Category" />
                  <input name="cardId" list="cash-card-options" className="cash-input-card" placeholder="カードID or 空欄" />
                  <input name="recurrenceRule" className="cash-input-card" placeholder="繰り返しルール" />
                  <input name="endDate" type="date" className="cash-input-card" />
                  <input name="orderIndex" type="number" min="0" defaultValue="0" className="cash-input-card" placeholder="順序" />
                  <label className="cash-check-card">
                    <input name="isActive" type="checkbox" defaultChecked />
                    有効な予定として保存
                  </label>
                  <input name="memoOnly" className="cash-input-card cash-input-wide" placeholder="メモ（表示のみ。API未対応のため保存しない）" />
                </div>
                <FormFooter message="Ctrl+Enter でも保存できます。" />
              </KeyboardForm>
            ) : null}

            {composerTab === "transaction" ? (
              <KeyboardForm
                action={(formData) => submitWithFeedback(handleTransactionSubmit, formData)}
              >
                <div className="cash-input-grid">
                  <input
                    name="date"
                    type="date"
                    className="cash-input-card cash-input-focus"
                    defaultValue={dashboard.range.startDate}
                    autoFocus
                  />
                  <input name="amount" type="number" step="0.01" className="cash-input-card" placeholder="金額" />
                  <input name="category" className="cash-input-card" placeholder="Category" />
                  <input name="project" className="cash-input-card" placeholder="Project" />
                  <input name="memo" className="cash-input-card cash-input-wide" placeholder="メモ" />
                  <input name="cardId" list="cash-card-options" className="cash-input-card" placeholder="カードID or 空欄" />
                  <input name="orderIndex" type="number" min="0" defaultValue="0" className="cash-input-card" placeholder="順序" />
                </div>
                <FormFooter message="Tabで流して Enter 保存。カードは任意です。" />
              </KeyboardForm>
            ) : null}

            {composerTab === "payment" ? (
              <KeyboardForm
                action={(formData) => submitWithFeedback(handleCardPaymentSubmit, formData)}
              >
                <div className="cash-input-grid">
                  <select name="creditCardId" className="cash-input-card cash-input-focus" defaultValue={creditCards[0]?.id ?? ""} autoFocus>
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                  <select name="sourceAccountId" className="cash-input-card" defaultValue="">
                    <option value="">引落口座未指定</option>
                    {dashboard.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <input
                    name="date"
                    type="date"
                    className="cash-input-card"
                    defaultValue={dashboard.range.startDate}
                  />
                  <input name="amount" type="number" step="0.01" className="cash-input-card" placeholder="金額" />
                  <input name="memo" className="cash-input-card cash-input-wide" placeholder="メモ" />
                  <input name="orderIndex" type="number" min="0" defaultValue="0" className="cash-input-card" placeholder="順序" />
                </div>
                <FormFooter message="現実残高更新用。理論残高は変わりません。" />
              </KeyboardForm>
            ) : null}

            {composerTab === "balance" ? (
              <KeyboardForm
                action={(formData) => submitWithFeedback(handleBalanceSubmit, formData)}
              >
                <div className="cash-input-grid">
                  <input
                    name="date"
                    type="date"
                    className="cash-input-card cash-input-focus"
                    defaultValue={dashboard.range.startDate}
                    autoFocus
                  />
                  <input name="amount" type="number" step="0.01" className="cash-input-card" placeholder="金額" />
                  <select name="fromAccountId" className="cash-input-card" defaultValue="">
                    <option value="">出金元なし / 外部</option>
                    {dashboard.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <select name="toAccountId" className="cash-input-card" defaultValue="">
                    <option value="">入金先なし / 外部</option>
                    {dashboard.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <input name="memo" className="cash-input-card cash-input-wide" placeholder="メモ" />
                  <input name="orderIndex" type="number" min="0" defaultValue="0" className="cash-input-card" placeholder="順序" />
                </div>
                <FormFooter message="現実残高のみ動かす移動・補正です。" />
              </KeyboardForm>
            ) : null}

            {composerTab === "account" ? (
              <KeyboardForm
                action={(formData) => submitWithFeedback(handleAccountSubmit, formData)}
              >
                <div className="cash-input-grid">
                  <input name="name" className="cash-input-card cash-input-focus" placeholder="口座名" autoFocus />
                  <select name="type" className="cash-input-card" defaultValue="bank">
                    {accountTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input name="currency" className="cash-input-card" defaultValue="JPY" />
                  <input
                    name="initialBalance"
                    type="number"
                    step="0.01"
                    className="cash-input-card"
                    placeholder="初期残高"
                  />
                </div>
                <FormFooter message="初期設定用。口座 CRUD のうち追加のみ実装しています。" />
              </KeyboardForm>
            ) : null}

            <datalist id="cash-card-options">
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </datalist>
          </div>

          <div className="cash-shortcut-row">
            <span className="cash-kbd">Tab</span>
            <span className="cash-kbd">Shift + Tab</span>
            <span className="cash-kbd">Enter 保存</span>
            <span className="cash-kbd">Ctrl + Enter 保存</span>
            <span className="cash-kbd">/ 検索</span>
          </div>

          {submissionState.message ? (
            <div className={`cash-feedback ${submissionState.tone}`}>{submissionState.message}</div>
          ) : null}
        </section>

        <section className="cash-panel cash-panel-body">
          <div className="cash-table-head">
            <div>
              <h2 className="cash-section-title">台帳</h2>
              <p className="cash-meta">
                MVP中心: 実績、予定、引落、資金移動の根拠一覧
              </p>
            </div>
            <div className="cash-pill-row">
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="cash-pill-field"
                placeholder="検索 / category / project"
                aria-label="台帳検索"
              />
            </div>
          </div>

          <div className="cash-table">
            <div className="cash-table-header">
              <div>日付</div>
              <div>内容</div>
              <div>種別</div>
              <div>金額</div>
              <div>操作</div>
            </div>

            {filteredLedgerItems.length === 0 ? (
              <div className="cash-empty-box">該当データがありません</div>
            ) : (
              filteredLedgerItems.slice(0, 12).map((item) => (
                <div key={`${item.kind}-${item.id}`} className="cash-table-row">
                  <div>{formatShortDate(item.date)}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <div className="cash-desc">{item.detail}</div>
                  </div>
                  <div>{item.kind}</div>
                  <div className={Number(item.amount) < 0 ? "risk-text" : Number(item.amount) > 0 ? "safe-text" : ""}>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                  <div className="cash-muted">{item.actionHint}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusCard({
  label,
  value,
  meta
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="cash-status-card">
      <div className="cash-status-label">{label}</div>
      <div className="cash-status-value">{value}</div>
      <div className="cash-status-meta">{meta}</div>
    </div>
  );
}

function DecisionLine({
  label,
  value,
  strong
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="cash-decision-line">
      <span className={strong ? "cash-decision-strong" : "cash-muted"}>{label}</span>
      <strong className={strong ? "cash-decision-value-lg" : "cash-decision-value"}>
        {value}
      </strong>
    </div>
  );
}

function KeyboardForm({
  action,
  children,
  resetOnSuccess = true
}: {
  action: (formData: FormData) => Promise<boolean>;
  children: React.ReactNode;
  resetOnSuccess?: boolean;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        void action(formData).then((shouldReset) => {
          if (shouldReset && resetOnSuccess) {
            form.reset();
          }
        });
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
    </form>
  );
}

function FormFooter({ message }: { message: string }) {
  return (
    <div className="cash-form-footer">
      <p className="cash-meta">{message}</p>
      <button type="submit" className="cash-btn">
        保存
      </button>
    </div>
  );
}
