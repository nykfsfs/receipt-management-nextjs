-- レシート管理システム DDL
-- データベース: sample_schema

USE sample_schema;

-- 消費税マスタ
CREATE TABLE IF NOT EXISTS tax_rates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  applicable_from DATE         NOT NULL COMMENT '適用開始日',
  rate            DECIMAL(5,2) NOT NULL COMMENT '税率（%）',
  description     VARCHAR(100)          COMMENT '説明',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tax_rates_from (applicable_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消費税マスタ';

-- 日本の消費税率履歴
INSERT INTO tax_rates (applicable_from, rate, description) VALUES
  ('1989-04-01',  3.00, '消費税導入'),
  ('1997-04-01',  5.00, '税率改定（3% → 5%）'),
  ('2014-04-01',  8.00, '税率改定（5% → 8%）'),
  ('2019-10-01', 10.00, '税率改定（8% → 10%）');

-- レシートテーブル
CREATE TABLE IF NOT EXISTS receipts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  store_name    VARCHAR(100) NOT NULL COMMENT '店舗名',
  purchase_date DATE         NOT NULL COMMENT '購入日',
  tax_rate_id   INT          NOT NULL COMMENT '消費税マスタID（購入日時点の基本税率）',
  subtotal      INT          NOT NULL DEFAULT 0 COMMENT '小計（税抜）',
  tax_amount    INT          NOT NULL DEFAULT 0 COMMENT '消費税額合計',
  total_amount  INT          NOT NULL DEFAULT 0 COMMENT '合計金額',
  memo          TEXT                  COMMENT 'メモ',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipts_tax_rate
    FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='レシート';

-- レシート明細テーブル
CREATE TABLE IF NOT EXISTS receipt_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id     INT          NOT NULL COMMENT 'レシートID',
  item_name      VARCHAR(200) NOT NULL COMMENT '商品名',
  quantity       INT          NOT NULL DEFAULT 1 COMMENT '数量',
  unit_price     INT          NOT NULL DEFAULT 0 COMMENT '単価',
  amount         INT          NOT NULL DEFAULT 0 COMMENT '金額（税抜）',
  item_tax_rate  DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT '明細税率（%）',
  item_tax_amount INT         NOT NULL DEFAULT 0 COMMENT '明細消費税額',
  CONSTRAINT fk_receipt_items_receipt
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='レシート明細';
