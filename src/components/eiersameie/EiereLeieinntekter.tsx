import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBelop } from '@/lib/format';
import { Eier, formatPct } from './types';

interface Props {
  aktive: Eier[];
}

export default function EiereLeieinntekter({ aktive }: Props) {
  const [liYear, setLiYear] = useState(new Date().getFullYear());
  const [liData, setLiData] = useState<{ brutto: number; oppgjor: Record<string, number> }>({ brutto: 0, oppgjor: {} });

  useEffect(() => {
    async function fetchLeieinntekter() {
      const { data } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7').eq('retning', 'inn')
        .gte('dato', `${liYear}-01-01`).lte('dato', `${liYear}-12-31`);
      const brutto = (data || []).filter(t => !t.er_oppgjor).reduce((s, t) => s + Number(t.belop), 0);
      const oppgjorTxs = (data || []).filter(t => t.er_oppgjor);
      const oppgjor: Record<string, number> = {};
      for (const t of oppgjorTxs) {
        const til = (t as any).oppgjor_til || 'Ukjent';
        oppgjor[til] = (oppgjor[til] || 0) + Number(t.belop);
      }
      const { data: utData } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7').eq('retning', 'ut')
        .gte('dato', `${liYear}-01-01`).lte('dato', `${liYear}-12-31`);
      for (const t of (utData || []).filter(t => t.er_oppgjor)) {
        const til = (t as any).oppgjor_til || 'Ukjent';
        oppgjor[til] = (oppgjor[til] || 0) + Number(t.belop);
      }
      setLiData({ brutto, oppgjor });
    }
    fetchLeieinntekter();
  }, [liYear]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fordeling av leieinntekter per eier</h2>
        <Select value={String(liYear)} onValueChange={v => setLiYear(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Eier</TableHead>
                <TableHead className="text-right">Inntektsandel</TableHead>
                <TableHead className="text-right">Brutto leieinntekt</TableHead>
                <TableHead className="text-right">Eiers andel</TableHead>
                <TableHead className="text-right">Faktisk mottatt</TableHead>
                <TableHead className="text-right">Differanse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aktive.map(e => {
                const andel = Math.round(liData.brutto * e.inntektsandel_prosent / 100);
                const mottatt = liData.oppgjor[e.navn] || 0;
                const diff = mottatt - andel;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.navn}</TableCell>
                    <TableCell className="text-right font-mono">{formatPct(e.inntektsandel_prosent)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(liData.brutto)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(andel)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(mottatt)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
                      {diff !== 0 && (diff > 0 ? '+' : '')}{formatBelop(diff)}
                      {diff < 0 && e.inntektsandel_prosent > 0 && <span className="text-xs ml-1">(lån)</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
