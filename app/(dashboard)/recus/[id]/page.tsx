'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Receipt, ReceiptLot } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer } from 'lucide-react';

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [lots, setLots] = useState<ReceiptLot[]>([]);

  useEffect(() => {
    loadReceipt();
  }, []);

  async function loadReceipt() {
    const id = params.id as string;
    const { data } = await supabase.from('receipts').select('*').eq('id', id).single();
    if (data) setReceipt(data);

    const { data: lotData } = await supabase
      .from('receipt_lots')
      .select('*')
      .eq('receipt_id', id)
      .order('display_order');
    if (lotData) setLots(lotData);
  }

  if (!receipt) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;
  }

  const statusBadge = () => {
    switch (receipt.status) {
      case 'soldé':
        return <Badge className="bg-green-100 text-green-800 text-base px-3 py-1">Soldé</Badge>;
      case 'partiel':
        return <Badge className="bg-orange-100 text-orange-800 text-base px-3 py-1">Partiel</Badge>;
      case 'annulé':
        return <Badge className="bg-red-100 text-red-800 text-base px-3 py-1 line-through">Annulé</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header print uniquement : logo + infos entreprise */}
        <div className="print-only border-b pb-4 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">WEBUILDD</h2>
              <p className="text-xs text-gray-500">Foncier & Immobilier</p>
              <p className="text-xs text-gray-500">Marcory Zone 4 — Abidjan</p>
              <p className="text-xs text-gray-500">www.webuildd-ci.com</p>
            </div>
            <img src="/logoW.png" alt="WEBUILDD" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Header normal : navigation + logo + bouton imprimer */}
        <div className="no-print flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold">Reçu {receipt.receipt_number}</h1>
            <p className="text-sm text-muted-foreground">Créé le {formatDate(receipt.created_at)}</p>
          </div>
          {statusBadge()}
          <Button className="bg-[#8B1A1A] hover:bg-[#6B1414]" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
          </Button>
          <img src="/logoW.png" alt="WEBUILDD" style={{ height: '50px', objectFit: 'contain' }} />
        </div>

        {/* Titre visible à l'impression */}
        <div className="print-only">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Reçu {receipt.receipt_number}</h1>
              <p className="text-sm text-gray-500">Créé le {formatDate(receipt.created_at)}</p>
            </div>
            <div className="text-right">
              {receipt.status === 'soldé' && <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px' }}>Soldé</span>}
              {receipt.status === 'partiel' && <span style={{ background: '#ffedd5', color: '#9a3412', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px' }}>Partiel</span>}
              {receipt.status === 'annulé' && <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px' }}>Annulé</span>}
            </div>
          </div>
        </div>

        {receipt.status === 'annulé' && receipt.cancel_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">Motif d&apos;annulation :</p>
            <p className="text-sm text-red-700 mt-1">{receipt.cancel_reason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nom :</span> <strong>{receipt.client_name}</strong></p>
              <p><span className="text-muted-foreground">Tél :</span> {receipt.client_phone}</p>
              <p><span className="text-muted-foreground">Email :</span> {receipt.client_email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Bien</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Type :</span> <strong>{receipt.property_type === 'terrain' ? 'Terrain' : 'Maison'}</strong></p>
              {receipt.lotissement_name && <p><span className="text-muted-foreground">Lotissement :</span> {receipt.lotissement_name}</p>}
              {receipt.localisation_quartier && (
                <p><span className="text-muted-foreground">Localisation :</span> {[receipt.localisation_quartier, receipt.localisation_commune, receipt.localisation_ville].filter(Boolean).join(', ')}</p>
              )}
              {receipt.superficie && <p><span className="text-muted-foreground">Superficie :</span> {receipt.superficie} m²</p>}
              {receipt.property_description && <p>{receipt.property_description}</p>}
            </CardContent>
          </Card>
        </div>

        {lots.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Lots ({lots.length})</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left">#</th>
                    <th className="pb-2 text-left">N° Îlot</th>
                    <th className="pb-2 text-left">N° Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((l, i) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2">{i + 1}</td>
                      <td className="py-2">{l.ilot_number}</td>
                      <td className="py-2">{l.lot_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Détails financiers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix unitaire</span>
              <span>{formatCFA(receipt.unit_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantité</span>
              <span>{receipt.quantity}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Montant total</span>
              <span>{formatCFA(receipt.total_amount)}</span>
            </div>
            <div className="bg-[#8B1A1A] text-white rounded-xl p-5 text-center">
              <p className="text-xs uppercase tracking-wide opacity-80">Somme versée</p>
              <p className="text-3xl font-bold mt-1">{formatCFA(receipt.amount_paid)}</p>
              <p className="text-sm italic opacity-90 mt-1">{receipt.amount_paid_words}</p>
            </div>
            <div className={`text-center text-lg font-bold ${receipt.amount_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Reste dû : {formatCFA(receipt.amount_due)}
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}