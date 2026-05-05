import { notFound } from 'next/navigation';
import NavBar from '@/components/NavBar';
import ReceiptForm from '@/components/ReceiptForm';
import { Receipt } from '@/lib/types';

async function getReceipt(id: string): Promise<Receipt | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/receipts/${id}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ id: string }> };

export default async function EditReceiptPage({ params }: Props) {
  const { id } = await params;
  const receipt = await getReceipt(id);

  if (!receipt) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-6">
          レシート編集
          <span className="ml-2 text-sm text-gray-400 font-normal">ID: {id}</span>
        </h2>
        <ReceiptForm initialData={receipt} receiptId={Number(id)} />
      </main>
    </div>
  );
}
