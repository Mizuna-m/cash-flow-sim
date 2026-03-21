# 計算仕様書（Draft v0.1）

---

## 1. 目的

本仕様は、理論残高および現実残高を日次で算出するシミュレーションロジックを定義する。

---

## 2. 入力データ

### 2.1 実績

* Transaction（収入・支出）
* BalanceEvent（資金移動）
* CardPayment（カード引落）

---

### 2.2 予定・予測

* ScheduledEvent
* DailySpendForecast
* CardPaymentForecast

---

### 2.3 マスタ

* Account
* CreditCard（締日・支払日）

---

### 2.4 Transactionの構造

* `payee` は取引先の主名称
* `payee_detail` は店舗や媒体などの階層パス
* `description` は取引内容の主説明
* `note` は備考
* `category_path` は `["食費", "外食費"]` のような分類階層
* `tags` は `project` や `custom` など検索補助の自由タグに限定する

---

## 3. 出力

* 日次理論残高
* 日次現実残高
* カード残高
* 口座別の現金系残高（cash / bank）
* ショート判定

---

## 4. 基本概念

### 4.1 日次処理単位

* シミュレーションは日単位で行う

---

### 4.2 初期状態

```
theoretical_balance = initial_balance
actual_balance = initial_balance
card_balance[card_id] = 初期値（通常0）
liquid_account_balance[account_id] = cash / bank の初期残高
```

---

## 5. 全体フロー

```
for date in simulation_range:

    events = collect_events(date)

    events = sort_by_order(events)

    for event in events:
        apply_event(event)

    record_daily_result(date)
```

---

## 6. イベント種別と処理

---

### 6.1 Transaction（支出）

```
if event.type == "expense":
    theoretical_balance -= event.amount

    if event.card_id is not null:
        card = resolve_card(event)
        card_balance[card] += event.amount
    else:
        actual_balance -= event.amount
        liquid_account_balance[event.account_id] -= event.amount
```

---

### 6.2 Transaction（収入）

```
if event.type == "income":
    theoretical_balance += event.amount
    actual_balance += event.amount
    liquid_account_balance[event.account_id] += event.amount
```

---

### 6.3 BalanceEvent（資金移動）

```
if event.type == "transfer":
    actual_balance += event.in_amount
    actual_balance -= event.out_amount
    liquid_account_balance[to_account] += event.amount
    liquid_account_balance[from_account] -= event.amount
```

※ 理論残高は変化しない

---

### 6.4 CardPayment（引落実績）

```
if event.type == "card_payment":
    actual_balance -= event.amount
    card_balance[event.card_id] -= event.amount
    liquid_account_balance[source_account_id] -= event.amount
```

---

### 6.5 ScheduledEvent（予定支出）

```
if event.type == "scheduled_expense":
    theoretical_balance -= event.amount

    if event.card_id is not null:
        card = resolve_card(event)
        card_balance[card] += event.amount
    else:
        liquid_account_balance[event.account_id] -= event.amount
```

---

### 6.6 DailySpendForecast（予測）

```
if event.type == "forecast_expense":
    if no_actual_transaction(date):
        theoretical_balance -= event.amount

        card = resolve_card(event)
        card_balance[card] += event.amount
```

---

### 6.7 CardPaymentForecast（引落予測）

```
if event.type == "card_payment_forecast":
    actual_balance -= event.amount
    card_balance[event.card_id] -= event.amount
    liquid_account_balance[settlement_account_id] -= event.amount
```

---

### 6.8 口座不足判定

```
if exists liquid_account_balance[account_id] < 0:
    short = true
```

総額がプラスでも、cash / bank のいずれかがマイナスなら不足扱いとする。

---

## 7. カード割当ロジック

```
function resolve_card(event):
    if event.card_id is not null:
        return event.card_id
    else:
        return default_card
```

---

## 8. カード引落予測生成

```
for each card:

    usage = collect_card_usage(card)

    grouped = group_by_closing_period(usage)

    for period in grouped:
        payment_date = get_payment_date(period)
        amount = sum(period)

        create CardPaymentForecast(payment_date, amount)
```

---

## 9. イベント収集

```
function collect_events(date):

    events = []

    events += transactions[date]
    events += balance_events[date]
    events += scheduled_events[date]
    events += forecast_events[date]
    events += card_payment_events[date]
    events += card_payment_forecast[date]

    return events
```

---

## 10. 並び順

```
function sort_by_order(events):
    return sort(events by event.order)
```

※ orderはユーザー操作または内部付与

---

## 11. ショート判定

```
if actual_balance < threshold:
    mark_short(date)
```

---

## 12. 補助関数

### 12.1 実績有無判定

```
function no_actual_transaction(date):
    return count(transactions[date]) == 0
```

---

## 13. 不一致処理

* カード残高と引落額の差分は許容する
* 負のカード残高も許容する（将来調整）

---

## 14. 拡張ポイント

* カード按分ロジック
* カテゴリ別予測
* 時刻単位処理
* 精度向上ロジック

---

（以上）
