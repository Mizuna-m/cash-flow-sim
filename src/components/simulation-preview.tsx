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

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/75 p-8 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">
            Simulation preview
          </p>
          <h2 className="mt-2 text-3xl font-semibold">純関数シミュレーションの現在地</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-ink/70">
          {source === "database"
            ? `seed 済みの DB データを使って ${startDate} から ${endDate} までの日次残高を描画しています。`
            : "DB 取得に失敗した場合でも、デモデータで理論残高、現実残高、カード残高の挙動を確認できます。"}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.2em] text-ink/55">
              <th className="px-4">Date</th>
              <th className="px-4">Theoretical</th>
              <th className="px-4">Actual</th>
              <th className="px-4">Cards</th>
              <th className="px-4">Short</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.date} className="rounded-2xl bg-sand/70 text-sm text-ink">
                <td className="rounded-l-2xl px-4 py-4 font-medium">{snapshot.date}</td>
                <td className="px-4 py-4">{formatYen(snapshot.theoreticalBalance)}</td>
                <td className="px-4 py-4">{formatYen(snapshot.actualBalance)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(snapshot.cardBalances).length === 0 ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-ink/60">none</span>
                    ) : (
                      Object.entries(snapshot.cardBalances).map(([cardId, amount]) => (
                        <span
                          key={cardId}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink/75"
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
