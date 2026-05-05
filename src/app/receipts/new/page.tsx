import NavBar from '@/components/NavBar';
import ReceiptForm from '@/components/ReceiptForm';

export default function NewReceiptPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-6">レシート新規登録</h2>
        <ReceiptForm />
      </main>
    </div>
  );
}
