'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, ArrowRight, Pencil, Users, ChevronLeft, ChevronRight } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-red-100 text-red-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
];

const TYPE_BADGE: Record<string, string> = {
  Particulier: 'text-indigo-700 bg-indigo-50 border-indigo-200/60',
  Entreprise:  'text-cyan-700 bg-cyan-50 border-cyan-200/60',
  Diaspora:    'text-violet-700 bg-violet-50 border-violet-200/60',
};

const PER_PAGE_OPTIONS = [5, 10, 20, 50];

// ── component ────────────────────────────────────────────────────────
export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients]       = useState<Client[]>([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [page, setPage]             = useState(1);
  const [perPage, setPerPage]       = useState(10);

  useEffect(() => { loadClients(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  async function loadClients() {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('full_name');
    if (data) setClients(data);
    setLoading(false);
  }

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_whatsapp.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  function toggleAll() {
    if (selected.size === paginated.length && paginated.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(c => c.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const allChecked = paginated.length > 0 && paginated.every(c => selected.has(c.id));

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-400 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/clients/nouveau">
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-red-200">
            <PlusCircle className="h-4 w-4" />
            Nouveau client
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Nom, téléphone, email..."
            className="pl-9 border-slate-200 bg-slate-50 placeholder:text-slate-400 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {/* Checkbox */}
                <th className="w-12 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
                  />
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Nom</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Téléphone</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Type</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Nationalité</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, idx) => {
                const colorCls = AVATAR_COLORS[(c.full_name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
                const isSelected = selected.has(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`table-row-hover border-b border-slate-100 last:border-0 ${isSelected ? 'bg-red-50/30' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="w-12 px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(c.id)}
                        className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
                      />
                    </td>

                    {/* Name + email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${colorCls} flex items-center justify-center shrink-0 text-xs font-semibold`}>
                          {initials(c.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 leading-none">{c.full_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-slate-600">{c.phone_whatsapp}</td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${TYPE_BADGE[c.client_type] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                        {c.client_type}
                      </span>
                    </td>

                    {/* Nationality */}
                    <td className="px-4 py-3.5 text-slate-600">{c.nationality}</td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                        <Link href={`/clients/${c.id}`}>
                          <button className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center transition-colors" title="Voir">
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500 hover:text-red-600" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    {loading ? (
                      <p className="text-sm text-slate-400">Chargement...</p>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400">Aucun client trouvé</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            {/* Per page */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Lignes par page</span>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Range */}
            <span className="text-xs text-slate-500">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} sur {filtered.length}
            </span>

            {/* Prev / Next */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
