"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
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

type ComposerTab = "transaction" | "scheduled" | "balance" | "payment" | "account";

type SubmissionState = {
  tone: "idle" | "success" | "error";
  message: string;
};

type RangeState = {
  startDate: string;
  endDate: string;
};

type DashboardState = DashboardPayload & {
  range: RangeState;
};

type ActivityItem = {
  id: string;
  date: string;
  type: "transaction" | "scheduled" | "balance" | "payment";
  title: string;
  subtitle: string;
  amount: string;
  tone: "inflow" | "outflow" | "neutral";
};

const composerTabs: Array<{ id: ComposerTab; label: string; description: string }> = [
  { id: "transaction", label: "実績入力", description: "日常支出・収入の追加" },
  { id: "scheduled", label: "予定登録", description: "イベントや固定費を追加" },
  { id: "balance", label: "資金移動", description: "口座移動と補正を記録" },
  { id: "payment", label: "カード引落", description: "現実残高の更新" },
  { id: "account", label: "口座追加", description: "土台となる口座を作成" }
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

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
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

async function refreshDashboard(range: RangeState): Promise<DashboardPayload> {
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
    creditCards: [],
    transactions: transactions.transactions,
    scheduledEvents: scheduledEvents.scheduledEvents,
    balanceEvents: balanceEvents.balanceEvents,
    cardPayments: cardPayments.cardPayments,
    simulation
  };
}

function sumAmount(values: Array<{ amount: string }>) {
  return values.reduce((sum, item) => sum + Number(item.amount), 0);
}

function getLowestSnapshot(snapshots: DailySimulationSnapshot[]) {
  return snapshots.reduce<DailySimulationSnapshot | null>((lowest, current) => {
    if (!lowest) {
      return current;
    }

    return Number(current.actualBalance) < Number(lowest.actualBalance) ? current : lowest;
  }, null);
}

function getProjectionSummary(simulation: SimulationResponse) {
  const snapshots = simulation.snapshots;
  const lowest = getLowestSnapshot(snapshots);
  const latest = snapshots.at(-1) ?? null;
  const shortCount = snapshots.filter((snapshot) => snapshot.short).length;

  return {
    lowest,
    latest,
    shortCount
  };
}

function getTopTagBreakdown(transactions: Transaction[], tagKey: string) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    const values = transaction.tags[tagKey];
    const amount = Math.abs(Number(transaction.amount));

    if (!Array.isArray(values) || amount === 0) {
      continue;
    }

    for (const entry of values) {
      if (typeof entry !== "string" || entry.length === 0) {
        continue;
      }

      totals.set(entry, (totals.get(entry) ?? 0) + amount);
    }
  }

  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, amount]) => ({ label, amount }));
}

function buildActivityItems(data: DashboardState, creditCards: CreditCard[]) {
  const accountById = new Map(data.accounts.map((account) => [account.id, account.name]));
  const cardById = new Map(creditCards.map((card) => [card.id, card.name]));

  const transactions: ActivityItem[] = data.transactions.map((item) => ({
    id: item.id,
    date: item.date,
    type: "transaction",
    title: item.memo || "実績",
    subtitle:
      Array.isArray(item.tags.category) && item.tags.category.length > 0
        ? String(item.tags.category.join(" / "))
        : "カテゴリ未設定",
    amount: item.amount,
    tone: Number(item.amount) >= 0 ? "inflow" : "outflow"
  }));

  const scheduledEvents: ActivityItem[] = data.scheduledEvents.map((item) => ({
    id: item.id,
    date: item.startDate,
    type: "scheduled",
    title: item.name,
    subtitle: item.recurrenceRule || "単発イベント",
    amount: item.amount,
    tone: Number(item.amount) >= 0 ? "inflow" : "outflow"
  }));

  const balanceEvents: ActivityItem[] = data.balanceEvents.map((item) => ({
    id: item.id,
    date: item.date,
    type: "balance",
    title: item.memo || "資金移動",
    subtitle: `${accountById.get(item.fromAccountId ?? "") ?? "外部"} -> ${
      accountById.get(item.toAccountId ?? "") ?? "外部"
    }`,
    amount: item.amount,
    tone: "neutral"
  }));

  const cardPayments: ActivityItem[] = data.cardPayments.map((item) => ({
    id: item.id,
    date: item.date,
    type: "payment",
    title: item.memo || "カード引落",
    subtitle: `${cardById.get(item.creditCardId) ?? "カード"} / ${
      accountById.get(item.sourceAccountId ?? "") ?? "口座未設定"
    }`,
    amount: item.amount,
    tone: "outflow"
  }));

  return [...transactions, ...scheduledEvents, ...balanceEvents, ...cardPayments].sort(
    (left, right) => {
      if (left.date === right.date) {
        return right.id.localeCompare(left.id);
      }

      return right.date.localeCompare(left.date);
    }
  );
}

