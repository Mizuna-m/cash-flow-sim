# 開発運用ノート（Living Document）

この文書は、実装や検証の途中で見つかった「暗黙知」を明文化して蓄積するための運用ノートである。

ルール:

* 実装や検証で毎回踏む手順はここに追加する
* 「なぜ必要か」が分からない手順は、理由も併記する
* API / UI / DB / コンテナ / ローカル開発のいずれに属するかを分けて書く
* この文書は随時更新対象とし、作業後に新しいノウハウがあれば追記する

---

## 1. 現在の運用ルール

### 1.1 build 後は `podman compose restart` まで行う

現時点の開発フローでは、`npm run build` の後に `podman compose restart` まで実施することを基本ルールとする。

理由:

* ブラウザで確認しているのは compose 上の `app` コンテナであることが多い
* ローカルの `npm run build` だけでは、compose 上の実行中コンテナに変更が反映されない
* 「ローカルでは通るがブラウザでは古い挙動」というズレを減らせる

基本手順:

1. `npm run test`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. `podman compose restart`

補足:

* ドキュメントのみ変更した場合は必須ではない
* 実装やスタイル、API、依存関係、ランタイムコードを触った場合は原則実施する

---

### 1.2 依存追加時は container 内 `node_modules` も確認する

`compose.yml` では `/app/node_modules` が volume 化されているため、依存追加後にコンテナ内の依存が古いまま残ることがある。

症状:

* ブラウザで `Module not found`
* `npm install` 済みなのに compose 上だけ import error

対応:

* `podman compose exec app npm install`
* 必要に応じて `podman compose restart app`

理由:

* イメージを build しても、既存 volume 上の `node_modules` が優先される場合がある

---

### 1.3 仕様変更時は API 契約との差分管理を意識する

残高モデルやイベント意味づけのような概念整理は、仕様書だけ先に進めることがある。

このときのルール:

* 仕様文書は先に更新してよい
* 現段階では互換性より意味整理を優先してよい
* ただし一度に全層を壊さず、責務のまとまりごとに破壊的更新する
* 実装と仕様のズレは `logic-design.md` や専用移行計画文書で明示する

---

### 1.4 破壊的更新は「小さく壊して、その場で揃える」

このプロジェクトでは、外部互換より意味の明快さを優先できる。

方針:

* rename や response shape 変更は許容する
* ただし 1 回の変更範囲を絞る
* UI / 型 / OpenAPI / 実装の整合は同じ変更単位で取る

避けること:

* 全残高モデルを一度に総入れ替えする
* 旧名と新名を長期間混在させる

---

## 2. ローカル確認の基本

### 2.1 最小確認セット

実装変更時の最低限の確認:

* `npm run test`
* `npm run typecheck`
* `npm run lint`
* `npm run build`
* `podman compose restart`

必要に応じて:

* API 応答確認
* ブラウザ画面確認
* seed / import の再適用

---

### 2.2 DB 変更時の確認

DB スキーマや seed を変えた場合は、以下も確認する。

* schema 適用手順
* seed 再投入手順
* 既存 API が期待形で応答するか
* import / simulation が新列を扱えるか

---

## 3. ドキュメント運用

### 3.1 この文書の更新対象

次のような知見は、この文書へ追記する。

* 毎回ハマりやすい compose / dependency / build の罠
* seed や import 再適用の運用上の癖
* API 契約と仕様文書の更新順
* 本番移行を見据えたローカル運用の注意点

---

### 3.2 関連文書

* 仕様の正本: `logic-design.md`
* 業務解釈: `business-rules.md`
* API 契約: `openapi.yaml`
* 実装方針: `implementation-plan.md`
* 作業台帳: `task-list.md`

---

## 4. 今後追加したいノウハウ候補

* ODS/CSV import の再実行ルール
* 既存データ投入時の dry-run 確認観点
* Podman volume の再作成が必要なケース
* 本番移行前に切り出すべきシークレット管理ルール
