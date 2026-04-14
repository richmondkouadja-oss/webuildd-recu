'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError('');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setError('Email ou mot de passe incorrect');
    setLoading(false);
    return;
  }

  // Attendre que la session soit bien enregistrée
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  window.location.href = '/';
}

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl">
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="mx-auto w-20 h-20 bg-[#8B1A1A] rounded-2xl flex items-center justify-center">
          <span className="text-white font-heading text-2xl font-bold">W</span>
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1A1A1A]">WEBUILDD</h1>
          <p className="text-sm text-muted-foreground">Foncier & Immobilier</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
          <Button type="submit" className="w-full bg-[#8B1A1A] hover:bg-[#6B1414]" disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
