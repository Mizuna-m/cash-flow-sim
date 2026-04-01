# 計算仕様書（Draft v0.2）

---

## 1. 目的

本仕様は、本システムが何を「残高」として持ち、各イベントがどのレイヤーにどう影響するかを定義する。

特に以下を明確にする。

* 家計簿・分析として見たい情報
* 資金繰りとして見たい情報
* 予定が確定し、さらに口座出納へ反映されるまでのライフサイクル

---

## 2. この仕様で解きたいこと

本システムは、単なる家計簿ではなく、次の2つを同時に扱う。

### 2.1 分析

* 何にいくら使ったか
* Project / Category / Group ごとの集計
* 月次の支出・収入の傾向

### 2.2 資金繰り

* 今いくら使えるか
* 将来どの口座が足りなくなるか
* カード、借入、リボなどの未払いがいつ cash に効くか

この2つを1本の「理論残高」で表そうとすると意味が混ざるため、本仕様では残高レイヤーを分けて扱う。

---

## 3. 残高レイヤー

### 3.1 主役として扱う残高

#### ① cash

* cash / bank 口座の実残高総額
* 「今この瞬間に使えるお金」の総額
* 実際に口座へ入出金が起きたときだけ変化する

#### ② cash_by_account

* 口座ごとの実残高
* 資金移動判断、引落口座の不足確認に使う
* short 判定の基準は主にこれ

#### ③ card_debt

* カードごとの未払い残高
* 利用で増え、引落で減る
* cash とは別レイヤーで管理する

#### ④ planned_outflow

* まだ口座からは落ちていないが、将来出ていく見込みの金額
* ScheduledEvent や CardPaymentForecast などから導出される
* 「残高」そのものではなく、将来支出のレイヤー

---

### 3.2 将来拡張で並列追加する残高

#### ⑤ loan_debt

* 借入の元本残高
* 借入実行で増え、返済で減る

#### ⑥ locked_assets

* 積立投資・定期積立など、資産ではあるが即時 cash として使いにくいもの
* cash とは分離して扱う

---

### 3.3 補助的な表示値

#### projected_cash

* `cash` から将来の `planned_outflow` を加味した着地見込み
* 便宜上の計算結果であり、元データとして永続化しない

---

## 4. 家計簿と資金繰りの役割分担

### 4.1 家計簿・分析で担うもの

* Transaction の明細管理
* 月次支出/収入
* Project 集計
* Category / Group 集計
* 「その月にいくら使ったか」

ここでは残高は主役ではない。

---

### 4.2 資金繰りで担うもの

* cash
* cash_by_account
* card_debt
* planned_outflow
* projected_cash

ここでは「使途分析」よりも「払えるか」「どの口座が足りないか」を重視する。

---

## 5. イベントライフサイクル

各イベントは、金額・日付・意味づけが固まるにつれて次の状態を取りうる。

### 5.1 planned

* 予定
* 金額は仮でもよい
* まだ実際の請求・出納は起きていない

例:

* 給与予定
* 家賃予定
* 電気代予定
* リボ月額予定
* 積立投資予定

---

### 5.2 confirmed

* 請求額・支給額・約定額など、発生額が確定した状態
* ただし cash はまだ動いていない場合がある

例:

* 給与明細が確定した
* 電気代の請求額が確定した
* リボ請求額が確定した
* カード利用額が確定した

---

### 5.3 settled

* 実際に口座出納まで反映された状態
* cash / cash_by_account が変化する

例:

* 給与振込が入った
* 電気代が引き落ちた
* カード請求が引き落ちた
* 借入返済が口座から出た

---

### 5.4 adjusted

* 確定後に修正が入った状態

例:

* 給与の追給
* カード請求訂正
* 光熱費再請求

---

### 5.5 cancelled / deferred

* 予定が中止された
* 支払・入金が後ろ倒しになった

例:

* 旅行予定の中止
* 支払日の翌月送り
* 引落不能による再引落

---

## 6. イベント種別ごとの意味づけ

### 6.1 Transaction

Transaction は家計簿・分析の中心であり、原則として「使途・発生」を表す。

#### 支出（現金/口座払い）

* 分析: 支出として計上
* cash: 減少
* cash_by_account: 減少
* planned_outflow: 変化なし

#### 支出（カード払い）

