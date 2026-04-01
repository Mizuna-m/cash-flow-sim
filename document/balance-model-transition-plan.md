# 残高モデル読み替え計画（Draft v0.2）

この文書は、現行実装の API / 型 / UI ラベルを、新しい残高レイヤー仕様へどう移行していくかを整理するための読み替え計画である。

目的:

* 仕様と実装のズレを見える化する
* 破壊的更新を許容しつつ、更新単位を小さく刻んで整合を保つ
* 将来の借入・リボ・投資拡張を見据えて、今の名前をどう扱うかを固定する

前提:

* 現時点では外部利用者や長期互換維持の必要がほぼない
* deprecated 管理を厚く持つより、意味が固まった時点で早めに rename / reshape する
* ただし、一度に全層を壊すのではなく、1回の変更で責務が明確な範囲だけを更新する

---

## 1. 現状整理

現行実装には次の名前がある。

* `theoreticalBalance`
* `actualBalance`
* `liquidAccountBalances`
* `cardBalances`

これらは実装上は動いているが、仕様上の意味づけとしては今後読み替えが必要である。

---

## 2. 目標モデル

仕様上の主レイヤーは次のとおり。

* `cash`
* `cash_by_account`
* `card_debt`
* `planned_outflow`
* 補助値として `projected_cash`

将来拡張:

* `loan_debt`
* `locked_assets`

---

## 3. 現行名との対応

### 3.1 `actualBalance`

読み替え先:

* 第一候補: `cash`

理由:

* 実績ベースの総額として使っている
* 日次の現金系総額を見る用途に近い

注意:

* 将来、投資・借入・外貨を混ぜるなら「何の総額か」を UI で明示する必要がある

---

### 3.2 `liquidAccountBalances`

読み替え先:

* 第一候補: `cash_by_account`

理由:

* 実態としては現金系口座別残高だから
* short 判定でもこちらの意味が重要

---

### 3.3 `cardBalances`

読み替え先:

* 第一候補: `card_debt`

理由:

* 表しているのはカード利用残高ではなく、未払い債務だから
* リボや分割の拡張にもつながる

---

### 3.4 `theoreticalBalance`

読み替え先:

* 単純 rename ではなく分解対象

候補:

* `projected_cash`
* `planned_outflow`

理由:

* 予定・予測・発生概念が混ざっている
* 家計簿上の支出分析まで巻き込んだ集約値になっており、主残高として意味が重い

方針:

* いきなり rename しない
* まず UI 主表示から段階的に降ろす
* API 上も将来的には deprecated 扱いに寄せる

---

## 4. レイヤ別の責務

### 4.1 household analysis

主データ:

* `Transaction`
* `category_path`
* `project`
* `payee`

出したいもの:

* 月次支出/収入
* Project 集計
* Category / Group 集計

ここでは `theoreticalBalance` 相当の値を主役にしない。

---

### 4.2 cashflow management

主データ:

* `cash`
* `cash_by_account`
* `card_debt`
* `planned_outflow`

出したいもの:

* 今いくら使えるか
* どの口座が足りないか
* どの引落が危ないか

---

## 5. 更新方針

### 5.1 基本方針

* API / 型 / UI をまとめて更新してよい
* 旧名称の長い互換維持はしない
* ただし、変更単位は小さく分ける

やらないこと:

* 全ページ・全 API・全型を一度に rename する
* 互換レイヤーを厚く積んで旧名を引きずる

やること:

* 「Simulation response の rename」
* 「Forecast / Simulation UI 表示名更新」
* 「OpenAPI と TS 契約更新」
のように、責務がまとまった単位で壊して直す

---

### 5.2 推奨順

#### Step 1: UI ラベル整理

* まず画面上の語彙を新仕様へ寄せる
* 実データの意味の伝わり方を先に正す

対象:

* simulation
* forecast

---

#### Step 2: TypeScript 型の rename

* `src/lib/openapi-contract.ts`
* simulation domain types
* view model

ここで旧名称を減らす。

---

#### Step 3: API 契約 rename

* `document/openapi.yaml`
* route response
* client fetch 側

このタイミングでは破壊的変更を許容する。

---

#### Step 4: `theoreticalBalance` の分解

* 単純 rename ではなく、`projected_cash` と `planned_outflow` へ整理する
* ここは別ステップで扱う

理由:

* `actualBalance -> cash` より意味の再設計が大きいから

---

## 6. UI 影響範囲

優先度が高いのは次の画面。

### 6.1 Simulation

対象:

* KPI 表示
* チャート凡例
* short 判定説明
* compare 差分説明

見直し方針:

* `theoretical` を主役から外す
* `cash` と `cash_by_account` の危険性を主表示に寄せる
* 将来見込みは `planned_outflow` や比較差分として補助表示に寄せる

---

### 6.2 Forecast Table

対象:

* 列名
* 状態表示
* イベント説明

見直し方針:

* `理論/現実` の二分より、`cash / account / future obligations` の読みへ寄せる
* 表の列名は、まず UI label から破壊的に変更してよい

---

### 6.3 集計画面

今後実装する Project / Category / Group 集計では、残高語をできるだけ持ち込まない。

理由:

* 集計画面は household analysis の責務だから
* ここに `theoreticalBalance` のような概念を混ぜると責務が再び濁る

---

## 7. 型・実装影響範囲

主な影響先:

* `src/lib/openapi-contract.ts`
* simulation domain types
* simulation service DTO
* forecast / simulation page view model
* compare response DTO

注意:

* import や ledger の明細入力は、残高語よりも analysis 語の影響が大きい
* 今回の rename は主に simulation / forecast 側に集中する
* まずは影響範囲の狭い response / view model から壊す

---

## 8. 先にやらないこと

以下はこの読み替え計画と分けて扱う。

* 借入機能の本実装
* リボ月額の完全な計算モデル化
* 投資評価額の本実装
* 多通貨換算 UI の全面見直し
* 借入・投資を見越した完全版の残高モデル実装

---

## 9. 実装の刻み方

1. 1回の変更で責務を1つに絞る
2. 変更後は UI / API / OpenAPI / 型の整合をその場で取り切る
3. `npm run test`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run build`
7. `podman compose restart`

---

## 10. 次アクション

1. UI 表示名の棚卸し
2. Simulation / Forecast の response 名をどこから壊すか決める
3. `actualBalance -> cash`、`liquidAccountBalances -> cashByAccount`、`cardBalances -> cardDebt` を先行候補として実装する
4. `theoreticalBalance` は別タスクとして分解方針を固める
