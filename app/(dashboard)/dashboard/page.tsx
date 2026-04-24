'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Receipt } from '@/lib/supabase/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Wallet, AlertCircle, CheckCircle2,
  Clock, Users, Eye, PlusCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEncaisse: 0, totalResteDu: 0, totalTransactions: 0,
    caMois: 0, recusMois: 0, recusSoldes: 0, recusPartiels: 0,
    recusAnnules: 0, totalClients: 0, tauxRecouvrement: 0,
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; encaisse: number; resteDu: number }[]>([]);
  const [siteData, setSiteData] = useState<{ name: string; value: number }[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadData();
  }, []);

async function loadData() {
  setLoading(true);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  const role = profileData?.role;

  let query = supabase.from('receipts').select('*, clients(id, full_name, phone_whatsapp, email)').order('created_at', { ascending: false });
  if (role === 'comptable') {
    query = query.eq('created_by', user?.id);
  }

  const { data: allReceipts } = await query;
  const { data: clients } = await supabase.from('clients').select('id');

  if (allReceipts) {
    const active = allReceipts.filter(r => r.status !== 'annulé');
    const totalEncaisse = active.reduce((s, r) => s + Number(r.amount_paid), 0);
    const totalResteDu = active.reduce((s, r) => s + Number(r.amount_due), 0);
    const totalMontant = totalEncaisse + totalResteDu;
    const monthReceipts = active.filter(r => r.receipt_date >= startOfMonth);
    const caMois = monthReceipts.reduce((s, r) => s + Number(r.amount_paid), 0);
    setStats({
      totalEncaisse, totalResteDu, totalTransactions: active.length, caMois,
      recusMois: monthReceipts.length,
      recusSoldes: allReceipts.filter(r => r.status === 'soldé').length,
      recusPartiels: allReceipts.filter(r => r.status === 'partiel').length,
      recusAnnules: allReceipts.filter(r => r.status === 'annulé').length,
      totalClients: clients?.length || 0,
      tauxRecouvrement: totalMontant > 0 ? Math.round((totalEncaisse / totalMontant) * 100) : 0,
    });
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      const mR = active.filter(r => r.receipt_date.startsWith(key));
      months.push({
        month: label,
        encaisse: mR.reduce((s, r) => s + Number(r.amount_paid), 0),
        resteDu: mR.reduce((s, r) => s + Number(r.amount_due), 0),
      });
    }
    setMonthlyData(months);
    const siteMap = new Map<string, number>();
    active.forEach(r => {
      const s = r.lotissement_name || 'Autre';
      siteMap.set(s, (siteMap.get(s) || 0) + Number(r.amount_paid));
    });
    setSiteData(Array.from(siteMap.entries()).map(([name, value]) => ({ name, value })));
    setRecentReceipts(allReceipts.slice(0, 6));
  }
  setLoading(false);
}

  const fmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
    v >= 1_000     ? `${(v / 1_000).toFixed(0)}K`      : `${v}`;

  const CHART_COLORS = ['#DC2626', '#F59E0B', '#059669', '#3B82F6', '#8B5CF6'];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vue d'ensemble</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/recus/nouveau">
         <button
  className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
  style={{
    backgroundColor: "var(--primary)",
    boxShadow: "0 2px 8px rgba(170, 0, 0, 0.2)"
  }}
  onMouseOver={e => e.currentTarget.style.backgroundColor = "#880000"}
  onMouseOut={e => e.currentTarget.style.backgroundColor = "var(--primary)"}
>
  <PlusCircle className="h-4 w-4" />
  Nouveau reçu
