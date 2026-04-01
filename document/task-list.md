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
* credit card の更新・削除・default 切替 API を追加し、Settings から選択編集できるようにした
* 削除導線には確認 UI を入れ、`ScheduledEvent` は `isActive` で停止、実績系とカードは hard delete の方針で当面運用する
* `/simulation` で ScheduledEvent を手動選択して compare API を叩けるようにした
* `/simulation` で比較結果を複数保持し、表示する比較シナリオを切り替えられるようにした
* forecast イベントに生成根拠メタデータを付与し、forecast ページで表示できるようにした
* simulation / forecast / compare の理解用デモ seed と確認メモ `demo-walkthrough.md` を追加した
* transaction / scheduled event に口座紐付けを追加し、現金系口座別残高を simulation に載せる変更を進めている
* 現在の simulation は指定期間ごとに初期残高から再計算する実装であり、長期運用時の計算コスト対策は未着手
* 既存実績データの標準列が `日付・取引先・取引先詳細・内容・金額・備考・種別・プロジェクト` であることを確認した
* Transaction は `payee / payee_detail / description / note / category_path` を主列として持ち、`tags` は `project / custom` など補助検索用に絞る方針へ更新した
* 既存スプレッドシートの行単位 running balance は移行対象にせず、残高確認は日次粒度へ寄せる方針で確定した
* Project / Category だけでなく、既存の `種別グループ` に相当する集計も新システム側で見られる状態を目標にする
* 外貨は専用台帳の再現より、口座ごとの `currency` を正しく扱えることを優先する
* 大量入力前提の UX 改善として、取引先・取引先詳細・種別階層・Project・口座・カードの強いサジェストと、キーボード完結の入力体験を入れる方針を追加した
* `api/import/spreadsheet` を追加し、`Financial Analysis` の `支出 / 収入 / 定期支出` を ODS/CSV から dry-run / import できる初版導線を進めている
* import preview では既存 transaction の `payee` 履歴から `category_path / project / account / card` を補完候補として提案できるようにした
* 残高モデルは `理論/現実` の二軸だけでは将来の借入・リボ・投資を表しにくいため、`cash / cash_by_account / card_debt / planned_outflow` を主軸とする再設計を検討し始めた
* 予定から確定、さらに口座出納へ反映されるまでの `planned / confirmed / settled / adjusted / cancelled / deferred` のイベントライフサイクルを仕様化する方針に入った
* `npm run build` 後に `podman compose restart` まで回す、依存追加時は container 側 `node_modules` も確認する、などの暗黙知を `development-playbook.md` に集約し始めた
* 残高モデル再設計に向けて、現行 API / 型 / UI ラベルの読み替え計画を `balance-model-transition-plan.md` に整理し始めた
* 残高モデル移行は deprecated を厚く持たず、責務のまとまりごとに小さめの破壊的更新を入れて整合を毎回取り切る方針にした
* 残高モデル変更の抜け漏れ防止用に、ドキュメント・API・型・UI・テスト・手動確認を横断したチェックリスト `balance-model-change-checklist.md` を追加した
* simulation response の主な残高語を `cash / cashByAccount / cardDebt / projectedCash / plannedOutflow` へ更新し、`plannedOutflow` も差分値ではなく future event 由来で積み上がる値へ寄せた
* compare / forecast summary も `settledThroughDate`、`projectedNegativeDaysDelta` など意味が伝わる名前へ更新した
* simulation の日別 `events` に `planned / confirmed / settled` の lifecycle を追加し、forecast table で予定・カード確定・出納済を読み分けやすくした
* 日別 `eventSummary` も `actual / forecast` ではなく `planned / confirmed / settled` の件数・金額集計へ更新し、ライフサイクルと整合するようにした
* `simulation-ux-alignment-review.md` を追加し、仕様と現在 UI の整合レビュー、および次は forecast を lifecycle 主体で読めるようにする方針を整理した
* UX の基本方針として、`short` や compare は補助であり、主役は日次残高・口座別残高・イベント lifecycle などの fact 整理であることを仕様文書へ反映した
* `projectedCash` は補助アラートではなく、fact から導く重要な計算済み観測値として扱う方針を仕様文書へ反映した
* `forecast` 表に `planned / confirmed / settled` の日次サマリ列を追加し、イベント明細も lifecycle ごとにまとまり表示する UI へ寄せた
* `simulation` も `short` 中心ではなく、`cash / projectedCash / plannedOutflow / cardDebt` の fact を前面に出し、compare も差分事実を読む寄りの文言へ更新した
* `simulation` の compare パネルをさらに fact 寄りにし、候補カードと比較結果カードを `projected cash / cash / planned outflow` の差分観察として読める文言へ寄せた
* `curl` による API 確認は `podman compose restart` 後に行う、という実運用上の注意を `development-playbook.md` に追記した

次に着手するべきこと:

* forecast を lifecycle 主体で読めるようにし、`planned / confirmed / settled` の日次サマリと明細グルーピングを UI へ反映する
* simulation の増分計算 / 月次スナップショットなど長期運用向けの高速化方針を決める
* accounts / liquid account の表示順を明示管理するか判断する
* カード引落予測に月次の支払日オーバーライドを入れるか判断する
* API 変更時に OpenAPI も更新する運用を維持する

---

## 3. マイルストーン

