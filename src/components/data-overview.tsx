import { listAccounts } from "@/src/infrastructure/repositories/account-repository";
import { listScheduledEvents } from "@/src/infrastructure/repositories/scheduled-event-repository";
import { listTransactions } from "@/src/infrastructure/repositories/transaction-repository";

function formatYen(value: number | string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function sumAmount(values: Array<{ amount: string }>) {
  return values.reduce((sum, item) => sum + Number(item.amount), 0);
}

export async function DataOverview() {
  const [accounts, transactions, scheduledEvents] = await Promise.all([
    listAccounts().catch(() => []),
    listTransactions({ startDate: "2026-03-01", endDate: "2026-03-31" }).catch(() => []),
    listScheduledEvents({ startDate: "2026-03-01", endDate: "2026-03-31" }).catch(() => [])
  ]);

  const totalInitialBalance = accounts.reduce(
    (sum, account) => sum + Number(account.initialBalance),
    0
  );
  const monthlyNet = sumAmount(transactions);
  const scheduledNet = sumAmount(scheduledEvents);

  return (
    <section className="rounded-[2rem] border border-white/65 bg-white/82 p-5 shadow-panel backdrop-blur md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brass">
            Data overview
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">いま入っているデータを俯瞰する</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/66">
            追加したデータがどこまで反映されたかを点検する場所です。テスト中に見るべき数字と一覧だけを先に並べています。
          </p>
        </div>
        <div className="rounded-full border border-ink/10 bg-sand/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
          server component
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-ink/10 bg-sand/55 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Accounts</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{accounts.length}</p>
          <p className="mt-1 text-sm text-ink/58">{formatYen(totalInitialBalance)}</p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/10 bg-sand/55 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Transactions</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{transactions.length}</p>
          <p className="mt-1 text-sm text-ink/58">monthly net {formatYen(monthlyNet)}</p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/10 bg-sand/55 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Scheduled</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{scheduledEvents.length}</p>
          <p className="mt-1 text-sm text-ink/58">future net {formatYen(scheduledNet)}</p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/10 bg-ink px-5 py-4 text-sand">
          <p className="text-xs uppercase tracking-[0.18em] text-sand/55">How to read</p>
          <p className="mt-2 text-lg font-semibold">入力したらここで確認</p>
          <p className="mt-2 text-sm leading-6 text-sand/72">
            上の件数が変わり、下の一覧に内容が出てくればデータ経路はほぼ確認完了です。
          </p>
        </article>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.7rem] border border-ink/10 bg-[#faf7f1] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
                Account balances
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">残高の土台</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink/55">
              {accounts.length} items
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-5 py-6 text-sm leading-7 text-ink/60">
                まだ口座がありません。Account タブから 1 件追加すると、ここがベースの残高一覧になります。
              </div>
            ) : (
              accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-4"
                >
                  <div>
                    <p className="font-medium text-ink">{account.name}</p>
                    <p className="mt-1 text-sm text-ink/52">{account.type}</p>
                  </div>
                  <p className="text-lg font-semibold text-ink">
                    {formatYen(account.initialBalance)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="grid gap-6">
          <section className="rounded-[1.7rem] border border-ink/10 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">
                  Recent transactions
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">直近の実績</p>
              </div>
              <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink/55">
                March 2026
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {transactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink/15 bg-sand/35 px-5 py-6 text-sm leading-7 text-ink/60">
                  Transaction を追加すると、ここに日付・メモ・金額が並びます。
                </div>
              ) : (
                transactions.slice(0, 6).map((transaction) => {
                  const amount = Number(transaction.amount);

                  return (
                    <div
                      key={transaction.id}
                      className="grid gap-2 rounded-2xl border border-ink/10 bg-sand/28 px-4 py-4 md:grid-cols-[110px_1fr_auto]"
                    >
                      <p className="font-medium text-ink">{transaction.date}</p>
                      <div>
                        <p className="text-ink">{transaction.memo || "No memo"}</p>
                        <p className="mt-1 text-sm text-ink/52">
                          {Array.isArray(transaction.tags.category) &&
                          transaction.tags.category.length > 0
                            ? transaction.tags.category.join(", ")
                            : "untagged"}
                        </p>
                      </div>
                      <p
                        className={`font-semibold ${
                          amount < 0 ? "text-ember" : "text-moss"
                        }`}
                      >
                        {formatYen(transaction.amount)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-ink/10 bg-ink p-5 text-sand">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand/55">
                  Scheduled events
                </p>
                <p className="mt-2 text-lg font-semibold text-white">将来に効く予定</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sand/65">
                preview linked
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {scheduledEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-6 text-sm leading-7 text-sand/70">
                  Scheduled event を追加すると、ここに予定支出やイベントが並びます。
                </div>
              ) : (
                scheduledEvents.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-4"
                  >
                    <div>
                      <p className="font-medium text-white">{event.name}</p>
                      <p className="mt-1 text-sm text-sand/65">
                        {event.startDate}
                        {event.recurrenceRule ? ` / ${event.recurrenceRule}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-sand">{formatYen(event.amount)}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
