"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCFA } from "@/lib/utils/formatters";
import type { Lot, Site } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Search,
  ArrowRight,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";

type LotStatus = "disponible" | "réservé" | "vendu" | "en_cours";

const STATUS_CFG: Record<LotStatus, { label: string; cls: string }> = {
  disponible: {
    label: "Disponible",
    cls: "text-emerald-700 bg-emerald-50 border-emerald-200/60",
  },
  réservé: {
    label: "Réservé",
    cls: "text-amber-700 bg-amber-50 border-amber-200/60",
  },
  vendu: { label: "Vendu", cls: "text-red-600 bg-red-50 border-red-200/60" },
  en_cours: {
    label: "En cours",
    cls: "text-blue-700 bg-blue-50 border-blue-200/60",
  },
};

const PER_PAGE_OPTIONS = [5, 10, 20, 50];

export default function LotsPage() {
  const supabase = createClient();
  const [lots, setLots] = useState<(Lot & { site?: Site })[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, siteFilter, statusFilter]);

  async function loadData() {
    const { data: sitesData } = await supabase
      .from("sites")
      .select("*")
      .order("name");
    if (sitesData) setSites(sitesData);
    const { data } = await supabase
      .from("lots")
      .select("*, site:sites(*)")
      .order("created_at", { ascending: false });
    if (data) setLots(data as (Lot & { site?: Site })[]);
  }

  const filtered = lots.filter((l) => {
    const matchSearch =
      !search ||
      l.lot_number.includes(search) ||
      l.ilot_number.includes(search);
    const matchSite = siteFilter === "all" || l.site_id === siteFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchSite && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // ── selection ──
  function toggleAll() {
    if (paginated.every((l) => selected.has(l.id)) && paginated.length > 0)
      setSelected(new Set());
    else setSelected(new Set(paginated.map((l) => l.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }
  const allChecked =
    paginated.length > 0 && paginated.every((l) => selected.has(l.id));

  // Status quick counts
  const counts = {
    disponible: lots.filter((l) => l.status === "disponible").length,
    reserve: lots.filter((l) => l.status === "réservé").length,
    en_cours: lots.filter((l) => l.status === "en_cours").length,
    vendu: lots.filter((l) => l.status === "vendu").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Catalogue des lots
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {lots.length} lot{lots.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link href="/lots/nouveau">
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-red-200">
            <PlusCircle className="h-4 w-4" />
            Nouveau lot
          </button>
        </Link>
      </div>

      {/* Status pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Disponibles",
            count: counts.disponible,
            icon: Check,
            cardBg: "bg-emerald-50",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-500",
            valueColor: "text-emerald-700",
          },
          {
            label: "Réservés",
            count: counts.reserve,
            icon: Clock,
            cardBg: "bg-amber-50",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-500",
            valueColor: "text-amber-700",
          },
          {
            label: "En cours",
            count: counts.en_cours,
            icon: AlertCircle,
            cardBg: "bg-blue-50",
            iconBg: "bg-blue-100",
            iconColor: "text-blue-500",
            valueColor: "text-blue-700",
          },
          {
            label: "Vendus",
            count: counts.vendu,
            icon: ShoppingCart,
            cardBg: "bg-red-50",
            iconBg: "bg-red-100",
            iconColor: "text-red-500",
            valueColor: "text-red-600",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`${s.cardBg} rounded-2xl p-5 shadow-sm flex items-center gap-4`}
          >
            <div
              className={`${s.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}
            >
              <s.icon className={`h-6 w-6 ${s.iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 leading-none">
                {s.label}
              </p>
              <p
                className={`text-2xl font-bold mt-1 leading-none ${s.valueColor}`}
              >
                {s.count}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="N° lot, N° îlot..."
              className="pl-9 border-slate-200 bg-slate-50 placeholder:text-slate-400 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={siteFilter}
            onValueChange={(v) => setSiteFilter(v || "all")}
          >
            <SelectTrigger className="w-[180px] border-slate-200 bg-slate-50 text-sm">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v || "all")}
          >
            <SelectTrigger className="w-[150px] border-slate-200 bg-slate-50 text-sm">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="réservé">Réservé</SelectItem>
              <SelectItem value="vendu">Vendu</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="w-12 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-red-600 cursor-pointer"
                  />
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  Site
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  N° Îlot
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  N° Lot
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  Superficie
                </th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  Prix
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  Statut
                </th>
                <th className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  Titre
                </th>
                <th className="text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide px-4 py-3.5">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((l) => {
                const st = STATUS_CFG[l.status as LotStatus];
                const isSelected = selected.has(l.id);
                return (
                  <tr
                    key={l.id}
                    className={`table-row-hover border-b border-slate-100 last:border-0 ${isSelected ? "bg-red-50/20" : ""}`}
                  >
                    <td className="w-12 px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(l.id)}
                        className="w-4 h-4 rounded border-slate-300 accent-red-600 cursor-pointer"
                      />
                    </td>

                    {/* Site */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                          <MapPin className="h-3 w-3 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-800">
                          {(l.site as Site)?.name || "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {l.ilot_number}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      {l.lot_number}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {l.superficie} m²
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-800">
                      {formatCFA(l.unit_price)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {st ? (
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">
                          {l.status}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 text-xs">
                      {l.title_type || "—"}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <Link href={`/lots/${l.id}`}>
                          <button
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center transition-colors"
                            title="Voir"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">Aucun lot trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Lignes par page</span>
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-slate-500">
              {(page - 1) * perPage + 1}–
              {Math.min(page * perPage, filtered.length)} sur {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
