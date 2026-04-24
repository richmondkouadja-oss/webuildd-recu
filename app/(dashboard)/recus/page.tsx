'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Receipt } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PlusCircle, Search, ArrowRight,
  Download, XCircle, FileText, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, Ban,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const PER_PAGE_OPTIONS = [5, 10, 20, 50];

export default function RecusPage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const router = useRouter();
  const [receipts, setReceipts]         = useState<any[]>([]);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [page, setPage]                 = useState(1);
  const [perPage, setPerPage]           = useState(10);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; receiptId: string }>({ open: false, receiptId: '' });
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => { loadReceipts(); checkRole(); }, []);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  async function checkRole() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    setIsAdmin(data?.role === 'super_admin');
  }

  async function loadReceipts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    const role = profileData?.role;

    // Join avec clients pour avoir les données à jour
    let query = supabase
      .from('receipts')
      .select('*, clients(id, full_name, phone_whatsapp, email)')
      .order('created_at', { ascending: false });

    if (role === 'comptable') {
      query = query.eq('created_by', user?.id);
    }

    const { data } = await query;
    if (data) setReceipts(data);
    setLoading(false);
  }

  // Nom client toujours depuis la relation clients
  const getClientName = (r: any) => r.clients?.full_name || r.client_name || '—';

  const filtered = receipts.filter(r => {
    const clientName = getClientName(r);
    const matchSearch = !search ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  function toggleAll() {
    if (paginated.every(r => selected.has(r.id)) && paginated.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(r => r.id)));
    }
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }
  const allChecked = paginated.length > 0 && paginated.every(r => selected.has(r.id));

  async function cancelReceipt() {
    if (!cancelReason.trim()) return;
    await supabase.from('receipts').update({ status: 'annulé', cancel_reason: cancelReason }).eq('id', cancelDialog.receiptId);
    setCancelDialog({ open: false, receiptId: '' });
    setCancelReason('');
    loadReceipts();
  }

  const counts = {
    solde:   receipts.filter(r => r.status === 'soldé').length,
    partiel: receipts.filter(r => r.status === 'partiel').length,
    annule:  receipts.filter(r => r.status === 'annulé').length,
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reçus de paiement</h1>
          <p className="text-sm text-slate-400 mt-0.5">{receipts.length} reçu{receipts.length !== 1 ? 's' : ''} au total</p>
        </div>
        <Link href="/recus/nouveau">
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-red-200">
            <PlusCircle className="h-4 w-4" />
            Nouveau reçu
          </button>
        </Link>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Soldés',   count: counts.solde,   icon: CheckCircle2, cardBg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500', valueColor: 'text-emerald-700' },
          { label: 'Partiels', count: counts.partiel, icon: Clock,        cardBg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconColor: 'text-amber-500',   valueColor: 'text-amber-700'   },
          { label: 'Annulés',  count: counts.annule,  icon: Ban,          cardBg: 'bg-red-50',     iconBg: 'bg-red-100',     iconColor: 'text-red-400',     valueColor: 'text-red-600'     },
        ].map((s, i) => (
          <div key={i} className={`${s.cardBg} rounded-2xl p-5 shadow-sm flex items-center gap-4`}>
            <div className={`${s.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className={`h-6 w-6 ${s.iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 leading-none">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 leading-none ${s.valueColor}`}>{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, N° reçu..."
              className="pl-9 border-slate-200 bg-slate-50 placeholder:text-slate-400 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
            <SelectTrigger className="w-[160px] border-slate-200 bg-slate-50 text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="partiel">Partiel</SelectItem>
              <SelectItem value="soldé">Soldé</SelectItem>
              <SelectItem value="annulé">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="w-12 px-4 py-3.5">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-red-600 cursor-pointer" />
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">N° Reçu</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Client</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Site</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Versé</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Reste</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Statut</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => {
                const isSelected = selected.has(r.id);
                return (
                  <tr key={r.id}
                    className={`table-row-hover border-b border-slate-100 last:border-0 ${isSelected ? 'bg-red-50/20' : ''}`}>

                    <td className="w-12 px-4 py-3.5">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)}
                        className="w-4 h-4 rounded border-slate-300 accent-red-600 cursor-pointer" />
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{r.receipt_number}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-800 leading-none">{getClientName(r)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(r.receipt_date)}</p>
                    </td>

                    <td className="px-4 py-3.5 text-slate-500">{r.lotissement_name || '—'}</td>

                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{formatCFA(r.amount_paid)}</td>

                    <td className={`px-4 py-3.5 text-right font-semibold ${r.amount_due > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatCFA(r.amount_due)}
                    </td>

                    <td className="px-4 py-3.5">
                      {r.status === 'soldé'   && <span className="status-badge-solde">Soldé</span>}
                      {r.status === 'partiel'  && <span className="status-badge-partiel">Partiel</span>}
                      {r.status === 'annulé'  && <span className="status-badge-annule">Annulé</span>}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && r.status !== 'annulé' && (
                          <button
                            onClick={() => setCancelDialog({ open: true, receiptId: r.id })}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center transition-colors"
                            title="Annuler"
                          >
                            <XCircle className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        )}
                        {r.pdf_url && (
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer">
                            <button className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Télécharger PDF">
                              <Download className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                          </a>
                        )}
                        <Link href={`/recus/${r.id}`}>
                          <button className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center transition-colors" title="Voir">
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    {loading ? (
                      <p className="text-sm text-slate-400">Chargement...</p>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400">Aucun reçu trouvé</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Lignes par page</span>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-slate-500">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} sur {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={cancelDialog.open} onOpenChange={(v) => setCancelDialog({ ...cancelDialog, open: v })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">Annuler ce reçu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-red-50 border border-red-200/60 rounded-lg px-4 py-3">
              <p className="text-xs text-red-700">Cette action est irréversible. Le reçu sera marqué comme annulé.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Motif d&apos;annulation <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Raison de l'annulation..."
                rows={3}
                className="border-slate-200 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                onClick={() => setCancelDialog({ open: false, receiptId: '' })}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={cancelReceipt}
                disabled={!cancelReason.trim()}
              >
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}