'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Client, Receipt } from '@/lib/supabase/types';
import { ArrowLeft, Phone, Mail, Eye, FileText, TrendingUp, Wallet, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';

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
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [client, setClient]       = useState<Client | null>(null);
  const [receipts, setReceipts]   = useState<Receipt[]>([]);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => { loadClient(); checkRole(); }, []);

  async function checkRole() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    setIsAdmin(data?.role === 'super_admin');
  }

  async function loadClient() {
    const id = params.id as string;
    const { data } = await supabase.from('clients').select('*').eq('id', id).single();
    if (data) {
      setClient(data);
      const { data: recs } = await supabase
        .from('receipts').select('*').eq('client_name', data.full_name).order('created_at', { ascending: false });
      if (recs) setReceipts(recs);
    }
  }

  async function handleDelete() {
    if (!client) return;
    setDeleting(true);
    await supabase.from('clients').delete().eq('id', client.id);
    router.push('/clients');
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
        <button onClick={() => router.back()}
          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-indigo-700">{clientInitials(client.full_name)}</span>
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
          {/* Boutons admin */}
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </button>
              <button onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>
          )}
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
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
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

      {/* Modal Modifier */}
      {showEdit && (
        <EditClientDialog
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadClient(); }}
        />
      )}

      {/* Modal Supprimer */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">Supprimer ce client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-red-50 border border-red-200/60 rounded-lg px-4 py-3">
              <p className="text-xs text-red-700">
                Vous allez supprimer <strong>{client.full_name}</strong>. Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                onClick={() => setShowDelete(false)}>Annuler</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditClientDialog({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      full_name: client.full_name,
      phone_whatsapp: client.phone_whatsapp,
      email: client.email || '',
      nationality: client.nationality || '',
      client_type: client.client_type,
      address: client.address || '',
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setSaving(true);
    await supabase.from('clients').update(data).eq('id', client.id);
    setSaving(false);
    onSaved();
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
            <div>
              <Label>Nationalité</Label>
              <Input {...register('nationality')} />
            </div>
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
            <Button type="submit" className="bg-[#8B1A1A] hover:bg-[#6B1414]" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}