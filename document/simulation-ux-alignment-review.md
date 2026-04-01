# Simulation UX 整合レビュー（2026-04-02）

## 1. 目的

本メモは、残高レイヤーとイベントライフサイクルの仕様に対して、現在の `simulation` / `forecast` UI がどこまで整合しているかを確認し、次の実装単位を決めるためのレビューである。

今回は「仕様を変える」のではなく、「今の仕様が画面でどう見えているか」を棚卸しする。

---

## 2. 仕様上の主役

現在の仕様では、資金繰りで主役にするのは次のレイヤー。

* `cash`
* `cash_by_account`
* `card_debt`
* `planned_outflow`
* 重要な計算済み観測値として `projected_cash`

また、イベントは次の lifecycle を持つ。

* `planned`
* `confirmed`
* `settled`

意味づけの要点:

* `cash` は実際に今使える現金系総額
* `cash_by_account` はどの口座が足りなくなるかを見るための実残高
* `card_debt` は未払いカード債務
* `planned_outflow` はまだ口座から落ちていない将来支出
* `projected_cash` は fact を元にした着地見込みであり、ユーザー判断に直結する重要な観測値

ここで重要なのは、「システムが何を勧めるか」よりも「ユーザーが判断するための fact をどう並べるか」である。

したがって、UX の評価基準は次を優先する。

* 日次の金額が正しく見えるか
* 口座別残高が追えるか
* イベントが `planned / confirmed / settled` のどれか分かるか
* その上で補助的に `short` や compare を参照できるか

---

## 3. 現在の整合している部分

### 3.1 API / 型

現行 API はかなり仕様に寄っている。

* snapshot は `cash / cashByAccount / cardDebt / plannedOutflow / projectedCash`
* 日別 `events` は `planned / confirmed / settled` を返す
* 日別 `eventSummary` も `planned / confirmed / settled` 集計へ更新済み
* `settledThroughDate` など、summary 名も以前より意味が通る

このため、データの意味づけ自体はかなり整理できている。

---

### 3.2 forecast table

`forecast` は、日次一覧としては仕様に近い。

見えていること:

* 日付ごとの `projected cash / cash / planned outflow`
* `cash_by_account`
* イベント明細
* イベントごとの lifecycle

つまり、「その日何が予定で、何がカード確定で、何が出納済みか」は一応読める。

---

## 4. 現在の UX 上のズレ

### 4.1 主役がまだ曖昧

今の画面では、`projected_cash` がかなり前面に出ている。

結果として、ユーザーは次の区別を直感的に掴みにくい。

* 今の使えるお金 = `cash`
* 口座ごとの不足確認 = `cash_by_account`
* 将来に落ちる見込み = `planned_outflow`
* 着地見込み = `projected_cash`

これは悪いことではないが、`projected_cash` の重要性に対して、差を構成する `planned_outflow` や lifecycle 情報の説明がまだ弱い。

加えて、`short` や compare の「判断結果」もやや前に出ており、
fact の整理より先に結論を見せる空気が少しある。

---

### 4.2 lifecycle が表には出たが、判断軸にはなっていない

`forecast` のイベント明細には `予定 / 確定 / 出納済` が出ているが、
UI 全体としてはまだ lifecycle を使って整理されていない。

例えば、今の画面では次の問いに一発で答えづらい。

* 今日の支出圧力は「予定」が重いのか
* 既に「確定」していて未払いが増えているのか
* もう「出納済」で cash に反映済みなのか

つまり、仕様上あるライフサイクルが「一覧の1ラベル」に留まっている。

---

### 4.3 `simulation` はまだチャート中心で、仕様理解には弱い

`simulation` はチャートと compare には強いが、仕様理解の観点では弱い。

特に弱い点:

* `cash` と `projected_cash` の関係は見えるが、なぜズレているかが弱い
* `planned_outflow` は補足値として見えるだけで、内訳が弱い
* `card_debt` は KPI や判断導線の主役になっていない
* 口座不足が「どの lifecycle のイベントで起こるか」が直接見えない

つまり、`simulation` は「線の比較」はできるが、「このモデルでは何を見ればいいか」はまだ学習しづらい。

---

### 4.4 `forecast` の表は情報はあるが、判断単位で整理されていない

今の `forecast` は表としては強いが、列が「残高の種類」と「イベント詳細」の混在になっている。

そのため、次のような見方をしたい時に少しつらい。

* 予定が多い日だけ見たい
* 確定カード利用が多い日だけ見たい
* 出納済イベントだけ追いたい
* ある日の `planned_outflow` が何で構成されているかをまとめて見たい

一覧性はあるが、「判断のためのまとまり」にはまだ分かれていない。

---

## 5. 仕様に対する現在の整合度

感覚値としては次の通り。

* API / 型: 8割以上整合
* ドメイン意味づけ: 7割前後整合
* UI / UX: 5割前後整合

つまり、内部の語彙はだいぶ整ってきたが、画面がまだ旧来の「残高推移ビュー」寄りで、仕様上の読み方を自然に案内できていない。

---

## 6. 次の実装方針

次は、残高計算をさらにいじるより、まず UI 側で仕様を感じられる構成へ寄せる方が効果が高い。

優先順位は次の通り。

### Step A: forecast を lifecycle 主体で読めるようにする

最小変更:

* 日ごとの `eventSummary` を `planned / confirmed / settled` の3指標として表に出す
* 状態列を `safe / 口座不足 / 未決済予定あり` だけでなく、`予定主導 / 確定主導 / 出納済中心` のように読める補助へ寄せる
* イベント明細を lifecycle ごとにまとまり表示する

狙い:

* その日の圧力が「予定」なのか「確定」なのかを一目で読む

---

### Step B: simulation を「線」だけでなく「fact」へ寄せる

最小変更:

* `projected_cash` は主役の計算済み観測値として維持する
* KPI のうち `cardDebt` を主役に近づける
* chart の注記ではなく、`cash / projected_cash / planned_outflow / card_debt` の関係を短い fact panel で示す
* compare も結論の押しつけではなく、`planned outflow` や `cash` の差分事実を並べる構成へ寄せる

狙い:

* 仕様上の主役と重要観測値を UI でも主役にする
* 判断結果より、判断材料を前面に出す

---

### Step C: その後に必要なら構造自体を見直す

もし Step A / B を入れてもまだ読みにくければ、その時点で初めて構造変更を考える。

候補:

* `simulation` を「チャート」より「判断パネル + 小さめチャート」に寄せる
* `forecast` を「日次イベント台帳」にさらに寄せる
* `planned / confirmed / settled` の3列または3ブロックで日次を読む UI に変える

---

## 7. 推奨する次の一手

次の1単位として最も安全で効果が高いのはこれ。

* `forecast` の表に `planned / confirmed / settled` サマリを前面表示する
* event 明細も lifecycle ごとにグルーピングする

理由:

* 今の API で既に必要データが出ている
* ドメイン計算を大きく触らずに UX を前に進められる
* 仕様の読み方をそのまま画面へ反映しやすい

この段階では、`simulation` の大改造まではまだしない。
