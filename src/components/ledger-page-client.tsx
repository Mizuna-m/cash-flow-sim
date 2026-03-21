"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import type {
  Account,
  BalanceEvent,
  BalanceEventCreateRequest,
  CardPayment,
  CardPaymentCreateRequest,
  CreditCard,
  DashboardPayload,
  ScheduledEvent,
  ScheduledEventCreateRequest,
  Transaction,
  TransactionCreateRequest
} from "@/src/lib/openapi-contract";

type ComposerTab = "scheduled" | "transaction" | "payment" | "balance";

type LedgerItem = {
  id: string;
  kind: "scheduled" | "transaction" | "card" | "balance";
  date: string;
  title: string;
  detail: string;
  amount: string;
  actionLabel: string;
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function parseTagField(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTags(category: string, project: string) {
  const tags: Record<string, unknown> = {};
  if (category.trim()) tags.category = parseTagField(category);
  if (project.trim()) tags.project = parseTagField(project);
  return tags;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

async function deleteJson<T>(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

async function patchJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

function buildLedgerItems(
  transactions: Transaction[],
  scheduledEvents: ScheduledEvent[],
  balanceEvents: BalanceEvent[],
  cardPayments: CardPayment[],
  accounts: Account[],
  creditCards: CreditCard[]
): LedgerItem[] {
  const accountById = new Map(accounts.map((account) => [account.id, account.name]));
  const cardById = new Map(creditCards.map((card) => [card.id, card.name]));

  return [
    ...scheduledEvents.map((item) => ({
      id: item.id,
      kind: "scheduled" as const,
      date: item.startDate,
      title: item.name,
      detail:
        `${accountById.get(item.accountId ?? "") ?? "口座未指定"} / ${
          item.recurrenceRule || "scheduled event"
        }`,
      amount: item.amount,
      actionLabel: item.isActive ? "無効化" : "有効化"
    })),
    ...transactions.map((item) => ({
      id: item.id,
      kind: "transaction" as const,
      date: item.date,
      title: item.memo || "transaction",
      detail: accountById.get(item.accountId ?? "") ?? "口座未指定",
      amount: item.amount,
      actionLabel: "削除"
    })),
    ...cardPayments.map((item) => ({
      id: item.id,
      kind: "card" as const,
      date: item.date,
      title: "カード引落",
      detail: `${cardById.get(item.creditCardId) ?? "card"} / ${
        accountById.get(item.sourceAccountId ?? "") ?? "口座未設定"
      }`,
      amount: item.amount,
      actionLabel: "削除"
    })),
    ...balanceEvents.map((item) => ({
      id: item.id,
      kind: "balance" as const,
      date: item.date,
      title: item.memo || "資金移動",
      detail: `${accountById.get(item.fromAccountId ?? "") ?? "外部"} -> ${
        accountById.get(item.toAccountId ?? "") ?? "外部"
      }`,
      amount: item.amount,
      actionLabel: "削除"
    }))
  ].sort((left, right) => {
    if (left.date === right.date) return right.id.localeCompare(left.id);
    return right.date.localeCompare(left.date);
  });
}

export function LedgerPageClient({ initialData }: { initialData: DashboardPayload }) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<ComposerTab>("scheduled");
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState("");
  const [pendingActionItem, setPendingActionItem] = useState<LedgerItem | null>(null);
  const ledgerItems = useMemo(
    () =>
      buildLedgerItems(
        data.transactions,
        data.scheduledEvents,
        data.balanceEvents,
        data.cardPayments,
        data.accounts,
        data.creditCards
      ),
    [data]
  );
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ledgerItems;
    return ledgerItems.filter((item) =>
      `${item.date} ${item.title} ${item.detail} ${item.kind}`.toLowerCase().includes(q)
    );
  }, [ledgerItems, search]);

  async function refreshLists() {
    const query = new URLSearchParams({
      startDate: data.simulation.startDate,
      endDate: data.simulation.endDate
    }).toString();
    const [transactions, scheduledEvents, balanceEvents, cardPayments] = await Promise.all([
      fetchJson<{ transactions: Transaction[] }>(`/api/transactions?${query}`),
      fetchJson<{ scheduledEvents: ScheduledEvent[] }>(`/api/scheduled-events?${query}`),
      fetchJson<{ balanceEvents: BalanceEvent[] }>(`/api/balance-events?${query}`),
      fetchJson<{ cardPayments: CardPayment[] }>(`/api/card-payments?${query}`)
    ]);

    setData((current) => ({
      ...current,
      transactions: transactions.transactions,
      scheduledEvents: scheduledEvents.scheduledEvents,
      balanceEvents: balanceEvents.balanceEvents,
      cardPayments: cardPayments.cardPayments
    }));
  }

  async function executeAction(item: LedgerItem) {
    try {
      if (item.kind === "scheduled") {
        const target = data.scheduledEvents.find((event) => event.id === item.id);
        if (!target) return;
        await patchJson(`/api/scheduled-events/${item.id}`, { isActive: !target.isActive });
      } else if (item.kind === "transaction") {
        await deleteJson(`/api/transactions/${item.id}`);
      } else if (item.kind === "card") {
        await deleteJson(`/api/card-payments/${item.id}`);
      } else {
        await deleteJson(`/api/balance-events/${item.id}`);
      }
      await refreshLists();
      setFlash("台帳を更新しました。");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "操作に失敗しました");
    } finally {
      setPendingActionItem(null);
    }
  }

  async function submitScheduled(formData: FormData) {
    const payload: ScheduledEventCreateRequest = {
      name: String(formData.get("name") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? "") || null,
      recurrenceRule: String(formData.get("recurrenceRule") ?? "") || null,
      amount: String(formData.get("amount") ?? ""),
      accountId: String(formData.get("accountId") ?? "") || null,
      orderIndex: Number(formData.get("orderIndex") ?? 0),
      isActive: formData.get("isActive") === "on",
      cardId: String(formData.get("cardId") ?? "") || null,
      tags: buildTags(String(formData.get("category") ?? ""), String(formData.get("project") ?? ""))
    };
    await postJson("/api/scheduled-events", payload);
  }

  async function submitTransaction(formData: FormData) {
    const payload: TransactionCreateRequest = {
      date: String(formData.get("date") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      accountId: String(formData.get("accountId") ?? "") || null,
      memo: String(formData.get("memo") ?? ""),
      orderIndex: Number(formData.get("orderIndex") ?? 0),
      cardId: String(formData.get("cardId") ?? "") || null,
      tags: buildTags(String(formData.get("category") ?? ""), String(formData.get("project") ?? ""))
    };
    await postJson("/api/transactions", payload);
  }

  async function submitPayment(formData: FormData) {
    const payload: CardPaymentCreateRequest = {
      creditCardId: String(formData.get("creditCardId") ?? ""),
      sourceAccountId: String(formData.get("sourceAccountId") ?? "") || null,
      date: String(formData.get("date") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      memo: String(formData.get("memo") ?? ""),
      orderIndex: Number(formData.get("orderIndex") ?? 0)
    };
    await postJson("/api/card-payments", payload);
  }

  async function submitBalance(formData: FormData) {
    const payload: BalanceEventCreateRequest = {
      date: String(formData.get("date") ?? ""),
      fromAccountId: String(formData.get("fromAccountId") ?? "") || null,
      toAccountId: String(formData.get("toAccountId") ?? "") || null,
      amount: String(formData.get("amount") ?? ""),
      memo: String(formData.get("memo") ?? ""),
      orderIndex: Number(formData.get("orderIndex") ?? 0)
    };
    await postJson("/api/balance-events", payload);
  }

  async function submitWithRefresh(action: (formData: FormData) => Promise<void>, formData: FormData) {
    try {
      await action(formData);
      await refreshLists();
      setFlash("データを保存しました。");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "保存に失敗しました");
    }
  }

  return (
    <section className="wire-panel wire-section">
      <ConfirmDialog
        open={pendingActionItem !== null}
        title={
          pendingActionItem?.kind === "scheduled"
            ? `${pendingActionItem.actionLabel === "無効化" ? "予定を無効化" : "予定を再有効化"}`
            : "削除の確認"
        }
        description={
          pendingActionItem
            ? pendingActionItem.kind === "scheduled"
              ? `${pendingActionItem.title} を${pendingActionItem.actionLabel === "無効化" ? "無効化" : "再有効化"}します。`
              : `${pendingActionItem.title} を削除します。この操作は元に戻せません。`
            : ""
        }
        confirmLabel={
          pendingActionItem?.kind === "scheduled"
            ? pendingActionItem.actionLabel === "無効化"
              ? "無効化する"
              : "再有効化する"
            : "削除する"
        }
        tone={pendingActionItem?.kind === "scheduled" ? "default" : "danger"}
        onCancel={() => setPendingActionItem(null)}
        onConfirm={() => {
          if (pendingActionItem) {
            void executeAction(pendingActionItem);
          }
        }}
      />
      <div className="wire-section-head">
        <div>
          <h2 className="wire-section-title">左: 台帳 / 右: 入力</h2>
          <p className="wire-section-meta">
            口座追加はここではなく settings。台帳は表、操作は削除または無効化まで。
          </p>
        </div>
      </div>

      <div className="wire-entry-layout">
        <div>
          <div className="wire-table-header wire-table-header-ledger">
            <div>日付</div>
            <div>種別</div>
            <div>内容</div>
            <div>金額</div>
            <div>操作</div>
          </div>
          <div className="wire-table wire-table-spacious">
            {filteredItems.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="wire-table-row wire-table-row-ledger">
                <div>{item.date}</div>
                <div>{item.kind}</div>
                <div>
                  <strong>{item.title}</strong>
                  <div className="wire-row-note">{item.detail}</div>
                </div>
                <div className={Number(item.amount) < 0 ? "danger" : "ok"}>
                  {formatCurrency(item.amount)}
                </div>
                <div>
                  <button type="button" className="wire-small-button" onClick={() => setPendingActionItem(item)}>
                    {item.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="wire-box wire-form-panel">
          <div className="wire-box-head">
            <span className="wire-label">Entry Panel</span>
          </div>
          <div className="wire-form-toolbar">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="wire-search-field"
              placeholder="検索 / category / project"
            />
          </div>
          <div className="wire-tabs">
            {[
              ["scheduled", "イベント追加"],
              ["transaction", "実績入力"],
              ["payment", "引落入力"],
              ["balance", "資金移動"]
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as ComposerTab)}
                className={`wire-tab ${tab === id ? "active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "scheduled" ? (
            <LedgerForm action={(formData) => void submitWithRefresh(submitScheduled, formData)}>
              <div className="wire-form-grid">
                <input name="name" className="wire-input" placeholder="イベント名" autoFocus />
                <input name="amount" type="number" step="0.01" className="wire-input" placeholder="金額" />
                <input name="startDate" type="date" className="wire-input" defaultValue={data.simulation.startDate} />
                <input name="project" className="wire-input" placeholder="Project" />
                <input name="category" className="wire-input" placeholder="Category" />
                <select name="accountId" className="wire-input" defaultValue="">
                  <option value="">口座未指定</option>
                  {data.accounts
                    .filter((account) => account.type === "cash" || account.type === "bank")
                    .map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                </select>
                <select name="cardId" className="wire-input" defaultValue="">
                  <option value="">カードなし</option>
                  {data.creditCards.map((card) => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
                <input name="recurrenceRule" className="wire-input" placeholder="繰り返しルール" />
                <input name="endDate" type="date" className="wire-input" />
                <input name="orderIndex" type="number" min="0" defaultValue="0" className="wire-input" placeholder="順序" />
                <label className="wire-check wire-input-wide">
                  <input name="isActive" type="checkbox" defaultChecked />
                  有効な予定として保存
                </label>
              </div>
            </LedgerForm>
          ) : null}

          {tab === "transaction" ? (
            <LedgerForm action={(formData) => void submitWithRefresh(submitTransaction, formData)}>
              <div className="wire-form-grid">
                <input name="date" type="date" className="wire-input" defaultValue={data.simulation.startDate} autoFocus />
                <input name="amount" type="number" step="0.01" className="wire-input" placeholder="金額" />
                <input name="category" className="wire-input" placeholder="Category" />
                <input name="project" className="wire-input" placeholder="Project" />
                <input name="memo" className="wire-input wire-input-wide" placeholder="メモ" />
                <select name="accountId" className="wire-input" defaultValue="">
                  <option value="">口座未指定</option>
                  {data.accounts
                    .filter((account) => account.type === "cash" || account.type === "bank")
                    .map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                </select>
                <select name="cardId" className="wire-input" defaultValue="">
                  <option value="">カードなし</option>
                  {data.creditCards.map((card) => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
                <input name="orderIndex" type="number" min="0" defaultValue="0" className="wire-input" placeholder="順序" />
              </div>
            </LedgerForm>
          ) : null}

          {tab === "payment" ? (
            <LedgerForm action={(formData) => void submitWithRefresh(submitPayment, formData)}>
              <div className="wire-form-grid">
                <select name="creditCardId" className="wire-input" defaultValue={data.creditCards[0]?.id ?? ""} autoFocus>
                  {data.creditCards.map((card) => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
                <select name="sourceAccountId" className="wire-input" defaultValue="">
                  <option value="">引落口座未指定</option>
                  {data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
                <input name="date" type="date" className="wire-input" defaultValue={data.simulation.startDate} />
                <input name="amount" type="number" step="0.01" className="wire-input" placeholder="金額" />
                <input name="memo" className="wire-input wire-input-wide" placeholder="メモ" />
                <input name="orderIndex" type="number" min="0" defaultValue="0" className="wire-input" placeholder="順序" />
              </div>
            </LedgerForm>
          ) : null}

          {tab === "balance" ? (
            <LedgerForm action={(formData) => void submitWithRefresh(submitBalance, formData)}>
              <div className="wire-form-grid">
                <input name="date" type="date" className="wire-input" defaultValue={data.simulation.startDate} autoFocus />
                <input name="amount" type="number" step="0.01" className="wire-input" placeholder="金額" />
                <select name="fromAccountId" className="wire-input" defaultValue="">
                  <option value="">出金元なし / 外部</option>
                  {data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
                <select name="toAccountId" className="wire-input" defaultValue="">
                  <option value="">入金先なし / 外部</option>
                  {data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
                <input name="memo" className="wire-input wire-input-wide" placeholder="メモ" />
                <input name="orderIndex" type="number" min="0" defaultValue="0" className="wire-input" placeholder="順序" />
              </div>
            </LedgerForm>
          ) : null}

          <div className="wire-kbd-row">
            <span className="wire-kbd">Tab</span>
            <span className="wire-kbd">Shift+Tab</span>
            <span className="wire-kbd">Enter 保存</span>
            <span className="wire-kbd">Ctrl+Enter 保存</span>
          </div>
          {flash ? <div className="wire-flash">{flash}</div> : null}
        </div>
      </div>
    </section>
  );
}

function LedgerForm({
  action,
  children
}: {
  action: (formData: FormData) => void;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
      <div className="wire-form-actions">
        <button type="submit" className="wire-button">保存</button>
      </div>
    </form>
  );
}
