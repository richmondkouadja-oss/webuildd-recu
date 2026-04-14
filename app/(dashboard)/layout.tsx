'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/types';
import {
  LayoutDashboard,
  FileText,
  Users,
  MapPin,
  LogOut,
  Menu,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/recus', label: 'Reçus', icon: FileText },
  { href: '/recus/nouveau', label: 'Nouveau reçu', icon: PlusCircle },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/lots', label: 'Lots', icon: MapPin },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    }
    loadProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-[#0F0F0F] text-white flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B1A1A] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-heading text-lg font-bold">W</span>
            </div>
            <div>
              <h2 className="font-heading text-sm font-bold leading-tight">WEBUILDD</h2>
              <p className="text-[11px] text-gray-400">Foncier & Immobilier</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#8B1A1A] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#2A2A2A]">
          {profile && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#8B1A1A] flex items-center justify-center text-xs font-bold">
                {profile.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name}</p>
                <p className="text-[11px] text-gray-400 capitalize">{profile.role.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-6 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block">
            <h1 className="font-heading text-lg font-semibold">
              {NAV_ITEMS.find(i => i.href === pathname)?.label || 'WEBUILDD'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {profile && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {profile.full_name}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}