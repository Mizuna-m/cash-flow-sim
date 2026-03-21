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
* SQL 適用用のローカルスクリプトを追加済み
* ローカル `npm run dev` でアプリ起動確認済み
* `GET /api/health` が `200` と JSON 応答を返すことを確認済み
* PostgreSQL コンテナは Podman で起動確認済み
* `podman compose build app` と `podman compose up -d app db` を確認済み
* `npm run db:setup` で schema / seed を DB へ適用済み
* `lint` / `typecheck` / `build` / `test` は通過済み
* ホーム画面にサンプルシミュレーションのプレビューを追加済み
* `api/simulation` は DB seed から日次残高を返す状態
* `api/accounts` と `api/transactions` の GET / POST を追加済み
* `api/scheduled-events` / `api/card-payments` / `api/balance-events` の GET / POST を追加済み
* ホーム画面で accounts / transactions / scheduled events を DB から表示できる
* ホーム画面に accounts / transactions / scheduled events の quick entry フォームを追加済み
* transaction の POST を実行し、DB 保存と API 再取得を確認済み
* card payment / balance event の POST を実行し、DB 保存と API 再取得を確認済み
* DailySpendForecast / CardPaymentForecast の初版ロジックを simulation に組み込み済み
* `/api/simulation` で future 側に forecast が反映されることを確認済み
* `document/openapi.yaml` を API 契約の正本として追加済み
* `simulation` レスポンスに `forecastSummary` と日別 `eventSummary` を追加済み
* `simulation` レスポンスに日別イベント明細 `events` を追加済み
* 新 UI 上で forecast 開始位置、予測件数、予測混在日を見分けられるように更新済み
* シミュレーション危険日カードから、その日に効いたイベント明細を確認できる
* 入力フォームは submit 成功時にリセットされ、一覧と simulation を再読込する
* `excludedEventIds` ベースの simulation compare API を追加済み
* 比較候補は mock ではなく ScheduledEvent 除外シナリオの実差分表示へ更新済み
* 比較候補から ScheduledEvent を永続的に無効化する PATCH API と UI を追加済み
* 台帳から Transaction / CardPayment / BalanceEvent を削除できるようにした
* ScheduledEvent は台帳から無効化 / 再有効化できるようにした
* Settings の credit card 追加を mock から実 API 接続へ更新した

次に着手するべきこと:

* forecast explanation を「どの実績から生成したか」まで結び付ける
* simulation の差分比較 UI を手動シナリオ選択まで広げる
* 各削除操作に確認 UI や soft-delete 方針が要るか判断する
* credit card の更新・削除・default 切替を API 化する
* API 変更時に OpenAPI も更新する運用を維持する

---

## 3. マイルストーン

| ID | Task | Status | Exit Criteria | Notes |
| --- | --- | --- | --- | --- |
| M0 | 実装方針の固定化 | DONE | 実装方針とタスクリストが文書化されている | 本ファイルと `implementation-plan.md` を作成 |
| M1 | Next.js + Podman の土台作成 | DONE | app と db がローカル起動する | compose build / up と HTTP 応答を確認済み |
| M2 | DB スキーマ初版 | DONE | MVP中核エンティティのテーブルとマイグレーションがある | 初版 SQL と適用スクリプトを追加し、実 DB へ適用済み |
| M3 | seed データ整備 | DOING | 主要ユースケースを再現できる seed がある | 初版 SQL seed を投入済み。simulation API と account/transaction API からは参照可能 |
| M4 | シミュレーションコア実装 | DOING | 日次残高・カード残高・ショート判定が計算できる | DB seed を使う simulation API まで実装済み。日別 event summary と event explanation 追加済み |
| M5 | 予測ロジック実装 | DONE | DailySpendForecast と CardPaymentForecast が動く | 初版ロジックと forecast summary を実装済み。精度改善余地は残る |
| M6 | API 実装 | DOING | CRUD と simulation API が動く | simulation、accounts、transactions、scheduled-events、card-payments、balance-events を実装済み |
| M7 | 最小UI 実装 | DOING | UC-01, UC-02, UC-03, UC-05, UC-06 を触れる | 新 UI ベースで dashboard / 入力 / simulation 可視化を更新済み。比較 UI は mock のまま |
| M8 | シナリオ比較 | DOING | イベントON/OFFと比較ができる | compare API、差分表示、ScheduledEvent 無効化まで追加済み。手動シナリオ選択は未実装 |
| M9 | 移行導線の初版 | TODO | 直近3〜6か月を投入できる | CSVまたは手入力補助 |
| M10 | 受け入れ確認 | TODO | AC の主要項目をテストまたは手順で確認できる | 重点は AC-01〜08, 16〜19, 21 |

