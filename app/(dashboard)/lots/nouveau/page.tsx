'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import type { Site } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';

export default function NouveauLotPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sites, setSites] = useState<Site[]>([]);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      site_id: '',
      lot_number: '',
      ilot_number: '',
      superficie: '',
      unit_price: '',
      status: 'disponible',
      title_type: '',
      notes: '',
    },
  });

  useEffect(() => {
    supabase.from('sites').select('*').order('name').then(({ data }) => {
      if (data) setSites(data);
    });
  }, []);

  async function onSubmit(data: Record<string, string>) {
    setSaving(true);
    const { error } = await supabase.from('lots').insert({
      ...data,
      superficie: Number(data.superficie),
      unit_price: Number(data.unit_price),
    });
    setSaving(false);
    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }
    router.push('/lots');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-2xl font-bold">Nouveau lot</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Site / Lotissement *</Label>
              <Select value={watch('site_id') || undefined} onValueChange={(v) => setValue('site_id', v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>N° Îlot *</Label>
                <Input {...register('ilot_number', { required: true })} />
              </div>
              <div>
                <Label>N° Lot *</Label>
                <Input {...register('lot_number', { required: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Superficie (m²) *</Label>
                <Input type="number" {...register('superficie', { required: true })} />
              </div>
              <div>
                <Label>Prix unitaire (FCFA) *</Label>
                <Input type="number" {...register('unit_price', { required: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Statut</Label>
                <Select value={watch('status') || undefined} onValueChange={(v) => setValue('status', v || 'disponible')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="réservé">Réservé</SelectItem>
                    <SelectItem value="vendu">Vendu</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de titre</Label>
                <Input {...register('title_type')} placeholder="TFU, ACD, TF Rural..." />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input {...register('notes')} placeholder="Notes (optionnel)" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
              <Button type="submit" className="bg-[#8B1A1A] hover:bg-[#6B1414]" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
