'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Client, Receipt } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Phone, Mail, Eye } from 'lucide-react';

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
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;
  }

  const totalPaid = receipts.reduce((s, r) => s + Number(r.amount_paid), 0);
  const totalDue = receipts.reduce((s, r) => s + Number(r.amount_due), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">{client.full_name}</h1>
          <p className="text-sm text-muted-foreground">Client depuis le {formatDate(client.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Phone className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Téléphone</p>
              <p className="font-medium text-sm">{client.phone_whatsapp}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Mail className="h-4 w-4 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-sm">{client.email}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Type</p>
            <Badge variant="outline" className="mt-1">{client.client_type}</Badge>
            <p className="text-xs text-muted-foreground mt-2">Nationalité : {client.nationality}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{receipts.length}</p>
            <p className="text-xs text-muted-foreground">Reçus émis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{formatCFA(totalPaid)}</p>
            <p className="text-xs text-muted-foreground">Total versé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCFA(totalDue)}
            </p>
            <p className="text-xs text-muted-foreground">Reste dû</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historique des reçus</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-3 font-medium text-muted-foreground">N° Reçu</th>
                  <th className="p-3 font-medium text-muted-foreground">Date</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Total</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Versé</th>
                  <th className="p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3 font-mono text-xs">{r.receipt_number}</td>
                    <td className="p-3">{formatDate(r.receipt_date)}</td>
                    <td className="p-3 text-right">{formatCFA(r.total_amount)}</td>
                    <td className="p-3 text-right font-medium">{formatCFA(r.amount_paid)}</td>
                    <td className="p-3">
                      <Badge className={
                        r.status === 'soldé' ? 'bg-green-100 text-green-800' :
                        r.status === 'partiel' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Link href={`/recus/${r.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun reçu</td>
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
