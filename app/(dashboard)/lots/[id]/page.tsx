'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCFA } from '@/lib/utils/formatters';
import type { Lot, Site } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Ruler, Tag } from 'lucide-react';

export default function LotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [lot, setLot] = useState<Lot | null>(null);
  const [site, setSite] = useState<Site | null>(null);

  useEffect(() => {
    loadLot();
  }, []);

  async function loadLot() {
    const id = params.id as string;
    const { data } = await supabase.from('lots').select('*, site:sites(*)').eq('id', id).single();
    if (data) {
      setLot(data as Lot);
      setSite((data as Lot & { site: Site }).site);
    }
  }

  if (!lot) return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;

  const STATUS_COLORS: Record<string, string> = {
    disponible: 'bg-green-100 text-green-800',
    'réservé': 'bg-yellow-100 text-yellow-800',
    vendu: 'bg-red-100 text-red-800',
    en_cours: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold">Lot {lot.lot_number} — Îlot {lot.ilot_number}</h1>
          <p className="text-sm text-muted-foreground">{site?.name || ''}</p>
        </div>
        <Badge className={STATUS_COLORS[lot.status] || ''} >{lot.status}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Ruler className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Superficie</p>
              <p className="font-bold">{lot.superficie} m²</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><Tag className="h-4 w-4 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Prix unitaire</p>
              <p className="font-bold">{formatCFA(lot.unit_price)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><MapPin className="h-4 w-4 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Site</p>
              <p className="font-bold">{site?.name}</p>
              <p className="text-xs text-muted-foreground">{site?.city}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {(lot.title_type || lot.notes) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Détails</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lot.title_type && <p><span className="text-muted-foreground">Type de titre :</span> {lot.title_type}</p>}
            {lot.notes && <p><span className="text-muted-foreground">Notes :</span> {lot.notes}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
