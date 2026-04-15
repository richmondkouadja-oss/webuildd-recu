'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Receipt, ReceiptLot } from '@/lib/supabase/types';
import { ArrowLeft, Printer, User, MapPin, Hash, CreditCard } from 'lucide-react';

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    soldé:  { label: 'Soldé',  cls: 'status-badge-solde' },
    partiel:{ label: 'Partiel',cls: 'status-badge-partiel' },
    annulé: { label: 'Annulé', cls: 'status-badge-annule' },
  };
  const statusCfg = statusConfig[receipt.status as keyof typeof statusConfig];

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

      <div className="max-w-3xl mx-auto space-y-5">

        {/* Print header */}
        <div className="print-only border-b pb-4 mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">WEBUILDD</h2>
              <p className="text-xs text-gray-500">Foncier & Immobilier — Marcory Zone 4, Abidjan</p>
            </div>
            <img src="/logoW.png" alt="WEBUILDD" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Screen header */}
        <div className="no-print flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-slate-900">Reçu {receipt.receipt_number}</h1>
              {statusCfg && <span className={statusCfg.cls}>{statusCfg.label}</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Créé le {formatDate(receipt.created_at)}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-indigo-200"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <img src="/logoW.png" alt="WEBUILDD" className="h-10 object-contain hidden sm:block" />
        </div>

        {/* Print title */}
        <div className="print-only">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Reçu {receipt.receipt_number}</h1>
              <p className="text-sm text-gray-500">Créé le {formatDate(receipt.created_at)}</p>
            </div>
            <div className="text-right">
              {receipt.status === 'soldé' && <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px' }}>Soldé</span>}
              {receipt.status === 'partiel' && <span style={{ background: '#fef9c3', color: '#92400e', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px' }}>Partiel</span>}
              {receipt.status === 'annulé' && <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px' }}>Annulé</span>}
            </div>
          </div>
        </div>

        {/* Cancellation alert */}
        {receipt.status === 'annulé' && receipt.cancel_reason && (
          <div className="bg-red-50 border border-red-200/60 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-0.5">Motif d'annulation</p>
            <p className="text-sm text-red-600">{receipt.cancel_reason}</p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Client card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div>
                <p className="text-xs text-slate-400">Nom</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{receipt.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Téléphone</p>
                <p className="text-sm text-slate-700 mt-0.5">{receipt.client_phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm text-slate-700 mt-0.5">{receipt.client_email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Bien card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bien</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div>
                <p className="text-xs text-slate-400">Type</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 capitalize">{receipt.property_type}</p>
              </div>
              {receipt.lotissement_name && (
                <div>
                  <p className="text-xs text-slate-400">Lotissement</p>
                  <p className="text-sm text-slate-700 mt-0.5">{receipt.lotissement_name}</p>
                </div>
              )}
              {receipt.localisation_quartier && (
                <div>
                  <p className="text-xs text-slate-400">Localisation</p>
                  <p className="text-sm text-slate-700 mt-0.5">
                    {[receipt.localisation_quartier, receipt.localisation_commune, receipt.localisation_ville].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {receipt.superficie && (
                <div>
                  <p className="text-xs text-slate-400">Superficie</p>
                  <p className="text-sm text-slate-700 mt-0.5">{receipt.superficie} m²</p>
                </div>
              )}
              {receipt.property_description && (
                <div>
                  <p className="text-xs text-slate-400">Description</p>
                  <p className="text-sm text-slate-700 mt-0.5">{receipt.property_description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lots table */}
        {lots.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                <Hash className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lots ({lots.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">#</th>
                    <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">N° Îlot</th>
                    <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">N° Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((l, i) => (
                    <tr key={l.id} className={i < lots.length - 1 ? 'border-b border-slate-100' : ''}>
                      <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-5 py-3 text-slate-700">{l.ilot_number}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{l.lot_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial summary */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Détails financiers</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-slate-500">Prix unitaire</span>
              <span className="text-sm text-slate-800">{formatCFA(receipt.unit_price)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-slate-500">Quantité</span>
              <span className="text-sm text-slate-800">{receipt.quantity}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-slate-800">Montant total</span>
              <span className="text-sm font-semibold text-slate-800">{formatCFA(receipt.total_amount)}</span>
            </div>

            {/* Somme versée — highlighted */}
            <div className="bg-indigo-600 rounded-xl px-5 py-4 text-center mt-2">
              <p className="text-xs font-medium text-indigo-200 uppercase tracking-wide mb-1">Somme versée</p>
              <p className="text-3xl font-bold text-white">{formatCFA(receipt.amount_paid)}</p>
              {receipt.amount_paid_words && (
                <p className="text-xs italic text-indigo-200 mt-1.5 leading-relaxed">{receipt.amount_paid_words}</p>
              )}
            </div>

            {/* Reste dû */}
            <div className={`flex justify-between items-center rounded-xl px-4 py-3 ${
              receipt.amount_due > 0
                ? 'bg-red-50 border border-red-200/60'
                : 'bg-emerald-50 border border-emerald-200/60'
            }`}>
              <span className={`text-sm font-semibold ${receipt.amount_due > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Reste dû</span>
              <span className={`text-lg font-bold ${receipt.amount_due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCFA(receipt.amount_due)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
