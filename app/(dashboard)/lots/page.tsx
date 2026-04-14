'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCFA } from '@/lib/utils/formatters';
import type { Lot, Site } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  disponible: 'bg-green-100 text-green-800',
  'réservé': 'bg-yellow-100 text-yellow-800',
  vendu: 'bg-red-100 text-red-800',
  en_cours: 'bg-blue-100 text-blue-800',
};

export default function LotsPage() {
  const supabase = createClient();
  const [lots, setLots] = useState<(Lot & { site?: Site })[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: sitesData } = await supabase.from('sites').select('*').order('name');
    if (sitesData) setSites(sitesData);

    const { data } = await supabase.from('lots').select('*, site:sites(*)').order('created_at', { ascending: false });
    if (data) setLots(data as (Lot & { site?: Site })[]);
  }

  const filtered = lots.filter(l => {
    const matchSearch = !search ||
      l.lot_number.includes(search) ||
      l.ilot_number.includes(search);
    const matchSite = siteFilter === 'all' || l.site_id === siteFilter;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchSite && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Catalogue des lots</h1>
        <Link href="/lots/nouveau">
          <Button className="bg-[#8B1A1A] hover:bg-[#6B1414]">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau lot
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° lot, N° îlot..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={siteFilter} onValueChange={(v) => setSiteFilter(v || 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="réservé">Réservé</SelectItem>
                <SelectItem value="vendu">Vendu</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-3 font-medium text-muted-foreground">Site</th>
                  <th className="p-3 font-medium text-muted-foreground">N° Îlot</th>
                  <th className="p-3 font-medium text-muted-foreground">N° Lot</th>
                  <th className="p-3 font-medium text-muted-foreground">Superficie</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Prix</th>
                  <th className="p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="p-3 font-medium text-muted-foreground">Titre</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3 font-medium">{(l.site as Site)?.name || '—'}</td>
                    <td className="p-3">{l.ilot_number}</td>
                    <td className="p-3">{l.lot_number}</td>
                    <td className="p-3">{l.superficie} m²</td>
                    <td className="p-3 text-right">{formatCFA(l.unit_price)}</td>
                    <td className="p-3">
                      <Badge className={STATUS_COLORS[l.status] || ''}>{l.status}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{l.title_type || '—'}</td>
                    <td className="p-3">
                      <Link href={`/lots/${l.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun lot trouvé</td>
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
