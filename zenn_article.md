---
title: "Next.js 16 + MySQL でレシート管理システムを作る — 商品マスタ・選択モーダル実装まで"
emoji: "🧾"
type: "tech"
topics: ["nextjs", "react", "mysql", "typescript", "tailwindcss"]
published: false
---

## ソースコード

本記事で紹介するコードは GitHub で公開しています。

https://github.com/nykfsfs/receipt-management-nextjs

---

## はじめに

家計簿や経費精算で「レシートを見て手入力」する作業は地味に手間がかかります。本記事では **Next.js 16（App Router）+ MySQL** を使って、以下の機能を持つレシート管理システムを段階的に構築する手順を紹介します。

- レシートのCRUD（一覧・登録・編集・削除）
- 購入日に応じた消費税率の自動適用（税率履歴マスタ）
- **商品マスタ登録画面**（カテゴリ・メーカーなどの属性管理）
- **レシート明細行からの商品選択**（コード直接入力 or ポップアップ選択）

完成イメージはこんな感じです。

```
レシート管理システム
├── / ................. レシート一覧
├── /receipts/new ..... レシート新規登録（明細入力・商品選択モーダル）
├── /receipts/:id/edit  レシート編集
├── /products ......... 商品マスタ一覧
├── /products/new ..... 商品マスタ新規登録
└── /products/:id/edit  商品マスタ編集
```

---

## 技術スタック

| 分類 | 採用技術 |
|------|---------|
| フレームワーク | Next.js 16.2（App Router / Turbopack） |
| UI | React 19、Tailwind CSS v4 |
| 言語 | TypeScript 5 |
| DB | MySQL 8（mysql2/promise） |
| ランタイム | Node.js |

---

## DBスキーマ設計

### ER図（簡略）

```
tax_rates         product_categories
    │                    │
    │                    ▼
    │              products（商品マスタ）
    │
    ▼
receipts ──── receipt_items
                （product_code で products と疎結合）
```

receipt_items は `product_code` を保持しますが、外部キー制約はかけません。商品マスタから選択するのはあくまで入力補助であり、商品の削除後もレシートの記録は残す設計にしています。

### DDL

```sql
-- 消費税マスタ（税率の歴史を保持）
CREATE TABLE tax_rates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  applicable_from DATE         NOT NULL,
  rate            DECIMAL(5,2) NOT NULL,
  description     VARCHAR(100),
  UNIQUE KEY uk_tax_rates_from (applicable_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tax_rates (applicable_from, rate, description) VALUES
  ('1989-04-01',  3.00, '消費税導入'),
  ('1997-04-01',  5.00, '税率改定（3% → 5%）'),
  ('2014-04-01',  8.00, '税率改定（5% → 8%）'),
  ('2019-10-01', 10.00, '税率改定（8% → 10%）');

-- 商品カテゴリマスタ
CREATE TABLE product_categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  UNIQUE KEY uk_product_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品マスタ
CREATE TABLE products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(50)  NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category_id  INT,
  manufacturer VARCHAR(200),
  memo         TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_products_code (product_code),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- レシート
CREATE TABLE receipts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  store_name    VARCHAR(100) NOT NULL,
  purchase_date DATE         NOT NULL,
  tax_rate_id   INT          NOT NULL,
  subtotal      INT          NOT NULL DEFAULT 0,
  tax_amount    INT          NOT NULL DEFAULT 0,
  total_amount  INT          NOT NULL DEFAULT 0,
  memo          TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipts_tax_rate FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- レシート明細
CREATE TABLE receipt_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id      INT          NOT NULL,
  product_code    VARCHAR(50),           -- 入力補助用（外部キーなし）
  item_name       VARCHAR(200) NOT NULL,
  quantity        INT          NOT NULL DEFAULT 1,
  unit_price      INT          NOT NULL DEFAULT 0,
  amount          INT          NOT NULL DEFAULT 0,
  item_tax_rate   DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  item_tax_amount INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_receipt_items_receipt
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx                    # レシート一覧
│   ├── receipts/
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   ├── products/
│   │   ├── page.tsx                # 商品マスタ一覧
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   └── api/
│       ├── tax-rates/route.ts
│       ├── receipts/
│       │   ├── route.ts            # GET / POST
│       │   └── [id]/route.ts       # GET / PUT / DELETE
│       ├── product-categories/route.ts
│       └── products/
│           ├── route.ts            # GET（一覧・コード検索）/ POST
│           └── [id]/route.ts       # GET / PUT / DELETE
├── components/
│   ├── NavBar.tsx                  # 共通ナビゲーション
│   ├── ReceiptForm.tsx             # レシート入力フォーム
│   ├── ProductForm.tsx             # 商品マスタ入力フォーム
│   └── ProductSelectModal.tsx      # 商品選択ポップアップ
└── lib/
    ├── db.ts                       # mysql2 コネクションプール
    └── types.ts                    # 型定義
```

---

## 実装のポイント

### 1. 購入日から消費税率を自動解決する API

