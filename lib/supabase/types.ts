export type Role = 'super_admin' | 'comptable' | 'commercial' | 'lecteur';
export type PropertyType = 'terrain' | 'maison' | 'motif';
export type ReceiptStatus = 'partiel' | 'soldé' | 'annulé';
export type LotStatus = 'disponible' | 'réservé' | 'vendu' | 'en_cours';
export type ClientType = 'Particulier' | 'Entreprise' | 'Diaspora';
export type SendChannel = 'whatsapp' | 'email' | 'download' | 'print';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone_whatsapp: string;
  email: string;
  nationality: string;
  address: string | null;
  client_type: ClientType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  name: string;
  city: string;
  commune: string | null;
  quartier: string | null;
  created_at: string;
}

export interface Lot {
  id: string;
  site_id: string;
  lot_number: string;
  ilot_number: string;
  superficie: number;
  unit_price: number;
  status: LotStatus;
  title_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  site?: Site;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  property_type: PropertyType;
  superficie: number | null;
  localisation_quartier: string | null;
  localisation_commune: string | null;
  localisation_ville: string | null;
  lotissement_name: string | null;
  property_description: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  amount_paid_words: string;
  status: ReceiptStatus;
  cancel_reason: string | null;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  client?: Client;
  receipt_lots?: ReceiptLot[];
}

export interface ReceiptLot {
  id: string;
  receipt_id: string;
  lot_id: string | null;
  ilot_number: string;
  lot_number: string;
  superficie: number | null;
  display_order: number;
}

export interface ReceiptSend {
  id: string;
  receipt_id: string;
  channel: SendChannel;
  recipient: string | null;
  sent_at: string;
  sent_by: string | null;
}
