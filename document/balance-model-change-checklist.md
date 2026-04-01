# 残高モデル変更チェックリスト（Working Checklist）

この文書は、残高モデルの rename / reshape を進めるときに、ドキュメント・API・型・UI・テストの抜け漏れを防ぐための実装チェックリストである。

使い方:

* 1つの変更単位ごとに、このチェックリストの対象を確認する
* 一度に全部やらない
* 変更後は、影響範囲の項目にチェックを入れるか、作業ログへ残す

前提:

* 互換性は厚く持たない
* ただし破壊的変更は小さく刻む
* 1回の変更で UI / 型 / OpenAPI / 実装の整合を取り切る

---

## 1. 今回の優先変更対象

まず先に触る候補:

* `actualBalance -> cash`
* `liquidAccountBalances -> cashByAccount`
* `cardBalances -> cardDebt`

後で別タスクに分けるもの:

* `theoreticalBalance` の分解
  * `projected_cash`
  * `planned_outflow`

理由:

* `theoreticalBalance` は単純 rename では済まない
* 先に `cash` 系の rename を進めた方が影響範囲を閉じやすい

---

## 2. ドキュメント

### 2.1 仕様・設計

- [ ] [logic-design.md](/Users/mizuna/dev/cash-flow-sim/document/logic-design.md)
- [ ] [business-rules.md](/Users/mizuna/dev/cash-flow-sim/document/business-rules.md)
- [ ] [data-model-design.md](/Users/mizuna/dev/cash-flow-sim/document/data-model-design.md)
- [ ] [glossary.md](/Users/mizuna/dev/cash-flow-sim/document/glossary.md)

確認観点:

* 新しい語が正本になっているか
* 旧語が残る場合は「現行実装名」として意図的に残しているか

---

### 2.2 実装計画・運用

- [ ] [implementation-plan.md](/Users/mizuna/dev/cash-flow-sim/document/implementation-plan.md)
- [ ] [task-list.md](/Users/mizuna/dev/cash-flow-sim/document/task-list.md)
- [ ] [development-playbook.md](/Users/mizuna/dev/cash-flow-sim/document/development-playbook.md)
- [ ] [balance-model-transition-plan.md](/Users/mizuna/dev/cash-flow-sim/document/balance-model-transition-plan.md)

確認観点:

* 次の変更単位と順番が更新されているか
* 暗黙知や運用ルールに新しい注意点が増えていないか

---

### 2.3 契約・利用者向け

- [ ] [openapi.yaml](/Users/mizuna/dev/cash-flow-sim/document/openapi.yaml)
- [ ] [accept-criteria.md](/Users/mizuna/dev/cash-flow-sim/document/accept-criteria.md)
- [ ] [use-case-details.md](/Users/mizuna/dev/cash-flow-sim/document/use-case-details.md)
- [ ] [migration.md](/Users/mizuna/dev/cash-flow-sim/document/migration.md)

確認観点:

* API 名と UI 上の語がずれていないか
* インポートや移行後の確認観点が新しい名称で説明できるか

---

## 3. API / 型

### 3.1 OpenAPI / 共通契約

- [ ] [openapi.yaml](/Users/mizuna/dev/cash-flow-sim/document/openapi.yaml)
- [ ] [openapi-contract.ts](/Users/mizuna/dev/cash-flow-sim/src/lib/openapi-contract.ts)

確認観点:

* field 名が新しい命名へ揃っているか
* required / optional の差分が発生していないか
* compare API も同じ考え方で追随しているか

---

### 3.2 domain types

- [ ] [types.ts](/Users/mizuna/dev/cash-flow-sim/src/domain/simulation/types.ts)
- [ ] [index.ts](/Users/mizuna/dev/cash-flow-sim/src/domain/simulation/index.ts)
- [ ] [index.test.ts](/Users/mizuna/dev/cash-flow-sim/src/domain/simulation/index.test.ts)

確認観点:

* 内部型が旧語を引きずっていないか
* テスト名や assertion も新名称へ揃っているか
* short 判定の意味が名前と一致しているか

---

### 3.3 application services

- [ ] [build-database-simulation.ts](/Users/mizuna/dev/cash-flow-sim/src/application/services/build-database-simulation.ts)
- [ ] [build-simulation-comparison.ts](/Users/mizuna/dev/cash-flow-sim/src/application/services/build-simulation-comparison.ts)
- [ ] [dashboard-data.ts](/Users/mizuna/dev/cash-flow-sim/src/lib/dashboard-data.ts)