function toneClassName(tone: ActivityItem["tone"]) {
  if (tone === "inflow") {
    return "text-emerald-100";
  }

  if (tone === "outflow") {
    return "text-rose-100";
  }

  return "text-sky-100";
}

function amountAccentClassName(value: string) {
  const amount = Number(value);

  if (amount > 0) {
    return "text-emerald-300";
  }

  if (amount < 0) {
    return "text-rose-300";
  }

  return "text-slate-200";
}

function sectionTitleClassName() {
  return "text-sm font-semibold uppercase tracking-[0.26em] text-slate-400";
}

export function CashflowWorkspaceClient({ initialData }: { initialData: DashboardPayload }) {
  const [dashboard, setDashboard] = useState<DashboardState>({
    ...initialData,
    range: {
      startDate: initialData.simulation.startDate,
      endDate: initialData.simulation.endDate
    }
  });
  const [creditCards, setCreditCards] = useState(initialData.creditCards);
  const [composerTab, setComposerTab] = useState<ComposerTab>("transaction");
  const [submissionState, setSubmissionState] = useState<SubmissionState>(emptySubmissionState);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);

  const projection = useMemo(
    () => getProjectionSummary(dashboard.simulation),
    [dashboard.simulation]
  );
  const categoryBreakdown = useMemo(
    () => getTopTagBreakdown(dashboard.transactions, "category"),
    [dashboard.transactions]
  );
  const projectBreakdown = useMemo(
    () => getTopTagBreakdown(dashboard.transactions, "project"),
    [dashboard.transactions]
  );
  const activityItems = useMemo(
    () => buildActivityItems(dashboard, creditCards),
    [creditCards, dashboard]
  );
  const filteredActivityItems = useMemo(() => {
    const needle = deferredSearchText.trim().toLowerCase();

    if (!needle) {
      return activityItems;
    }

    return activityItems.filter((item) =>
      `${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(needle)
    );
  }, [activityItems, deferredSearchText]);

  async function reload(range = dashboard.range) {
    setIsRefreshing(true);

    try {
      const refreshed = await refreshDashboard(range);
      setDashboard({
        ...refreshed,
        creditCards,
        range
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRangeSubmit(formData: FormData) {
    const range = {
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? "")
    };

    startTransition(() => {
      reload(range).catch((error: unknown) => {
        setSubmissionState({
          tone: "error",
          message: error instanceof Error ? error.message : "期間変更に失敗しました"
        });
      });
    });
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

  async function handleTransactionSubmit(formData: FormData) {
    const payload: TransactionCreateRequest = {
      date: String(formData.get("date") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      memo: String(formData.get("memo") ?? ""),
      cardId: String(formData.get("cardId") ?? "") || null,
      orderIndex: Number(formData.get("orderIndex") ?? 0),
      tags: buildTags(
        String(formData.get("category") ?? ""),
        String(formData.get("project") ?? "")
      )
    };

    await postJson<{ transaction: Transaction }>("/api/transactions", payload);
  }

  async function handleScheduledSubmit(formData: FormData) {
    const payload: ScheduledEventCreateRequest = {
      name: String(formData.get("name") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? "") || null,
      recurrenceRule: String(formData.get("recurrenceRule") ?? "") || null,
      amount: String(formData.get("amount") ?? ""),
      isActive: formData.get("isActive") === "on",
      orderIndex: Number(formData.get("orderIndex") ?? 0),
      cardId: String(formData.get("cardId") ?? "") || null,
      tags: buildTags(
        String(formData.get("category") ?? ""),
        String(formData.get("project") ?? "")
      )
    };

    await postJson<{ scheduledEvent: ScheduledEvent }>("/api/scheduled-events", payload);
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

  async function submitWithFeedback(action: (formData: FormData) => Promise<void>, formData: FormData) {
    setSubmissionState(emptySubmissionState);

    try {
      await action(formData);
      await reload();
      setSubmissionState({
        tone: "success",
        message: "登録内容を保存し、シミュレーションと一覧を更新しました。"
      });
    } catch (error) {
      setSubmissionState({
        tone: "error",
        message: error instanceof Error ? error.message : "保存に失敗しました"
      });
    }
  }

  const currentActual = projection.latest ? Number(projection.latest.actualBalance) : 0;
  const currentTheoretical = projection.latest ? Number(projection.latest.theoreticalBalance) : 0;
  const totalAssets = dashboard.accounts.reduce((sum, account) => {
    return account.type === "credit" ? sum : sum + Number(account.initialBalance);
  }, 0);
  const outstandingCardBalance = Object.values(projection.latest?.cardBalances ?? {}).reduce(
    (sum, amount) => sum + Number(amount),
    0
  );

  return (
    <main className="min-h-screen px-4 py-4 text-slate-50 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.18),transparent_28%),linear-gradient(135deg,#07111f_0%,#0f1f33_42%,#101a25_100%)] p-6 shadow-[0_30px_80px_rgba(2,6,23,0.45)] md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100">
                  Cash Flow Planner
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                  OpenAPI contract driven UI
                </span>
              </div>
              <h1 className="mt-5 max-w-4xl font-['Georgia','Iowan_Old_Style','Hiragino_Mincho_ProN',serif] text-4xl leading-tight text-white md:text-6xl">
                資金ショートの予防を中心に、
                <span className="block text-sky-100">実績と未来予定をひとつの操作面に再構成。</span>
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-300 md:text-base">
                シミュレーション確認、イベント追加、実績記録、カード引落の更新を同じ視界で回せるようにしました。
                現在の UI は既存部品に依存せず、OpenAPI 契約に沿ったデータ単位で再設計しています。
              </p>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5 backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="理論残高" value={formatCurrency(currentTheoretical)} detail="発生ベース" />
                <MetricCard label="現実残高" value={formatCurrency(currentActual)} detail="資金ショート判定基準" />
                <MetricCard label="最低残高" value={formatCurrency(projection.lowest?.actualBalance ?? 0)} detail={projection.lowest ? `${projection.lowest.date}` : "未計算"} />
                <MetricCard label="カード負債" value={formatCurrency(outstandingCardBalance)} detail={`${Object.keys(projection.latest?.cardBalances ?? {}).length} cards`} />
              </div>
              <div className="rounded-[1.4rem] border border-amber-300/15 bg-amber-300/10 px-4 py-4 text-sm leading-7 text-amber-50">
                {projection.shortCount > 0
                  ? `${projection.shortCount} 日でショート警戒があります。最低日は ${projection.lowest?.date ?? "-"} です。`
                  : "指定期間ではショートしていません。イベント追加時の差分確認に進めます。"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.32fr_0.68fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.35)] backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className={sectionTitleClassName()}>Simulation Canvas</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">未来残高の流れを日次で確認</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  理論残高と現実残高を同じキャンバスに重ね、ショート日とカード負債の積み上がりを把握しやすくしています。
                </p>
              </div>
              <form action={handleRangeSubmit} className="grid gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
                <Field label="開始日">
                  <input name="startDate" type="date" defaultValue={dashboard.range.startDate} className={inputClassName()} />
                </Field>
                <Field label="終了日">
                  <input name="endDate" type="date" defaultValue={dashboard.range.endDate} className={inputClassName()} />
                </Field>
                <div className="flex items-end">
                  <button type="submit" className={primaryButtonClassName()}>
                    {isRefreshing ? "更新中..." : "期間を反映"}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(8,15,28,0.92))] p-4">
                <div className="grid gap-3">
                  {dashboard.simulation.snapshots.length === 0 ? (
                    <EmptyPanel
                      title="シミュレーション結果がありません"
                      body="データベース接続または seed が未設定のときは、まず account と transaction を追加してください。"
                    />
                  ) : (
                    dashboard.simulation.snapshots.map((snapshot) => (
                      <BalanceRail key={snapshot.date} snapshot={snapshot} />
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <InsightCard
                  title="判定"
                  body={
                    projection.shortCount > 0
                      ? "現実残高ベースでショート警戒が発生しています。イベント追加前に最低残高付近の支払日を優先確認してください。"
                      : "資金繰りは維持できています。ここからイベント追加でどこまで余裕が減るかを見る段階です。"
                  }
                />
                <InsightCard
                  title="実績の反映"
                  body={`実績 ${dashboard.transactions.length} 件、予定 ${dashboard.scheduledEvents.length} 件、引落 ${dashboard.cardPayments.length} 件が期間内に反映されています。`}
                />
                <InsightCard
                  title="契約情報"
                  body={`基軸通貨は ${dashboard.health.baseCurrency}、デフォルトカードは ${dashboard.health.defaultCardId} です。`}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <PanelShell title="Portfolio Pulse" subtitle="初期資産とカード設定">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <StatStrip label="初期資産合計" value={formatCurrency(totalAssets)} />
                <StatStrip label="アカウント数" value={`${dashboard.accounts.length}`} />
                <StatStrip label="カード数" value={`${creditCards.length}`} />
              </div>
              <div className="mt-4 grid gap-3">
                {dashboard.accounts.map((account) => (
                  <div key={account.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{account.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{account.type}</p>
                      </div>
                      <p className="text-base font-semibold text-sky-100">
                        {formatCurrency(account.initialBalance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </PanelShell>

            <PanelShell title="Card Forecast" subtitle="引落設計の前提">
              <div className="grid gap-3">
                {creditCards.length === 0 ? (
                  <EmptyPanel title="カード設定なし" body="現在は credit_cards テーブルの設定を読み込みます。" />
                ) : (
                  creditCards.map((card) => (
                    <div key={card.id} className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{card.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            締日 {card.closingDay} / 支払日 {card.paymentDay}
                          </p>
                        </div>
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                          {card.isDefault ? "default" : "card"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PanelShell>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,23,39,0.92),rgba(8,15,28,0.96))] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.3)] md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className={sectionTitleClassName()}>Scenario Composer</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">入力導線を用途別に整理</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  実績、予定、資金移動、カード引落、口座追加をひとつのフォーム群にまとめました。保存後は右側の一覧と上部シミュレーションが更新されます。
                </p>
              </div>
              {submissionState.message ? (
                <div className={submissionBannerClassName(submissionState.tone)}>{submissionState.message}</div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {composerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setComposerTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    composerTab === tab.id
                      ? "border-sky-300/35 bg-sky-300/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {composerTab === "transaction" ? (
                <form
                  action={(formData) => void submitWithFeedback(handleTransactionSubmit, formData)}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Field label="日付"><input name="date" type="date" defaultValue={dashboard.range.startDate} className={inputClassName()} /></Field>
                  <Field label="金額"><input name="amount" type="number" step="0.01" placeholder="-4500" className={inputClassName()} /></Field>
                  <Field label="カテゴリ"><input name="category" placeholder="food, cafe" className={inputClassName()} /></Field>
                  <Field label="Project"><input name="project" placeholder="trip-kyoto" className={inputClassName()} /></Field>
                  <Field label="カード"><select name="cardId" className={inputClassName()}><option value="">未指定</option>{creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></Field>
                  <Field label="順序"><input name="orderIndex" type="number" min="0" defaultValue="0" className={inputClassName()} /></Field>
                  <Field label="メモ" className="md:col-span-2"><input name="memo" placeholder="昼食 / 交通費 / 給与" className={inputClassName()} /></Field>
                  <div className="md:col-span-2"><button type="submit" className={primaryButtonClassName()}>実績を保存</button></div>
                </form>
              ) : null}

              {composerTab === "scheduled" ? (
                <form
                  action={(formData) => void submitWithFeedback(handleScheduledSubmit, formData)}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Field label="イベント名"><input name="name" placeholder="旅行 / 家賃 / 機材購入" className={inputClassName()} /></Field>
                  <Field label="金額"><input name="amount" type="number" step="0.01" placeholder="-120000" className={inputClassName()} /></Field>
                  <Field label="開始日"><input name="startDate" type="date" defaultValue={dashboard.range.startDate} className={inputClassName()} /></Field>
                  <Field label="終了日"><input name="endDate" type="date" className={inputClassName()} /></Field>
                  <Field label="繰り返しルール"><input name="recurrenceRule" placeholder="FREQ=MONTHLY;BYMONTHDAY=25" className={inputClassName()} /></Field>
                  <Field label="カード"><select name="cardId" className={inputClassName()}><option value="">未指定</option>{creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></Field>
                  <Field label="カテゴリ"><input name="category" placeholder="rent, utilities" className={inputClassName()} /></Field>
                  <Field label="Project"><input name="project" placeholder="summer-trip" className={inputClassName()} /></Field>
                  <Field label="順序"><input name="orderIndex" type="number" min="0" defaultValue="0" className={inputClassName()} /></Field>
                  <label className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    <input name="isActive" type="checkbox" defaultChecked />
                    有効な予定として保存
                  </label>
                  <div className="md:col-span-2"><button type="submit" className={primaryButtonClassName()}>予定を保存</button></div>
                </form>
              ) : null}

              {composerTab === "balance" ? (
                <form
                  action={(formData) => void submitWithFeedback(handleBalanceSubmit, formData)}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Field label="日付"><input name="date" type="date" defaultValue={dashboard.range.startDate} className={inputClassName()} /></Field>
                  <Field label="金額"><input name="amount" type="number" step="0.01" placeholder="50000" className={inputClassName()} /></Field>
                  <Field label="出金元"><select name="fromAccountId" className={inputClassName()}><option value="">外部 / なし</option>{dashboard.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field>
                  <Field label="入金先"><select name="toAccountId" className={inputClassName()}><option value="">外部 / なし</option>{dashboard.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field>
                  <Field label="順序"><input name="orderIndex" type="number" min="0" defaultValue="0" className={inputClassName()} /></Field>
                  <Field label="メモ"><input name="memo" placeholder="メイン口座へ移動" className={inputClassName()} /></Field>
                  <div className="md:col-span-2"><button type="submit" className={primaryButtonClassName()}>移動を保存</button></div>
                </form>
              ) : null}

              {composerTab === "payment" ? (
                <form
                  action={(formData) => void submitWithFeedback(handleCardPaymentSubmit, formData)}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Field label="カード"><select name="creditCardId" className={inputClassName()}>{creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></Field>
                  <Field label="引落口座"><select name="sourceAccountId" className={inputClassName()}><option value="">未指定</option>{dashboard.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field>
                  <Field label="引落日"><input name="date" type="date" defaultValue={dashboard.range.startDate} className={inputClassName()} /></Field>
                  <Field label="金額"><input name="amount" type="number" step="0.01" placeholder="42000" className={inputClassName()} /></Field>
                  <Field label="順序"><input name="orderIndex" type="number" min="0" defaultValue="0" className={inputClassName()} /></Field>
                  <Field label="メモ"><input name="memo" placeholder="3月分引落" className={inputClassName()} /></Field>
                  <div className="md:col-span-2"><button type="submit" className={primaryButtonClassName()}>引落を保存</button></div>
                </form>
              ) : null}

              {composerTab === "account" ? (
                <form
                  action={(formData) => void submitWithFeedback(handleAccountSubmit, formData)}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Field label="口座名"><input name="name" placeholder="メイン口座" className={inputClassName()} /></Field>
                  <Field label="種別"><select name="type" className={inputClassName()}>{accountTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                  <Field label="通貨"><input name="currency" defaultValue="JPY" className={inputClassName()} /></Field>
                  <Field label="初期残高"><input name="initialBalance" type="number" step="0.01" placeholder="250000" className={inputClassName()} /></Field>
                  <div className="md:col-span-2"><button type="submit" className={primaryButtonClassName()}>口座を保存</button></div>
                </form>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6">
            <PanelShell title="Spending Signals" subtitle="予測の根拠に使う実績傾向">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                <BreakdownList title="カテゴリ別支出" items={categoryBreakdown} emptyMessage="カテゴリ付き支出がまだありません。" />
                <BreakdownList title="Project別支出" items={projectBreakdown} emptyMessage="Project 付き支出がまだありません。" />
              </div>
            </PanelShell>

            <PanelShell title="Operations Ledger" subtitle="期間内の更新履歴">
              <div className="mb-4">
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="実績 / 予定 / 引落を検索"
                  className={inputClassName()}
                />
              </div>
              <div className="grid gap-3">
                {filteredActivityItems.length === 0 ? (
                  <EmptyPanel title="該当データなし" body="検索条件に合う項目がありません。" />
                ) : (
                  filteredActivityItems.slice(0, 14).map((item) => (
                    <div key={`${item.type}-${item.id}`} className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClassName(item.tone)} border-current/20 bg-current/10`}>
                              {item.type}
                            </span>
                            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {formatCompactDate(item.date)}
                            </span>
                          </div>
                          <p className="mt-3 font-medium text-white">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">{item.subtitle}</p>
                        </div>
                        <p className={`text-lg font-semibold ${amountAccentClassName(item.amount)}`}>
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PanelShell>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </article>
  );
}

function PanelShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.3)] backdrop-blur md:p-6">
      <p className={sectionTitleClassName()}>{title}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{subtitle}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-200">{body}</p>
    </article>
  );
}

function StatStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function BreakdownList({
  title,
  items,
  emptyMessage
}: {
  title: string;
  items: Array<{ label: string; amount: number }>;
  emptyMessage: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <EmptyPanel title={title} body={emptyMessage} />
        ) : (
          items.map((item) => (
            <div key={item.label} className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-slate-100">{item.label}</p>
                <p className="text-sm font-semibold text-sky-100">{formatCurrency(item.amount)}</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,#38bdf8,#fbbf24)]"
                  style={{ width: `${Math.max(12, Math.min(100, item.amount / 2000))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BalanceRail({ snapshot }: { snapshot: DailySimulationSnapshot }) {
  const theoretical = Number(snapshot.theoreticalBalance);
  const actual = Number(snapshot.actualBalance);
  const upper = Math.max(Math.abs(theoretical), Math.abs(actual), 1);
  const theoreticalWidth = `${Math.max(8, (Math.abs(theoretical) / upper) * 100)}%`;
  const actualWidth = `${Math.max(8, (Math.abs(actual) / upper) * 100)}%`;

  return (
    <article className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">{formatCompactDate(snapshot.date)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
            {snapshot.short ? "short risk" : "within range"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-sky-100">{formatCurrency(snapshot.actualBalance)}</p>
          <p className="mt-1 text-xs text-slate-400">
            理論 {formatCurrency(snapshot.theoreticalBalance)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span>理論残高</span>
            <span>{formatCurrency(theoretical)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/5">
            <div className="h-2.5 rounded-full bg-[linear-gradient(90deg,#38bdf8,#60a5fa)]" style={{ width: theoreticalWidth }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
            <span>現実残高</span>
            <span>{formatCurrency(actual)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/5">
            <div
              className={`h-2.5 rounded-full ${snapshot.short ? "bg-[linear-gradient(90deg,#fb7185,#f97316)]" : "bg-[linear-gradient(90deg,#34d399,#38bdf8)]"}`}
              style={{ width: actualWidth }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5">
      <p className="font-medium text-slate-100">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-400">{body}</p>
    </div>
  );
}

function inputClassName() {
  return "w-full rounded-[1rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/35 focus:bg-slate-950 focus:ring-4 focus:ring-sky-300/10";
}

function primaryButtonClassName() {
  return "inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#38bdf8,#f59e0b)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105";
}

function submissionBannerClassName(tone: SubmissionState["tone"]) {
  if (tone === "success") {
    return "rounded-[1rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100";
  }

  if (tone === "error") {
    return "rounded-[1rem] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100";
  }

  return "hidden";
}
