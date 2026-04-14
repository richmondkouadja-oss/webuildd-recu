'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Client } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Eye, Phone, Mail } from 'lucide-react';

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('full_name');
    if (data) setClients(data);
    setLoading(false);
  }

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_whatsapp.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">Clients</h1>
        <Link href="/clients/nouveau">
          <Button className="bg-[#8B1A1A] hover:bg-[#6B1414]">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, téléphone, email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-3 font-medium text-muted-foreground">Nom</th>
                  <th className="p-3 font-medium text-muted-foreground">Téléphone</th>
                  <th className="p-3 font-medium text-muted-foreground">Email</th>
                  <th className="p-3 font-medium text-muted-foreground">Type</th>
                  <th className="p-3 font-medium text-muted-foreground">Nationalité</th>
                  <th className="p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3 font-medium">{c.full_name}</td>
                    <td className="p-3">{c.phone_whatsapp}</td>
                    <td className="p-3 text-muted-foreground">{c.email}</td>
                    <td className="p-3"><Badge variant="outline">{c.client_type}</Badge></td>
                    <td className="p-3">{c.nationality}</td>
                    <td className="p-3">
                      <Link href={`/clients/${c.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      {loading ? 'Chargement...' : 'Aucun client trouvé'}
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
