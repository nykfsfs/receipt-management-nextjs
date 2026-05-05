import Link from 'next/link';

export default function NavBar() {
  return (
    <header className="bg-blue-600 text-white shadow">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-6">
        <h1 className="text-xl font-bold">レシート管理システム</h1>
        <nav className="flex gap-5 ml-2">
          <Link
            href="/"
            className="text-blue-100 hover:text-white transition text-sm font-medium"
          >
            レシート一覧
          </Link>
          <Link
            href="/products"
            className="text-blue-100 hover:text-white transition text-sm font-medium"
          >
            商品マスタ
          </Link>
        </nav>
      </div>
    </header>
  );
}