確認観点:

* service の戻り値名と UI の読みが一致しているか
* compare の差分項目名が主残高の考え方と合っているか

---

## 4. UI

### 4.1 Simulation

- [ ] [simulation-page-client.tsx](/Users/mizuna/dev/cash-flow-sim/src/components/simulation-page-client.tsx)
- [ ] [simulation-preview.tsx](/Users/mizuna/dev/cash-flow-sim/src/components/simulation-preview.tsx)
- [ ] [globals.css](/Users/mizuna/dev/cash-flow-sim/app/globals.css)

確認観点:

* KPI ラベル
* チャート凡例
* compare 差分文言
* short 説明
* 注記の語彙

---

### 4.2 Forecast

- [ ] [forecast-page-client.tsx](/Users/mizuna/dev/cash-flow-sim/src/components/forecast-page-client.tsx)
- [ ] [page.tsx](/Users/mizuna/dev/cash-flow-sim/app/forecast/page.tsx)
- [ ] [globals.css](/Users/mizuna/dev/cash-flow-sim/app/globals.css)

確認観点:

* 列名
* テーブルヘッダ
* 口座列の説明
* イベント明細の用語

---

### 4.3 その他のラベル残り

- [ ] `rg -n "theoretical|actual|理論|現実" src app`

確認観点:

* Simulation / Forecast 以外に旧語が残っていないか
* あえて残す場合は意味が別であることが明確か

---

## 5. 比較・計算ロジック

### 5.1 compare

- [ ] [build-simulation-comparison.ts](/Users/mizuna/dev/cash-flow-sim/src/application/services/build-simulation-comparison.ts)
- [ ] [simulation-page-client.tsx](/Users/mizuna/dev/cash-flow-sim/src/components/simulation-page-client.tsx)

確認観点:

* 何を差分比較しているかが新しい残高モデルで説明できるか
* `lowest` / `ending` が `cash` ベースなのか、別概念なのかを明示できるか
* `theoretical` 由来の差分を当面残すなら、その意味がUIで伝わるか

---

### 5.2 forecast summary / event summary

- [ ] [build-database-simulation.ts](/Users/mizuna/dev/cash-flow-sim/src/application/services/build-database-simulation.ts)
- [ ] [types.ts](/Users/mizuna/dev/cash-flow-sim/src/domain/simulation/types.ts)

確認観点:

* `actualCount` / `forecastCount` のような event summary は今のままで意味が通るか
* `actualsThroughDate` の表示名を変更する必要があるか

---

## 6. テスト

### 6.1 simulation tests

- [ ] [index.test.ts](/Users/mizuna/dev/cash-flow-sim/src/domain/simulation/index.test.ts)
- [ ] [forecast/index.test.ts](/Users/mizuna/dev/cash-flow-sim/src/domain/forecast/index.test.ts)

確認観点:

* フィールド名変更に追随しているか
* テストケース名が古い概念を前提にしていないか

---

### 6.2 手動確認

- [ ] `GET /api/simulation`
- [ ] `GET /api/simulation/compare` 相当の UI 動作
- [ ] `/simulation`
- [ ] `/forecast`

確認観点:

* JSON 形状
* 画面のラベル
* compare の差分説明
* short 判定の表示

---

## 7. seed / demo / import への影響

- [ ] [demo-walkthrough.md](/Users/mizuna/dev/cash-flow-sim/document/demo-walkthrough.md)
- [ ] import preview 上の用語
- [ ] seed データ説明文

確認観点:

* デモの説明が旧語を前提にしていないか
* ユーザーが見ている画面上の言葉と walkthrough が一致するか

---

## 8. 実装後の共通確認

- [ ] `npm run test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `podman compose restart`

必要に応じて:

- [ ] `podman compose exec app npm install` を実施したか
- [ ] API 実レスポンスを curl 等で確認したか
- [ ] ブラウザ画面を確認したか

---

## 9. 最初の実装単位のおすすめ

最初にやるなら、次の単位が最も安全。

### Unit A

* `actualBalance -> cash`
* `liquidAccountBalances -> cashByAccount`
* `cardBalances -> cardDebt`

対象:

* simulation domain types
* OpenAPI
* TS contract
* simulation / forecast UI
* compare service
* テスト

まだ触らないもの:

* `theoreticalBalance`
* `planned_outflow` の実体化

理由:

* rename の意味が明確
* 影響範囲を読みやすい
* `theoreticalBalance` 分解より先に片付けやすい
