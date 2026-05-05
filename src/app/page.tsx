import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { Receipt } from '@/lib/types';

async function getReceipts(): Promise<Receipt[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/receipts`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const receipts = await getReceipts();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* メインコンテンツ */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">
            レシート一覧
            <span className="ml-2 text-sm text-gray-400 font-normal">
              {receipts.length} 件
            </span>
          </h2>
          <Link
            href="/receipts/new"
            className="bg-blue-600 text-white font-medium px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            ＋ 新規登録
          </Link>
        </div>

        {receipts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🧾</p>
            <p className="text-lg">レシートがまだ登録されていません</p>
            <Link
              href="/receipts/new"
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              最初のレシートを登録する →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">店舗名</th>
                  <th className="text-left px-4 py-3 font-medium">購入日</th>
                  <th className="text-center px-4 py-3 font-medium">税率</th>
                  <th className="text-right px-4 py-3 font-medium">小計</th>
                  <th className="text-right px-4 py-3 font-medium">消費税</th>
                  <th className="text-right px-4 py-3 font-medium">合計</th>
                  <th className="text-left px-4 py-3 font-medium">メモ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-t hover:bg-blue-50 transition ${
                      idx % 2 === 1 ? 'bg-gray-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400">{r.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.store_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.purchase_date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {Number(r.tax_rate)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                      {Number(r.subtotal).toLocaleString()} 円
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                      {Number(r.tax_amount).toLocaleString()} 円
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                      {Number(r.total_amount).toLocaleString()} 円
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {r.memo || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/receipts/${r.id}/edit`}
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
