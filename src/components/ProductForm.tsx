'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, ProductCategory } from '@/lib/types';

type Props = {
  initialData?: Product;
  productId?: number;
};

export default function ProductForm({ initialData, productId }: Props) {
  const router = useRouter();
  const isEdit = !!productId;

  const [productCode, setProductCode] = useState(initialData?.product_code ?? '');
  const [productName, setProductName] = useState(initialData?.product_name ?? '');
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.category_id?.toString() ?? ''
  );
  const [manufacturer, setManufacturer] = useState(initialData?.manufacturer ?? '');
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/product-categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!productCode.trim()) { setError('商品コードを入力してください'); return; }
    if (!productName.trim()) { setError('商品名を入力してください'); return; }

    const payload: Product = {
      product_code: productCode.trim(),
      product_name: productName.trim(),
      category_id: categoryId ? Number(categoryId) : null,
      manufacturer: manufacturer.trim() || undefined,
      memo: memo.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/products/${productId}` : '/api/products';
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
      router.push('/products');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この商品を削除しますか？')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/products');
      router.refresh();
    } catch {
      setError('削除に失敗しました');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            商品コード <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="例：4901234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            商品名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="例：緑茶 500ml"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">カテゴリ</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">（未選択）</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">メーカー</label>
          <input
            type="text"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="例：サントリー"
          />
        </div>
      </div>

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

      <div className="flex gap-3 pt-2 border-t">
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
  );
}