* 分析: 支出として計上
* card_debt: 増加
* cash: 変化なし
* cash_by_account: 変化なし

#### 収入

* 分析: 収入として計上
* cash: 増加
* cash_by_account: 増加

---

### 6.2 ScheduledEvent

ScheduledEvent は将来の予定を表す。

* 分析: 原則として確定前は含めない
* planned_outflow: 増加要因
* projected_cash: 減少要因
* cash: 変化なし

備考:

* 給与予定のような将来入金も、将来は `planned_inflow` を導入して対称に扱えるようにする
* まず MVP では outflow を主対象とする

---

### 6.3 CardPayment

CardPayment はカード債務の cash 決済を表す。

* cash: 減少
* cash_by_account: 引落口座が減少
* card_debt: 減少
* 分析支出: 原則として二重計上しない

---

### 6.4 CardPaymentForecast

CardPaymentForecast は将来のカード引落見込みを表す。

* planned_outflow: 増加要因
* projected_cash: 減少要因
* cash: 変化なし
* card_debt: 現時点では変化なし

注:

* card_debt 自体は利用によって増えている前提
* forecast は「いつ cash に効くか」を示す

---

### 6.5 BalanceEvent

BalanceEvent は口座間または外部との資金移動を表す。

#### 内部口座間移動

* cash: 総額は不変
* cash_by_account: 片方減り、片方増える

#### 外部からの借入実行

* cash: 増加
* cash_by_account: 増加
* 将来的には loan_debt: 増加

#### 外部への返済

* cash: 減少
* cash_by_account: 減少
* 将来的には loan_debt: 減少

---

### 6.6 DailySpendForecast

DailySpendForecast は日常支出の見込み。

* 分析: 実績とは別管理
* planned_outflow: 増加要因
* projected_cash: 減少要因
* cash: 変化なし

---

## 7. 典型的な運用フロー

### 7.1 給与

1. planned: 予定給与を持つ
2. confirmed: 明細確定で残業代・控除差分を反映
3. settled: 振込で cash / cash_by_account が増える

---

### 7.2 電気代・水道代

1. planned: 固定見込み額を ScheduledEvent として持つ
2. confirmed: 実請求額で上書き
3. settled: 引落で cash / cash_by_account が減る

---

### 7.3 カード払い

1. confirmed: 利用時点で支出が確定し、card_debt が増える
2. planned: 締日計算から CardPaymentForecast を作る
3. settled: 引落で cash / cash_by_account が減り、card_debt が減る

---

### 7.4 カードリボ

1. confirmed: 利用で card_debt が増える
2. planned: カード別条件・利率・月額ルールから次回以降の支払予定を算出
3. confirmed: 実請求額で月額を固定
4. settled: 支払で cash が減り、card_debt が減る
5. 未払い残債は次月へ繰り越す

---

### 7.5 借入

1. settled: 借入実行で cash が増える
2. 将来的に loan_debt が増える
3. planned: 返済予定を持つ
4. settled: 返済で cash が減り、loan_debt が減る

---

### 7.6 積立投資

1. planned: 積立予定を持つ
2. confirmed: 約定金額が確定
3. settled: cash が減る
4. 将来的に locked_assets / investment balance が増える

---

## 8. short 判定

short 判定は、総額よりも口座別の使える cash を優先する。

```
if exists cash_by_account[account_id] < 0:
    short = true
```

総額がプラスでも、引落口座や生活口座が不足するなら short 扱いとする。

---

## 9. 現仕様からの読み替え

現行実装の `theoreticalBalance` と `actualBalance` は、将来的には次の概念へ整理し直す前提とする。

* `theoreticalBalance`
  * 廃止または補助表示へ縮小
  * 主に `projected_cash` と `planned_outflow` に分解する
* `actualBalance`
  * `cash` へ改名候補
* `liquidAccountBalances`
  * `cash_by_account` へ改名候補
* `cardBalances`
  * `card_debt` へ改名候補

---

## 10. 実装指針

残高ロジックの再設計では、以下を優先する。

* 家計簿・分析と資金繰りを別責務として扱う
* `planned -> confirmed -> settled` の流れをイベント種別ごとに表せるようにする
* カード、借入、投資を同じ「残高」へ無理に押し込まない
* 残高の主役は `cash` と `cash_by_account` に置く
* 将来見込みは `planned_outflow` と `projected_cash` で補助的に扱う
