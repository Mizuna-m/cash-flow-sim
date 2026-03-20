# タスクリスト / セッション再開メモ

## 1. 使い方

このファイルは、次のセッションで「どこまで終わっていて、次に何をやるか」を即時に把握するための作業台帳として使う。

ルール:

* タスク着手時に `Status` を更新する
* 完了したら関連ファイルと確認結果を追記する
* 方針変更があれば `Notes` に理由を残す

Status の意味:

* `TODO`: 未着手
* `DOING`: 着手中
* `BLOCKED`: 判断待ちまたは依存待ち
* `DONE`: 完了

---

## 2. 現在のスナップショット

更新日時:

* 2026-03-21

現在の状態:

* Next.js App Router の雛形を追加済み
* `compose.yml` / `Containerfile` / `.env.example` を追加済み
* DB 接続準備と初版スキーマ SQL を追加済み
* `lint` / `typecheck` / `build` は通過済み
* Podman machine の存在は確認したが、compose 実行時は Podman socket 接続拒否で未確認

次に着手するべきこと:

* Podman 接続拒否の解消後に app/db の実起動確認
* DB アクセス方法とマイグレーション運用の確定
* seed 前提の最小データモデル確定

---

## 3. マイルストーン

| ID | Task | Status | Exit Criteria | Notes |
| --- | --- | --- | --- | --- |
| M0 | 実装方針の固定化 | DONE | 実装方針とタスクリストが文書化されている | 本ファイルと `implementation-plan.md` を作成 |
| M1 | Next.js + Podman の土台作成 | DOING | app と db がローカル起動する | App Router 前提。アプリ雛形、compose、build/lint/typecheck は完了。Podman socket 接続拒否のため実起動確認のみ未実施 |
| M2 | DB スキーマ初版 | DOING | MVP中核エンティティのテーブルとマイグレーションがある | 初版 SQL を追加済み。実 DB 適用確認は未実施 |
| M3 | seed データ整備 | TODO | 主要ユースケースを再現できる seed がある | ショート検知、カード予測、Project 集計を含む |
| M4 | シミュレーションコア実装 | TODO | 日次残高・カード残高・ショート判定が計算できる | 純関数で実装 |
| M5 | 予測ロジック実装 | TODO | DailySpendForecast と CardPaymentForecast が動く | 実績優先ルール必須 |
| M6 | API 実装 | TODO | CRUD と simulation API が動く | Route Handler でよい |
| M7 | 最小UI 実装 | TODO | UC-01, UC-02, UC-03, UC-05, UC-06 を触れる | グラフ含む |
| M8 | シナリオ比較 | TODO | イベントON/OFFと比較ができる | MVP終盤でよい |
| M9 | 移行導線の初版 | TODO | 直近3〜6か月を投入できる | CSVまたは手入力補助 |
| M10 | 受け入れ確認 | TODO | AC の主要項目をテストまたは手順で確認できる | 重点は AC-01〜08, 16〜19, 21 |

---

## 4. 実装タスク詳細

| ID | Task | Status | Depends On | Done When |
| --- | --- | --- | --- | --- |
| T01 | Next.js App Router 初期化 | DONE | M1 | 開発サーバが起動する |
| T02 | Tailwind 設定 | DONE | T01 | 最小画面が描画できる |
| T03 | Podman / compose 構成追加 | BLOCKED | T01 | app/db 同時起動ができる |
| T04 | PostgreSQL 接続層追加 | DONE | T03 | アプリからDB接続確認できる |
| T05 | DB アクセス方法の選定と導入 | TODO | T04 | マイグレーション運用が決まる |
| T06 | Account / CreditCard スキーマ作成 | DONE | T05 | 初期残高とカード設定が保存できる |
| T07 | Transaction スキーマ作成 | DONE | T05 | amount, tags, card_id, order_index を保存できる |
| T08 | ScheduledEvent / BalanceEvent / CardPayment スキーマ作成 | DONE | T05 | 各イベントが保存できる |
| T09 | seed データセット作成 | TODO | T06,T07,T08 | 主要ケースを1回で投入できる |
| T10 | イベント正規化ロジック実装 | TODO | T09 | 各種イベントを共通形式に変換できる |
| T11 | 同日内ソート実装 | TODO | T10 | `order_index` で順序制御できる |
| T12 | 残高更新ロジック実装 | TODO | T10,T11 | 理論残高 / 現実残高 / カード残高が更新される |
| T13 | ショート判定実装 | TODO | T12 | 閾値未満の日を抽出できる |
| T14 | カード引落予測生成 | TODO | T12 | 締日・支払日から forecast を作れる |
| T15 | 日常支出予測生成 | TODO | T09 | 実績欠損日に予測適用できる |
| T16 | 実績優先ルール実装 | TODO | T14,T15 | 実績がある日には予測を抑制できる |
| T17 | シミュレーション API | TODO | T12,T14,T15,T16 | 期間指定で結果を返せる |
| T18 | CRUD API | TODO | T06,T07,T08 | 主要エンティティを操作できる |
| T19 | ダッシュボード画面 | TODO | T17 | 残高サマリが見える |
| T20 | 取引入力画面 | TODO | T18 | Transaction 登録できる |
| T21 | 予定入力画面 | TODO | T18 | ScheduledEvent 登録できる |
| T22 | シミュレーション結果画面 | TODO | T17 | 理論/現実残高グラフが見える |
| T23 | Project / Category 集計画面 | TODO | T18 | タグ別集計が見える |
| T24 | イベント ON/OFF | TODO | T21,T22 | シミュレーション結果が変わる |
| T25 | シナリオ比較 UI/API | TODO | T24 | 差分表示できる |
| T26 | 初回移行導線 | TODO | T18 | 手入力またはCSV投入ができる |
| T27 | 受け入れテスト整備 | TODO | T09,T12,T14,T15,T16 | AC を検証できる |

---

## 5. 最初に作るべき seed ケース

以下は T09 完了条件に含める。

* 給与収入がある
* 家賃の定期支出がある
* 数日の生活費支出がある
* カード利用がある
* そのカードの引落実績がある
* Project付き旅行支出がある
* 口座間の資金移動がある
* 将来にショートするケースがある
* 同日内順序で残高結果が変わるケースがある

---

## 6. 実装時の注意点

次の方針を破るとやり直しコストが高い。

* シミュレーションロジックを UI 層に書かない
* シミュレーションロジックを SQL に寄せすぎない
* 支出と引落を混同しない
* `order_index` を捨てない
* `card_id` を必須にしない
* 多通貨や投資を最初のクリティカルパスに乗せない

---

## 7. 再開チェックリスト

次のセッションで始めるときは、まずこれだけ確認する。

1. `document/implementation-plan.md` を読む
2. この `task-list.md` の `Status` を確認する
3. `git status --short` で未コミット差分を確認する
4. 直前で触っていたマイルストーンとタスクを `DOING` にする
5. 作業後に `Status` と `Notes` を更新する

---

## 8. 今のおすすめ着手順

次の実装着手はこの順がよい。

1. T01 `Next.js App Router 初期化`
2. T03 `Podman / compose 構成追加`
3. T05 `DB アクセス方法の選定と導入`
4. T09 `seed データセット作成`
5. T10-T16 `シミュレーション / 予測`
