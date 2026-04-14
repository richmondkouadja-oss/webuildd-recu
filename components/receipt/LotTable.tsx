'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

export interface LotLine {
  ilot_number: string;
  lot_number: string;
  superficie?: number;
}

interface LotTableProps {
  lots: LotLine[];
  onChange: (lots: LotLine[]) => void;
  maxLots?: number;
}

export default function LotTable({ lots, onChange, maxLots = 20 }: LotTableProps) {
  function updateLot(index: number, field: keyof LotLine, value: string | number) {
    const updated = [...lots];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }

  function addLot() {
    if (lots.length >= maxLots) return;
    onChange([...lots, { ilot_number: '', lot_number: '' }]);
  }

  function removeLot(index: number) {
    if (lots.length <= 1) return;
    onChange(lots.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>N° Îlot</span>
        <span>N° Lot</span>
        <span></span>
      </div>
      {lots.map((lot, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            placeholder="Ex: 12"
            value={lot.ilot_number}
            onChange={(e) => updateLot(i, 'ilot_number', e.target.value)}
          />
          <Input
            placeholder="Ex: 045"
            value={lot.lot_number}
            onChange={(e) => updateLot(i, 'lot_number', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeLot(i)}
            disabled={lots.length <= 1}
            className="text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {lots.length < maxLots && (
        <Button type="button" variant="outline" size="sm" onClick={addLot} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un lot ({lots.length}/{maxLots})
        </Button>
      )}
    </div>
  );
}
