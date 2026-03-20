import { DataOverview } from "@/src/components/data-overview";
import { SimulationPreview } from "@/src/components/simulation-preview";

const milestones = [
  {
    title: "Simulation Core",
    detail: "理論残高・現実残高・カード残高を純関数で計算する"
  },
  {
    title: "Forecasting",
    detail: "日常支出予測とカード引落予測を時系列へ重ねる"
  },
  {
    title: "Scenario Compare",
    detail: "イベント ON/OFF と比較で意思決定を支援する"
  }
] as const;

const pillars = [
  "Theoretical vs Actual balance",
  "Card usage and payment separation",
  "Forecasts grounded in recorded history"
] as const;

export async function HomeDashboard() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 md:px-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 p-8 shadow-panel backdrop-blur md:p-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ember">
              Cash Flow Simulation Workspace
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                実績と予定をつないで、
                <span className="block text-moss">将来の資金ショートを先回りする。</span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-ink/75 md:text-lg">
                この初期画面は、要件から整理した実装の中心線を可視化するための土台です。まずは
                シミュレーションコアを安定させ、その上に予測、CRUD、可視化を積み上げます。
              </p>
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-ink px-6 py-5 text-sand shadow-panel">
            <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Current focus</p>
            <p className="mt-3 text-3xl font-semibold">Phase 1</p>
            <p className="mt-2 max-w-xs text-sm leading-7 text-sand/80">
              Next.js モノリス、PostgreSQL 接続準備、純関数シミュレーションの置き場を作成済み。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/60 bg-white/70 p-8 shadow-panel backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brass">Core pillars</p>
          <ul className="mt-5 grid gap-4">
            {pillars.map((pillar) => (
              <li
                key={pillar}
                className="rounded-2xl border border-ink/10 bg-sand/70 px-5 py-4 text-base font-medium text-ink"
              >
                {pillar}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-ink p-8 text-sand shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sand/70">Health check</p>
          <p className="mt-4 text-3xl font-semibold">`/api/health`</p>
          <p className="mt-4 text-sm leading-7 text-sand/80">
            環境変数が読めることと、アプリが起動していることを確認する最小 API を用意しています。
            DB 接続テストは次のステップで追加します。
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {milestones.map((milestone) => (
          <article
            key={milestone.title}
            className="rounded-[1.75rem] border border-white/60 bg-white/70 p-6 shadow-panel backdrop-blur"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-ember">{milestone.title}</p>
            <p className="mt-4 text-base leading-7 text-ink/80">{milestone.detail}</p>
          </article>
        ))}
      </section>

      <DataOverview />

      <SimulationPreview />
    </main>
  );
}
