import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Plus, Building2, User } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { Eier, COLORS, formatPct } from './types';

interface Props {
  aktive: Eier[];
  sumEierandel: number;
  sumInntekt: number;
  sumKostnad: number;
  onOpenNew: () => void;
  onOpenEdit: (e: Eier) => void;
}

export default function EiereOversikt({ aktive, sumEierandel, sumInntekt, sumKostnad, onOpenNew, onOpenEdit }: Props) {
  const pieData = aktive.map((e, i) => ({ name: e.navn, value: e.eierandel_prosent, fill: COLORS[i % COLORS.length] }));

  return (
    <div className="space-y-6">
      {sumEierandel !== 100 && aktive.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">Eierandeler summerer til {formatPct(sumEierandel)}. Skal være 100,00 %.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{aktive.length}</div><div className="text-sm text-muted-foreground">Aktive eiere</div></CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold flex items-center gap-2">
            {formatPct(sumEierandel)}
            {Math.abs(sumEierandel - 100) < 0.01 && <Check className="h-5 w-5 text-green-600" />}
          </div>
          <div className="text-sm text-muted-foreground">Total eierandel</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{sumInntekt === 100 && sumKostnad === 100 ? <span className="text-green-600">OK</span> : <span className="text-red-600">Avvik</span>}</div>
          <div className="text-sm text-muted-foreground">Fordelingsstatus</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Eierfordeling</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name.split(' ')[0]} ${formatPct(value)}`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <ReTooltip formatter={(v: number) => formatPct(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {aktive.map((e, i) => (
            <Card key={e.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onOpenEdit(e)}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                    {e.type === 'aksjeselskap' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium">{e.navn}</div>
                    <div className="text-xs text-muted-foreground">{e.identifikator || '-'} · {e.epost || '-'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{formatPct(e.eierandel_prosent)}</div>
                  <div className="text-xs text-muted-foreground">{e.sist_endret ? `Sist endret ${e.sist_endret}` : ''}</div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button onClick={onOpenNew} variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" />Legg til eier</Button>
        </div>
      </div>
    </div>
  );
}