| ID | Task | Status | Exit Criteria | Notes |
| --- | --- | --- | --- | --- |
| M0 | 実装方針の固定化 | DONE | 実装方針とタスクリストが文書化されている | 本ファイルと `implementation-plan.md` を作成 |
| M1 | Next.js + Podman の土台作成 | DONE | app と db がローカル起動する | compose build / up と HTTP 応答を確認済み |
| M2 | DB スキーマ初版 | DONE | MVP中核エンティティのテーブルとマイグレーションがある | 初版 SQL と適用スクリプトを追加し、実 DB へ適用済み |
| M3 | seed データ整備 | DOING | 主要ユースケースを再現できる seed がある | 初版 SQL seed と demo 用ケースを投入済み。simulation / forecast / compare の確認メモを追加 |
| M4 | シミュレーションコア実装 | DOING | 日次残高・カード残高・ショート判定が計算できる | DB seed を使う simulation API まで実装済み。口座別 liquid balance と不足判定の拡張を進めている |
| M5 | 予測ロジック実装 | DONE | DailySpendForecast と CardPaymentForecast が動く | 初版ロジックと forecast summary を実装済み。精度改善余地は残る |
| M6 | API 実装 | DOING | CRUD と simulation API が動く | simulation、accounts、transactions、scheduled-events、card-payments、balance-events を実装済み |
| M7 | 最小UI 実装 | DOING | UC-01, UC-02, UC-03, UC-05, UC-06 を触れる | 新 UI ベースで dashboard / 入力 / simulation 可視化を更新済み。比較 UI は mock のまま |
| M8 | シナリオ比較 | DOING | イベントON/OFFと比較ができる | compare API、差分表示、ScheduledEvent 無効化、手動シナリオ選択、複数比較保持まで追加済み。比較履歴や保存は未実装 |
| M9 | 移行導線の初版 | DOING | 直近3〜6か月を投入できる | CSV/ODS インポートと確認導線を優先する。初版の dry-run / import API と ledger UI を追加中 |
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
| T07 | Transaction スキーマ作成 | DONE | T05 | amount, payee, payee_detail, description, note, category_path, tags, card_id, order_index を保存できる |
| T08 | ScheduledEvent / BalanceEvent / CardPayment スキーマ作成 | DONE | T05 | 各イベントが保存できる |
| T09 | seed データセット作成 | DOING | T06,T07,T08 | 主要ケースを1回で投入でき、実 DB に適用済み |
| T10 | イベント正規化ロジック実装 | DOING | T09 | Transaction / ScheduledEvent / BalanceEvent / CardPayment を simulation 用に変換できる |
| T11 | 同日内ソート実装 | DONE | T10 | `order_index` で順序制御できる |
| T12 | 残高更新ロジック実装 | DOING | T10,T11 | `cash / cash_by_account / card_debt / planned_outflow` を中心に日次残高が更新される |
| T13 | ショート判定実装 | DONE | T12 | 閾値未満の日を抽出できる |
| T14 | カード引落予測生成 | DONE | T12 | 締日・支払日から forecast を作れる |
| T15 | 日常支出予測生成 | DONE | T09 | 実績欠損日に予測適用できる |
| T16 | 実績優先ルール実装 | DONE | T14,T15 | 実績がある日には予測を抑制できる |
| T17 | シミュレーション API | DONE | T12,T14,T15,T16 | 期間指定で結果を返せる |
| T18 | CRUD API | DOING | T06,T07,T08 | create / list は主要系実装済み。実績系 delete、scheduled update、credit card の create/update/delete/default 切替を追加済み |
| T19 | ダッシュボード画面 | DONE | T17 | 残高サマリが見える |
| T20 | 取引入力画面 | DONE | T18 | Transaction 登録できる |
| T21 | 予定入力画面 | DONE | T18 | ScheduledEvent 登録できる |
| T22 | シミュレーション結果画面 | DONE | T17 | 日次の資金繰り結果と比較表示が見える |
| T23 | Project / Category / Group 集計画面 | DONE | T18 | `/analysis` で Project別、種別階層別、種別グループ相当の集計と月次 net が見える |
| T24 | イベント ON/OFF | DOING | T21,T22 | ScheduledEvent の無効化 PATCH と比較反映を追加済み。再有効化導線は限定的 |
| T25 | シナリオ比較 UI/API | DOING | T24 | compare API、差分表示、手動選択 UI、複数比較保持を追加済み。比較の保存やベース切替は未実装 |
| T26 | 初回移行導線 | DOING | T18 | CSV/ODS の dry-run と本投入ができ、既存列 `日付・取引先・取引先詳細・内容・金額・備考・種別・プロジェクト` を欠落なく対応付けられる |
| T27 | 受け入れテスト整備 | TODO | T09,T12,T14,T15,T16 | AC を検証できる |
| T28 | simulation 高速化方針の設計 | TODO | T12,T17 | 初期残高からの全件再計算を避ける方針と保存単位を決める |
| T29 | account 表示順の導入 | TODO | T06,T12 | 口座表示順を `display_order` 等で制御でき、forecast / settings / ledger で一貫して並ぶ |
| T30 | カード支払日オーバーライド設計 | TODO | T14,T18 | 土日や祝日ずれを手動補正できる入力・保存方法を決める |
| T31 | インポート補助 / サジェスト UX | DOING | T18,T20,T26 | 列マッピング、取引先・取引先詳細・種別階層・Project・口座・カードを既存入力から強くサジェストでき、dry-run 確認と矢印キー / Enter / Tab / Esc で完結操作できる。payee 起点の既定候補補完は初版実装済み |

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

1. CSV/ODS インポート中心の初回移行導線を作る
2. 列マッピング補助とサジェスト UX を移行導線に組み込む
3. Project / Category / Group 集計画面の設計と実装に入る
4. simulation の月次スナップショットまたは増分再計算の設計に入る
