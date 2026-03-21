# デモ確認メモ

このメモは、直近で追加したシミュレーション / forecast / compare 機能を手元で理解しやすくするための確認手順。

## 1. まず見る場所

* `/simulation`
* `/forecast`
* `/ledger`

既定期間は `2026-03-01` から `2026-04-30`。

---

## 2. forecast explanation を見る

### ケースA: 日常支出 forecast

`/forecast` で `2026-03-22` 以降の日付を選ぶ。

期待:

* `日常支出予測` が表示される
* `根拠` に `通常支出平均` が出る
* `source N件` で平均元の件数が分かる

### ケースB: カード引落 forecast

`/forecast` で `2026-04-15` を選ぶ。

期待:

* `カード引落予測` が表示される
* `Forecast Demo Card` に紐づく予測になっている
* `根拠` に `1件のカード利用を集計` が出る

補足:

* この予測は `2026-03-04` の `Forecast Demo Headphones` を元に生成される
* `2026-04-10` を選ぶと、`Default Card` 側のカード引落予測も見える

---

## 3. compare を触る

`/simulation` の右側 `Risk / Compare` で次を試す。

### 自動候補

* `Monthly Rent を外した場合`
* `Forecast Demo Insurance を外した場合`

期待:

* 最低残高差分
* short 日数差分
* ending 差分

### 手動候補

* `Forecast Demo Insurance`
* `Monthly Rent`
* `Forecast Demo Concert`

を選択して `選択中の予定で比較` を押す。

期待:

* 複数イベント除外の差分が返る

---

## 4. 戻し操作を触る

`/ledger` で次を試す。

* ScheduledEvent は `無効化 / 有効化`
* Transaction / CardPayment / BalanceEvent は `削除`

注意:

* これは実 DB を更新する
* デモを戻したい場合は `npm run db:seed` を再実行する
