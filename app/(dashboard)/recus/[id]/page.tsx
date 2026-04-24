'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Receipt, ReceiptLot } from '@/lib/supabase/types';
import { ArrowLeft, Printer, User, MapPin, Hash, CreditCard, Download } from 'lucide-react';
import dynamic from 'next/dynamic';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false }
);
import ReceiptPDF from '@/components/receipt/ReceiptPDF';

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [receipt, setReceipt] = useState<any | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [lots, setLots] = useState<ReceiptLot[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadReceipt();
  }, []);

  async function loadReceipt() {
    const id = params.id as string;

    // Join avec clients pour avoir les données à jour
    const { data } = await supabase
      .from('receipts')
      .select('*, clients(id, full_name, phone_whatsapp, email)')
      .eq('id', id)
      .single();

    if (data) {
      setReceipt(data);
      setClient(data.clients || null);
    }

    const { data: lotData } = await supabase
      .from('receipt_lots').select('*').eq('receipt_id', id).order('display_order');
    if (lotData) setLots(lotData);
  }

  // Helpers — toujours lire depuis client en priorité
  const clientName  = client?.full_name  || receipt?.client_name  || '—';
  const clientPhone = client?.phone_whatsapp || receipt?.client_phone || '—';
  const clientEmail = client?.email      || receipt?.client_email  || '—';

  if (!receipt) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    soldé:  { label: 'Soldé',   bg: 'bg-green-100',  text: 'text-green-700' },
    partiel:{ label: 'Partiel', bg: 'bg-orange-100', text: 'text-orange-700' },
    annulé: { label: 'Annulé',  bg: 'bg-red-100',    text: 'text-red-700' },
  };
  const sc = statusConfig[receipt.status as keyof typeof statusConfig];

  // Passer les données client à jour au PDF
  const receiptForPDF = { ...receipt, client_name: clientName, client_phone: clientPhone, client_email: clientEmail };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          .print-block { display: block !important; }
          body { background: white; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .print-only { display: none; }
        .print-block { display: none; }
        .signature-section {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-5">

        {/* HEADER IMPRESSION */}
        <div className="print-only items-center justify-between border-b pb-4 mb-2">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#8B1A1A', margin: 0 }}>WEBUILDD FONCIER & IMMOBILIER</h2>
            <p style={{ fontSize: '11px', color: '#374151', margin: '2px 0 0' }}>Marcory Zone 4 — Immeuble Z4, Abidjan, Côte d'Ivoire</p>
            <p style={{ fontSize: '11px', color: '#374151', margin: '2px 0 0' }}>Tél : +225 07 07 07 07 07 | info@webuildd.ci</p>
          </div>
          <img src="/logoW.png" alt="WEBUILDD" style={{ height: '55px', objectFit: 'contain' }} />
        </div>

        {/* HEADER ECRAN */}
        <div className="no-print flex items-center gap-3 flex-wrap">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">Reçu {receipt.receipt_number}</h1>
              {sc && <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Créé le {formatDate(receipt.created_at)}</p>
          </div>

          <PDFDownloadLink
            document={<ReceiptPDF receipt={receiptForPDF} lots={lots} />}
            fileName={`recu-${receipt.receipt_number}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <button
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                disabled={pdfLoading}
              >
                <Download className="h-4 w-4" />
                {pdfLoading ? 'Génération...' : 'Télécharger PDF'}
              </button>
            )}
          </PDFDownloadLink>

          <img src="/logoW.png" alt="WEBUILDD" className="h-10 object-contain hidden sm:block" />
        </div>

        {/* TITRE IMPRESSION */}
        <div className="print-block">
          <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#8B1A1A', margin: '8px 0' }}>
            REÇU DE PAIEMENT
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Reçu {receipt.receipt_number}</div>
              <div style={{ fontSize: '12px', color: '#374151' }}>Créé le {formatDate(receipt.created_at)}</div>
            </div>
            <div>
              {receipt.status === 'soldé'  && <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px' }}>Soldé</span>}
              {receipt.status === 'partiel' && <span style={{ background: '#ffedd5', color: '#9a3412', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px' }}>Partiel</span>}
              {receipt.status === 'annulé' && <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px' }}>Annulé</span>}
            </div>
          </div>
        </div>

        {/* Annulation */}
        {receipt.status === 'annulé' && receipt.cancel_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-0.5">Motif d'annulation</p>
            <p className="text-sm text-red-600">{receipt.cancel_reason}</p>
          </div>
        )}

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center no-print">
                <User className="h-3.5 w-3.5 text-[#8B1A1A]" />
              </div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div>
                <p className="text-xs text-gray-400">Nom</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{clientName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Téléphone</p>
                <p className="text-sm text-gray-700 mt-0.5">{clientPhone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm text-gray-700 mt-0.5">{clientEmail !== '—' ? clientEmail : '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center no-print">
                <MapPin className="h-3.5 w-3.5 text-[#8B1A1A]" />
              </div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bien</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {receipt.property_type === 'terrain' ? 'Terrain' : receipt.property_type === 'maison' ? 'Maison' : receipt.property_description || receipt.property_type}
                </p>
              </div>
              {receipt.lotissement_name && (
                <div>
                  <p className="text-xs text-gray-400">Lotissement</p>
                  <p className="text-sm text-gray-700 mt-0.5">{receipt.lotissement_name}</p>
                </div>
              )}
              {receipt.localisation_quartier && (
                <div>
                  <p className="text-xs text-gray-400">Localisation</p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {[receipt.localisation_quartier, receipt.localisation_commune, receipt.localisation_ville].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {receipt.superficie && (
                <div>
                  <p className="text-xs text-gray-400">Superficie</p>
                  <p className="text-sm text-gray-700 mt-0.5">{receipt.superficie} m²</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LOTS */}
        {lots.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center no-print">
                <Hash className="h-3.5 w-3.5 text-[#8B1A1A]" />
              </div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lots ({lots.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">#</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">N° Îlot</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">N° Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((l, i) => (
                    <tr key={l.id} className={i < lots.length - 1 ? 'border-b border-gray-50' : ''}>
                      <td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-5 py-3 text-gray-700">{l.ilot_number}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{l.lot_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FINANCIER */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center no-print">
              <CreditCard className="h-3.5 w-3.5 text-[#8B1A1A]" />
            </div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Détails financiers</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-500">Prix unitaire</span>
              <span className="text-sm text-gray-800">{formatCFA(receipt.unit_price)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-500">Quantité</span>
              <span className="text-sm text-gray-800">{receipt.quantity}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-3">
              <span className="text-sm font-semibold text-gray-800">Montant total</span>
              <span className="text-sm font-semibold text-gray-800">{formatCFA(receipt.total_amount)}</span>
            </div>

            {/* Somme versée */}
            <div style={{ backgroundColor: '#F3F4F6', borderRadius: '12px', padding: '16px 20px', textAlign: 'center', marginTop: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Somme versée</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>{formatCFA(receipt.amount_paid)}</p>
              {receipt.amount_paid_words && (
                <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#6B7280', marginTop: '6px' }}>{receipt.amount_paid_words}</p>
              )}
            </div>

            {/* Reste dû */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderRadius: '12px', padding: '12px 16px',
              backgroundColor: receipt.amount_due > 0 ? '#FEF2F2' : '#F0FDF4',
              border: `1px solid ${receipt.amount_due > 0 ? '#FECACA' : '#BBF7D0'}`
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: receipt.amount_due > 0 ? '#B91C1C' : '#15803D' }}>Reste dû</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: receipt.amount_due > 0 ? '#DC2626' : '#16A34A' }}>{formatCFA(receipt.amount_due)}</span>
            </div>
          </div>
        </div>

        {/* SIGNATURES IMPRESSION */}
        <div className="print-only signature-section" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <div style={{ width: '40%', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '40px' }}>Signature du Client</p>
            <div style={{ borderBottom: '1px solid #9CA3AF', marginBottom: '4px' }} />
            <p style={{ fontSize: '10px', color: '#374151' }}>{clientName}</p>
          </div>
          <div style={{ width: '40%', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '40px' }}>Signature du Service Comptable</p>
            <div style={{ borderBottom: '1px solid #9CA3AF', marginBottom: '4px' }} />
            <p style={{ fontSize: '10px', color: '#374151' }}>WEBUILDD F&I</p>
          </div>
        </div>

        {/* FOOTER IMPRESSION */}
        <div className="print-block" style={{ textAlign: 'center', fontSize: '10px', color: '#9CA3AF', borderTop: '0.5px solid #E5E7EB', paddingTop: '8px', marginTop: '8px' }}>
          <p>WEBUILDD Foncier & Immobilier — DG : F.W. WEGUI | Document officiel — Conservez ce reçu</p>
        </div>

      </div>
    </>
  );
}