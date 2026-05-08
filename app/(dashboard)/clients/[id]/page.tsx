'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import { numberToWordsFr } from '@/lib/utils/numberToWords';
import type { Client } from '@/lib/supabase/types';
import {
  ArrowLeft, Phone, Mail, FileText, TrendingUp, Wallet,
  Pencil, Trash2, PlusCircle, X, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Banknote, MapPin, Calendar, Download,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import ReceiptForm from '@/components/receipt/ReceiptForm';
import ReceiptPDF from '@/components/receipt/ReceiptPDF';
import PaymentPDF from '@/components/receipt/PaymentPDF';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => (
    <button className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center" disabled>
      <Download className="h-3.5 w-3.5 text-slate-300" />
    </button>
  )},
);

function clientInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function formatNumberInput(v: string) {
  const n = v.replace(/[^\d]/g, '');
  return n ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '';
}

const TYPE_STYLES: Record<string, string> = {
  Particulier: 'text-indigo-700 bg-indigo-50 border-indigo-200/60',
  Entreprise:  'text-cyan-700   bg-cyan-50   border-cyan-200/60',
  Diaspora:    'text-violet-700 bg-violet-50  border-violet-200/60',
};

const METHOD_LABELS: Record<string, string> = {
  espèces: 'Espèces', virement: 'Virement', chèque: 'Chèque',
  mobile_money: 'Mobile Money', autre: 'Autre',
};

const METHOD_COLORS: Record<string, string> = {
  espèces:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  virement:     'bg-blue-50    text-blue-700    border-blue-200',
  chèque:       'bg-violet-50  text-violet-700  border-violet-200',
  mobile_money: 'bg-orange-50  text-orange-700  border-orange-200',
  autre:        'bg-slate-50   text-slate-600   border-slate-200',
};

type Payment = {
  id: string; receipt_id: string; payment_date: string;
  amount: number; amount_words: string; payment_method: string;
  reference: string | null; notes: string | null; created_at: string;
};

type ReceiptWithPayments = {
  id: string; receipt_number: string; receipt_date: string;
  property_type: string; lotissement_name: string | null;
  localisation_quartier: string | null; property_description: string | null;
  total_amount: number; amount_paid: number; amount_due: number;
  status: string; receipt_lots: any[];
  payments: Payment[];
};

