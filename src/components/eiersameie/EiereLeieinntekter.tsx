import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBelop } from '@/lib/format';
import { Eier, formatPct } from './types';

interface Props {
  aktive: Eier[];
}

export default function EiereLeieinntekter({ aktive }: Props) {
  const [liYear, setLiYear] = useState(new Date().getFullYear());
  const [brutto, setBrutto] = useState(0);
  const [totalKostnader, setTotalKostnader] = useState(0);
  const [oppgjor, setOppgjor] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      // Hent alle E7-transaksjoner for året
      const { data } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7')
        .gte('dato', `${liYear}-01-01`).lte('dato', `${liYear}-12-31`);

      const txs = data || [];
      const realTxs = txs.filter(t => !t.er_oppgjor);

      // Brutto leieinntekter (inn, ikke oppgjør)
      const bruttoSum = realTxs.filter(t => t.retning === 'inn').reduce((s, t) => s + Number(t.belop), 0);
      setBrutto(bruttoSum);

      // Totale kostnader (ut, ikke oppgjør)
      const kostnaderSum = realTxs.filter(t => t.retning === 'ut').reduce((s, t) => s + Number(t.belop), 0);
      setTotalKostnader(kostnaderSum);

      // Oppgjør per eier (faktisk utbetalt)
      const oppgjorMap: Record<string, number> = {};
      for (const t of txs.filter(t => t.er_oppgjor)) {
        const til = (t as any).oppgjor_til || 'Ukjent';
        oppgjorMap[til] = (oppgjorMap[til] || 0) + Number(t.belop);
      }
      setOppgjor(oppgjorMap);
    }
    fetchData();
  }, [liYear]);

  const netto = brutto - totalKostnader;

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

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{formatBelop(brutto)}</div>
          <div className="text-sm text-muted-foreground">Leieinntekter</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-red-600">{formatBelop(totalKostnader)}</div>
          <div className="text-sm text-muted-foreground">Kostnader</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className={`text-2xl font-bold ${netto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBelop(netto)}</div>
          <div className="text-sm text-muted-foreground">Resultat</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Eier</TableHead>
                <TableHead className="text-right">Andel</TableHead>
                <TableHead className="text-right">Andel av inntekter</TableHead>
                <TableHead className="text-right">Andel av kostnader</TableHead>
                <TableHead className="text-right">Resultat</TableHead>
                <TableHead className="text-right">Faktisk mottatt</TableHead>
                <TableHead className="text-right">Differanse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aktive.map(e => {
                const inntektAndel = Math.round(brutto * e.inntektsandel_prosent / 100);
                const kostnadAndel = Math.round(totalKostnader * e.kostnadsandel_prosent / 100);
                const nettoAndel = inntektAndel - kostnadAndel;
                const mottatt = oppgjor[e.navn] || 0;
                const diff = mottatt - nettoAndel;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.navn}</TableCell>
                    <TableCell className="text-right font-mono">{formatPct(e.inntektsandel_prosent)}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatBelop(inntektAndel)}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{formatBelop(kostnadAndel)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${nettoAndel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatBelop(nettoAndel)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(mottatt)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
                      {diff !== 0 && (diff > 0 ? '+' : '')}{formatBelop(diff)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Totalt</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-mono font-bold text-green-600">{formatBelop(brutto)}</TableCell>
                <TableCell className="text-right font-mono font-bold text-red-600">{formatBelop(totalKostnader)}</TableCell>
                <TableCell className={`text-right font-mono font-bold ${netto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBelop(netto)}</TableCell>
                <TableCell className="text-right font-mono font-bold">{formatBelop(Object.values(oppgjor).reduce((s, v) => s + v, 0))}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            «Faktisk mottatt» hentes fra oppgjørstransaksjoner (transaksjoner merket som oppgjør med mottaker-eier).
            Differanse viser avvik mellom netto andel og faktisk utbetalt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
