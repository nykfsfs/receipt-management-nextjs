import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import ProductForm from '@/components/ProductForm';
import { Product } from '@/lib/types';

type Props = { params: Promise<{ id: string }> };

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/products/${id}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-6">
          商品マスタ 編集
          <span className="ml-2 text-sm text-gray-400 font-normal">ID: {id}</span>
        </h2>
        <ProductForm initialData={product} productId={product.id} />
      </main>
    </div>
  );
}
