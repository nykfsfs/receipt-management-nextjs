'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product, ProductCategory } from '@/lib/types';

type Props = {
  onSelect: (product: Product) => void;
  onClose: () => void;
};

export default function ProductSelectModal({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/product-categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId) params.set('category_id', categoryId);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-700">商品選択</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* 検索フィルター */}
        <div className="px-6 py-3 border-b bg-gray-50 flex flex-wrap gap-3 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="商品コード・商品名・メーカーで検索"
            className="flex-1 min-w-48 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">全カテゴリ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 商品一覧 */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-gray-400 py-8 text-sm">読み込み中...</p>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">該当する商品がありません</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">商品コード</th>
                  <th className="text-left px-4 py-2 font-medium">商品名</th>
                  <th className="text-left px-4 py-2 font-medium">カテゴリ</th>
                  <th className="text-left px-4 py-2 font-medium">メーカー</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelect(p)}
                    className={`border-t cursor-pointer hover:bg-blue-50 transition ${
                      idx % 2 === 1 ? 'bg-gray-50' : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-mono text-gray-700">{p.product_code}</td>
                    <td className="px-4 py-2 text-gray-800 font-medium">{p.product_name}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {p.category_name ? (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {p.category_name}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{p.manufacturer || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-3 border-t text-right flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
