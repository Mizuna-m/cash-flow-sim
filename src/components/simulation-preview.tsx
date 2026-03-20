import { buildDatabaseSimulation } from "@/src/application/services/build-database-simulation";
import { buildDemoSimulation } from "@/src/application/services/build-demo-simulation";

function formatYen(value: string) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export async function SimulationPreview() {
  const simulation = await buildDatabaseSimulation().catch(() => ({
    snapshots: buildDemoSimulation(),
    source: "demo" as const,
    startDate: "2026-03-01",
    endDate: "2026-03-06"
  }));
  const { snapshots, source, startDate, endDate } = simulation;
  const shortDays = snapshots.filter((snapshot) => snapshot.short).length;
  const latestSnapshot = snapshots.at(-1);
  const minimumActual = snapshots.reduce((minimum, snapshot) => {
    return Number(snapshot.actualBalance) < Number(minimum.actualBalance) ? snapshot : minimum;
  }, snapshots[0]);

  return (
    <section className="rounded-[2rem] border border-white/65 bg-white/82 p-5 shadow-panel backdrop-blur md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brass">
            Simulation preview
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">将来残高のざっくり確認</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/66">
            入力したデータがどう残高へ効くかを見るための面です。まずは short の有無と、最低残高がどこに来るかだけ分かれば十分です。
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-ink/10 bg-sand/45 px-5 py-4 text-sm leading-7 text-ink/68">
          {source === "database"
            ? `${startDate} から ${endDate} までを DB データで描画中`
            : "DB 取得失敗時は demo データで fallback 表示中"}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_0.8fr_0.8fr_1fr]">
        <article className="rounded-[1.5rem] border border-ink/10 bg-sand/55 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Source</p>
          <p className="mt-2 text-2xl font-semibold capitalize text-ink">{source}</p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/10 bg-sand/55 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Short days</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{shortDays}</p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/10 bg-sand/55 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Latest actual</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {latestSnapshot ? formatYen(latestSnapshot.actualBalance) : "-"}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-ink/10 bg-ink px-5 py-4 text-sand">
          <p className="text-xs uppercase tracking-[0.18em] text-sand/55">Lowest actual</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {minimumActual ? formatYen(minimumActual.actualBalance) : "-"}
          </p>
          <p className="mt-2 text-sm text-sand/72">
            {minimumActual ? `${minimumActual.date} が底です` : "snapshot がありません"}
          </p>
        </article>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[1.6rem] border border-ink/10 bg-[#fbf8f2] p-3">
        <table className="min-w-full border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-ink/50">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Theoretical</th>
              <th className="px-4 py-2">Actual</th>
              <th className="px-4 py-2">Cards</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr
                key={snapshot.date}
                className={`text-sm text-ink ${
                  snapshot.short ? "bg-ember/10" : "bg-white"
                }`}
              >
                <td className="rounded-l-2xl px-4 py-4 font-medium">{snapshot.date}</td>
                <td className="px-4 py-4">{formatYen(snapshot.theoreticalBalance)}</td>
                <td className="px-4 py-4">{formatYen(snapshot.actualBalance)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(snapshot.cardBalances).length === 0 ? (
                      <span className="rounded-full bg-sand px-3 py-1 text-xs text-ink/55">none</span>
                    ) : (
                      Object.entries(snapshot.cardBalances).map(([cardId, amount]) => (
                        <span
                          key={cardId}
                          className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink/75"
                        >
                          {cardId}: {formatYen(amount)}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="rounded-r-2xl px-4 py-4">
                  <span
                    className={
                      snapshot.short
                        ? "rounded-full bg-ember px-3 py-1 text-xs font-semibold text-white"
                        : "rounded-full bg-moss px-3 py-1 text-xs font-semibold text-white"
                    }
                  >
                    {snapshot.short ? "short" : "safe"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