購入日を渡すと、その時点で適用されていた税率レコードを返すエンドポイントです。

:::message
**mysql2/promise の型パラメータについて**
`pool.query<T>()` の返り値は `Promise<[T, FieldPacket[]]>` のタプルです。ジェネリクス `T` は *rows* の型を表します。通常の SELECT では各要素が1行に対応する `RowDataPacket[]` を指定し、デストラクチャリングで `const [rows] = await pool.query<RowDataPacket[]>(...)` と書くことで `rows: RowDataPacket[]` を得ます。`RowDataPacket[][]` は `multipleStatements: true` 設定で複数のクエリを一度に発行した場合（複数の結果セットが返る場合）に使います。
:::

```ts
// src/app/api/tax-rates/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (date) {
    // 購入日以前で最も新しい税率を取得
    // pool.query<RowDataPacket[]> → [rows: RowDataPacket[], fields: FieldPacket[]] のタプルを返す
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM tax_rates
       WHERE applicable_from <= ?
       ORDER BY applicable_from DESC
       LIMIT 1`,
      [date]
    );
    return NextResponse.json(rows[0] ?? null);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tax_rates ORDER BY applicable_from`
  );
  return NextResponse.json(rows);
}
```

フロント側は購入日の `onChange` で即座にフェッチし、明細行の税率を一括更新します。

```ts
// ReceiptForm.tsx（抜粋）
const fetchTaxRate = useCallback(async (date: string) => {
  const res = await fetch(`/api/tax-rates?date=${date}`);
  const taxRate: TaxRate = await res.json();
  setCurrentTaxRate(taxRate);
  // 全明細行の税率・税額を更新
  setItems((prev) =>
    prev.map((item) => ({
      ...item,
      item_tax_rate: taxRate.rate,
      // Math.floor = 端数切り捨て。日本の消費税は「切り捨て」が一般的なビジネスルール。
      // 四捨五入にする場合は Math.round に変更する。
      item_tax_amount: Math.floor(item.amount * taxRate.rate / 100),
    }))
  );
}, []);

useEffect(() => {
  if (purchaseDate) fetchTaxRate(purchaseDate);
}, [purchaseDate, fetchTaxRate]);
```

### 2. 商品マスタ API — コード検索と一覧検索を 1 エンドポイントで

`?code=xxx` で単一取得、`?search=xxx&category_id=n` で絞り込み一覧を返します。

```ts
// src/app/api/products/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

// JOIN句を共通化した定数
const SELECT_PRODUCT = `
  SELECT p.id, p.product_code, p.product_name, p.category_id,
         pc.name AS category_name, p.manufacturer, p.memo,
         p.created_at, p.updated_at
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const search = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('category_id');

  // 商品コードによる単一検索（明細行からのコード入力補完用）
  if (code) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_PRODUCT} WHERE p.product_code = ?`, [code]
    );
    if (rows.length === 0) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  }

  // 一覧検索（モーダルの検索フィルター用）
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (search) {
    conditions.push('(p.product_code LIKE ? OR p.product_name LIKE ? OR p.manufacturer LIKE ?)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (categoryId) {
    conditions.push('p.category_id = ?');
    values.push(Number(categoryId));
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_PRODUCT} ${where} ORDER BY p.product_code LIMIT 200`, values
  );
  return NextResponse.json(rows);
}
```

### 3. レシート明細への商品コード入力と選択ボタン

明細の各行に「商品コード入力」と「選択ボタン」を追加しました。

- **コード直接入力**：フォーカスが外れたとき（`onBlur`）または Enter キーで `/api/products?code=xxx` をフェッチし、ヒットすれば商品名を自動補完
- **選択ボタン**：クリックで `ProductSelectModal` を開き、選択した商品のコード・商品名を反映

```tsx
// ReceiptForm.tsx（明細行の商品コード部分）
<div className="flex items-center gap-1 mb-1">
  <input
    type="text"
    value={item.product_code ?? ''}
    onChange={(e) => updateItem(i, 'product_code', e.target.value)}
    onBlur={(e) => lookupProductByCode(i, e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        lookupProductByCode(i, (e.target as HTMLInputElement).value);
      }
    }}
    className="w-32 border border-gray-300 rounded px-2 py-1 text-xs font-mono ..."
    placeholder="商品コード"
  />
  <button
    type="button"
    onClick={() => setProductSelectIndex(i)}
    className="text-xs bg-gray-100 hover:bg-blue-50 border border-gray-300 ..."
  >
    選択
  </button>
</div>
<input
  type="text"
  value={item.item_name}
  onChange={(e) => updateItem(i, 'item_name', e.target.value)}
  placeholder="商品名"
  ...
