import NavBar from '@/components/NavBar';
import ProductForm from '@/components/ProductForm';

export default function NewProductPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-6">商品マスタ 新規登録</h2>
        <ProductForm />
      </main>
    </div>
  );
}
