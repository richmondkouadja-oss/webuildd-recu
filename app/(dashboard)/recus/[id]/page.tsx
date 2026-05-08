'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import { numberToWordsFr } from '@/lib/utils/numberToWords';
import type { ReceiptLot } from '@/lib/supabase/types';
import {
  ArrowLeft, Download, User, MapPin, Hash, CreditCard,
  PlusCircle, Trash2, Calendar, Banknote, CheckCircle2,
  Clock, AlertCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false }
);
import ReceiptPDF from '@/components/receipt/ReceiptPDF';

type Payment = {
  id: string; receipt_id: string; payment_date: string;
  amount: number; amount_words: string; payment_method: string;
  reference: string | null; notes: string | null; created_at: string;
};

const METHOD_LABELS: Record<string, string> = {
  espèces: 'Espèces', virement: 'Virement', chèque: 'Chèque',
  mobile_money: 'Mobile Money', autre: 'Autre',
};

const METHOD_COLORS: Record<string, string> = {
  espèces: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  virement: 'bg-blue-50 text-blue-700 border-blue-200',
  chèque: 'bg-violet-50 text-violet-700 border-violet-200',
  mobile_money: 'bg-orange-50 text-orange-700 border-orange-200',
  autre: 'bg-slate-50 text-slate-600 border-slate-200',
};

