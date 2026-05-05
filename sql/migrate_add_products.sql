USE sample_schema;

-- 商品カテゴリマスタ
CREATE TABLE IF NOT EXISTS product_categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL COMMENT 'カテゴリ名',
  sort_order INT          NOT NULL DEFAULT 0 COMMENT '表示順',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_product_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品カテゴリマスタ';

INSERT INTO product_categories (name, sort_order) VALUES
  ('食料',   1),
  ('野菜',   2),
  ('果物',   3),
  ('お菓子', 4),
  ('嗜好品', 5),
  ('日用品', 6)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

-- 商品マスタ
CREATE TABLE IF NOT EXISTS products (
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

-- レシート明細に商品コードカラムを追加
ALTER TABLE receipt_items
  ADD COLUMN product_code VARCHAR(50) NULL COMMENT '商品コード' AFTER id;
