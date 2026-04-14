import { z } from 'zod';

const lotLineSchema = z.object({
  ilot_number: z.string().min(1, 'N° îlot requis'),
  lot_number: z.string().min(1, 'N° lot requis'),
  superficie: z.number().optional(),
});

export const receiptSchema = z.object({
  receipt_date: z.string().min(1, 'Date requise'),

  // Client
  client_id: z.string().optional(),
  client_name: z.string().min(1, 'Nom du client requis'),
  client_phone: z.string().min(8, 'Numéro de téléphone invalide'),
  client_email: z.string().email('Email invalide'),

  // Bien
  property_type: z.enum(['terrain', 'maison']),
  superficie: z.number().positive('Superficie requise').optional(),
  localisation_quartier: z.string().optional(),
  localisation_commune: z.string().optional(),
  localisation_ville: z.string().optional(),
  lotissement_name: z.string().optional(),
  property_description: z.string().optional(),

  // Lots (terrain only)
  quantity: z.number().int().min(1).max(20).default(1),
  lots: z.array(lotLineSchema).optional(),

  // Finance
  unit_price: z.number().positive('Prix unitaire requis'),
  amount_paid: z.number().min(0, 'Montant versé requis'),
}).refine(
  (data) => {
    if (data.property_type === 'terrain') {
      return !!data.localisation_quartier && !!data.localisation_commune && !!data.localisation_ville;
    }
    return true;
  },
  { message: 'Localisation complète requise pour un terrain', path: ['localisation_quartier'] }
).refine(
  (data) => {
    if (data.property_type === 'maison') {
      return !!data.property_description;
    }
    return true;
  },
  { message: 'Description requise pour une maison', path: ['property_description'] }
).refine(
  (data) => {
    const total = data.unit_price * (data.quantity || 1);
    return data.amount_paid <= total;
  },
  { message: 'La somme versée ne peut pas dépasser le montant total', path: ['amount_paid'] }
);

export type ReceiptFormData = z.infer<typeof receiptSchema>;

export const clientSchema = z.object({
  full_name: z.string().min(1, 'Nom requis'),
  phone_whatsapp: z.string().min(8, 'Téléphone requis'),
  email: z.string().email('Email invalide'),
  nationality: z.string().default('Ivoirienne'),
  address: z.string().optional(),
  client_type: z.enum(['Particulier', 'Entreprise', 'Diaspora']).default('Particulier'),
});

export type ClientFormData = z.infer<typeof clientSchema>;

export const lotSchema = z.object({
  site_id: z.string().min(1, 'Site requis'),
  lot_number: z.string().min(1, 'N° lot requis'),
  ilot_number: z.string().min(1, 'N° îlot requis'),
  superficie: z.number().positive('Superficie requise'),
  unit_price: z.number().positive('Prix requis'),
  status: z.enum(['disponible', 'réservé', 'vendu', 'en_cours']).default('disponible'),
  title_type: z.string().optional(),
  notes: z.string().optional(),
});

export type LotFormData = z.infer<typeof lotSchema>;
