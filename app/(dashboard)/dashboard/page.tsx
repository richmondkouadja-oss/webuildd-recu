"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCFA, formatDate } from "@/lib/utils/formatters";
import {
  PlusCircle,
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  FileText,
} from "lucide-react";
import type { Receipt } from "@/lib/supabase/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'3' | '6' | '12'>('12');
  const [activeReceiptsCache, setActiveReceiptsCache] = useState<Receipt[]>([]);
  const [stats, setStats] = useState({
    totalEncaisse: 0,
    totalResteDu: 0,
    totalTransactions: 0,
    caMois: 0,
    recusMois: 0,
    recusSoldes: 0,
    recusPartiels: 0,
    recusAnnules: 0,
    totalClients: 0,
    tauxRecouvrement: 0,
  });
  const [monthlyData, setMonthlyData] = useState<
    { month: string; encaisse: number; resteDu: number }[]
  >([]);
  const [siteData, setSiteData] = useState<{ name: string; value: number }[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadData();
  }, []);

  // Recalcule uniquement le graphe sans recharger les données
  useEffect(() => {
    if (activeReceiptsCache.length === 0) return;
    const now = new Date();
    const nbMois = parseInt(chartPeriod);
    const months = [];
    for (let i = nbMois - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const mR = activeReceiptsCache.filter(r => r.receipt_date.startsWith(key));
      months.push({
        month: label,
        encaisse: mR.reduce((s, r) => s + Number(r.amount_paid), 0),
        resteDu: mR.reduce((s, r) => s + Number(r.amount_due), 0),
      });
    }
    setMonthlyData(months);
  }, [chartPeriod, activeReceiptsCache]);

  async function loadData() {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    const role = profileData?.role;

    let query = supabase.from("receipts").select("*").order("created_at", { ascending: false });
    if (role === 'comptable') {
      query = query.eq('created_by', user?.id);
    }

    const { data: allReceipts } = await query;
    const { data: clients } = await supabase.from("clients").select("id");

    if (allReceipts) {
      const active = allReceipts.filter((r) => r.status !== "annulé");
      const totalEncaisse = active.reduce((s, r) => s + Number(r.amount_paid), 0);
      const totalResteDu = active.reduce((s, r) => s + Number(r.amount_due), 0);
      const totalMontant = totalEncaisse + totalResteDu;
      const monthReceipts = active.filter((r) => r.receipt_date >= startOfMonth);
      const caMois = monthReceipts.reduce((s, r) => s + Number(r.amount_paid), 0);

      setStats({
        totalEncaisse,
        totalResteDu,
        totalTransactions: active.length,
        caMois,
        recusMois: monthReceipts.length,
        recusSoldes: allReceipts.filter((r) => r.status === "soldé").length,
        recusPartiels: allReceipts.filter((r) => r.status === "partiel").length,
        recusAnnules: allReceipts.filter((r) => r.status === "annulé").length,
        totalClients: clients?.length || 0,
        tauxRecouvrement:
          totalMontant > 0 ? Math.round((totalEncaisse / totalMontant) * 100) : 0,
      });

      // Sauvegarde dans le cache pour le graphe
      setActiveReceiptsCache(active);

      // Site data
      const siteMap = new Map<string, number>();
      active.forEach((r) => {
        const site = r.lotissement_name || "Non spécifié";
        siteMap.set(site, (siteMap.get(site) || 0) + Number(r.amount_paid));
      });
      setSiteData(Array.from(siteMap.entries()).map(([name, value]) => ({ name, value })));

      setRecentReceipts(allReceipts.slice(0, 8));
    }
    setLoading(false);
  }

  const formatShort = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
  };

  const PIE_COLORS = ["#AB0303", "#f87171", "#f59e0b", "#10b981", "#3b82f6"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Total encaissé',
      value: formatShort(stats.totalEncaisse),
      sub: 'FCFA collectés',
      icon: Wallet,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-500',
    },
    {
      label: 'Reste à recouvrer',
      value: formatShort(stats.totalResteDu),
      sub: 'FCFA à recouvrer',
      icon: AlertCircle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Clients',
      value: String(stats.totalClients),
      sub: `${stats.totalTransactions} transactions`,
      icon: Users,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Ce mois',
      value: formatShort(stats.caMois),
      sub: `${stats.recusMois} reçus émis`,
      icon: TrendingUp,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-500',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de l'activité</p>
        </div>
        <Link href="/recus/nouveau">
          <button
            className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            style={{ backgroundColor: "#AB0303", boxShadow: "0 1px 2px rgba(171, 3, 3, 0.2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B0202")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#AB0303")}
          >
            <PlusCircle className="h-4 w-4" />
            Nouveau reçu
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`${kpi.iconBg} w-14 h-14 rounded-xl flex items-center justify-center shrink-0`}>
              <kpi.icon className={`h-7 w-7 ${kpi.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 leading-none">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight leading-none">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary mini cards */}
    {/*   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Reçus soldés",   value: stats.recusSoldes,   icon: CheckCircle2, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", valueColor: "text-emerald-700" },
          { label: "Reçus partiels", value: stats.recusPartiels, icon: Clock,        iconBg: "bg-amber-100",   iconColor: "text-amber-600",   valueColor: "text-amber-700"   },
          { label: "Clients",        value: stats.totalClients,  icon: Users,        iconBg: "bg-sky-100",     iconColor: "text-sky-600",     valueColor: "text-sky-700"     },
          { label: "Annulés",        value: stats.recusAnnules,  icon: AlertCircle,  iconBg: "bg-red-100",     iconColor: "text-red-500",     valueColor: "text-red-600"     },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
            <div className={`${c.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
              <c.icon className={`h-5 w-5 ${c.iconColor}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold leading-none ${c.valueColor}`}>{c.value}</p>
              <p className="text-xs text-slate-400 mt-1">{c.label}</p>
            </div>
          </div>
        ))}
      </div> */}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Encaissements</p>
            <div className="flex gap-1">
              {(['3', '6', '12'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    chartPeriod === p ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={chartPeriod === p ? { backgroundColor: '#AB0303' } : {}}
                >
                  {p === '3' ? '3 mois' : p === '6' ? '6 mois' : '12 mois'}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEncaisse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#AB0303" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#AB0303" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradResteDu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatShort} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => formatCFA(Number(v))}
                  labelFormatter={(l) => `Mois : ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                />
                <Area type="monotone" dataKey="encaisse" stroke="#AB0303" strokeWidth={3} fill="url(#gradEncaisse)" name="Encaissé" isAnimationActive={false} />
                <Area type="monotone" dataKey="resteDu" stroke="#f59e0b" strokeWidth={2} fill="url(#gradResteDu)" strokeDasharray="4 4" name="Reste dû" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-800 mb-4">Répartition par site</p>
          {siteData.length > 0 ? (
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={siteData} cx="50%" cy="50%" innerRadius={48} outerRadius={75} dataKey="value" nameKey="name" paddingAngle={2}>
                    {siteData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCFA(Number(v))}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(v) => <span style={{ fontSize: 11, color: "#64748b" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[230px]">
              <p className="text-sm text-slate-400">Aucune donnée</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent receipts table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Derniers reçus</p>
          <Link href="/recus">
            <button
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: "#AB0303" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#8B0202")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#AB0303")}
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">N° Reçu</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Client</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Site</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Versé</th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Reste dû</th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Statut</th>
                <th className="w-10 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentReceipts.map((r) => (
                <tr key={r.id} className="table-row-hover border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{r.receipt_number}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800 leading-none">{r.client_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(r.receipt_date)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{r.lotissement_name || "—"}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">{formatCFA(r.amount_paid)}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${r.amount_due > 0 ? "text-red-500" : "text-emerald-600"}`}>
                    {formatCFA(r.amount_due)}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === "soldé"  && <span className="status-badge-solde">Soldé</span>}
                    {r.status === "partiel" && <span className="status-badge-partiel">Partiel</span>}
                    {r.status === "annulé" && <span className="status-badge-annule">Annulé</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/recus/${r.id}`}>
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: "#f5f5f5" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                      >
                        <ArrowRight className="h-3.5 w-3.5" style={{ color: "#94a3b8" }} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
              {recentReceipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">Aucun reçu pour le moment</p>
                    </div>
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