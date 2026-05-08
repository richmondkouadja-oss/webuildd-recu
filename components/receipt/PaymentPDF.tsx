'use client';

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatCFA, formatDate } from '@/lib/utils/formatters';

const RED = '#002255';
const GRAY = '#374151';
const LIGHT = '#F9FAFB';
const ORANGE = '#FF6600';


const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: GRAY, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: ORANGE, paddingBottom: 12, marginBottom: 20 },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: RED },
  companyInfo: { fontSize: 8, color: GRAY, marginTop: 2 },
  logoImage: { width: 100, height: 36, objectFit: 'contain' },
  title: { textAlign: 'center', fontSize: 15, fontFamily: 'Helvetica-Bold', color: RED, marginBottom: 6, textTransform: 'uppercase' },
  subtitle: { textAlign: 'center', fontSize: 9, color: GRAY, marginBottom: 16 },
  metaRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  metaBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 8, flex: 1 },
  metaLabel: { fontSize: 7, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: GRAY },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  infoBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 90, fontSize: 9, color: '#6B7280' },
  value: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GRAY },
  amountBox: { backgroundColor: '#F3F4F6', borderRadius: 6, padding: 18, alignItems: 'center', marginVertical: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  amountLabel: { fontSize: 8, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  amountValue: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: GRAY },
  amountWords: { fontSize: 9, fontStyle: 'italic', color: '#6B7280', marginTop: 6, textAlign: 'center' },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', marginVertical: 8 },
  paymentMethod: { marginTop: 6, flexDirection: 'row', justifyContent: 'center' },
  methodLabel: { fontSize: 8, color: '#6B7280' },
  methodValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GRAY },
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },
  signatureBlock: { width: '42%', alignItems: 'center' },
  signatureLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 36, color: GRAY },
  signatureLine: { width: '100%', borderBottomWidth: 0.8, borderBottomColor: '#9CA3AF', marginBottom: 4 },
  signatureName: { fontSize: 8, color: '#6B7280' },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40, textAlign: 'center', fontSize: 7, color: '#9CA3AF', borderTopWidth: 0.5, borderTopColor: '#E5E7EB', paddingTop: 8 },
});

const METHOD_LABELS: Record<string, string> = {
  espèces: 'Espèces', virement: 'Virement bancaire',
  chèque: 'Chèque', mobile_money: 'Mobile Money', autre: 'Autre',
};

interface PaymentPDFProps {
  payment: { id: string; payment_date: string; amount: number; amount_words: string; payment_method: string; reference: string | null; notes: string | null; };
  receipt: { receipt_number: string; receipt_date: string; property_type: string; lotissement_name: string | null; localisation_quartier: string | null; localisation_commune: string | null; localisation_ville: string | null; property_description: string | null; total_amount: number; amount_paid: number; amount_due: number; quantity: number; unit_price: number; receipt_lots?: { ilot_number: string; lot_number: string }[]; };
  client: { full_name: string; phone_whatsapp: string; email: string | null; };
  paymentIndex: number;
  totalPayments: number;
}

export default function PaymentPDF({ payment, receipt, client, paymentIndex, totalPayments }: PaymentPDFProps) {
  const bienLabel = receipt.property_type === 'motif'
    ? (receipt.property_description || 'Motif')
    : receipt.lotissement_name ||
      [receipt.localisation_quartier, receipt.localisation_commune, receipt.localisation_ville].filter(Boolean).join(', ') ||
      receipt.property_type;

  const lots = receipt.receipt_lots || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyName}>WEBUILDD FONCIER & IMMOBILIER</Text>
            <Text style={styles.companyInfo}>Marcory Zone 4 — Immeuble Z4, Abidjan, Côte d'Ivoire</Text>
            <Text style={styles.companyInfo}>Tél : +225 07 16 00 00 76 | 07 13 33 33 69</Text>
            <Text style={styles.companyInfo}>serviceclient@webuildd-ci.com</Text>
          </View>
          <Image style={styles.logoImage} src="/logoW.png" />
        </View>

        <Text style={styles.title}>Reçu de Versement</Text>
        <Text style={styles.subtitle}>Versement {paymentIndex}/{totalPayments} — Reçu N° {receipt.receipt_number}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>N° Reçu principal</Text>
            <Text style={styles.metaValue}>{receipt.receipt_number}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Date du versement</Text>
            <Text style={styles.metaValue}>{formatDate(payment.payment_date)}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Mode de paiement</Text>
            <Text style={styles.metaValue}>{METHOD_LABELS[payment.payment_method] || payment.payment_method}</Text>
          </View>
          {payment.reference && (
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Référence</Text>
              <Text style={styles.metaValue}>{payment.reference}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.infoBox}>
            <View style={styles.row}><Text style={styles.label}>Nom :</Text><Text style={styles.value}>{client.full_name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Téléphone :</Text><Text style={styles.value}>{client.phone_whatsapp}</Text></View>
            {client.email && <View style={styles.row}><Text style={styles.label}>Email :</Text><Text style={styles.value}>{client.email}</Text></View>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bien concerné</Text>
          <View style={styles.infoBox}>
            <View style={styles.row}><Text style={styles.label}>Type :</Text><Text style={styles.value}>{receipt.property_type === 'terrain' ? 'Terrain' : receipt.property_type === 'maison' ? 'Maison' : 'Autre'}</Text></View>
            {bienLabel && <View style={styles.row}><Text style={styles.label}>Désignation :</Text><Text style={styles.value}>{bienLabel}</Text></View>}
            {lots.length > 0 && <View style={styles.row}><Text style={styles.label}>Lots :</Text><Text style={styles.value}>{lots.map(l => `Îlot ${l.ilot_number} / Lot ${l.lot_number}`).join(' · ')}</Text></View>}
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.label}>Montant total :</Text><Text style={styles.value}>{formatCFA(receipt.total_amount)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Déjà versé :</Text><Text style={[styles.value, { color: '#059669' }]}>{formatCFA(receipt.amount_paid)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Reste dû :</Text><Text style={[styles.value, { color: receipt.amount_due > 0 ? '#DC2626' : '#059669' }]}>{receipt.amount_due > 0 ? formatCFA(receipt.amount_due) : '✓ Soldé'}</Text></View>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Somme versée</Text>
          <Text style={styles.amountValue}>{formatCFA(payment.amount)}</Text>
          {payment.amount_words && <Text style={styles.amountWords}>{payment.amount_words}</Text>}
          <View style={[styles.divider, { width: '60%', marginTop: 10 }]} />
          <View style={styles.paymentMethod}>
            <Text style={styles.methodLabel}>Mode : </Text>
            <Text style={styles.methodValue}>{METHOD_LABELS[payment.payment_method] || payment.payment_method}</Text>
          </View>
          {payment.reference && (
            <View style={styles.paymentMethod}>
              <Text style={styles.methodLabel}>Référence : </Text>
              <Text style={styles.methodValue}>{payment.reference}</Text>
            </View>
          )}
        </View>

        {payment.notes && (
          <View style={[styles.section, { marginTop: 4 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 9, color: GRAY, fontStyle: 'italic' }}>{payment.notes}</Text>
          </View>
        )}

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Signature du Client</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{client.full_name}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Signature du Service Comptable</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>WEBUILDD F&I</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>WEBUILDD Foncier & Immobilier — DG : F.W. WEGUI | Document officiel — Conservez ce reçu</Text>
        </View>
      </Page>
    </Document>
  );
}