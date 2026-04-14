'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';

export default function NouveauClientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      full_name: '',
      phone_whatsapp: '',
      email: '',
      nationality: 'Ivoirienne',
      client_type: 'Particulier',
      address: '',
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('clients').insert({ ...data, created_by: user?.id });
    setSaving(false);
    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }
    router.push('/clients');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-2xl font-bold">Nouveau client</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Nom complet *</Label>
              <Input {...register('full_name', { required: 'Nom requis' })} />
              {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Téléphone WhatsApp *</Label>
                <Input {...register('phone_whatsapp', { required: 'Téléphone requis' })} placeholder="+225 XX XX XX XX XX" />
                {errors.phone_whatsapp && <p className="text-xs text-red-600 mt-1">{errors.phone_whatsapp.message}</p>}
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" {...register('email', { required: 'Email requis' })} />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nationalité</Label>
                <Input {...register('nationality')} />
              </div>
              <div>
                <Label>Type de client</Label>
                <select {...register('client_type')} className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background">
                  <option value="Particulier">Particulier</option>
                  <option value="Entreprise">Entreprise</option>
                  <option value="Diaspora">Diaspora</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input {...register('address')} placeholder="Adresse (optionnel)" />
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
