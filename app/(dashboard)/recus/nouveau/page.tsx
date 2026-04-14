import ReceiptForm from '@/components/receipt/ReceiptForm';

export default function NouveauRecuPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Nouveau reçu de paiement</h1>
      <ReceiptForm />
    </div>
  );
}
