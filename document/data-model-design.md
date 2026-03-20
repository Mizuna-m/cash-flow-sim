# データモデル草案（Draft v0.2）

---

## 1. 設計方針（更新）

### 1.1 セマンティクスの扱い

* Category / Project は「タグ」として扱う
* RDBで厳密管理しない
* JSONまたは別コレクションで柔軟管理

---

### 1.2 Transaction設計

* 金額は正負（+/-）で表現
* 支出・収入を分けない

---

### 1.3 Account設計

* 複数口座・複数カード・複数通貨を許容
* 通貨はAccount単位で持つ

---

### 1.4 Forecast設計

* 基本はオンデマンド生成
* 必要に応じてキャッシュ

---

## 2. エンティティ（更新）

---

### 2.1 Transaction（更新）

#### カラム

* id (PK)
* date
* amount（+収入 / -支出）
* tags（JSONB） ← ★変更
* card_id（nullable）
* memo
* created_at
* order_index

---

#### tags例

```json
{
  "category": ["交通費", "旅行"],
  "project": ["箱根旅行"],
  "custom": ["立替", "仕事"]
}
```

---

### 2.2 Category / Project（変更）

#### 方針

* マスタとして厳密管理しない
* 以下いずれかで実現：

##### Option A（推奨）

* tagsの自由入力
* よく使うタグのみ別テーブルで補助管理

##### Option B

* NoSQL（例：Mongo）でタグ辞書管理

---

### 2.3 Account（更新）

#### カラム

* id (PK)
* name
* type（cash / bank / credit / loan / investment）
* currency（例：JPY, USD）
* initial_balance
* is_active

---

### 2.4 CreditCard（更新）

#### カラム

* id (PK)
* name
* closing_day
* payment_day
* account_id（引落口座）
* currency

---

---

## 3. Forecast設計（重要）

---

### 3.1 基本方針

* Forecastは保存しない（原則）
* 必要に応じてキャッシュ

---

### 3.2 キャッシュ戦略

#### キャッシュ対象

* 日次残高結果
* カード引落予測

---

#### キャッシュテーブル（任意）

```id="cache1"
SimulationCache
- id
- date_range
- generated_at
- result_json
```

---

### 3.3 更新トリガ

以下でキャッシュ無効化：

* Transaction追加/更新
* CardPayment追加
* ScheduledEvent変更

---

---

## 4. カード予測との整合

---

### 4.1 card_idの扱い

* null許容
* nullの場合：

  * default_cardへ割当

---

### 4.2 将来拡張

* タグベース割当（例：交通費→特定カード）

---

---

## 5. インデックス（更新）

* Transaction(date)
* Transaction(tags JSONB GIN) ← ★重要
* Transaction(card_id)
* Account(type)
* CardPayment(date)

---

---

## 6. この構成のメリット

---

### 6.1 柔軟性

* タグ無限拡張
* Project / Categoryの統合

---

### 6.2 UXとの整合

* 入力が自然（分類を強制しない）

---

### 6.3 将来拡張

* ML分類
* 自動タグ付け
* 分析

---

---

## 7. リスクと対策

---

### リスク①：タグの乱雑化

→ 対策：

* サジェスト
* よく使うタグを昇格

---

### リスク②：クエリ複雑化

→ 対策：

* JSONB GIN index
* 集計用ビュー

---

### リスク③：パフォーマンス

→ 対策：

* キャッシュ
* 期間限定クエリ

---

---

## 8. 設計の本質（重要）

---

このモデルの核心：

👉 「お金の動き（Fact）」と「意味（Tag）」を分離

---

* Fact：RDBで厳密
* 意味：柔軟

---

（以上）
