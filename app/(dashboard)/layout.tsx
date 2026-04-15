'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/types';
import {
  LayoutDashboard, FileText, Users, MapPin,
  LogOut, Menu, PlusCircle, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/recus',     label: 'Reçus',           icon: FileText },
  { href: '/clients',   label: 'Clients',          icon: Users },
  { href: '/lots',      label: 'Lots',             icon: MapPin },
];

function isNavActive(itemHref: string, pathname: string): boolean {
  if (pathname === itemHref) return true;
  if (itemHref === '/dashboard') return false;
  return pathname.startsWith(itemHref + '/');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    }
    loadProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const currentLabel =
    NAV_ITEMS.slice().reverse().find(i => isNavActive(i.href, pathname))?.label || 'WEBUILDD';

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        no-print fixed lg:static inset-y-0 left-0 z-50 w-64
        bg-white border-r border-slate-100 flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-red-200">
              <span className="text-white font-bold tracking-tight" style={{ fontSize: 15 }}>W</span>
            </div>
            <div>
              <p className="text-slate-900 font-semibold leading-none tracking-wide" style={{ fontSize: 13 }}>WEBUILDD</p>
              <p className="text-slate-400 leading-none mt-0.5" style={{ fontSize: 10 }}>Foncier & Immobilier</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compose-style CTA */}
        <div className="px-4 pb-5">
          <Link href="/recus/nouveau" onClick={() => setSidebarOpen(false)}>
            <button className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl py-3 transition-colors shadow-md shadow-red-200/60 text-sm">
              <PlusCircle className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              Nouveau reçu
            </button>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
                  transition-all duration-150
                  ${active
                    ? 'bg-red-50 text-red-700 font-semibold'
                    : 'text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800'}
                `}
              >
                <item.icon
                  className={`shrink-0 ${active ? 'text-red-600' : 'text-slate-400'}`}
                  style={{ width: 17, height: 17 }}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 pb-5 pt-4 border-t border-slate-100">
          {profile ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-default">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-semibold truncate leading-none" style={{ fontSize: 12 }}>{profile.full_name}</p>
                <p className="text-slate-400 capitalize mt-0.5 leading-none" style={{ fontSize: 10 }}>{profile.role.replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Déconnexion"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-400 hover:text-red-500 text-xs px-2 py-2 w-full transition-colors rounded-xl hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="no-print h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4 text-slate-600" />
            </button>
            <h1 className="text-sm font-semibold text-slate-800">{currentLabel}</h1>
          </div>
          {profile && (
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 leading-none">{profile.full_name}</p>
                <p className="text-[10px] text-slate-400 capitalize mt-0.5 leading-none">{profile.role.replace('_', ' ')}</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
