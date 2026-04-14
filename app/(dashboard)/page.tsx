'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import StatsCards from '@/components/dashboard/StatsCards';
import RevenueChart from '@/components/dashboard/RevenueChart';
import SiteChart from '@/components/dashboard/SiteChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import { Eye, PlusCircle } from 'lucide-react';
import type { Receipt, Site } from '@/lib/supabase/types';

type Period = 'month' | 'quarter' | 'year' | 'all';

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({ totalEncaisse: 0, caMois: 0, totalResteDu: 0, recusMois: 0 });
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; amount: number }[]>([]);
  const [siteData, setSiteData] = useState<{ name: string; value: number }[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [period, setPeriod] = useState<Period>('year');
  const [siteFilter, setSiteFilter] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, [period, siteFilter]);

  async function loadDashboardData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Load sites
    const { data: sitesData } = await supabase.from('sites').select('*');
    if (sitesData) setSites(sitesData);

    // Load all non-cancelled receipts
    let query = supabase.from('receipts').select('*').neq('status', 'annulé');
    if (siteFilter !== 'all') {
      query = query.eq('lotissement_name', siteFilter);
    }
    const { data: receipts } = await query;

    if (receipts) {
      const totalEncaisse = receipts.reduce((sum, r) => sum + Number(r.amount_paid), 0);
      const totalResteDu = receipts.reduce((sum, r) => sum + Number(r.amount_due), 0);

      const monthReceipts = receipts.filter(r => r.receipt_date >= startOfMonth);
      const caMois = monthReceipts.reduce((sum, r) => sum + Number(r.amount_paid), 0);

      setStats({
        totalEncaisse,
        caMois,
        totalResteDu,
        recusMois: monthReceipts.length,
      });

      // Monthly chart data (12 months)
      const months: { month: string; amount: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const monthAmount = receipts
          .filter(r => r.receipt_date.startsWith(monthKey))
          .reduce((sum, r) => sum + Number(r.amount_paid), 0);
        months.push({ month: label, amount: monthAmount });
      }
      setMonthlyData(months);

      // Site chart data
      const siteMap = new Map<string, number>();
      receipts.forEach(r => {
        const site = r.lotissement_name || 'Non spécifié';
        siteMap.set(site, (siteMap.get(site) || 0) + Number(r.amount_paid));
      });
      setSiteData(Array.from(siteMap.entries()).map(([name, value]) => ({ name, value })));
    }

    // Recent receipts
    const { data: recent } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (recent) setRecentReceipts(recent);
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'soldé':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Soldé</Badge>;
      case 'partiel':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Partiel</Badge>;
      case 'annulé':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 line-through">Annulé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Tableau de bord</h1>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => v && setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={(v) => setSiteFilter(v || 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tous les sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/recus/nouveau">
            <Button className="bg-[#8B1A1A] hover:bg-[#6B1414]">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau reçu
            </Button>
          </Link>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart data={monthlyData} />
        <SiteChart data={siteData} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">10 derniers reçus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">N° Reçu</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium text-right">Versé</th>
                  <th className="pb-2 font-medium text-right">Reste dû</th>
                  <th className="pb-2 font-medium">Statut</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2.5 font-mono text-xs">{r.receipt_number}</td>
                    <td className="py-2.5">{formatDate(r.receipt_date)}</td>
                    <td className="py-2.5">{r.client_name}</td>
                    <td className="py-2.5 text-right font-medium">{formatCFA(r.amount_paid)}</td>
                    <td className={`py-2.5 text-right ${r.amount_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCFA(r.amount_due)}
                    </td>
                    <td className="py-2.5">{statusBadge(r.status)}</td>
                    <td className="py-2.5">
                      <Link href={`/recus/${r.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentReceipts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Aucun reçu pour le moment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