/>
```

```ts
// コード入力補完ロジック
const lookupProductByCode = async (index: number, code: string) => {
  if (!code.trim()) return;
  const res = await fetch(`/api/products?code=${encodeURIComponent(code.trim())}`);
  if (!res.ok) return;
  const product: Product = await res.json();
  applyProduct(index, product);  // product_code と item_name を反映
};
```

### 4. 商品選択モーダル

検索テキストやカテゴリフィルターの変更を 300ms デバウンスして API を叩き、リアルタイムで候補を絞り込みます。

```tsx
// ProductSelectModal.tsx（抜粋）
const fetchProducts = useCallback(async () => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (categoryId) params.set('category_id', categoryId);
  const res = await fetch(`/api/products?${params}`);
  const data = await res.json();
  setProducts(Array.isArray(data) ? data : []);
}, [search, categoryId]);

useEffect(() => {
  const timer = setTimeout(fetchProducts, 300);  // デバウンス
  return () => clearTimeout(timer);
}, [fetchProducts]);
```

モーダルの開閉は `productSelectIndex`（`number | null`）で管理し、行インデックスを同時に保持することで「どの明細行の選択か」を追跡します。

```tsx
// ReceiptForm.tsx
const [productSelectIndex, setProductSelectIndex] = useState<number | null>(null);

const handleProductSelect = (product: Product) => {
  if (productSelectIndex !== null) applyProduct(productSelectIndex, product);
  setProductSelectIndex(null);  // モーダルを閉じる
};

return (
  <>
    {productSelectIndex !== null && (
      <ProductSelectModal
        onSelect={handleProductSelect}
        onClose={() => setProductSelectIndex(null)}
      />
    )}
    <form>...</form>
  </>
);
```

### 5. DB接続プール

`mysql2/promise` でコネクションプールを作り、`src/lib/db.ts` から全 API ルートで使い回します。トランザクションが必要な処理（レシートと明細の同時保存）は `pool.getConnection()` で接続を取り出して使います。

```ts
// src/lib/db.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'sample_schema',
  connectionLimit: 10,
});

export default pool;
```

```ts
// レシート登録API（トランザクション例）
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  const [result] = await conn.query<ResultSetHeader>(
    `INSERT INTO receipts (...) VALUES (?, ?, ...)`, [...]
  );
  const receiptId = result.insertId;
  // 明細の一括INSERT
  await conn.query(
    `INSERT INTO receipt_items (receipt_id, product_code, item_name, ...) VALUES ?`,
    [itemValues]
  );
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  conn.release();
}
```

---

## 型定義

TypeScript の型を一箇所に集約しています。`ReceiptItem` の `product_code` はオプショナルで、商品マスタ未登録の商品でも手入力で登録できる設計です。

```ts
// src/lib/types.ts
export type ProductCategory = {
  id: number;
  name: string;
  sort_order: number;
};

export type Product = {
  id?: number;
  product_code: string;
  product_name: string;
  category_id?: number | null;
  category_name?: string;
  manufacturer?: string;
  memo?: string;
};

export type ReceiptItem = {
  id?: number;
  receipt_id?: number;
  product_code?: string;    // 任意（手入力可）
  item_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_tax_rate: number;
  item_tax_amount: number;
};
```

---

## つまずきポイント

### Next.js App Router の動的ルートパラメータは Promise

Next.js 15 で導入された破壊的変更として、`params` が同期オブジェクトから `Promise` に変わりました。本記事で使用する Next.js 16 でも同様の仕様です（15 より前のコードからの移行時に注意してください）。

```ts
// NG（古いパターン）
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params; // 型エラーになる
}

// OK
type Params = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
}
```

### mysql2 の bulk INSERT

明細の一括挿入には `VALUES ?` に二次元配列を渡す mysql2 の構文を使います。

```ts
const itemValues = items.map((item) => [
  receiptId, item.product_code || null, item.item_name,
  item.quantity, item.unit_price, item.amount,
  item.item_tax_rate, item.item_tax_amount,
]);
await conn.query(
  `INSERT INTO receipt_items (receipt_id, product_code, item_name, ...) VALUES ?`,
  [itemValues]  // ← 二次元配列を配列でラップ
);
```

### 商品マスタとの疎結合

receipt_items の `product_code` に外部キー制約を付けると、商品マスタから削除した商品が含まれるレシートを更新できなくなります。「商品マスタは入力補助」という割り切りで、外部キーなし・`product_code` は `NULL` 許容にしました。

---

## まとめ

| 機能 | 実装のカギ |
|------|-----------|
| 消費税の自動適用 | 購入日で `applicable_from <= date` を降順ソートして最初の1件を取得 |
| 商品コードによる補完 | `onBlur` / Enter で `/api/products?code=xxx` をフェッチ |
| 商品選択モーダル | `productSelectIndex`（行番号）で開閉と対象行を一元管理 |
| デバウンス検索 | `setTimeout` + クリーンアップ関数でリクエスト数を抑制 |
| トランザクション | `pool.getConnection()` → `beginTransaction` → `commit/rollback` |

Next.js の App Router（Server Components / Route Handlers）と mysql2 の組み合わせは、フロントとバックエンドを一つのリポジトリにまとめられる点でスモールプロジェクトに向いています。ぜひ参考にしてみてください。

完全なソースコードはこちら → https://github.com/nykfsfs/receipt-management-nextjs
