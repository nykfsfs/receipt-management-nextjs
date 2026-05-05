/**
 * DBマイグレーションスクリプト（既存データ全削除 → 再作成）
 *
 * 実行前に環境変数を設定してください:
 *   PowerShell: $env:DB_PASSWORD="xxxx"; node scripts/migrate.mjs
 *   bash:       DB_PASSWORD=xxxx node scripts/migrate.mjs
 *
 * .env.local の値を使う場合は dotenv-cli 経由で:
 *   npx dotenv -e .env.local -- node scripts/migrate.mjs
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER     ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME     ?? 'sample_schema',
  multipleStatements: true,
});

try {
  console.log('=== 既存テーブルを削除 ===');
  await conn.query(`
    SET FOREIGN_KEY_CHECKS = 0;
    DROP TABLE IF EXISTS receipt_items;
    DROP TABLE IF EXISTS receipts;
    DROP TABLE IF EXISTS tax_rates;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS product_categories;
    SET FOREIGN_KEY_CHECKS = 1;
  `);
  console.log('削除完了');

  console.log('\n=== 消費税マスタ ===');
  await conn.query(`
    CREATE TABLE tax_rates (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      applicable_from DATE         NOT NULL COMMENT '適用開始日',
      rate            DECIMAL(5,2) NOT NULL COMMENT '税率（%）',
      description     VARCHAR(100)          COMMENT '説明',
      created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tax_rates_from (applicable_from)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消費税マスタ';
  `);
  await conn.query(`
    INSERT INTO tax_rates (applicable_from, rate, description) VALUES
      ('1989-04-01',  3.00, '消費税導入'),
      ('1997-04-01',  5.00, '税率改定（3% → 5%）'),
      ('2014-04-01',  8.00, '税率改定（5% → 8%）'),
      ('2019-10-01', 10.00, '税率改定（8% → 10%）');
  `);
  console.log('消費税マスタ作成・データ投入完了');

  console.log('\n=== 商品カテゴリマスタ ===');
  await conn.query(`
    CREATE TABLE product_categories (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(100) NOT NULL COMMENT 'カテゴリ名',
      sort_order INT          NOT NULL DEFAULT 0 COMMENT '表示順',
      created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_product_categories_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品カテゴリマスタ';
  `);
  await conn.query(`
    INSERT INTO product_categories (name, sort_order) VALUES
      ('食料',   1),
      ('野菜',   2),
      ('果物',   3),
      ('お菓子', 4),
      ('嗜好品', 5),
      ('日用品', 6);
  `);
  console.log('商品カテゴリマスタ作成・データ投入完了');

  console.log('\n=== 商品マスタ ===');
  await conn.query(`
    CREATE TABLE products (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(50)  NOT NULL COMMENT '商品コード',
      product_name VARCHAR(200) NOT NULL COMMENT '商品名',
      category_id  INT                   COMMENT '商品カテゴリID',
      manufacturer VARCHAR(200)          COMMENT 'メーカー',
      memo         TEXT                  COMMENT 'メモ',
      created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_products_code (product_code),
      CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品マスタ';
  `);
  console.log('商品マスタ作成完了');

  console.log('\n=== レシートテーブル ===');
  await conn.query(`
    CREATE TABLE receipts (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      store_name    VARCHAR(100) NOT NULL COMMENT '店舗名',
      purchase_date DATE         NOT NULL COMMENT '購入日',
      tax_rate_id   INT          NOT NULL COMMENT '消費税マスタID',
      subtotal      INT          NOT NULL DEFAULT 0 COMMENT '小計（税抜）',
      tax_amount    INT          NOT NULL DEFAULT 0 COMMENT '消費税額合計',
      total_amount  INT          NOT NULL DEFAULT 0 COMMENT '合計金額',
      memo          TEXT                  COMMENT 'メモ',
      created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_receipts_tax_rate
        FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='レシート';
  `);
  console.log('レシートテーブル作成完了');

  console.log('\n=== レシート明細テーブル ===');
  await conn.query(`
    CREATE TABLE receipt_items (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      receipt_id      INT          NOT NULL COMMENT 'レシートID',
      product_code    VARCHAR(50)           COMMENT '商品コード（入力補助用・外部キーなし）',
      item_name       VARCHAR(200) NOT NULL COMMENT '商品名',
      quantity        INT          NOT NULL DEFAULT 1 COMMENT '数量',
      unit_price      INT          NOT NULL DEFAULT 0 COMMENT '単価',
      amount          INT          NOT NULL DEFAULT 0 COMMENT '金額（税抜）',
      item_tax_rate   DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT '明細税率（%）',
      item_tax_amount INT          NOT NULL DEFAULT 0 COMMENT '明細消費税額',
      CONSTRAINT fk_receipt_items_receipt
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='レシート明細';
  `);
  console.log('レシート明細テーブル作成完了');

  console.log('\n=== テーブル一覧確認 ===');
  const [tables] = await conn.query(`SHOW TABLES;`);
  console.table(tables);

  console.log('\n✓ マイグレーション完了');
} catch (err) {
  console.error('エラー:', err);
  process.exit(1);
} finally {
  await conn.end();
}
