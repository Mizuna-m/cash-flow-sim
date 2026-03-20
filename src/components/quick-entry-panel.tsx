"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountRecord } from "@/src/infrastructure/repositories/account-repository";
import type { CreditCardRecord } from "@/src/infrastructure/repositories/credit-card-repository";

type EntryState = {
  message: string;
  kind: "idle" | "success" | "error";
};

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

const accountTypes = ["cash", "bank", "credit", "loan", "investment"] as const;

type QuickEntryPanelProps = {
  accounts: AccountRecord[];
  creditCards: CreditCardRecord[];
};

export function QuickEntryPanel({ accounts, creditCards }: QuickEntryPanelProps) {
  const router = useRouter();
  const [accountState, setAccountState] = useState<EntryState>(initialState);
  const [transactionState, setTransactionState] = useState<EntryState>(initialState);
  const [scheduledState, setScheduledState] = useState<EntryState>(initialState);
  const [cardPaymentState, setCardPaymentState] = useState<EntryState>(initialState);
  const [balanceEventState, setBalanceEventState] = useState<EntryState>(initialState);

  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <form
        className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur"
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
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">Quick entry</p>
        <h2 className="mt-2 text-2xl font-semibold">Account</h2>
        <div className="mt-5 grid gap-3">
          <input
            name="name"
            placeholder="Main Savings"
            required
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
          <select
            name="type"
            defaultValue="bank"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          >
            {accountTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="currency"
              defaultValue="JPY"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm uppercase outline-none"
            />
            <input
              name="initialBalance"
              type="number"
              step="0.01"
              defaultValue="0"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>
        <button className="mt-5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Add account
        </button>
        {accountState.message ? (
          <p
            className={`mt-3 text-sm ${accountState.kind === "error" ? "text-ember" : "text-moss"}`}
          >
            {accountState.message}
          </p>
        ) : null}
      </form>

      <form
        className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur"
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
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">Quick entry</p>
        <h2 className="mt-2 text-2xl font-semibold">Transaction</h2>
        <div className="mt-5 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              name="date"
              type="date"
              defaultValue="2026-03-21"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              placeholder="-2500"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
          </div>
          <input
            name="memo"
            placeholder="Lunch or salary"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="category"
              placeholder="食費, 交通費"
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
            <input
              name="project"
              placeholder="春の旅行"
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
          </div>
          <input
            name="orderIndex"
            type="number"
            defaultValue="0"
            min="0"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
        </div>
        <button className="mt-5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Add transaction
        </button>
        {transactionState.message ? (
          <p
            className={`mt-3 text-sm ${transactionState.kind === "error" ? "text-ember" : "text-moss"}`}
          >
            {transactionState.message}
          </p>
        ) : null}
      </form>

      <form
        className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur"
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
                message: error instanceof Error ? error.message : "Failed to create scheduled event.",
                kind: "error"
              });
            }
          });
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">Quick entry</p>
        <h2 className="mt-2 text-2xl font-semibold">Scheduled event</h2>
        <div className="mt-5 grid gap-3">
          <input
            name="name"
            placeholder="Rent or trip"
            required
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="startDate"
              type="date"
              defaultValue="2026-03-27"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              placeholder="-85000"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
          </div>
          <input
            name="recurrenceRule"
            placeholder="FREQ=MONTHLY"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="category"
              placeholder="家賃"
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
            <input
              name="project"
              placeholder="春の旅行"
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
          </div>
          <input
            name="orderIndex"
            type="number"
            defaultValue="0"
            min="0"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
        </div>
        <button className="mt-5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Add scheduled event
        </button>
        {scheduledState.message ? (
          <p
            className={`mt-3 text-sm ${scheduledState.kind === "error" ? "text-ember" : "text-moss"}`}
          >
            {scheduledState.message}
          </p>
        ) : null}
      </form>

      <form
        className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur"
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
                message: error instanceof Error ? error.message : "Failed to create card payment.",
                kind: "error"
              });
            }
          });
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">Quick entry</p>
        <h2 className="mt-2 text-2xl font-semibold">Card payment</h2>
        <div className="mt-5 grid gap-3">
          <select
            name="creditCardId"
            required
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            defaultValue={creditCards[0]?.id ?? ""}
          >
            {creditCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
          <select
            name="sourceAccountId"
            defaultValue={accounts[0]?.id ?? ""}
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          >
            <option value="">No source account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="date"
              type="date"
              defaultValue="2026-03-25"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              placeholder="48000"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
          </div>
          <input
            name="memo"
            placeholder="Card settlement"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
          <input
            name="orderIndex"
            type="number"
            defaultValue="0"
            min="0"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
        </div>
        <button className="mt-5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Add card payment
        </button>
        {cardPaymentState.message ? (
          <p
            className={`mt-3 text-sm ${cardPaymentState.kind === "error" ? "text-ember" : "text-moss"}`}
          >
            {cardPaymentState.message}
          </p>
        ) : null}
      </form>

      <form
        className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur"
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
                message: error instanceof Error ? error.message : "Failed to create balance event.",
                kind: "error"
              });
            }
          });
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">Quick entry</p>
        <h2 className="mt-2 text-2xl font-semibold">Balance event</h2>
        <div className="mt-5 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              name="fromAccountId"
              defaultValue={accounts[0]?.id ?? ""}
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            >
              <option value="">No source</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select
              name="toAccountId"
              defaultValue={accounts[1]?.id ?? accounts[0]?.id ?? ""}
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            >
              <option value="">No destination</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="date"
              type="date"
              defaultValue="2026-03-21"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              placeholder="10000"
              required
              className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
            />
          </div>
          <input
            name="memo"
            placeholder="Move travel cash"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
          <input
            name="orderIndex"
            type="number"
            defaultValue="0"
            min="0"
            className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-3 text-sm outline-none"
          />
        </div>
        <button className="mt-5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Add balance event
        </button>
        {balanceEventState.message ? (
          <p
            className={`mt-3 text-sm ${balanceEventState.kind === "error" ? "text-ember" : "text-moss"}`}
          >
            {balanceEventState.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
