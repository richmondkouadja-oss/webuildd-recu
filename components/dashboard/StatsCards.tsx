'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Calendar, AlertCircle, FileText } from 'lucide-react';
import { formatCFA } from '@/lib/utils/formatters';

interface Stats {
  totalEncaisse: number;
  caMois: number;
  totalResteDu: number;
  recusMois: number;
}

export default function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      label: 'CA Total Encaissé',
      value: formatCFA(stats.totalEncaisse),
      icon: TrendingUp,
      color: 'text-[#16A34A]',
      bg: 'bg-green-50',
    },
    {
      label: 'CA du mois',
      value: formatCFA(stats.caMois),
      icon: Calendar,
      color: 'text-[#2563EB]',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Reste Dû',
      value: formatCFA(stats.totalResteDu),
      icon: AlertCircle,
      color: stats.totalResteDu > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]',
      bg: stats.totalResteDu > 0 ? 'bg-red-50' : 'bg-green-50',
    },
    {
      label: 'Reçus ce mois',
      value: String(stats.recusMois),
      icon: FileText,
      color: 'text-[#8B1A1A]',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
