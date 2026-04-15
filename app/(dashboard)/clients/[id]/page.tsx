'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Client, Receipt } from '@/lib/supabase/types';
import { ArrowLeft, Phone, Mail, Eye, FileText, TrendingUp, Wallet } from 'lucide-react';

function clientInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const TYPE_STYLES: Record<string, string> = {
  Particulier: 'text-indigo-700 bg-indigo-50 border-indigo-200/60',
  Entreprise:  'text-cyan-700 bg-cyan-50 border-cyan-200/60',
  Diaspora:    'text-violet-700 bg-violet-50 border-violet-200/60',
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [client, setClient] = useState<Client | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    loadClient();
  }, []);

  async function loadClient() {
    const id = params.id as string;
    const { data } = await supabase.from('clients').select('*').eq('id', id).single();
    if (data) setClient(data);

    const { data: recs } = await supabase
      .from('receipts')
      .select('*')
      .eq('client_name', data?.full_name || '')
      .order('created_at', { ascending: false });
    if (recs) setReceipts(recs);
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const totalPaid = receipts.reduce((s, r) => s + Number(r.amount_paid), 0);
  const totalDue  = receipts.reduce((s, r) => s + Number(r.amount_due), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-indigo-700">{clientInitials(client.full_name)}</span>
          </div>
          <div className="min-w-0">
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
        </div>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Phone className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Téléphone</p>
            <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{client.phone_whatsapp}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Email</p>
            <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{client.email || '—'}</p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Reçus émis', value: receipts.length, icon: FileText, bg: 'bg-indigo-50', color: 'text-indigo-600', val: 'text-indigo-700', accent: 'border-l-indigo-500' },
          { label: 'Total versé', value: formatCFA(totalPaid), icon: Wallet, bg: 'bg-emerald-50', color: 'text-emerald-600', val: 'text-emerald-700', accent: 'border-l-emerald-500' },
          { label: 'Reste dû', value: formatCFA(totalDue), icon: TrendingUp, bg: totalDue > 0 ? 'bg-red-50' : 'bg-emerald-50', color: totalDue > 0 ? 'text-red-500' : 'text-emerald-600', val: totalDue > 0 ? 'text-red-600' : 'text-emerald-700', accent: totalDue > 0 ? 'border-l-red-500' : 'border-l-emerald-500' },
        ].map((kpi, i) => (
          <div key={i} className={`bg-white rounded-xl border border-slate-200/80 shadow-sm border-l-4 ${kpi.accent} px-4 py-3.5 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div>
              <p className={`text-base font-bold ${kpi.val}`}>{kpi.value}</p>
              <p className="text-xs text-slate-400">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Receipt history */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Historique des reçus</h3>
          <p className="text-xs text-slate-400 mt-0.5">{receipts.length} transaction{receipts.length > 1 ? 's' : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3.5">N° Reçu</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3.5">Date</th>
                <th className="text-right text-xs font-medium text-slate-400 px-5 py-3.5">Total</th>
                <th className="text-right text-xs font-medium text-slate-400 px-5 py-3.5">Versé</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3.5">Statut</th>
                <th className="px-5 py-3.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {receipts.map((r, i) => (
                <tr key={r.id} className={`table-row-hover ${i < receipts.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{r.receipt_number}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(r.receipt_date)}</td>
                  <td className="px-5 py-3.5 text-right text-slate-600">{formatCFA(r.total_amount)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">{formatCFA(r.amount_paid)}</td>
                  <td className="px-5 py-3.5">
                    {r.status === 'soldé'  && <span className="status-badge-solde">Soldé</span>}
                    {r.status === 'partiel' && <span className="status-badge-partiel">Partiel</span>}
                    {r.status === 'annulé' && <span className="status-badge-annule">Annulé</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/recus/${r.id}`}>
                      <button className="w-7 h-7 rounded-md bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <Eye className="h-3.5 w-3.5 text-slate-500 hover:text-indigo-600" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                    Aucun reçu pour ce client
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
