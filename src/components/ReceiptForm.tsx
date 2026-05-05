'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, ReceiptItem, TaxRate, Product } from '@/lib/types';
import ProductSelectModal from '@/components/ProductSelectModal';

type Props = {
  initialData?: Receipt;
  receiptId?: number;
};

const emptyItem = (defaultRate: number): ReceiptItem => ({
  product_code: '',
  item_name: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
  item_tax_rate: defaultRate,
  item_tax_amount: 0,
});

export default function ReceiptForm({ initialData, receiptId }: Props) {
  const router = useRouter();
  const isEdit = !!receiptId;

  const [storeName, setStoreName] = useState(initialData?.store_name ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchase_date ?? '');
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [items, setItems] = useState<ReceiptItem[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [emptyItem(initialData?.tax_rate ?? 10)]
  );
  const [currentTaxRate, setCurrentTaxRate] = useState<TaxRate | null>(
    initialData?.tax_rate_id
      ? {
          id: initialData.tax_rate_id,
          rate: initialData.tax_rate ?? 10,
          description: initialData.tax_rate_description ?? '',
          applicable_from: '',
        }
      : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [productSelectIndex, setProductSelectIndex] = useState<number | null>(null);

  const fetchTaxRate = useCallback(async (date: string) => {
    if (!date) return;
    try {
      const res = await fetch(`/api/tax-rates?date=${date}`);
      if (!res.ok) return;
      const taxRate: TaxRate = await res.json();
      setCurrentTaxRate(taxRate);
      setItems((prev) =>
        prev.map((item) => {
          const newTax = Math.floor(item.amount * taxRate.rate / 100);
          return { ...item, item_tax_rate: taxRate.rate, item_tax_amount: newTax };
        })
      );
    } catch {
      // 取得失敗時は無視
    }
  }, []);

  useEffect(() => {
    if (purchaseDate) fetchTaxRate(purchaseDate);
  }, [purchaseDate, fetchTaxRate]);

  useEffect(() => {
    if (initialData) {
      setStoreName(initialData.store_name);
      setPurchaseDate(initialData.purchase_date);
      setMemo(initialData.memo ?? '');
      setItems(
        initialData.items && initialData.items.length > 0
          ? initialData.items
          : [emptyItem(initialData.tax_rate ?? 10)]
      );
    }
  }, [initialData]);

  const updateItem = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        item.amount = Number(item.quantity) * Number(item.unit_price);
        item.item_tax_amount = Math.floor(item.amount * Number(item.item_tax_rate) / 100);
      }
      if (field === 'item_tax_rate') {
        item.item_tax_amount = Math.floor(item.amount * Number(value) / 100);
      }
      next[index] = item;
      return next;
    });
  };

  const applyProduct = (index: number, product: Product) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], product_code: product.product_code, item_name: product.product_name };
      return next;
    });
  };

  const lookupProductByCode = async (index: number, code: string) => {
    if (!code.trim()) return;
    try {
      const res = await fetch(`/api/products?code=${encodeURIComponent(code.trim())}`);
      if (!res.ok) return;
      const product: Product = await res.json();
      applyProduct(index, product);
    } catch {
      // 見つからない場合は無視
    }
  };

  const handleProductSelect = (product: Product) => {
    if (productSelectIndex !== null) {
      applyProduct(productSelectIndex, product);
    }
    setProductSelectIndex(null);
  };

  const addItem = () =>
    setItems((prev) => [...prev, emptyItem(currentTaxRate?.rate ?? 10)]);

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const taxAmount = items.reduce((sum, i) => sum + (i.item_tax_amount || 0), 0);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!storeName.trim()) { setError('店舗名を入力してください'); return; }
    if (!purchaseDate) { setError('購入日を入力してください'); return; }
    if (!currentTaxRate) { setError('購入日に対応する税率が取得できません'); return; }
    if (items.some((i) => !i.item_name.trim())) { setError('商品名が未入力の明細があります'); return; }

    const payload: Receipt = {
      store_name: storeName,
      purchase_date: purchaseDate,
      tax_rate_id: currentTaxRate.id,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      memo,
      items,
    };

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/receipts/${receiptId}` : '/api/receipts';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? '登録に失敗しました');
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('このレシートを削除しますか？')) return;
    try {
      await fetch(`/api/receipts/${receiptId}`, { method: 'DELETE' });
      router.push('/');
      router.refresh();
    } catch {
      setError('削除に失敗しました');
    }
  };

  return (
    <>
      {productSelectIndex !== null && (
        <ProductSelectModal
          onSelect={handleProductSelect}
          onClose={() => setProductSelectIndex(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded p-3 text-sm">
            {error}
          </div>
        )}

        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                店舗名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="例：スーパーマーケット ABC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                購入日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {currentTaxRate ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">適用税率：</span>
              <span className="inline-block bg-blue-100 text-blue-700 font-semibold px-3 py-0.5 rounded-full">
                {currentTaxRate.rate}%
              </span>
              <span className="text-gray-400">（{currentTaxRate.description}）</span>
            </div>
          ) : purchaseDate ? (
            <p className="text-sm text-amber-600">税率を取得中...</p>
          ) : (
            <p className="text-sm text-gray-400">購入日を入力すると適用税率が自動設定されます</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="備考など"
            />
          </div>
        </div>

        {/* 明細 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-700">購入明細</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
            >
              ＋ 行追加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-2 py-2 font-medium">商品コード / 商品名</th>
                  <th className="text-right px-2 py-2 font-medium w-16">数量</th>
                  <th className="text-right px-2 py-2 font-medium w-24">単価（円）</th>
                  <th className="text-right px-2 py-2 font-medium w-24">金額（円）</th>
                  <th className="text-right px-2 py-2 font-medium w-20">税率（%）</th>
                  <th className="text-right px-2 py-2 font-medium w-24">消費税（円）</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      {/* 商品コード入力＋選択ボタン */}
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
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                          placeholder="商品コード"
                        />
                        <button
                          type="button"
                          onClick={() => setProductSelectIndex(i)}
                          className="text-xs bg-gray-100 hover:bg-blue-50 hover:border-blue-300 border border-gray-300 text-gray-600 hover:text-blue-600 px-2 py-1 rounded whitespace-nowrap transition"
                          title="商品選択"
                        >
                          選択
                        </button>
                      </div>
                      {/* 商品名入力 */}
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => updateItem(i, 'item_name', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="商品名"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-gray-700">
                      {item.amount.toLocaleString()}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={item.item_tax_rate}
                        onChange={(e) => updateItem(i, 'item_tax_rate', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-gray-500">
                      {item.item_tax_amount.toLocaleString()}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg leading-none"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 合計欄 */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-end gap-8">
              <span className="text-gray-600">小計（税抜）</span>
              <span className="font-mono w-32 text-right">{subtotal.toLocaleString()} 円</span>
            </div>
            <div className="flex justify-end gap-8">
              <span className="text-gray-600">消費税合計</span>
              <span className="font-mono w-32 text-right">{taxAmount.toLocaleString()} 円</span>
            </div>
            <div className="flex justify-end gap-8 text-base font-bold text-gray-800 border-t pt-1">
              <span>合計</span>
              <span className="font-mono w-32 text-right">{totalAmount.toLocaleString()} 円</span>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
          >
            {submitting ? '保存中...' : isEdit ? '更新する' : '登録する'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded font-medium"
          >
            キャンセル
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded font-medium"
            >
              削除
            </button>
          )}
        </div>
      </form>
    </>
  );
}
