'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCFA, formatDate, cleanPhoneNumber } from '@/lib/utils/formatters';
import type { Receipt } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Eye, MessageCircle, Mail, Download, XCircle, PlusCircle, Search,
} from 'lucide-react';

export default function RecusPage() {
  const supabase = createClient();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; receiptId: string }>({ open: false, receiptId: '' });
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    setLoading(true);
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReceipts(data);
    setLoading(false);
  }

  const filtered = receipts.filter(r => {
    const matchSearch = !search ||
      r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      r.client_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function statusBadge(status: string) {
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
  }

  async function cancelReceipt() {
    if (!cancelReason.trim()) return;
    await supabase
      .from('receipts')
      .update({ status: 'annulé', cancel_reason: cancelReason })
      .eq('id', cancelDialog.receiptId);
    setCancelDialog({ open: false, receiptId: '' });
    setCancelReason('');
    loadReceipts();
  }

  function sendWhatsApp(receipt: Receipt) {
    const phone = cleanPhoneNumber(receipt.client_phone);
    const message = encodeURIComponent(
      `Bonjour, veuillez trouver ci-joint votre reçu de paiement N° ${receipt.receipt_number}.\n\n` +
      `${receipt.pdf_url ? `Téléchargez votre reçu : ${receipt.pdf_url}\n\n` : ''}` +
      `WEBUILDD FONCIER & IMMOBILIER\nMarcory Zone 4 — Abidjan`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    supabase.from('receipt_sends').insert({
      receipt_id: receipt.id,
      channel: 'whatsapp',
      recipient: phone,
    });
  }

  async function sendEmail(receipt: Receipt) {
    try {
      await fetch('/api/recus/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt.id }),
      });
      alert('Email envoyé');
    } catch {
      alert("Erreur lors de l'envoi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Reçus de paiement</h1>
        <Link href="/recus/nouveau">
          <Button className="bg-[#8B1A1A] hover:bg-[#6B1414]">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau reçu
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, N° reçu, N° lot..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="partiel">Partiel</SelectItem>
                <SelectItem value="soldé">Soldé</SelectItem>
                <SelectItem value="annulé">Annulé</SelectItem>
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
                  <th className="p-3 font-medium text-muted-foreground">N° Reçu</th>
                  <th className="p-3 font-medium text-muted-foreground">Date</th>
                  <th className="p-3 font-medium text-muted-foreground">Client</th>
                  <th className="p-3 font-medium text-muted-foreground">Site</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Total</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Versé</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Reste</th>
                  <th className="p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3 font-mono text-xs">{r.receipt_number}</td>
                    <td className="p-3">{formatDate(r.receipt_date)}</td>
                    <td className="p-3 font-medium">{r.client_name}</td>
                    <td className="p-3 text-muted-foreground">{r.lotissement_name || '—'}</td>
                    <td className="p-3 text-right">{formatCFA(r.total_amount)}</td>
                    <td className="p-3 text-right font-medium">{formatCFA(r.amount_paid)}</td>
                    <td className={`p-3 text-right ${r.amount_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCFA(r.amount_due)}
                    </td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/recus/${r.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp" onClick={() => sendWhatsApp(r)}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Email" onClick={() => sendEmail(r)}>
                          <Mail className="h-4 w-4" />
                        </Button>
                        {r.pdf_url && (
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Télécharger">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {r.status !== 'annulé' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            title="Annuler"
                            onClick={() => setCancelDialog({ open: true, receiptId: r.id })}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      {loading ? 'Chargement...' : 'Aucun reçu trouvé'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cancel dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(v) => setCancelDialog({ ...cancelDialog, open: v })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler ce reçu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motif d&apos;annulation *</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Raison de l'annulation..."
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelDialog({ open: false, receiptId: '' })}>
                Annuler
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={cancelReceipt}
                disabled={!cancelReason.trim()}
              >
                Confirmer l&apos;annulation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
