export type TaxRate = {
  id: number;
  applicable_from: string;
  rate: number;
  description: string;
};

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
  created_at?: string;
  updated_at?: string;
};

export type ReceiptItem = {
  id?: number;
  receipt_id?: number;
  product_code?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_tax_rate: number;
  item_tax_amount: number;
};

export type Receipt = {
  id?: number;
  store_name: string;
  purchase_date: string;
  tax_rate_id: number;
  tax_rate?: number;
  tax_rate_description?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  memo: string;
  created_at?: string;
  updated_at?: string;
  items?: ReceiptItem[];
};
