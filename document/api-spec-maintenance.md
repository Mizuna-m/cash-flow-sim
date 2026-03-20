# API仕様メンテナンス方針

## 1. 目的

この文書は、フロント担当へ引き渡す API 契約をどのファイルで管理し、どのタイミングで更新するかを固定するためのメモである。

API 契約の正本は以下とする。

* OpenAPI: `document/openapi.yaml`

---

## 2. 更新ルール

以下のいずれかに該当する変更を行う場合、同じ変更セットで `document/openapi.yaml` も更新する。

* エンドポイント追加
* パス変更
* HTTP メソッド変更
* クエリパラメータ追加・変更・削除
* リクエストボディの shape 変更
* レスポンスボディの shape 変更
* ステータスコードの変更
* バリデーションルールの変更

---

## 3. レビュー観点

API 関連の変更では、コードレビュー時に少なくとも以下を確認する。

* Route Handler 実装と OpenAPI の整合
* フロントが依存するフィールド名の破壊的変更有無
* optional / nullable の扱い一致
* date / amount / UUID-like 文字列のフォーマット整合

---

## 4. フロント引き渡し時の参照先

フロント担当には以下を渡す。

* API 契約: `document/openapi.yaml`
* 業務ルール: `document/business-rules.md`
* 計算仕様: `document/logic-design.md`
* 実装方針: `document/implementation-plan.md`

---

## 5. 現在の注意点

現時点の OpenAPI は、実装済み MVP API のみを対象とする。

未反映または将来拡張扱いのもの:

* 予測根拠メタデータの返却
* シナリオ管理 API
* update / delete 系 API
* OpenAPI からの自動コード生成導線
