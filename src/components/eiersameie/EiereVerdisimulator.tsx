import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Building2, User } from 'lucide-react';
import { formatBelop } from '@/lib/format';
import { Eier, COLORS, formatPct } from './types';

interface Props {
  aktive: Eier[];
  sumEierandel: number;
}

export default function EiereVerdisimulator({ aktive, sumEierandel }: Props) {
  const [totalVerdi, setTotalVerdi] = useState(17000000);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Boligens totalverdi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input type="number" value={totalVerdi} onChange={e => setTotalVerdi(Number(e.target.value))} className="w-[200px]" />
            <span className="text-muted-foreground">kr</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[5000000, 7500000, 10000000, 12500000, 15000000, 17000000, 20000000].map(v => (
              <Button key={v} variant={totalVerdi === v ? 'secondary' : 'outline'} size="sm" onClick={() => setTotalVerdi(v)}>
                {(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)} mill
              </Button>
            ))}
          </div>
          <Slider value={[totalVerdi]} onValueChange={v => setTotalVerdi(v[0])} min={1000000} max={30000000} step={100000} />
          <div className="text-sm text-muted-foreground">Verdi: {formatBelop(totalVerdi)}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {aktive.map((e, i) => {
          const verdi = Math.round(totalVerdi * e.eierandel_prosent / 100);
          return (
            <Card key={e.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {e.type === 'aksjeselskap' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  <span className="font-medium">{e.navn}</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{formatBelop(verdi)}</div>
                <div className="text-sm text-muted-foreground">{formatPct(e.eierandel_prosent)} av {formatBelop(totalVerdi)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="text-center text-lg font-semibold">
        Totalt: {formatPct(sumEierandel)} fordelt — {formatBelop(totalVerdi)}
      </div>
    </div>
  );
}