export default function ClientDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;

  const [client, setClient]               = useState<Client | null>(null);
  const [receipts, setReceipts]           = useState<ReceiptWithPayments[]>([]);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [showDelete, setShowDelete]       = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showNewReceipt, setShowNewReceipt]   = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [addPaymentFor, setAddPaymentFor]     = useState<ReceiptWithPayments | null>(null);

  const loadAll = useCallback(async () => {
    const id = params.id as string;
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', id).single();
    if (!clientData) return;
    setClient(clientData);

    const { data: byId } = await supabase
      .from('receipts').select('*, receipt_lots(*)')
      .eq('client_id', id).order('created_at', { ascending: false });

    const { data: byName } = await supabase
      .from('receipts').select('*, receipt_lots(*)')
      .eq('client_name', clientData.full_name).order('created_at', { ascending: false });

    const combined = [...(byId || []), ...(byName || [])];
    const unique   = Array.from(new Map(combined.map(r => [r.id, r])).values());
    unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const withPayments: ReceiptWithPayments[] = await Promise.all(
      unique.map(async (r) => {
        const { data: pays } = await supabase
          .from('payments').select('*').eq('receipt_id', r.id)
          .order('payment_date', { ascending: true });
        return { ...r, payments: pays || [] };
      })
    );
    setReceipts(withPayments);
  }, [params.id]);

  useEffect(() => { loadAll(); checkRole(); }, []);

  async function checkRole() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    setIsAdmin(data?.role === 'super_admin');
  }

  async function handleDelete() {
    if (!client) return;
    setDeleting(true);
    try {
      const { data: clientReceipts } = await supabase
        .from('receipts').select('id').eq('client_id', client.id);
      if (clientReceipts && clientReceipts.length > 0) {
        const receiptIds = clientReceipts.map(r => r.id);
        await supabase.from('payments').delete().in('receipt_id', receiptIds);
        await supabase.from('receipt_lots').delete().in('receipt_id', receiptIds);
        await supabase.from('receipt_sends').delete().in('receipt_id', receiptIds);
        await supabase.from('receipts').delete().in('id', receiptIds);
      }
      await supabase.from('clients').delete().eq('id', client.id);
      router.push('/clients');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#002255] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const activeReceipts = receipts.filter(r => r.status !== 'annulé');
  const totalPaid      = activeReceipts.reduce((s, r) => s + Number(r.amount_paid), 0);
  const totalDue       = activeReceipts.reduce((s, r) => s + Number(r.amount_due), 0);
  const totalAmount    = activeReceipts.reduce((s, r) => s + Number(r.total_amount), 0);
  const countSolde     = activeReceipts.filter(r => r.status === 'soldé').length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-full bg-[#002255]/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-[#002255]">{clientInitials(client.full_name)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-slate-900">{client.full_name}</h1>
              <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${TYPE_STYLES[client.client_type] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                {client.client_type}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client depuis le {formatDate(client.created_at)} · {client.nationality}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* Bouton principal — bleu */}
            <button onClick={() => setShowNewReceipt(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#002255] hover:bg-[#001844] text-white rounded-lg transition-colors shadow-sm">
              <PlusCircle className="h-3.5 w-3.5" />
              Nouveau bien
            </button>
            {isAdmin && (
              <>
                <button onClick={() => setShowEdit(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                </button>
                <button onClick={() => setShowDelete(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Contact ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { icon: Phone, label: 'Téléphone', value: client.phone_whatsapp },
          { icon: Mail,  label: 'Email',     value: client.email || '—' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#002255]/10 flex items-center justify-center shrink-0">
              <c.icon className="h-4 w-4 text-[#002255]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">{c.label}</p>
              <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Biens',       value: activeReceipts.length,                       icon: FileText,    bg: 'bg-[#002255]/5',  ic: 'text-[#002255]',   vc: 'text-[#002255]'   },
          { label: 'Total versé', value: formatCFA(totalPaid),                         icon: Wallet,      bg: 'bg-emerald-50',   ic: 'text-emerald-500', vc: 'text-emerald-700' },
          { label: 'Reste dû',    value: formatCFA(totalDue),                          icon: TrendingUp,  bg: totalDue > 0 ? 'bg-orange-50' : 'bg-emerald-50', ic: totalDue > 0 ? 'text-[#FF6600]' : 'text-emerald-500', vc: totalDue > 0 ? 'text-[#FF6600]' : 'text-emerald-700' },
          { label: 'Soldés',      value: `${countSolde}/${activeReceipts.length}`,     icon: CheckCircle2, bg: 'bg-amber-50',   ic: 'text-amber-500',   vc: 'text-amber-700'   },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-2xl p-4 shadow-sm flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
              <k.icon className={`h-4 w-4 ${k.ic}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">{k.label}</p>
              <p className={`text-sm font-bold ${k.vc} truncate`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Barre de progression globale ── */}
      {totalAmount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-slate-600">Progression globale</p>
            <p className="text-xs font-bold text-slate-700">
              {Math.round((totalPaid / totalAmount) * 100)}% · {formatCFA(totalAmount)} total
            </p>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (totalPaid / totalAmount) * 100)}%`,
                background: 'linear-gradient(to right, #002255, #FF6600)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs">
            <span className="text-emerald-600 font-medium">{formatCFA(totalPaid)} versés</span>
            <span className={`font-medium ${totalDue > 0 ? 'text-[#FF6600]' : 'text-emerald-600'}`}>
              {totalDue > 0 ? `${formatCFA(totalDue)} restants` : '✓ Tout soldé'}
            </span>
          </div>
        </div>
      )}

      {/* ── Liste des biens ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Biens & versements</h2>
          {activeReceipts.length > 0 && (
            <span className="text-xs text-slate-400">{activeReceipts.length} bien{activeReceipts.length > 1 ? 's' : ''}</span>
          )}
        </div>

        {receipts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-5 py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 mb-3">Aucun bien enregistré pour ce client</p>
            <button onClick={() => setShowNewReceipt(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#002255] hover:text-[#001844]">
              <PlusCircle className="h-3.5 w-3.5" />
              Enregistrer le premier bien
            </button>
          </div>
        ) : (
          receipts.map((receipt) => {
            const pct        = receipt.total_amount > 0 ? Math.min(100, Math.round((receipt.amount_paid / receipt.total_amount) * 100)) : 0;
            const isExpanded = expandedReceipt === receipt.id;
            const bienLabel  = receipt.property_type === 'motif'
              ? (receipt.property_description || 'Motif')
              : receipt.lotissement_name || receipt.localisation_quartier || receipt.property_type;
            const isSolde    = receipt.status === 'soldé';
            const isAnnule   = receipt.status === 'annulé';

            return (
              <div key={receipt.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                isAnnule ? 'border-slate-200/50 opacity-60' : isSolde ? 'border-emerald-200/60' : 'border-slate-200/80'
              }`}>

                {/* ── En-tête bien ── */}
                <div className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSolde ? 'bg-emerald-100' : isAnnule ? 'bg-slate-100' : 'bg-[#002255]/10'
                    }`}>
                      <MapPin className={`h-5 w-5 ${isSolde ? 'text-emerald-600' : isAnnule ? 'text-slate-400' : 'text-[#002255]'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{bienLabel || receipt.property_type}</p>
                        {isSolde && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Soldé
                          </span>
                        )}
                        {receipt.status === 'partiel' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FF6600]/10 text-[#FF6600]">
                            <Clock className="h-3 w-3" /> En cours · {receipt.payments.length} versement{receipt.payments.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {isAnnule && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Annulé</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 font-mono">{receipt.receipt_number}</span>
                        <span className="text-xs text-slate-400">{formatDate(receipt.receipt_date)}</span>
                        {receipt.receipt_lots?.length > 0 && (
                          <span className="text-xs text-slate-400">{receipt.receipt_lots.length} lot{receipt.receipt_lots.length > 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {!isAnnule && (
                        <div className="mt-3 space-y-1">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#002255]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-600 font-medium">{formatCFA(receipt.amount_paid)}</span>
                            <span className={`font-medium ${receipt.amount_due > 0 ? 'text-[#FF6600]' : 'text-emerald-600'}`}>
                              {receipt.amount_due > 0 ? `reste ${formatCFA(receipt.amount_due)}` : '✓'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Montant + actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-sm font-bold text-slate-700">{formatCFA(receipt.total_amount)}</p>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/recus/${receipt.id}`}>
                          <button className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Voir le reçu">
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                        </Link>

                        <PDFDownloadLink
                          document={
                            <ReceiptPDF
                              receipt={{ ...receipt, client_name: client.full_name, client_phone: client.phone_whatsapp, client_email: client.email || '' } as any}
                              lots={receipt.receipt_lots || []}
                            />
                          }
                          fileName={`recu-${receipt.receipt_number}.pdf`}
                        >
                          {({ loading: pdfLoading }) => (
                            <button
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#002255]/10 flex items-center justify-center transition-colors"
                              title={pdfLoading ? 'Génération...' : 'Télécharger le PDF'}
                              disabled={pdfLoading}
                            >
                              <Download className={`h-3.5 w-3.5 ${pdfLoading ? 'text-slate-300' : 'text-slate-500'}`} />
                            </button>
                          )}
                        </PDFDownloadLink>

                        {!isAnnule && (
                          <button
                            onClick={() => setExpandedReceipt(isExpanded ? null : receipt.id)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                          >
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                              : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Panneau versements ── */}
                {isExpanded && !isAnnule && (
                  <div className="border-t border-slate-100">
                    {receipt.payments.length === 0 ? (
                      <div className="px-5 py-5 text-center">
                        <p className="text-xs text-slate-400">Aucun versement enregistré sur ce bien</p>
                      </div>
                    ) : (
                      <div className="px-5 pt-4 pb-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                          Versements ({receipt.payments.length})
                        </p>
                        <div className="space-y-3">
                          {receipt.payments.map((p, i) => (
                            <div key={p.id} className="flex items-start gap-3">
                              <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  i === receipt.payments.length - 1 && isSolde
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-[#002255]/10 text-[#002255]'
                                }`}>
                                  {i + 1}
                                </div>
                                {i < receipt.payments.length - 1 && <div className="w-px h-4 bg-slate-200" />}
                              </div>

                              <div className="flex-1 min-w-0 pb-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800">{formatCFA(p.amount)}</span>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${METHOD_COLORS[p.payment_method] || METHOD_COLORS.autre}`}>
                                      {METHOD_LABELS[p.payment_method] || p.payment_method}
                                    </span>
                                  </div>

                                  {/* PDF versement */}
                                  <PDFDownloadLink
                                    document={
                                      <PaymentPDF
                                        payment={p}
                                        receipt={receipt as any}
                                        client={{ full_name: client.full_name, phone_whatsapp: client.phone_whatsapp, email: client.email || null }}
                                        paymentIndex={i + 1}
                                        totalPayments={receipt.payments.length}
                                      />
                                    }
                                    fileName={`versement-${i + 1}-${receipt.receipt_number}.pdf`}
                                  >
                                    {({ loading: pdfLoading }) => (
                                      <button
                                        className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-[#002255] hover:bg-[#002255]/10 px-2 py-1 rounded-md transition-colors"
                                        disabled={pdfLoading}
                                      >
                                        <Download className="h-3 w-3" />
                                        {pdfLoading ? '...' : 'PDF'}
                                      </button>
                                    )}
                                  </PDFDownloadLink>
                                </div>

                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(p.payment_date)}</span>
                                  {p.reference && <span className="font-mono bg-slate-100 px-1 rounded">Réf: {p.reference}</span>}
                                </div>
                                {p.amount_words && (
                                  <p className="text-[10px] italic text-slate-400 mt-0.5 leading-tight">{p.amount_words}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bouton ajouter versement — orange en pointillés */}
                    {receipt.amount_due > 0 && (
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40">
                        <button
                          onClick={() => setAddPaymentFor(receipt)}
                          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-[#FF6600] hover:bg-[#FF6600]/5 border border-dashed border-[#FF6600]/40 rounded-lg py-2.5 transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Ajouter un versement — reste {formatCFA(receipt.amount_due)}
                        </button>
                      </div>
                    )}

                    {isSolde && (
                      <div className="px-5 py-3 border-t border-emerald-100 bg-emerald-50/40 flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium">Bien entièrement payé</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Modale : Nouveau bien ── */}
      {showNewReceipt && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setShowNewReceipt(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-slate-600" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Nouveau bien</h2>
                <p className="text-xs text-slate-400 mt-0.5">Client : <strong>{client.full_name}</strong></p>
              </div>
            </div>
            <ReceiptForm defaultClient={client} onSuccess={() => { setShowNewReceipt(false); loadAll(); }} />
          </div>
        </div>
      )}

      {/* ── Modale : Ajouter versement ── */}
      {addPaymentFor && (
        <AddPaymentModal
          receipt={addPaymentFor}
          onClose={() => setAddPaymentFor(null)}
          onSaved={() => { setAddPaymentFor(null); loadAll(); }}
        />
      )}

      {/* ── Modale : Modifier client ── */}
      {showEdit && (
        <EditClientDialog client={client} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); loadAll(); }} />
      )}

      {/* ── Modale : Supprimer client ── */}
      <Dialog open={showDelete} onOpenChange={(v) => { if (!v) setDeleteConfirm(''); setShowDelete(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Supprimer ce client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-red-800">⚠️ Cette action est irréversible. Tout sera définitivement supprimé :</p>
              <div className="space-y-1.5">
                {[
                  `Le client ${client.full_name}`,
                  `${receipts.length} bien${receipts.length > 1 ? 's' : ''} enregistré${receipts.length > 1 ? 's' : ''}`,
                  `${receipts.reduce((s, r) => s + r.payments.length, 0)} versement${receipts.reduce((s, r) => s + r.payments.length, 0) > 1 ? 's' : ''} enregistré${receipts.reduce((s, r) => s + r.payments.length, 0) > 1 ? 's' : ''}`,
                  'Tous les reçus PDF et historiques associés',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-red-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700">
                Pour confirmer, tapez : <span className="font-bold text-slate-900">{client.full_name}</span>
              </Label>
              <Input className="mt-1.5 border-red-200 focus:border-red-400" placeholder={client.full_name}
                value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}>Annuler</button>
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleDelete} disabled={deleting || deleteConfirm.trim() !== client.full_name.trim()}>
                {deleting
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Suppression...</>
                  : <><Trash2 className="h-3.5 w-3.5" /> Supprimer définitivement</>
                }
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Modal versement ───────────────────────────────────────────────────────────
function AddPaymentModal({ receipt, onClose, onSaved }: {
  receipt: ReceiptWithPayments; onClose: () => void; onSaved: () => void;
}) {
  const [amountRaw, setAmountRaw]     = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod]           = useState('espèces');
  const [reference, setReference]     = useState('');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const amount    = Number(amountRaw.replace(/[^\d]/g, '')) || 0;
  const amountDue = Number(receipt.amount_due);
  const remaining = Math.max(0, amountDue - amount);
  const willSolde = amount > 0 && amount >= amountDue;
  const words     = amount > 0 ? numberToWordsFr(amount) : '';
  const pct       = amountDue > 0 ? Math.min(100, Math.round((amount / amountDue) * 100)) : 0;
  const bienLabel = receipt.property_type === 'motif'
    ? (receipt.property_description || 'Motif')
    : receipt.lotissement_name || receipt.localisation_quartier || receipt.property_type;

  async function handleSave() {
    if (!amount || amount <= 0) { setError('Montant requis'); return; }
    if (amount > amountDue)     { setError(`Dépasse le reste dû (${formatCFA(amountDue)})`); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_id: receipt.id, payment_date: paymentDate, amount, payment_method: method, reference: reference || null, notes: notes || null }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Erreur'); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Banknote className="h-4 w-4 text-[#FF6600]" />
            Versement
            <span className="text-slate-400 font-normal text-sm truncate max-w-[160px]">· {bienLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-700">Reste dû sur ce bien</p>
                <p className="text-2xl font-bold text-amber-800 mt-0.5">{formatCFA(amountDue)}</p>
              </div>
              {amount > 0 && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Après versement</p>
                  <p className={`text-lg font-bold mt-0.5 ${willSolde ? 'text-emerald-600' : 'text-[#FF6600]'}`}>
                    {willSolde ? '✓ Soldé !' : formatCFA(remaining)}
                  </p>
                </div>
              )}
            </div>
            {amount > 0 && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${willSolde ? 'bg-emerald-500' : 'bg-[#FF6600]'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-amber-600 text-right">{pct}% du solde couvert</p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Montant versé (FCFA) <span className="text-[#FF6600]">*</span></Label>
            <Input className="mt-1.5 text-xl font-bold h-12 border-[#002255]" placeholder="Ex: 1 500 000"
              value={amountRaw} onChange={e => setAmountRaw(formatNumberInput(e.target.value))} />
            {words && <p className="text-xs italic text-[#002255] mt-1">{words}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700">Date</Label>
              <Input type="date" className="mt-1.5" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Mode</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="espèces">Espèces</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="chèque">Chèque</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Référence <span className="text-slate-400 text-xs">(N° chèque…)</span></Label>
            <Input className="mt-1.5" placeholder="Optionnel" value={reference} onChange={e => setReference(e.target.value)} />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Notes</Label>
            <Textarea className="mt-1.5 resize-none" rows={2} placeholder="Optionnel" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" onClick={onClose}>
              Annuler
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#002255] hover:bg-[#001844] rounded-lg transition-colors disabled:opacity-50"
              onClick={handleSave} disabled={saving || amount <= 0}>
              {saving
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement...</>
                : <><CheckCircle2 className="h-3.5 w-3.5" /> Enregistrer</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Modifier client ───────────────────────────────────────────────────────────
function EditClientDialog({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      full_name: client.full_name, phone_whatsapp: client.phone_whatsapp,
      email: client.email || '', nationality: client.nationality || '',
      client_type: client.client_type, address: client.address || '',
    },
  });
  async function onSubmit(data: Record<string, string>) {
    setSaving(true);
    await supabase.from('clients').update(data).eq('id', client.id);
    setSaving(false); onSaved();
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Modifier le client</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
          <div>
            <Label>Nom complet *</Label>
            <Input {...register('full_name', { required: true })} className={errors.full_name ? 'border-red-500' : ''} />
          </div>
          <div>
            <Label>Téléphone WhatsApp *</Label>
            <Input {...register('phone_whatsapp', { required: true })} className={errors.phone_whatsapp ? 'border-red-500' : ''} />
          </div>
          <div>
            <Label>Email <span className="text-gray-400 text-xs">(optionnel)</span></Label>
            <Input type="email" {...register('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nationalité</Label><Input {...register('nationality')} /></div>
            <div>
              <Label>Type</Label>
              <select {...register('client_type')} className="w-full h-10 rounded-md border px-3 text-sm">
                <option value="Particulier">Particulier</option>
                <option value="Entreprise">Entreprise</option>
                <option value="Diaspora">Diaspora</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-[#002255] hover:bg-[#001844]" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}