'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCFA, formatDate } from '@/lib/utils/formatters';
import type { LotLine } from './LotTable';

interface ReceiptPreviewProps {
  data: Record<string, unknown>;
  lots: LotLine[];
  open: boolean;
  onClose: () => void;
}

export default function ReceiptPreview({ data, lots, open, onClose }: ReceiptPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aperçu du reçu</DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg p-6 space-y-4 text-sm bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-[#002255]">WEBUILDD FONCIER & IMMOBILIER</h2>
              <p className="text-xs text-muted-foreground">Marcory Zone 4 — Immeuble Z4</p>
              <p className="text-xs text-muted-foreground">Abidjan, Côte d&apos;Ivoire</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs">N° sera généré</p>
              <p className="text-xs">Date : {formatDate(data.receipt_date as string)}</p>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-center text-lg font-bold text-[#002255]">REÇU DE PAIEMENT</h3>

          {/* Client */}
          <div className="bg-gray-50 rounded p-3">
            <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Informations client</h4>
            <p>Nom : <strong>{data.client_name as string}</strong></p>
            <p>Tél : {data.client_phone as string} | Email : {data.client_email as string}</p>
          </div>

          {/* Property */}
          <div>
            <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Bien acquis</h4>
            <p>Type : <strong>{(data.property_type as string) === 'terrain' ? 'Terrain' : 'Maison'}</strong></p>
            {data.property_type === 'terrain' ? (
              <>
                {data.lotissement_name && <p>Lotissement : {data.lotissement_name as string}</p>}
                <p>Localisation : {[data.localisation_quartier, data.localisation_commune, data.localisation_ville].filter(Boolean).join(', ')}</p>
                {data.superficie && <p>Superficie : {data.superficie as number} m²</p>}
                {lots.some(l => l.ilot_number || l.lot_number) && (
                  <table className="w-full mt-2 border text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-1 text-left">Qté</th>
                        <th className="border p-1 text-left">N° Îlot</th>
                        <th className="border p-1 text-left">N° Lot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.filter(l => l.ilot_number || l.lot_number).map((l, i) => (
                        <tr key={i}>
                          <td className="border p-1">{i + 1}</td>
                          <td className="border p-1">{l.ilot_number}</td>
                          <td className="border p-1">{l.lot_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <>
                <p>{data.property_description as string}</p>
                {data.superficie && <p>Superficie : {data.superficie as number} m²</p>}
              </>
            )}
          </div>

          {/* Finance */}
          <div className="space-y-2">
            <p>Prix unitaire : {formatCFA(data.unit_price as number)}</p>
            <p>Montant total : <strong>{formatCFA(data.total_amount as number)}</strong></p>

            <div className="bg-gray-100 text-white rounded-lg p-4 text-center">
              <p className="text-xs uppercase tracking-wide opacity-80">Somme versée</p>
              <p className="text-2xl font-bold">{formatCFA(data.amount_paid as number)}</p>
            </div>
            {data.amount_paid_words ? (
              <p className="italic text-center text-sm">{String(data.amount_paid_words)}</p>
            ) : null}
            <p className={`text-center font-bold ${(data.amount_due as number) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Reste dû : {formatCFA(Math.max(0, data.amount_due as number))}
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t">
            <div className="text-center">
              <p className="text-xs font-medium mb-8">Signature du Client</p>
              <div className="border-b border-gray-400 mb-1" />
              <p className="text-xs">{data.client_name as string}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium mb-8">Signature du Service Comptable</p>
              <div className="border-b border-gray-400 mb-1" />
              <p className="text-xs">WEBUILDD F&I</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-muted-foreground border-t pt-3 mt-4">
            <p>WEBUILDD Foncier & Immobilier — DG : F.W. WEGUI</p>
            <p>Document officiel — Conservez ce reçu</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}