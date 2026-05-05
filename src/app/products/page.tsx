import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { Product } from '@/lib/types';

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/products`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">
            商品マスタ一覧
            <span className="ml-2 text-sm text-gray-400 font-normal">{products.length} 件</span>
          </h2>
          <Link
            href="/products/new"
            className="bg-blue-600 text-white font-medium px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            ＋ 新規登録
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
            <p className="text-lg">商品がまだ登録されていません</p>
            <Link href="/products/new" className="inline-block mt-4 text-blue-600 hover:underline">
              最初の商品を登録する →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">商品コード</th>
                  <th className="text-left px-4 py-3 font-medium">商品名</th>
                  <th className="text-left px-4 py-3 font-medium">カテゴリ</th>
                  <th className="text-left px-4 py-3 font-medium">メーカー</th>
                  <th className="text-left px-4 py-3 font-medium">メモ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-t hover:bg-blue-50 transition ${
                      idx % 2 === 1 ? 'bg-gray-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-gray-700">{p.product_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.product_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.category_name ? (
                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {p.category_name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.manufacturer || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{p.memo || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        編集
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
