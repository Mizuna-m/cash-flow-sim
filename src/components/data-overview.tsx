import { listAccounts } from "@/src/infrastructure/repositories/account-repository";
import { listScheduledEvents } from "@/src/infrastructure/repositories/scheduled-event-repository";
import { listTransactions } from "@/src/infrastructure/repositories/transaction-repository";

function formatYen(value: string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export async function DataOverview() {
  const [accounts, transactions, scheduledEvents] = await Promise.all([
    listAccounts().catch(() => []),
    listTransactions({ startDate: "2026-03-01", endDate: "2026-03-31" }).catch(() => []),
    listScheduledEvents({ startDate: "2026-03-01", endDate: "2026-03-31" }).catch(() => [])
  ]);

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[2rem] border border-white/60 bg-white/75 p-8 shadow-panel backdrop-blur">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">
              Data overview
            </p>
            <h2 className="mt-2 text-3xl font-semibold">seed から読めているもの</h2>
          </div>
          <p className="text-sm text-ink/60">server component</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl bg-sand/70 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/55">Accounts</p>
            <p className="mt-3 text-3xl font-semibold">{accounts.length}</p>
          </article>
          <article className="rounded-2xl bg-sand/70 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/55">Transactions</p>
            <p className="mt-3 text-3xl font-semibold">{transactions.length}</p>
          </article>
          <article className="rounded-2xl bg-sand/70 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/55">Scheduled</p>
            <p className="mt-3 text-3xl font-semibold">{scheduledEvents.length}</p>
          </article>
        </div>

        <div className="mt-6 space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-5 py-4"
            >
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-ink/55">{account.type}</p>
              </div>
              <p className="font-semibold">{formatYen(account.initialBalance)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        <section className="rounded-[2rem] border border-white/60 bg-white/75 p-8 shadow-panel backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">
                Recent transactions
              </p>
              <h2 className="mt-2 text-2xl font-semibold">3月の実績入力</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-2 rounded-2xl border border-ink/10 bg-white px-5 py-4 md:grid-cols-[120px_1fr_auto]"
              >
                <p className="font-medium">{transaction.date}</p>
                <div>
                  <p>{transaction.memo || "No memo"}</p>
                  <p className="text-sm text-ink/55">
                    {Array.isArray(transaction.tags.category)
                      ? transaction.tags.category.join(", ")
                      : "untagged"}
                  </p>
                </div>
                <p className="font-semibold">{formatYen(transaction.amount)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/60 bg-ink p-8 text-sand shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sand/70">
            Scheduled events
          </p>
          <div className="mt-5 space-y-3">
            {scheduledEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-sand/70">
                    {event.startDate}
                    {event.recurrenceRule ? ` / ${event.recurrenceRule}` : ""}
                  </p>
                </div>
                <p className="font-semibold">{formatYen(event.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
