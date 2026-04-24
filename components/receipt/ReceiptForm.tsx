'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { numberToWordsFr } from '@/lib/utils/numberToWords';
import { formatCFA } from '@/lib/utils/formatters';
import LotTable, { type LotLine } from './LotTable';
import ReceiptPreview from './ReceiptPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Eye, CheckCircle, Download, MessageCircle, Mail, Printer, Search, UserPlus,
} from 'lucide-react';
import type { Client, Site } from '@/lib/supabase/types';

interface ReceiptFormValues {
  receipt_date: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  property_type: 'terrain' | 'maison' | 'motif';
  superficie: string;
  localisation_quartier: string;
  localisation_commune: string;
  localisation_ville: string;
  lotissement_name: string;
  property_description: string;
  motif: string;
  quantity: number;
  unit_price: string;
  amount_paid: string;
}

export default function ReceiptForm() {
  const router = useRouter();
  const supabase = createClient();

  const { register, handleSubmit, watch, setValue, control, trigger, formState: { errors } } = useForm<ReceiptFormValues>({
    defaultValues: {
      receipt_date: new Date().toISOString().split('T')[0],
      property_type: 'terrain',
      quantity: 1,
      client_name: '',
      client_phone: '',
      client_email: '',
      superficie: '',
      localisation_quartier: '',
      localisation_commune: '',
      localisation_ville: '',
      lotissement_name: '',
      property_description: '',
      motif: '',
      unit_price: '',
      amount_paid: '',
    },
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [lots, setLots] = useState<LotLine[]>([{ ilot_number: '', lot_number: '' }]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<{ id: string; receipt_number: string; pdf_url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const propertyType = watch('property_type');
  const quantity = watch('quantity');
  const unitPriceRaw = watch('unit_price');
  const amountPaidRaw = watch('amount_paid');

  const unitPrice = Number(String(unitPriceRaw).replace(/[^\d]/g, '')) || 0;
  const amountPaid = Number(String(amountPaidRaw).replace(/[^\d]/g, '')) || 0;
  const totalAmount = unitPrice * (quantity || 1);
  const amountDue = totalAmount - amountPaid;
  const amountPaidWords = amountPaid > 0 ? numberToWordsFr(amountPaid) : '';

  useEffect(() => {
    loadClients();
    loadSites();
  }, []);

  useEffect(() => {
    if (quantity > lots.length) {
      const newLots = [...lots];
      for (let i = lots.length; i < quantity; i++) {
        newLots.push({ ilot_number: '', lot_number: '' });
      }
      setLots(newLots);
    }
  }, [quantity]);

  async function loadClients() {
    const { data } = await supabase.from('clients').select('*').order('full_name');
    if (data) setClients(data);
  }

  async function loadSites() {
    const { data } = await supabase.from('sites').select('*').order('name');
    if (data) setSites(data);
  }

  function selectClient(client: Client) {
    setValue('client_name', client.full_name);
    setValue('client_phone', client.phone_whatsapp);
    setValue('client_email', client.email || '');
    setSelectedClientId(client.id);
    setShowClientSearch(false);
    setClientSearch('');
  }

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone_whatsapp.includes(clientSearch)
  );

  function formatNumberInput(value: string): string {
    const num = value.replace(/[^\d]/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('fr-FR').format(Number(num));
  }

  function getFormData(): Record<string, unknown> {
    const values = watch();
    return {
      ...values,
      unit_price: unitPrice,
      amount_paid: amountPaid,
      total_amount: totalAmount,
      amount_due: amountDue,
      amount_paid_words: amountPaidWords,
      lots,
      quantity: quantity || 1,
      superficie: Number(String(values.superficie).replace(/[^\d]/g, '')) || 0,
    };
  }

  async function goToStep(nextStep: number) {
    let valid = true;
    if (step === 1) {
      valid = await trigger(['receipt_date']);
    } else if (step === 2) {
      if (!watch('client_name')) return;
      valid = true;
    } else if (step === 3) {
      if (propertyType === 'motif') {
        valid = await trigger(['motif']);
      } else if (propertyType === 'terrain') {
        valid = await trigger(['localisation_quartier', 'localisation_commune', 'localisation_ville']);
      } else if (propertyType === 'maison') {
        valid = await trigger(['property_description', 'localisation_quartier']);
      }
    } else if (step === 4) {
      valid = await trigger(['unit_price', 'amount_paid']);
    }
    if (valid) setStep(nextStep);
  }

  async function onSubmit(data: ReceiptFormValues) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: receiptNum } = await supabase.rpc('generate_receipt_number');

      const receiptData = {
        receipt_number: receiptNum || `WFI-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
        receipt_date: data.receipt_date,
        client_name: data.client_name,
        client_phone: data.client_phone,
        client_email: data.client_email,
        property_type: data.property_type,
        superficie: data.property_type === 'motif' ? null : (Number(String(data.superficie).replace(/[^\d]/g, '')) || null),
        localisation_quartier: data.property_type === 'motif' ? null : (data.localisation_quartier || null),
        localisation_commune: data.property_type === 'motif' ? null : (data.localisation_commune || null),
        localisation_ville: data.property_type === 'motif' ? null : (data.localisation_ville || null),
        lotissement_name: data.property_type === 'motif' ? null : (data.lotissement_name || null),
        property_description: data.property_type === 'motif' ? data.motif : (data.property_description || null),
        quantity: data.property_type === 'motif' ? 1 : (quantity || 1),
        unit_price: unitPrice,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        amount_due: amountDue,
        amount_paid_words: amountPaidWords,
        status: amountDue <= 0 ? 'soldé' : 'partiel',
        created_by: user?.id || null,
      };

      if (selectedClientId) {
        Object.assign(receiptData, { client_id: selectedClientId });
      } else if (data.client_name) {
        const { data: existingClient } = await supabase
          .from('clients').select('id').eq('full_name', data.client_name).single();
        if (existingClient) Object.assign(receiptData, { client_id: existingClient.id });
      }

      const { data: receipt, error } = await supabase
        .from('receipts').insert(receiptData).select().single();

      if (error) throw error;

      if (data.property_type !== 'motif' && lots.length > 0) {
        const lotRows = lots
          .filter(l => l.ilot_number || l.lot_number)
          .map((l, i) => ({
            receipt_id: receipt.id,
            ilot_number: l.ilot_number,
            lot_number: l.lot_number,
            superficie: l.superficie || null,
            display_order: i + 1,
          }));
        if (lotRows.length > 0) await supabase.from('receipt_lots').insert(lotRows);
      }

      try {
        const res = await fetch('/api/pdf/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiptId: receipt.id }),
        });
        if (res.ok) {
          const { pdf_url } = await res.json();
          await supabase.from('receipts').update({ pdf_url }).eq('id', receipt.id);
          receipt.pdf_url = pdf_url;
        }
      } catch { /* non-blocking */ }

      setSavedReceipt({ id: receipt.id, receipt_number: receipt.receipt_number, pdf_url: receipt.pdf_url || '' });
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du reçu');
    } finally {
      setSaving(false);
    }
  }

  function sendWhatsApp() {
    if (!savedReceipt) return;
    const phone = watch('client_phone').replace(/[\s+\-()]/g, '');
    const message = encodeURIComponent(
      `Bonjour, veuillez trouver ci-joint votre reçu de paiement N° ${savedReceipt.receipt_number}.\n\n` +
      `${savedReceipt.pdf_url ? `Téléchargez votre reçu : ${savedReceipt.pdf_url}\n\n` : ''}` +
      `WEBUILDD FONCIER & IMMOBILIER\nMarcory Zone 4 — Abidjan`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    supabase.from('receipt_sends').insert({ receipt_id: savedReceipt.id, channel: 'whatsapp', recipient: phone });
  }

  async function sendEmail() {
    if (!savedReceipt) return;
    try {
      await fetch('/api/recus/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: savedReceipt.id }),
      });
      alert('Email envoyé avec succès');
    } catch { alert("Erreur lors de l'envoi de l'email"); }
  }

  const STEPS = propertyType === 'motif'
    ? ['En-tête', 'Client', 'Motif', 'Finance', 'Signatures']
    : ['En-tête', 'Client', 'Bien', 'Finance', 'Signatures'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => i + 1 < step && setStep(i + 1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              step === i + 1 ? 'bg-[#8B1A1A] text-white'
              : step > i + 1 ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/20">
              {step > i + 1 ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Étape 1 — En-tête */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-[#8B1A1A]" />
                En-tête du reçu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>N° Reçu</Label>
                <Input disabled placeholder="Sera généré automatiquement" className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="receipt_date">Date du reçu *</Label>
                <Input type="date" {...register('receipt_date', { required: 'Date requise' })}
                  className={errors.receipt_date ? 'border-red-500' : ''} />
                {errors.receipt_date && <p className="text-xs text-red-600 mt-1">{errors.receipt_date.message}</p>}
              </div>
              <Button type="button" onClick={() => goToStep(2)} className="bg-[#8B1A1A] hover:bg-[#6B1414]">
                Suivant
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Étape 2 — Client */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {watch('client_name') ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">{watch('client_name')}</p>
                    <p className="text-xs text-green-600">{watch('client_phone')}</p>
                    {watch('client_email') && <p className="text-xs text-green-600">{watch('client_email')}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setValue('client_name', ''); setValue('client_phone', ''); setValue('client_email', ''); setSelectedClientId(null); }}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-700">Sélectionnez ou créez un client pour continuer</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un client existant..."
                      className="pl-9"
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientSearch(true); }}
                      onFocus={() => setShowClientSearch(true)}
                    />
                    {showClientSearch && clientSearch && (
                      <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                        {filteredClients.map(c => (
                          <button key={c.id} type="button" onClick={() => selectClient(c)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                            <span className="font-medium">{c.full_name}</span>
                            <span className="text-muted-foreground ml-2">{c.phone_whatsapp}</span>
                          </button>
                        ))}
                        {filteredClients.length === 0 && (
                          <p className="px-4 py-2 text-sm text-muted-foreground">Aucun client trouvé</p>
                        )}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowNewClient(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer un nouveau client
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>Précédent</Button>
                <Button
                  type="button"
                  onClick={() => goToStep(3)}
                  disabled={!watch('client_name')}
                  className="bg-[#8B1A1A] hover:bg-[#6B1414] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 3 — Bien ou Motif */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {propertyType === 'motif' ? 'Motif du paiement' : 'Bien acheté'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Controller
                  control={control}
                  name="property_type"
                  render={({ field }) => (
                    <>
                      {(['terrain', 'maison', 'motif'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-colors ${
                            field.value === type
                              ? 'border-[#8B1A1A] bg-[#8B1A1A] text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </>
                  )}
                />
              </div>

              {propertyType === 'motif' && (
                <div className="space-y-3">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm text-orange-700 font-medium mb-1">Reçu sans bien immobilier</p>
                    <p className="text-xs text-orange-600">Ce reçu ne contiendra pas de section bien acquis ni de lots.</p>
                  </div>
                  <div>
                    <Label htmlFor="motif">Motif du paiement *</Label>
                    <Textarea
                      {...register('motif', { required: 'Motif requis' })}
                      rows={4}
                      placeholder="Ex: Frais de dossier, Réservation parcelle..."
                      className={`mt-1 ${errors.motif ? 'border-red-500' : ''}`}
                    />
                    {errors.motif && <p className="text-xs text-red-600 mt-1">{errors.motif.message}</p>}
                  </div>
                </div>
              )}

              {propertyType === 'terrain' && (
                <>
                  <div>
                    <Label>Superficie (m²)</Label>
                    <Input {...register('superficie')} placeholder="Ex: 400" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Quartier *</Label>
                      <Input {...register('localisation_quartier', { required: 'Quartier requis' })}
                        className={errors.localisation_quartier ? 'border-red-500' : ''} />
                      {errors.localisation_quartier && <p className="text-xs text-red-600 mt-1">{errors.localisation_quartier.message}</p>}
                    </div>
                    <div>
                      <Label>Commune *</Label>
                      <Input {...register('localisation_commune', { required: 'Commune requise' })}
                        className={errors.localisation_commune ? 'border-red-500' : ''} />
                      {errors.localisation_commune && <p className="text-xs text-red-600 mt-1">{errors.localisation_commune.message}</p>}
                    </div>
                    <div>
                      <Label>Ville *</Label>
                      <Input {...register('localisation_ville', { required: 'Ville requise' })}
                        className={errors.localisation_ville ? 'border-red-500' : ''} />
                      {errors.localisation_ville && <p className="text-xs text-red-600 mt-1">{errors.localisation_ville.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Label>Nom du lotissement</Label>
                    <Controller
                      control={control}
                      name="lotissement_name"
                      render={({ field }) => (
                        <Select value={field.value === '__other' ? '__other' : field.value} onValueChange={(v) => field.onChange(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un site" />
                          </SelectTrigger>
                          <SelectContent>
                            {sites.map(s => (
                              <SelectItem key={s.id} value={s.name}>{s.name} — {s.city}</SelectItem>
                            ))}
                            <SelectItem value="__other">Autre (saisie libre)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {watch('lotissement_name') === '__other' && (
                      <Input className="mt-2" placeholder="Nom du lotissement"
                        onBlur={(e) => setValue('lotissement_name', e.target.value)} />
                    )}
                  </div>
                  <div>
                    <Label>Tableau des lots (N° Îlot / N° Lot)</Label>
                    <LotTable lots={lots} onChange={setLots} maxLots={20} />
                  </div>
                </>
              )}

              {propertyType === 'maison' && (
                <>
                  <div>
                    <Label>Description *</Label>
                    <Textarea {...register('property_description', { required: 'Description requise' })}
                      rows={3} placeholder="Description du bien"
                      className={errors.property_description ? 'border-red-500' : ''} />
                    {errors.property_description && <p className="text-xs text-red-600 mt-1">{errors.property_description.message}</p>}
                  </div>
                  <div>
                    <Label>Adresse *</Label>
                    <Input {...register('localisation_quartier', { required: 'Adresse requise' })}
                      placeholder="Adresse complète"
                      className={errors.localisation_quartier ? 'border-red-500' : ''} />
                    {errors.localisation_quartier && <p className="text-xs text-red-600 mt-1">{errors.localisation_quartier.message}</p>}
                  </div>
                  <div>
                    <Label>Superficie bâtie (m²)</Label>
                    <Input {...register('superficie')} placeholder="Optionnel" />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>Précédent</Button>
                <Button type="button" onClick={() => goToStep(4)} className="bg-[#8B1A1A] hover:bg-[#6B1414]">Suivant</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 4 — Finance */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Éléments financiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Prix unitaire (FCFA) *</Label>
                <Controller
                  control={control}
                  name="unit_price"
                  rules={{
                    required: 'Prix unitaire requis',
                    validate: v => Number(String(v).replace(/[^\d]/g, '')) > 0 || 'Le prix doit être supérieur à 0'
                  }}
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(formatNumberInput(e.target.value))}
                      placeholder="Ex: 6 000 000"
                      className={errors.unit_price ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.unit_price && <p className="text-xs text-red-600 mt-1">{errors.unit_price.message}</p>}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-muted-foreground">Montant total</Label>
                <p className="text-2xl font-bold mt-1">{formatCFA(totalAmount)}</p>
                {propertyType !== 'motif' && (
                  <p className="text-xs text-muted-foreground">= Prix unitaire × {quantity || 1} lot(s)</p>
                )}
              </div>

              <div className="border-2 border-[#8B1A1A] rounded-xl p-5 bg-red-50/50">
                <Label className="text-lg font-bold text-[#8B1A1A]">Somme versée (FCFA) *</Label>
                <Controller
                  control={control}
                  name="amount_paid"
                  rules={{ required: 'Somme versée requise' }}
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(formatNumberInput(e.target.value))}
                      placeholder="Ex: 3 000 000"
                      className={`text-2xl h-14 font-bold border-[#8B1A1A] mt-2 ${errors.amount_paid ? 'border-red-500' : ''}`}
                    />
                  )}
                />
                {errors.amount_paid && <p className="text-xs text-red-600 mt-1">{errors.amount_paid.message}</p>}
                {amountPaid > totalAmount && (
                  <p className="text-sm text-red-600 mt-1">La somme versée dépasse le montant total</p>
                )}
                {amountPaidWords && (
                  <p className="text-sm italic text-[#8B1A1A] mt-2">{amountPaidWords}</p>
                )}
              </div>

              <div className={`rounded-lg p-4 ${amountDue > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                <Label className="text-muted-foreground">Reste dû</Label>
                <p className="text-2xl font-bold mt-1">{formatCFA(Math.max(0, amountDue))}</p>
                {amountDue <= 0 && <Badge className="bg-green-600 mt-1">SOLDÉ</Badge>}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>Précédent</Button>
                <Button type="button" onClick={() => goToStep(5)} className="bg-[#8B1A1A] hover:bg-[#6B1414]">Suivant</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 5 — Signatures */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signatures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center space-y-4">
                  <p className="font-medium text-sm">Signature du Client</p>
                  <div className="h-24 border-b-2 border-gray-300" />
                  <p className="text-sm text-muted-foreground">{watch('client_name') || '_______________'}</p>
                </div>
                <div className="text-center space-y-4">
                  <p className="font-medium text-sm">Signature du Service Comptable</p>
                  <div className="h-24 border-b-2 border-gray-300" />
                  <p className="text-sm text-muted-foreground">WEBUILDD F&I</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(4)}>Précédent</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sticky action bar */}
        <div className="sticky bottom-0 bg-white border-t p-4 rounded-t-xl shadow-lg -mx-4 flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Aperçu PDF
          </Button>
          <Button type="submit" className="bg-[#8B1A1A] hover:bg-[#6B1414]" disabled={saving}>
            <CheckCircle className="mr-2 h-4 w-4" />
            {saving ? 'Création...' : 'Valider & Générer'}
          </Button>
        </div>
      </form>

      {showPreview && (
        <ReceiptPreview data={getFormData()} lots={lots} open={showPreview} onClose={() => setShowPreview(false)} />
      )}

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
          <NewClientForm onCreated={(client) => { selectClient(client); setSelectedClientId(client.id); setShowNewClient(false); loadClients(); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              Reçu créé avec succès
            </DialogTitle>
          </DialogHeader>
          {savedReceipt && (
            <div className="space-y-3">
              <p className="text-center font-mono text-lg font-bold">{savedReceipt.receipt_number}</p>
              <div className="grid grid-cols-2 gap-2">
                {savedReceipt.pdf_url && (
                  <a href={savedReceipt.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full"><Download className="mr-2 h-4 w-4" />Télécharger</Button>
                  </a>
                )}
                <Button variant="outline" className="w-full" onClick={sendWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
                </Button>
                <Button variant="outline" className="w-full" onClick={sendEmail}>
                  <Mail className="mr-2 h-4 w-4" />Email
                </Button>
                <Button variant="outline" className="w-full" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />Imprimer
                </Button>
              </div>
              <Button className="w-full bg-[#8B1A1A] hover:bg-[#6B1414]" onClick={() => router.push('/recus')}>
                Voir tous les reçus
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewClientForm({ onCreated }: { onCreated: (client: Client) => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { full_name: '', phone_whatsapp: '', email: '', nationality: 'Ivoirienne', client_type: 'Particulier', address: '' },
  });

  async function onSubmit(data: Record<string, string>) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: client, error } = await supabase.from('clients').insert({ ...data, created_by: user?.id }).select().single();
    setLoading(false);
    if (error) { alert('Erreur: ' + error.message); return; }
    onCreated(client);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Label>Nom complet *</Label>
        <Input {...register('full_name', { required: true })} className={errors.full_name ? 'border-red-500' : ''} />
      </div>
      <div>
        <Label>Téléphone WhatsApp *</Label>
        <Input {...register('phone_whatsapp', { required: true })} placeholder="+225"
          className={errors.phone_whatsapp ? 'border-red-500' : ''} />
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
      <Button type="submit" className="w-full bg-[#8B1A1A] hover:bg-[#6B1414]" disabled={loading}>
        {loading ? 'Création...' : 'Créer le client'}
      </Button>
    </form>
  );
}