---

## 4. 実装タスク詳細

| ID | Task | Status | Depends On | Done When |
| --- | --- | --- | --- | --- |
| T01 | Next.js App Router 初期化 | DONE | M1 | 開発サーバが起動する |
| T02 | Tailwind 設定 | DONE | T01 | 最小画面が描画できる |
| T03 | Podman / compose 構成追加 | DONE | T01 | app/db 同時起動ができる |
| T04 | PostgreSQL 接続層追加 | DONE | T03 | アプリからDB接続確認できる |
| T05 | DB アクセス方法の選定と導入 | DONE | T04 | 当面は SQL + `scripts/run-sql.mjs` で適用する |
| T06 | Account / CreditCard スキーマ作成 | DONE | T05 | 初期残高とカード設定が保存できる |
| T07 | Transaction スキーマ作成 | DONE | T05 | amount, tags, card_id, order_index を保存できる |
| T08 | ScheduledEvent / BalanceEvent / CardPayment スキーマ作成 | DONE | T05 | 各イベントが保存できる |
| T09 | seed データセット作成 | DOING | T06,T07,T08 | 主要ケースを1回で投入でき、実 DB に適用済み |
| T10 | イベント正規化ロジック実装 | DOING | T09 | Transaction / ScheduledEvent / BalanceEvent / CardPayment を simulation 用に変換できる |
| T11 | 同日内ソート実装 | DONE | T10 | `order_index` で順序制御できる |
| T12 | 残高更新ロジック実装 | DOING | T10,T11 | 理論残高 / 現実残高 / カード残高が更新される。日別 summary 追加済み |
| T13 | ショート判定実装 | DONE | T12 | 閾値未満の日を抽出できる |
| T14 | カード引落予測生成 | DONE | T12 | 締日・支払日から forecast を作れる |
| T15 | 日常支出予測生成 | DONE | T09 | 実績欠損日に予測適用できる |
| T16 | 実績優先ルール実装 | DONE | T14,T15 | 実績がある日には予測を抑制できる |
| T17 | シミュレーション API | DONE | T12,T14,T15,T16 | 期間指定で結果を返せる |
| T18 | CRUD API | DOING | T06,T07,T08 | create / list は主要系実装済み。実績系 delete、scheduled update、credit card create を追加済み |
| T19 | ダッシュボード画面 | DONE | T17 | 残高サマリが見える |
| T20 | 取引入力画面 | DONE | T18 | Transaction 登録できる |
| T21 | 予定入力画面 | DONE | T18 | ScheduledEvent 登録できる |
| T22 | シミュレーション結果画面 | DONE | T17 | 理論/現実残高グラフが見える |
| T23 | Project / Category 集計画面 | TODO | T18 | タグ別集計が見える |
| T24 | イベント ON/OFF | DOING | T21,T22 | ScheduledEvent の無効化 PATCH と比較反映を追加済み。再有効化導線は限定的 |
| T25 | シナリオ比較 UI/API | DOING | T24 | compare API と差分表示を追加済み。手動選択 UI は未実装 |
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

1. ScheduledEvent の永続 ON/OFF 更新 API を追加する
2. 比較 UI を手動シナリオ選択まで広げる
3. forecast explanation を生成元データまでつなぐ
4. 初回移行導線の入力補助を作る