function formatNumberInput(value: string): string {
  const num = value.replace(/[^\d]/g, '');
  if (!num) return '';
  return new Intl.NumberFormat('fr-FR').format(Number(num));
}

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [receipt, setReceipt] = useState<any | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [lots, setLots] = useState<ReceiptLot[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showDeletePayment, setShowDeletePayment] = useState<Payment | null>(null);
  const loadedRef = useRef(false);

  const loadAll = useCallback(async () => {
    const id = params.id as string;
    const { data } = await supabase
      .from('receipts').select('*, clients(id, full_name, phone_whatsapp, email)')
      .eq('id', id).single();
    if (data) { setReceipt(data); setClient(data.clients || null); }

    const { data: lotData } = await supabase.from('receipt_lots').select('*').eq('receipt_id', id).order('display_order');
    if (lotData) setLots(lotData);

    const { data: payData } = await supabase.from('payments').select('*').eq('receipt_id', id).order('payment_date', { ascending: true });
    if (payData) setPayments(payData);
  }, [params.id]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadAll();
    checkRole();
  }, []);

  async function checkRole() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    setIsAdmin(data?.role === 'super_admin');
  }

  async function handleDeletePayment() {
    if (!showDeletePayment) return;
    await fetch(`/api/payments?id=${showDeletePayment.id}`, { method: 'DELETE' });
    setShowDeletePayment(null);
    loadedRef.current = false;
    loadAll();
  }

  const clientName = client?.full_name || receipt?.client_name || '—';
  const clientPhone = client?.phone_whatsapp || receipt?.client_phone || '—';
  const clientEmail = client?.email || receipt?.client_email || '—';

  if (!receipt) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    soldé: { label: 'Soldé', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    partiel: { label: 'Partiel', bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock },
    annulé: { label: 'Annulé', bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  };
  const sc = statusConfig[receipt.status as keyof typeof statusConfig];
  const receiptForPDF = { ...receipt, client_name: clientName, client_phone: clientPhone, client_email: clientEmail };
  const pctPaid = receipt.total_amount > 0 ? Math.min(100, Math.round((receipt.amount_paid / receipt.total_amount) * 100)) : 0;

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="no-print flex items-center gap-3 flex-wrap">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">Reçu {receipt.receipt_number}</h1>
              {sc && (
                <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                  <sc.icon className="h-3 w-3" />{sc.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Créé le {formatDate(receipt.created_at)}</p>
          </div>
          <PDFDownloadLink document={<ReceiptPDF receipt={receiptForPDF} lots={lots} />} fileName={`recu-${receipt.receipt_number}.pdf`}>
            {({ loading: pdfLoading }) => (
              <button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors" disabled={pdfLoading}>
                <Download className="h-4 w-4" />
                {pdfLoading ? 'Génération...' : 'PDF'}
              </button>
            )}
          </PDFDownloadLink>
          <img src="/logoW.png" alt="WEBUILDD" className="h-10 object-contain hidden sm:block" />
        </div>

        {receipt.status === 'annulé' && receipt.cancel_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-0.5">Motif d'annulation</p>
            <p className="text-sm text-red-600">{receipt.cancel_reason}</p>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center"><User className="h-3.5 w-3.5 text-[#002255]" /></div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div><p className="text-xs text-gray-400">Nom</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{clientName}</p></div>
              <div><p className="text-xs text-gray-400">Téléphone</p><p className="text-sm text-gray-700 mt-0.5">{clientPhone}</p></div>
              <div><p className="text-xs text-gray-400">Email</p><p className="text-sm text-gray-700 mt-0.5">{clientEmail}</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center"><MapPin className="h-3.5 w-3.5 text-[#002255]" /></div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bien</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <div><p className="text-xs text-gray-400">Type</p><p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{receipt.property_type === 'terrain' ? 'Terrain' : receipt.property_type === 'maison' ? 'Maison' : receipt.property_description || receipt.property_type}</p></div>
              {receipt.lotissement_name && <div><p className="text-xs text-gray-400">Lotissement</p><p className="text-sm text-gray-700 mt-0.5">{receipt.lotissement_name}</p></div>}
              {receipt.localisation_quartier && <div><p className="text-xs text-gray-400">Localisation</p><p className="text-sm text-gray-700 mt-0.5">{[receipt.localisation_quartier, receipt.localisation_commune, receipt.localisation_ville].filter(Boolean).join(', ')}</p></div>}
              {receipt.superficie && <div><p className="text-xs text-gray-400">Superficie</p><p className="text-sm text-gray-700 mt-0.5">{receipt.superficie} m²</p></div>}
            </div>
          </div>
        </div>

        {/* Lots */}
        {lots.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center"><Hash className="h-3.5 w-3.5 text-[#002255]" /></div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lots ({lots.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-50 bg-gray-50/50"><th className="text-left text-xs font-medium text-gray-400 px-5 py-3">#</th><th className="text-left text-xs font-medium text-gray-400 px-5 py-3">N° Îlot</th><th className="text-left text-xs font-medium text-gray-400 px-5 py-3">N° Lot</th></tr></thead>
                <tbody>{lots.map((l, i) => (<tr key={l.id} className={i < lots.length - 1 ? 'border-b border-gray-50' : ''}><td className="px-5 py-3 text-gray-400 text-xs">{i + 1}</td><td className="px-5 py-3 text-gray-700">{l.ilot_number}</td><td className="px-5 py-3 font-medium text-gray-800">{l.lot_number}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Récapitulatif financier */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center"><CreditCard className="h-3.5 w-3.5 text-[#002255]" /></div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Récapitulatif financier</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Prix unitaire</span><span className="text-sm text-gray-800">{formatCFA(receipt.unit_price)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Quantité</span><span className="text-sm text-gray-800">{receipt.quantity}</span></div>
            <div className="flex justify-between items-center border-t border-gray-100 pt-3"><span className="text-sm font-semibold text-gray-800">Montant total du bien</span><span className="text-sm font-semibold text-gray-800">{formatCFA(receipt.total_amount)}</span></div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500"><span>Progression du paiement</span><span className="font-semibold text-gray-700">{pctPaid}%</span></div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pctPaid === 100 ? 'bg-emerald-500' : 'bg-[#002255]'}`} style={{ width: `${pctPaid}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-600 font-medium">Versé : {formatCFA(receipt.amount_paid)}</span>
                <span className={`font-medium ${receipt.amount_due > 0 ? 'text-red-500' : 'text-emerald-600'}`}>Reste : {formatCFA(receipt.amount_due)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-emerald-50 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-emerald-600 font-medium">Total versé</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{formatCFA(receipt.amount_paid)}</p>
                <p className="text-xs text-emerald-500 mt-0.5">{payments.length} versement{payments.length > 1 ? 's' : ''}</p>
              </div>
              <div className={`rounded-xl px-4 py-3 text-center ${receipt.amount_due > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <p className={`text-xs font-medium ${receipt.amount_due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Reste dû</p>
                <p className={`text-xl font-bold mt-1 ${receipt.amount_due > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCFA(receipt.amount_due)}</p>
                {receipt.amount_due === 0 && <p className="text-xs text-emerald-500 mt-0.5">✓ Soldé</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Historique versements */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center"><Banknote className="h-3.5 w-3.5 text-[#002255]" /></div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historique des versements</h3>
            </div>
            {receipt.status !== 'annulé' && receipt.amount_due > 0 && (
              <button onClick={() => setShowAddPayment(true)} className="flex items-center gap-1.5 text-xs font-medium bg-[#002255] hover:bg-[#001844] text-white px-3 py-1.5 rounded-lg transition-colors">
                <PlusCircle className="h-3.5 w-3.5" />Ajouter un versement
              </button>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2"><Banknote className="h-5 w-5 text-gray-300" /></div>
              <p className="text-sm text-gray-400">Aucun versement enregistré</p>
              {receipt.status !== 'annulé' && receipt.amount_due > 0 && (
                <button onClick={() => setShowAddPayment(true)} className="mt-3 text-xs text-[#002255] hover:underline font-medium">+ Enregistrer le premier versement</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map((p, i) => (
                <div key={p.id} className="px-5 py-4 flex items-start gap-4 group hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === payments.length - 1 && receipt.status === 'soldé' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</div>
                    {i < payments.length - 1 && <div className="w-px h-4 bg-gray-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-gray-900">{formatCFA(p.amount)}</p>
                        {p.amount_words && <p className="text-xs italic text-gray-400 mt-0.5 leading-tight">{p.amount_words}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${METHOD_COLORS[p.payment_method] || METHOD_COLORS.autre}`}>{METHOD_LABELS[p.payment_method] || p.payment_method}</span>
                        {isAdmin && (
                          <button onClick={() => setShowDeletePayment(p)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all"><Trash2 className="h-3 w-3 text-red-500" /></button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(p.payment_date)}</span>
                      {p.reference && <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Réf: {p.reference}</span>}
                    </div>
                    {p.notes && <p className="text-xs text-gray-400 mt-1 italic">{p.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {payments.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
              <span className="text-xs text-gray-400">{payments.length} versement{payments.length > 1 ? 's' : ''}</span>
              <span className="text-sm font-bold text-emerald-600">{formatCFA(receipt.amount_paid)} versés</span>
            </div>
          )}
        </div>
      </div>

      <AddPaymentModal open={showAddPayment} onClose={() => setShowAddPayment(false)} receipt={receipt} onSaved={() => { setShowAddPayment(false); loadedRef.current = false; loadAll(); }} />

      <Dialog open={!!showDeletePayment} onOpenChange={() => setShowDeletePayment(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-base font-semibold text-slate-800">Supprimer ce versement</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-red-50 border border-red-200/60 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-red-800">{showDeletePayment && formatCFA(showDeletePayment.amount)}</p>
              <p className="text-xs text-red-600 mt-1">Le montant versé et le reste dû seront recalculés automatiquement.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" onClick={() => setShowDeletePayment(null)}>Annuler</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-[#002255] hover:bg-[#001844] rounded-lg transition-colors" onClick={handleDeletePayment}>Supprimer</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddPaymentModal({ open, onClose, receipt, onSaved }: { open: boolean; onClose: () => void; receipt: any; onSaved: () => void; }) {
  const [amountRaw, setAmountRaw] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('espèces');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const amount = Number(amountRaw.replace(/[^\d]/g, '')) || 0;
  const amountDueNum = Number(receipt?.amount_due) || 0;
  const remainingAfter = Math.max(0, amountDueNum - amount);
  const willSolde = amount >= amountDueNum && amount > 0;
  const amountWords = amount > 0 ? numberToWordsFr(amount) : '';

  function reset() { setAmountRaw(''); setPaymentDate(new Date().toISOString().split('T')[0]); setPaymentMethod('espèces'); setReference(''); setNotes(''); setError(''); }

  async function handleSave() {
    if (!amount || amount <= 0) { setError('Montant requis'); return; }
    if (amount > amountDueNum) { setError(`Le versement dépasse le reste dû (${formatCFA(amountDueNum)})`); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipt_id: receipt.id, payment_date: paymentDate, amount, payment_method: paymentMethod, reference: reference || null, notes: notes || null }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur'); return; }
      reset(); onSaved();
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2"><PlusCircle className="h-4 w-4 text-[#002255]" />Nouveau versement</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div><p className="text-xs font-medium text-amber-700">Reste dû actuellement</p><p className="text-xl font-bold text-amber-800 mt-0.5">{formatCFA(amountDueNum)}</p></div>
            {amount > 0 && <div className="text-right"><p className="text-xs font-medium text-gray-500">Après ce versement</p><p className={`text-lg font-bold mt-0.5 ${willSolde ? 'text-emerald-600' : 'text-amber-700'}`}>{willSolde ? '✓ Soldé' : formatCFA(remainingAfter)}</p></div>}
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Montant versé (FCFA) <span className="text-red-500">*</span></Label>
            <Input className="mt-1.5 text-xl font-bold h-12 border-[#FF6600]" placeholder="Ex: 1 500 000" value={amountRaw} onChange={(e) => setAmountRaw(formatNumberInput(e.target.value))} />
            {amountWords && <p className="text-xs italic text-[#002255] mt-1">{amountWords}</p>}
          </div>
          {amount > 0 && amountDueNum > 0 && (
            <div className="space-y-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${willSolde ? 'bg-emerald-500' : 'bg-[#002255]'}`} style={{ width: `${Math.min(100, (amount / amountDueNum) * 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-right">{Math.min(100, Math.round((amount / amountDueNum) * 100))}% du solde couvert</p>
            </div>
          )}
          <div><Label className="text-sm font-medium text-slate-700">Date du versement</Label><Input type="date" className="mt-1.5" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Mode de paiement</Label>
<Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>              
  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="espèces">Espèces</SelectItem>
                <SelectItem value="virement">Virement bancaire</SelectItem>
                <SelectItem value="chèque">Chèque</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-sm font-medium text-slate-700">Référence <span className="text-gray-400 text-xs">(N° chèque, virement…)</span></Label><Input className="mt-1.5" placeholder="Optionnel" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div><Label className="text-sm font-medium text-slate-700">Notes</Label><Textarea className="mt-1.5 resize-none" rows={2} placeholder="Optionnel" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"><p className="text-xs text-red-700">{error}</p></div>}
          <div className="flex gap-2 justify-end pt-1">
            <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" onClick={() => { reset(); onClose(); }}>Annuler</button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#002255] hover:bg-[#001844] rounded-lg transition-colors disabled:opacity-50" onClick={handleSave} disabled={saving || amount <= 0}>
              {saving ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement...</> : <><CheckCircle2 className="h-3.5 w-3.5" />Enregistrer le versement</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}