</button>
        </Link>
      </div>

      {/* ── KPI cards — pastel style ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Total encaissé',
            value: fmt(stats.totalEncaisse),
            sub: 'FCFA collectés',
            icon: Wallet,
            bg: 'bg-rose-50',
            iconColor: 'text-rose-400',
            valColor: 'text-slate-800',
          },
          {
            label: 'Reste à recouvrer',
            value: fmt(stats.totalResteDu),
            sub: `${stats.recusPartiels} reçus partiels`,
            icon: AlertCircle,
            bg: 'bg-amber-50',
            iconColor: 'text-amber-400',
            valColor: 'text-slate-800',
          },
          {
            label: 'Taux de recouvrement',
            value: `${stats.tauxRecouvrement}%`,
            sub: `${stats.totalTransactions} transactions`,
            icon: TrendingUp,
            bg: 'bg-emerald-50',
            iconColor: 'text-emerald-400',
            valColor: 'text-slate-800',
          },
          {
            label: 'Ce mois',
            value: fmt(stats.caMois),
            sub: `${stats.recusMois} reçus émis`,
            icon: TrendingUp,
            bg: 'bg-sky-50',
            iconColor: 'text-sky-400',
            valColor: 'text-slate-800',
          },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.bg} rounded-2xl p-5 shadow-sm`}>
            {/* Icon */}
            <div className="mb-4">
              <kpi.icon className={`h-8 w-8 ${kpi.iconColor} opacity-80`} />
            </div>
            {/* Label */}
            <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
            {/* Value */}
            <p className={`text-2xl font-bold ${kpi.valColor} mt-0.5 tracking-tight`}>{kpi.value}</p>
            {/* Sub */}
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Secondary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Soldés',  value: stats.recusSoldes,   icon: CheckCircle2, bg: 'bg-emerald-50', ic: 'text-emerald-500', vc: 'text-emerald-700' },
          { label: 'Partiels',value: stats.recusPartiels, icon: Clock,        bg: 'bg-amber-50',   ic: 'text-amber-500',   vc: 'text-amber-700'   },
          { label: 'Clients', value: stats.totalClients,  icon: Users,        bg: 'bg-blue-50',    ic: 'text-blue-500',    vc: 'text-blue-700'    },
          { label: 'Annulés', value: stats.recusAnnules,  icon: AlertCircle,  bg: 'bg-red-50',     ic: 'text-red-500',     vc: 'text-red-600'     },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3.5 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`h-4 w-4 ${s.ic}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${s.vc}`}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Area chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Encaissements</h3>
              <p className="text-xs text-slate-400 mt-0.5">12 derniers mois</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />Encaissé
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-400 inline-block rounded" />Reste dû
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gEncaisse" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReste" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => formatCFA(Number(v))}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Area type="monotone" dataKey="encaisse" stroke="#DC2626" strokeWidth={2} fill="url(#gEncaisse)" name="Encaissé" />
              <Area type="monotone" dataKey="resteDu"  stroke="#F59E0B" strokeWidth={1.5} fill="url(#gReste)" strokeDasharray="4 4" name="Reste dû" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Par site</h3>
            <p className="text-xs text-slate-400 mt-0.5">Répartition des encaissements</p>
          </div>
          {siteData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={siteData} cx="50%" cy="50%"
                    innerRadius={40} outerRadius={65}
                    dataKey="value" strokeWidth={2} stroke="#F8FAFC"
                  >
                    {siteData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCFA(Number(v))}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {siteData.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-slate-600 truncate">{s.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 ml-2 shrink-0">{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-300 text-sm">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* ── Recent receipts table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Derniers reçus</h3>
            <p className="text-xs text-slate-400 mt-0.5">{recentReceipts.length} transactions récentes</p>
          </div>
          <Link href="/recus" className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors">
            Voir tout →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">N° Reçu</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Client</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Site</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Versé</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Reste</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Statut</th>
                <th className="px-5 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {recentReceipts.map((r, i) => (
                <tr key={r.id} className={`table-row-hover ${i < recentReceipts.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{r.receipt_number}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-slate-800">{r.clients?.full_name || r.client_name}</p>
                    <p className="text-xs text-slate-400">{formatDate(r.receipt_date)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{r.lotissement_name || '—'}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold text-emerald-600">{fmt(Number(r.amount_paid))}</td>
                  <td className={`px-5 py-3.5 text-right text-sm font-semibold ${r.amount_due > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {fmt(Number(r.amount_due))}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === 'soldé'  && <span className="status-badge-solde">Soldé</span>}
                    {r.status === 'partiel' && <span className="status-badge-partiel">Partiel</span>}
                    {r.status === 'annulé' && <span className="status-badge-annule">Annulé</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/recus/${r.id}`}>
                      <button className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors">
                        <Eye className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
              {recentReceipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">Aucun reçu pour le moment</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}