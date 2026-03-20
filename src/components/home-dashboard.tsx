import { DataOverview } from "@/src/components/data-overview";
import { QuickEntrySection } from "@/src/components/quick-entry-section";
import { SimulationPreview } from "@/src/components/simulation-preview";

const statusCards = [
  {
    label: "Main flow",
    value: "入力 -> 確認 -> preview",
    detail: "作業順がそのまま画面構造になるように並べ替えています"
  },
  {
    label: "Primary action",
    value: "Transaction を追加",
    detail: "最初の検証は transaction か scheduled event から始める想定です"
  },
  {
    label: "Health",
    value: "`/api/health`",
    detail: "起動確認は API と UI の両方から追えます"
  }
] as const;

export async function HomeDashboard() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-6 px-5 py-5 md:px-8 md:py-8 xl:px-10">
      <section className="rounded-[1.8rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,242,233,0.88))] p-6 shadow-panel backdrop-blur md:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-ink/65">
                Cash Flow Simulator
              </p>
              <p className="rounded-full border border-moss/20 bg-moss/10 px-3 py-1.5 text-xs font-medium text-ink/70">
                開発中でも実作業しやすい管理画面
              </p>
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-4xl">
              入力と確認を同時に回せる、
              <span className="block text-ink/78">テスト用の実務画面に寄せる。</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/64">
              大きな説明より、手を動かすための画面を優先しています。左で入力し、右で一覧と preview を見て、すぐ次の操作に戻れる構成です。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:min-w-[640px] xl:max-w-[760px]">
            {statusCards.map((card) => (
              <article
                key={card.label}
                className="rounded-[1.35rem] border border-ink/10 bg-white/82 px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
                  {card.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-ink/60">{card.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] xl:items-start">
        <div className="min-w-0">
          <QuickEntrySection />
        </div>
        <div className="grid min-w-0 gap-5">
          <DataOverview />
          <SimulationPreview />
        </div>
      </section>
    </main>
  );
}
