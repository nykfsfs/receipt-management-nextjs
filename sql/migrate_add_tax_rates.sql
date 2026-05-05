-- 既存DBへの追加マイグレーション
-- ※ init.sql で新規作成した場合は不要

USE sample_schema;

-- 消費税マスタ作成
CREATE TABLE IF NOT EXISTS tax_rates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  applicable_from DATE         NOT NULL COMMENT '適用開始日',
  rate            DECIMAL(5,2) NOT NULL COMMENT '税率（%）',
  description     VARCHAR(100)          COMMENT '説明',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tax_rates_from (applicable_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消費税マスタ';

INSERT IGNORE INTO tax_rates (applicable_from, rate, description) VALUES
  ('1989-04-01',  3.00, '消費税導入'),
  ('1997-04-01',  5.00, '税率改定（3% → 5%）'),
  ('2014-04-01',  8.00, '税率改定（5% → 8%）'),
  ('2019-10-01', 10.00, '税率改定（8% → 10%）');

-- receipts に tax_rate_id 列追加（既存レコードは購入日時点の税率で埋める）
ALTER TABLE receipts
  ADD COLUMN tax_rate_id INT NOT NULL DEFAULT 0 COMMENT '消費税マスタID' AFTER purchase_date;

UPDATE receipts r
  JOIN tax_rates t
    ON t.applicable_from = (
      SELECT MAX(applicable_from) FROM tax_rates
      WHERE applicable_from <= r.purchase_date
    )
  SET r.tax_rate_id = t.id;

ALTER TABLE receipts
  ADD CONSTRAINT fk_receipts_tax_rate
    FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id);

-- receipt_items に明細税率列追加
ALTER TABLE receipt_items
  ADD COLUMN item_tax_rate   DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT '明細税率（%）' AFTER amount,
  ADD COLUMN item_tax_amount INT          NOT NULL DEFAULT 0     COMMENT '明細消費税額'  AFTER item_tax_rate;

-- 既存明細の消費税額を再計算（FLOOR(amount * rate / 100)）
UPDATE receipt_items ri
  JOIN receipts r ON r.id = ri.receipt_id
  JOIN tax_rates t ON t.id = r.tax_rate_id
  SET ri.item_tax_rate   = t.rate,
      ri.item_tax_amount = FLOOR(ri.amount * t.rate / 100);
