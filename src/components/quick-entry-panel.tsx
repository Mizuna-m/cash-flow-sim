"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountRecord } from "@/src/infrastructure/repositories/account-repository";
import type { CreditCardRecord } from "@/src/infrastructure/repositories/credit-card-repository";

type EntryState = {
  message: string;
  kind: "idle" | "success" | "error";
};

type QuickEntryPanelProps = {
  accounts: AccountRecord[];
  creditCards: CreditCardRecord[];
};

type TabId = "transaction" | "scheduled" | "balance" | "card" | "account";

type TabConfig = {
  id: TabId;
  title: string;
  description: string;
  hint: string;
  disabled?: boolean;
};

const accountTypes = ["cash", "bank", "credit", "loan", "investment"] as const;

function initialState(): EntryState {
  return { message: "", kind: "idle" };
}

function toTagList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }
}

function formatCount(value: number, singular: string, plural = singular) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function fieldClassName() {
  return "w-full rounded-2xl border border-ink/10 bg-[#f7f3eb] px-4 py-3 text-sm text-ink outline-none transition focus:border-ember/40 focus:bg-white focus:ring-4 focus:ring-ember/10";
}

function submitClassName() {
  return "inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/92";
}

function statusClassName(kind: EntryState["kind"]) {
  if (kind === "error") {
    return "rounded-2xl border border-ember/20 bg-ember/10 px-4 py-3 text-sm text-ember";
  }

  if (kind === "success") {
    return "rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss";
  }

  return "hidden";
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink/85">
      <span>
        {label}
        {hint ? <span className="ml-2 text-xs font-normal text-ink/45">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function FormIntro({
  title,
  description,
  badge
}: {
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="border-b border-ink/8 pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-ember/15 bg-ember/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ember">
          {badge}
        </span>
        <h3 className="text-2xl font-semibold text-ink">{title}</h3>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/68">{description}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-ink/15 bg-sand/45 px-5 py-6">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-7 text-ink/62">{body}</p>
    </div>
  );
}

export function QuickEntryPanel({ accounts, creditCards }: QuickEntryPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("transaction");
  const [accountState, setAccountState] = useState<EntryState>(initialState);
  const [transactionState, setTransactionState] = useState<EntryState>(initialState);
  const [scheduledState, setScheduledState] = useState<EntryState>(initialState);
  const [cardPaymentState, setCardPaymentState] = useState<EntryState>(initialState);
  const [balanceEventState, setBalanceEventState] = useState<EntryState>(initialState);

  const tabs: TabConfig[] = [
    {
      id: "transaction",
      title: "Transaction",
      description: "支出・収入を追加",
      hint: "まずはここから"
    },
    {
      id: "scheduled",
      title: "Scheduled event",
      description: "固定費や将来イベント",
      hint: "preview に効く"
    },
    {
      id: "balance",
      title: "Balance event",
      description: "口座間移動や補正",
      hint: "移動系"
    },
    {
      id: "card",
      title: "Card payment",
      description: "カード引き落とし登録",
      hint: creditCards.length > 0 ? "カードあり" : "カード未登録",
      disabled: creditCards.length === 0
    },
    {
      id: "account",
      title: "Account",
      description: "口座の追加",
      hint: "土台作成"
    }
  ];

  const statusByTab: Record<TabId, EntryState> = {
    account: accountState,
    transaction: transactionState,
    scheduled: scheduledState,
    card: cardPaymentState,
    balance: balanceEventState
  };

  const quickFacts = [
    {
      label: "Accounts",
      value: formatCount(accounts.length, "account")
    },
    {
      label: "Cards",
      value: formatCount(creditCards.length, "card")
    },
    {
      label: "Refresh",
      value: "auto after submit"
    }
  ] as const;

  return (
    <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,239,231,0.88))] p-4 shadow-panel md:p-6">
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="space-y-4">
          <div className="rounded-[1.6rem] bg-ink px-5 py-5 text-sand">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sand/60">
              Quick entry
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">入力作業を 1 枚に集約</h2>
            <p className="mt-3 text-sm leading-7 text-sand/75">
              フォームは 1 つずつ表示します。今触る対象だけに集中して、送信後は一覧と simulation を確認する流れです。
            </p>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => {
              const state = statusByTab[tab.id];
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-ink bg-ink text-white shadow-panel"
                      : "border-ink/10 bg-white/80 text-ink hover:border-ink/20 hover:bg-white"
                  } ${tab.disabled ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? "text-white" : "text-ink"
                        }`}
                      >
                        {tab.title}
                      </p>
                      <p
                        className={`mt-1 text-sm leading-6 ${
                          isActive ? "text-sand/72" : "text-ink/62"
                        }`}
                      >
                        {tab.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        isActive ? "bg-white/12 text-sand" : "bg-sand text-ink/65"
                      }`}
                    >
                      {tab.hint}
                    </span>
                  </div>
                  {state.message ? (
                    <p
                      className={`mt-3 text-xs font-medium ${
                        state.kind === "error"
                          ? isActive
                            ? "text-[#ffb2a0]"
                            : "text-ember"
                          : isActive
                            ? "text-[#d6efd9]"
                            : "text-moss"
                      }`}
                    >
                      {state.message}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="rounded-[1.8rem] border border-ink/8 bg-white p-5 shadow-sm md:p-6">
          {activeTab === "transaction" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    await postJson("/api/transactions", {
                      date: String(formData.get("date") ?? ""),
                      amount: String(formData.get("amount") ?? ""),
                      memo: String(formData.get("memo") ?? ""),
                      orderIndex: Number(formData.get("orderIndex") ?? 0),
                      tags: {
                        category: toTagList(String(formData.get("category") ?? "")),
                        project: toTagList(String(formData.get("project") ?? ""))
                      }
                    });
                    event.currentTarget.reset();
                    setTransactionState({ message: "Transaction created.", kind: "success" });
                    router.refresh();
                  } catch (error) {
                    setTransactionState({
                      message: error instanceof Error ? error.message : "Failed to create transaction.",
                      kind: "error"
                    });
                  }
                });
              }}
            >
              <FormIntro
                badge="Most used"
                title="Transaction"
                description="最も頻度の高い入力です。支出はマイナス、収入はプラスで入れるだけで recent transactions と preview に反映されます。"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Date">
                  <input
                    name="date"
                    type="date"
                    defaultValue="2026-03-21"
                    required
                    className={fieldClassName()}
                  />
                </Field>
                <Field label="Amount" hint="支出はマイナス">
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="-2500"
                    required
                    className={fieldClassName()}
                  />
                </Field>
              </div>
              <Field label="Memo">
                <input name="memo" placeholder="Lunch or salary" className={fieldClassName()} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Category" hint="カンマ区切り">
                  <input name="category" placeholder="食費, 交通費" className={fieldClassName()} />
                </Field>
                <Field label="Project" hint="任意">
                  <input name="project" placeholder="春の旅行" className={fieldClassName()} />
                </Field>
              </div>
              <Field label="Order index" hint="同日内の順序">
                <input
                  name="orderIndex"
                  type="number"
                  defaultValue="0"
                  min="0"
                  className={fieldClassName()}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className={submitClassName()}>Add transaction</button>
                <p className="text-sm text-ink/55">一番手早く画面の変化を確認できます。</p>
              </div>
              {transactionState.message ? (
                <p className={statusClassName(transactionState.kind)}>{transactionState.message}</p>
              ) : null}
            </form>
          ) : null}

          {activeTab === "scheduled" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    await postJson("/api/scheduled-events", {
                      name: String(formData.get("name") ?? ""),
                      startDate: String(formData.get("startDate") ?? ""),
                      recurrenceRule: String(formData.get("recurrenceRule") ?? "") || null,
                      amount: String(formData.get("amount") ?? ""),
                      orderIndex: Number(formData.get("orderIndex") ?? 0),
                      tags: {
                        category: toTagList(String(formData.get("category") ?? "")),
                        project: toTagList(String(formData.get("project") ?? ""))
                      }
                    });
                    event.currentTarget.reset();
                    setScheduledState({ message: "Scheduled event created.", kind: "success" });
                    router.refresh();
                  } catch (error) {
                    setScheduledState({
                      message:
                        error instanceof Error ? error.message : "Failed to create scheduled event.",
                      kind: "error"
                    });
                  }
                });
              }}
            >
              <FormIntro
                badge="Preview impact"
                title="Scheduled event"
                description="家賃や旅行など、将来日に効くイベントを登録します。単発でも定期でも扱えるので preview で差分が見やすい入力です。"
              />
              <Field label="Name">
                <input name="name" placeholder="Rent or trip" required className={fieldClassName()} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Start date">
                  <input
                    name="startDate"
                    type="date"
                    defaultValue="2026-03-27"
                    required
                    className={fieldClassName()}
                  />
                </Field>
                <Field label="Amount">
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="-85000"
                    required
                    className={fieldClassName()}
                  />
                </Field>
              </div>
              <Field label="Recurrence rule" hint="任意">
                <input name="recurrenceRule" placeholder="FREQ=MONTHLY" className={fieldClassName()} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Category">
                  <input name="category" placeholder="家賃" className={fieldClassName()} />
                </Field>
                <Field label="Project" hint="任意">
                  <input name="project" placeholder="春の旅行" className={fieldClassName()} />
                </Field>
              </div>
              <Field label="Order index" hint="同日内の順序">
                <input
                  name="orderIndex"
                  type="number"
                  defaultValue="0"
                  min="0"
                  className={fieldClassName()}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className={submitClassName()}>Add scheduled event</button>
                <p className="text-sm text-ink/55">予定系の確認に一番効くフォームです。</p>
              </div>
              {scheduledState.message ? (
                <p className={statusClassName(scheduledState.kind)}>{scheduledState.message}</p>
              ) : null}
            </form>
          ) : null}

          {activeTab === "balance" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    await postJson("/api/balance-events", {
                      date: String(formData.get("date") ?? ""),
                      fromAccountId: String(formData.get("fromAccountId") ?? "") || null,
                      toAccountId: String(formData.get("toAccountId") ?? "") || null,
                      amount: String(formData.get("amount") ?? ""),
                      memo: String(formData.get("memo") ?? ""),
                      orderIndex: Number(formData.get("orderIndex") ?? 0)
                    });
                    event.currentTarget.reset();
                    setBalanceEventState({ message: "Balance event created.", kind: "success" });
                    router.refresh();
                  } catch (error) {
                    setBalanceEventState({
                      message:
                        error instanceof Error ? error.message : "Failed to create balance event.",
                      kind: "error"
                    });
                  }
                });
              }}
            >
              <FormIntro
                badge="Transfer"
                title="Balance event"
                description="口座間の資金移動や補正用です。source / destination はどちらか片方だけでも送れます。"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="From account" hint="任意">
                  <select
                    name="fromAccountId"
                    defaultValue={accounts[0]?.id ?? ""}
                    className={fieldClassName()}
                  >
                    <option value="">No source</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="To account" hint="任意">
                  <select
                    name="toAccountId"
                    defaultValue={accounts[1]?.id ?? accounts[0]?.id ?? ""}
                    className={fieldClassName()}
                  >
                    <option value="">No destination</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Date">
                  <input
                    name="date"
                    type="date"
                    defaultValue="2026-03-21"
                    required
                    className={fieldClassName()}
                  />
                </Field>
                <Field label="Amount">
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    required
                    className={fieldClassName()}
                  />
                </Field>
              </div>
              <Field label="Memo" hint="任意">
                <input name="memo" placeholder="Move travel cash" className={fieldClassName()} />
              </Field>
              <Field label="Order index" hint="同日内の順序">
                <input
                  name="orderIndex"
                  type="number"
                  defaultValue="0"
                  min="0"
                  className={fieldClassName()}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className={submitClassName()}>Add balance event</button>
                <p className="text-sm text-ink/55">残高だけを素早く動かしたい時に使います。</p>
              </div>
              {balanceEventState.message ? (
                <p className={statusClassName(balanceEventState.kind)}>
                  {balanceEventState.message}
                </p>
              ) : null}
            </form>
          ) : null}

          {activeTab === "card" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    await postJson("/api/card-payments", {
                      creditCardId: String(formData.get("creditCardId") ?? ""),
                      sourceAccountId: String(formData.get("sourceAccountId") ?? "") || null,
                      date: String(formData.get("date") ?? ""),
                      amount: String(formData.get("amount") ?? ""),
                      memo: String(formData.get("memo") ?? ""),
                      orderIndex: Number(formData.get("orderIndex") ?? 0)
                    });
                    event.currentTarget.reset();
                    setCardPaymentState({ message: "Card payment created.", kind: "success" });
                    router.refresh();
                  } catch (error) {
                    setCardPaymentState({
                      message:
                        error instanceof Error ? error.message : "Failed to create card payment.",
                      kind: "error"
                    });
                  }
                });
              }}
            >
              <FormIntro
                badge="Cards"
                title="Card payment"
                description="カード利用残高を実際の引き落としとして登録します。credit card が未登録の時はこのタブを無効化しています。"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Credit card">
                  <select
                    name="creditCardId"
                    required
                    className={fieldClassName()}
                    defaultValue={creditCards[0]?.id ?? ""}
                  >
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Source account" hint="任意">
                  <select
                    name="sourceAccountId"
                    defaultValue={accounts[0]?.id ?? ""}
                    className={fieldClassName()}
                  >
                    <option value="">No source account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Date">
                  <input
                    name="date"
                    type="date"
                    defaultValue="2026-03-25"
                    required
                    className={fieldClassName()}
                  />
                </Field>
                <Field label="Amount">
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="48000"
                    required
                    className={fieldClassName()}
                  />
                </Field>
              </div>
              <Field label="Memo" hint="任意">
                <input name="memo" placeholder="Card settlement" className={fieldClassName()} />
              </Field>
              <Field label="Order index" hint="同日内の順序">
                <input
                  name="orderIndex"
                  type="number"
                  defaultValue="0"
                  min="0"
                  className={fieldClassName()}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className={submitClassName()}>Add card payment</button>
                <p className="text-sm text-ink/55">カード残高の現実支出への接続に使います。</p>
              </div>
              {cardPaymentState.message ? (
                <p className={statusClassName(cardPaymentState.kind)}>{cardPaymentState.message}</p>
              ) : null}
            </form>
          ) : null}

          {activeTab === "account" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                startTransition(async () => {
                  try {
                    await postJson("/api/accounts", {
                      name: String(formData.get("name") ?? ""),
                      type: String(formData.get("type") ?? "bank"),
                      currency: String(formData.get("currency") ?? "JPY"),
                      initialBalance: String(formData.get("initialBalance") ?? "0")
                    });
                    event.currentTarget.reset();
                    setAccountState({ message: "Account created.", kind: "success" });
                    router.refresh();
                  } catch (error) {
                    setAccountState({
                      message: error instanceof Error ? error.message : "Failed to create account.",
                      kind: "error"
                    });
                  }
                });
              }}
            >
              <FormIntro
                badge="Setup"
                title="Account"
                description="検証用の口座を増やす時のフォームです。新しい残高の器を作ってから transaction や balance event を入れる流れに向いています。"
              />
              <Field label="Name">
                <input name="name" placeholder="Main Savings" required className={fieldClassName()} />
              </Field>
              <Field label="Type">
                <select name="type" defaultValue="bank" className={fieldClassName()}>
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Currency">
                  <input
                    name="currency"
                    defaultValue="JPY"
                    required
                    className={`${fieldClassName()} uppercase`}
                  />
                </Field>
                <Field label="Initial balance">
                  <input
                    name="initialBalance"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                    required
                    className={fieldClassName()}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className={submitClassName()}>Add account</button>
                <p className="text-sm text-ink/55">土台を増やしたい時だけ使えば十分です。</p>
              </div>
              {accountState.message ? (
                <p className={statusClassName(accountState.kind)}>{accountState.message}</p>
              ) : null}
            </form>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.6rem] border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">Quick facts</p>
            <div className="mt-4 grid gap-3">
              {quickFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-2xl border border-ink/10 bg-sand/50 px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-ink/48">{fact.label}</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{fact.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">
              Available accounts
            </p>
            <div className="mt-4 space-y-2">
              {accounts.length === 0 ? (
                <EmptyState
                  title="口座がまだありません"
                  body="Account タブで 1 つ作っておくと、balance event や card payment の選択肢が増えます。"
                />
              ) : (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-ink/10 bg-sand/45 px-4 py-3"
                  >
                    <p className="font-medium text-ink">{account.name}</p>
                    <p className="mt-1 text-sm text-ink/55">{account.type}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">
              Available cards
            </p>
            <div className="mt-4 space-y-2">
              {creditCards.length === 0 ? (
                <EmptyState
                  title="カードがまだありません"
                  body="Card payment は credit card データが入ってから使えます。今は transaction と scheduled event から触るのが自然です。"
                />
              ) : (
                creditCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-2xl border border-ink/10 bg-sand/45 px-4 py-3"
                  >
                    <p className="font-medium text-ink">{card.name}</p>
                    <p className="mt-1 text-sm text-ink/55">{card.id}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
