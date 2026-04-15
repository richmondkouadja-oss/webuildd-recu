"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { numberToWordsFr } from "@/lib/utils/numberToWords";
import { formatCFA } from "@/lib/utils/formatters";
import LotTable, { type LotLine } from "./LotTable";
import ReceiptPreview from "./ReceiptPreview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  User,
  Home,
  DollarSign,
  PenLine,
  Eye,
  CheckCircle,
  Download,
  MessageCircle,
  Mail,
  Printer,
  Search,
  UserPlus,
  ChevronRight,
  Check,
} from "lucide-react";
import type { Client, Site } from "@/lib/supabase/types";

interface ReceiptFormValues {
  receipt_date: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  property_type: "terrain" | "maison";
  superficie: string;
  localisation_quartier: string;
  localisation_commune: string;
  localisation_ville: string;
  lotissement_name: string;
  property_description: string;
  quantity: number;
  unit_price: string;
  amount_paid: string;
}

const STEPS = [
  { id: 1, label: "En-tête", icon: FileText },
  { id: 2, label: "Client", icon: User },
  { id: 3, label: "Bien", icon: Home },
  { id: 4, label: "Finance", icon: DollarSign },
  { id: 5, label: "Signatures", icon: PenLine },
];

export default function ReceiptForm() {
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ReceiptFormValues>({
    defaultValues: {
      receipt_date: new Date().toISOString().split("T")[0],
      property_type: "terrain",
      quantity: 1,
      client_name: "",
      client_phone: "",
      client_email: "",
      superficie: "",
      localisation_quartier: "",
      localisation_commune: "",
      localisation_ville: "",
      lotissement_name: "",
      property_description: "",
      unit_price: "",
      amount_paid: "",
    },
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [lots, setLots] = useState<LotLine[]>([
    { ilot_number: "", lot_number: "" },
  ]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<{
    id: string;
    receipt_number: string;
    pdf_url: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const propertyType = watch("property_type");
  const quantity = watch("quantity");
  const unitPriceRaw = watch("unit_price");
  const amountPaidRaw = watch("amount_paid");

  const unitPrice = Number(String(unitPriceRaw).replace(/[^\d]/g, "")) || 0;
  const amountPaid = Number(String(amountPaidRaw).replace(/[^\d]/g, "")) || 0;
  const totalAmount = unitPrice * (quantity || 1);
  const amountDue = totalAmount - amountPaid;
  const amountPaidWords = amountPaid > 0 ? numberToWordsFr(amountPaid) : "";

  useEffect(() => {
    loadClients();
    loadSites();
  }, []);

  useEffect(() => {
    if (quantity > lots.length) {
      const newLots = [...lots];
      for (let i = lots.length; i < quantity; i++) {
        newLots.push({ ilot_number: "", lot_number: "" });
      }
      setLots(newLots);
    }
  }, [quantity]);

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("full_name");
    if (data) setClients(data);
  }

  async function loadSites() {
    const { data } = await supabase.from("sites").select("*").order("name");
    if (data) setSites(data);
  }

  function selectClient(client: Client) {
    setValue("client_name", client.full_name);
    setValue("client_phone", client.phone_whatsapp);
    setValue("client_email", client.email);
    setShowClientSearch(false);
    setClientSearch("");
  }

  const filteredClients = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone_whatsapp.includes(clientSearch),
  );

  function formatNumberInput(value: string): string {
    const num = value.replace(/[^\d]/g, "");
    if (!num) return "";
    return new Intl.NumberFormat("fr-FR").format(Number(num));
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
      superficie: Number(String(values.superficie).replace(/[^\d]/g, "")) || 0,
    };
  }

  async function onSubmit(data: ReceiptFormValues) {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: receiptNum } = await supabase.rpc(
        "generate_receipt_number",
      );

      const receiptData = {
        receipt_number:
          receiptNum ||
          `WFI-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
        receipt_date: data.receipt_date,
        client_name: data.client_name,
        client_phone: data.client_phone,
        client_email: data.client_email,
        property_type: data.property_type,
        superficie:
          Number(String(data.superficie).replace(/[^\d]/g, "")) || null,
        localisation_quartier: data.localisation_quartier || null,
        localisation_commune: data.localisation_commune || null,
        localisation_ville: data.localisation_ville || null,
        lotissement_name: data.lotissement_name || null,
        property_description: data.property_description || null,
        quantity: quantity || 1,
        unit_price: unitPrice,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        amount_due: amountDue,
        amount_paid_words: amountPaidWords,
        status: amountDue <= 0 ? "soldé" : "partiel",
        created_by: user?.id || null,
      };

      if (data.client_name) {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("full_name", data.client_name)
          .single();
        if (existingClient) {
          Object.assign(receiptData, { client_id: existingClient.id });
        }
      }

      const { data: receipt, error } = await supabase
        .from("receipts")
        .insert(receiptData)
        .select()
        .single();

      if (error) throw error;

      if (data.property_type === "terrain" && lots.length > 0) {
        const lotRows = lots
          .filter((l) => l.ilot_number || l.lot_number)
          .map((l, i) => ({
            receipt_id: receipt.id,
            ilot_number: l.ilot_number,
            lot_number: l.lot_number,
            superficie: l.superficie || null,
            display_order: i + 1,
          }));
        if (lotRows.length > 0) {
          await supabase.from("receipt_lots").insert(lotRows);
        }
      }

      try {
        const res = await fetch("/api/pdf/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiptId: receipt.id }),
        });
        if (res.ok) {
          const { pdf_url } = await res.json();
          await supabase
            .from("receipts")
            .update({ pdf_url })
            .eq("id", receipt.id);
          receipt.pdf_url = pdf_url;
        }
      } catch {
        // PDF generation is non-blocking
      }

      setSavedReceipt({
        id: receipt.id,
        receipt_number: receipt.receipt_number,
        pdf_url: receipt.pdf_url || "",
      });
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création du reçu");
    } finally {
      setSaving(false);
    }
  }

  function sendWhatsApp() {
    if (!savedReceipt) return;
    const phone = watch("client_phone").replace(/[\s+\-()]/g, "");
    const message = encodeURIComponent(
      `Bonjour, veuillez trouver ci-joint votre reçu de paiement N° ${savedReceipt.receipt_number}.\n\n` +
        `${savedReceipt.pdf_url ? `Téléchargez votre reçu : ${savedReceipt.pdf_url}\n\n` : ""}` +
        `WEBUILDD FONCIER & IMMOBILIER\nMarcory Zone 4 — Abidjan`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    supabase.from("receipt_sends").insert({
      receipt_id: savedReceipt.id,
      channel: "whatsapp",
      recipient: phone,
    });
  }

  async function sendEmail() {
    if (!savedReceipt) return;
    try {
      await fetch("/api/recus/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId: savedReceipt.id }),
      });
      alert("Email envoyé avec succès");
    } catch {
      alert("Erreur lors de l'envoi de l'email");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stepper */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div
                key={s.id}
                className="flex items-center flex-1 last:flex-none"
              >
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                    transition-all duration-200
                    ${
                      done
                        ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-200"
                        : active
                          ? "bg-red-600 text-white shadow-sm shadow-red-200"
                          : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                    }
                  `}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:block leading-none ${active ? "text-red-600" : done ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 self-center transition-colors ${done ? "bg-emerald-200" : "bg-slate-200"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1 — En-tête */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  En-tête du reçu
                </h2>
                <p className="text-xs text-slate-400">
                  Informations générales du document
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  N° Reçu
                </Label>
                <Input
                  disabled
                  placeholder="Sera généré automatiquement"
                  className="bg-slate-50 border-slate-200 text-slate-400 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Date du reçu
                </Label>
                <Input
                  type="date"
                  {...register("receipt_date", { required: true })}
                  className="border-slate-200 focus:border-red-300 text-sm max-w-xs"
                />
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Client */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <User className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Informations client
                </h2>
                <p className="text-xs text-slate-400">
                  Sélectionnez ou saisissez les coordonnées
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Client search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher un client existant..."
                    className="pl-9 border-slate-200 bg-slate-50 text-sm"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientSearch(true);
                    }}
                    onFocus={() => setShowClientSearch(true)}
                  />
                  {showClientSearch && clientSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto mt-1">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectClient(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-slate-800">
                            {c.full_name}
                          </span>
                          <span className="text-slate-400 ml-2 text-xs">
                            {c.phone_whatsapp}
                          </span>
                        </button>
                      ))}
                      {filteredClients.length === 0 && (
                        <p className="px-4 py-3 text-sm text-slate-400">
                          Aucun client trouvé
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 whitespace-nowrap"
                >
                  <UserPlus className="h-4 w-4" />
                  Nouveau
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">
                    Nom et prénoms <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register("client_name", { required: "Nom requis" })}
                    className="border-slate-200 focus:border-red-300 text-sm"
                  />
                  {errors.client_name && (
                    <p className="text-xs text-red-500">
                      {errors.client_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">
                    Téléphone WhatsApp <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register("client_phone", {
                      required: "Téléphone requis",
                    })}
                    placeholder="+225 XX XX XX XX XX"
                    className="border-slate-200 focus:border-red-300 text-sm"
                  />
                  {errors.client_phone && (
                    <p className="text-xs text-red-500">
                      {errors.client_phone.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  {...register("client_email", { required: "Email requis" })}
                  className="border-slate-200 focus:border-red-300 text-sm"
                />
                {errors.client_email && (
                  <p className="text-xs text-red-500">
                    {errors.client_email.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Bien */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Home className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Bien acheté
                </h2>
                <p className="text-xs text-slate-400">
                  Type et caractéristiques du bien
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Toggle */}
              <Controller
                control={control}
                name="property_type"
                render={({ field }) => (
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    {(["terrain", "maison"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => field.onChange(type)}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                          field.value === type
                            ? "bg-white text-red-700 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              />

              {propertyType === "terrain" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Superficie (m²)
                    </Label>
                    <Input
                      {...register("superficie")}
                      placeholder="Ex: 400"
                      className="border-slate-200 focus:border-red-300 text-sm max-w-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Quartier", name: "localisation_quartier" },
                      { label: "Commune", name: "localisation_commune" },
                      { label: "Ville", name: "localisation_ville" },
                    ].map((f) => (
                      <div key={f.name} className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700">
                          {f.label}
                        </Label>
                        <Input
                          {...register(f.name as keyof ReceiptFormValues)}
                          className="border-slate-200 focus:border-red-300 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Nom du lotissement
                    </Label>
                    <Controller
                      control={control}
                      name="lotissement_name"
                      render={({ field }) => (
                        <>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="border-slate-200 text-sm">
                              <SelectValue placeholder="Sélectionner un site" />
                            </SelectTrigger>
                            <SelectContent>
                              {sites.map((s) => (
                                <SelectItem key={s.id} value={s.name}>
                                  {s.name} — {s.city}
                                </SelectItem>
                              ))}
                              <SelectItem value="__other">
                                Autre (saisie libre)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {field.value === "__other" && (
                            <Input
                              className="mt-2 border-slate-200 text-sm"
                              placeholder="Nom du lotissement"
                              onChange={(e) =>
                                setValue("lotissement_name", e.target.value)
                              }
                            />
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Quantité
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setValue("quantity", Math.max(1, quantity - 1))
                        }
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-lg font-medium flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <Input
                        type="number"
                        {...register("quantity", {
                          valueAsNumber: true,
                          min: 1,
                          max: 20,
                        })}
                        className="w-16 text-center border-slate-200 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setValue("quantity", Math.min(20, quantity + 1))
                        }
                        className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-lg font-medium flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Tableau des lots
                    </Label>
                    <LotTable lots={lots} onChange={setLots} maxLots={20} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Description
                    </Label>
                    <Textarea
                      {...register("property_description")}
                      rows={3}
                      placeholder="Description du bien"
                      className="border-slate-200 text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Adresse complète
                    </Label>
                    <Input
                      {...register("localisation_quartier")}
                      placeholder="Adresse complète"
                      className="border-slate-200 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      Superficie bâtie (m²)
                    </Label>
                    <Input
                      {...register("superficie")}
                      placeholder="Optionnel"
                      className="border-slate-200 text-sm max-w-xs"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Finance */}
        {step === 4 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Éléments financiers
                </h2>
                <p className="text-xs text-slate-400">
                  Montants et conditions de paiement
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Prix unitaire (FCFA)
                </Label>
                <Controller
                  control={control}
                  name="unit_price"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(formatNumberInput(e.target.value))
                      }
                      placeholder="Ex: 6 000 000"
                      className="border-slate-200 focus:border-red-300 text-sm max-w-sm"
                    />
                  )}
                />
              </div>

              {/* Total banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">
                    Montant total
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    = Prix × {quantity || 1} lot{(quantity || 1) > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-xl font-bold text-slate-800">
                  {formatCFA(totalAmount)}
                </p>
              </div>

              {/* Amount paid — highlighted */}
              <div className="border-2 border-red-200 bg-red-50/40 rounded-xl p-4 space-y-2">
                <Label className="text-sm font-semibold text-red-700">
                  Somme versée (FCFA) <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="amount_paid"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(formatNumberInput(e.target.value))
                      }
                      placeholder="Ex: 3 000 000"
                      className="text-xl h-12 font-bold border-red-300 bg-white focus:border-red-400 focus:ring-red-200/40"
                    />
                  )}
                />
                {amountPaid > totalAmount && (
                  <p className="text-xs text-red-500">
                    La somme versée dépasse le montant total
                  </p>
                )}
                {amountPaidWords && (
                  <p className="text-xs italic text-red-600 leading-relaxed">
                    {amountPaidWords}
                  </p>
                )}
              </div>

              {/* Reste dû */}
              <div
                className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
                  amountDue > 0
                    ? "bg-red-50 border-red-200/60"
                    : "bg-emerald-50 border-emerald-200/60"
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">Reste dû</p>
                  {amountDue <= 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 mt-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Soldé
                      intégralement
                    </span>
                  )}
                </div>
                <p
                  className={`text-xl font-bold ${amountDue > 0 ? "text-red-600" : "text-emerald-600"}`}
                >
                  {formatCFA(Math.max(0, amountDue))}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Signatures */}
        {step === 5 && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <PenLine className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Signatures
                </h2>
                <p className="text-xs text-slate-400">
                  Apposition des signatures des parties
                </p>
              </div>
            </div>
            <div className="px-6 py-8">
              <div className="grid grid-cols-2 gap-10">
                {[
                  {
                    label: "Signature du Client",
                    name: watch("client_name") || "_______________",
                  },
                  {
                    label: "Signature du Service Comptable",
                    name: "WEBUILDD F&I",
                  },
                ].map((sig, i) => (
                  <div key={i} className="text-center space-y-4">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {sig.label}
                    </p>
                    <div className="h-20 border-b-2 border-dashed border-slate-300 rounded-b-none" />
                    <p className="text-xs text-slate-400">{sig.name}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Précédent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky action bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400 hidden sm:block">
            Étape {step} sur {STEPS.length}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <Eye className="h-4 w-4" />
              Aperçu PDF
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors shadow-sm shadow-red-200"
            >
              <CheckCircle className="h-4 w-4" />
              {saving ? "Création..." : "Valider & Générer"}
            </button>
          </div>
        </div>
      </form>

      {/* Preview modal */}
      {showPreview && (
        <ReceiptPreview
          data={getFormData()}
          lots={lots}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* New client modal */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">
              Nouveau client
            </DialogTitle>
          </DialogHeader>
          <NewClientForm
            onCreated={(client) => {
              selectClient(client);
              setShowNewClient(false);
              loadClients();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 pb-2">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <DialogTitle className="text-base font-semibold text-slate-800 text-center">
                Reçu créé avec succès
              </DialogTitle>
            </div>
          </DialogHeader>
          {savedReceipt && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Numéro de reçu</p>
                <p className="font-mono text-base font-bold text-slate-800">
                  {savedReceipt.receipt_number}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {savedReceipt.pdf_url && (
                  <a
                    href={savedReceipt.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200">
                      <Download className="h-4 w-4" />
                      Télécharger
                    </button>
                  </a>
                )}
                <button
                  onClick={sendWhatsApp}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={sendEmail}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200/60"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </button>
              </div>
              <button
                className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                onClick={() => router.push("/recus")}
              >
                Voir tous les reçus
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Inline new client form ────────────────────────────────────────────
function NewClientForm({ onCreated }: { onCreated: (client: Client) => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      full_name: "",
      phone_whatsapp: "",
      email: "",
      nationality: "Ivoirienne",
      client_type: "Particulier",
      address: "",
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: client, error } = await supabase
      .from("clients")
      .insert({ ...data, created_by: user?.id })
      .select()
      .single();
    setLoading(false);
    if (error) {
      alert("Erreur: " + error.message);
      return;
    }
    onCreated(client);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">
          Nom complet <span className="text-red-500">*</span>
        </Label>
        <Input
          {...register("full_name", { required: true })}
          className="border-slate-200 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">
          Téléphone WhatsApp <span className="text-red-500">*</span>
        </Label>
        <Input
          {...register("phone_whatsapp", { required: true })}
          placeholder="+225"
          className="border-slate-200 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          type="email"
          {...register("email", { required: true })}
          className="border-slate-200 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Nationalité
          </Label>
          <Input
            {...register("nationality")}
            className="border-slate-200 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Type</Label>
          <select
            {...register("client_type")}
            className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white text-slate-700 focus:outline-none focus:border-red-300"
          >
            <option value="Particulier">Particulier</option>
            <option value="Entreprise">Entreprise</option>
            <option value="Diaspora">Diaspora</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors mt-2"
      >
        {loading ? "Création..." : "Créer le client"}
      </button>
    </form>
  );
}
