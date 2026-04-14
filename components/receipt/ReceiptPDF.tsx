'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { Receipt, ReceiptLot } from '@/lib/supabase/types';

const WEBUILDD_RED = '#8B1A1A';
const GRAY_DARK = '#1A1A1A';
const GRAY_LIGHT = '#F5F5F5';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: GRAY_DARK,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: WEBUILDD_RED,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: WEBUILDD_RED,
  },
  companyInfo: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 2,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: WEBUILDD_RED,
    marginVertical: 12,
  },
  receiptInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 1,
  },
  clientBox: {
    backgroundColor: GRAY_LIGHT,
    padding: 10,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 80,
    fontSize: 9,
    color: '#6B7280',
  },
  value: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: GRAY_LIGHT,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  financeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountPaidBox: {
    backgroundColor: WEBUILDD_RED,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginVertical: 10,
  },
  amountPaidLabel: {
    fontSize: 9,
    color: '#FFFFFF',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  amountPaidValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  amountWords: {
    textAlign: 'center',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  resteDu: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  signatureBlock: {
    width: '40%',
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 40,
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#9CA3AF',
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: '#9CA3AF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
});

interface ReceiptPDFProps {
  receipt: Receipt;
  lots: ReceiptLot[];
}

export default function ReceiptPDF({ receipt, lots }: ReceiptPDFProps) {
  const amountDueColor = receipt.amount_due > 0 ? '#DC2626' : '#16A34A';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>WEBUILDD FONCIER & IMMOBILIER</Text>
            <Text style={styles.companyInfo}>Marcory Zone 4 — Immeuble Z4</Text>
            <Text style={styles.companyInfo}>Abidjan, Côte d&apos;Ivoire</Text>
            <Text style={styles.companyInfo}>Tél : +225 07 07 07 07 07 | info@webuildd.ci</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>N° {receipt.receipt_number}</Text>
            <Text style={{ fontSize: 9, marginTop: 2 }}>Date : {formatDate(receipt.receipt_date)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>REÇU DE PAIEMENT</Text>

        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Client</Text>
          <View style={styles.clientBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Nom :</Text>
              <Text style={styles.value}>{receipt.client_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tél :</Text>
              <Text style={styles.value}>{receipt.client_phone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email :</Text>
              <Text style={styles.value}>{receipt.client_email}</Text>
            </View>
          </View>
        </View>

        {/* Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bien Acquis</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type :</Text>
            <Text style={styles.value}>{receipt.property_type === 'terrain' ? 'Terrain' : 'Maison'}</Text>
          </View>
          {receipt.lotissement_name && (
            <View style={styles.row}>
              <Text style={styles.label}>Lotissement :</Text>
              <Text style={styles.value}>{receipt.lotissement_name}</Text>
            </View>
          )}
          {receipt.localisation_quartier && (
            <View style={styles.row}>
              <Text style={styles.label}>Localisation :</Text>
              <Text style={styles.value}>
                {[receipt.localisation_quartier, receipt.localisation_commune, receipt.localisation_ville].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {receipt.superficie && (
            <View style={styles.row}>
              <Text style={styles.label}>Superficie :</Text>
              <Text style={styles.value}>{receipt.superficie} m²</Text>
            </View>
          )}
          {receipt.property_description && (
            <View style={styles.row}>
              <Text style={styles.label}>Description :</Text>
              <Text style={styles.value}>{receipt.property_description}</Text>
            </View>
          )}

          {/* Lots table */}
          {lots.length > 0 && (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellHeader, { maxWidth: 40 }]}>Qté</Text>
                <Text style={styles.tableCellHeader}>N° Îlot</Text>
                <Text style={styles.tableCellHeader}>N° Lot</Text>
              </View>
              {lots.map((lot, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { maxWidth: 40 }]}>{i + 1}</Text>
                  <Text style={styles.tableCell}>{lot.ilot_number}</Text>
                  <Text style={styles.tableCell}>{lot.lot_number}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Finance */}
        <View style={styles.section}>
          <View style={styles.financeLine}>
            <Text>Prix unitaire :</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCFA(receipt.unit_price)}</Text>
          </View>
          <View style={styles.financeLine}>
            <Text>Montant total :</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCFA(receipt.total_amount)}</Text>
          </View>
        </View>

        {/* Amount paid - HIGHLIGHTED */}
        <View style={styles.amountPaidBox}>
          <Text style={styles.amountPaidLabel}>Somme Versée</Text>
          <Text style={styles.amountPaidValue}>{formatCFA(receipt.amount_paid)}</Text>
        </View>
        <Text style={styles.amountWords}>{receipt.amount_paid_words}</Text>

        {/* Amount due */}
        <Text style={[styles.resteDu, { color: amountDueColor }]}>
          Reste dû : {formatCFA(receipt.amount_due)}
        </Text>

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Signature du Client</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{receipt.client_name}</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Signature du Service Comptable</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>WEBUILDD F&I</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>WEBUILDD Foncier & Immobilier — DG : F.W. WEGUI</Text>
          <Text>Document officiel — Conservez ce reçu</Text>
        </View>
      </Page>
    </Document>
  );
}
