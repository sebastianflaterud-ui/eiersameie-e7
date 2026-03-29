import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBelop } from '@/lib/format';
import { Eier, formatPct } from './types';

const MAANEDER = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

interface Props {
  aktive: Eier[];
}

interface TxData {
  dato: string;
  belop: number;
  retning: string;
  er_oppgjor: boolean | null;
  oppgjor_til: string | null;
}

export default function EiereLeieinntekter({ aktive }: Props) {
  const [liYear, setLiYear] = useState(new Date().getFullYear());
  const [txs, setTxs] = useState<TxData[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('transaksjoner').select('dato, belop, retning, er_oppgjor, oppgjor_til')
        .eq('kategori', 'Eiersameie E7')
        .gte('dato', `${liYear}-01-01`).lte('dato', `${liYear}-12-31`);
      setTxs((data || []) as TxData[]);
    }
    fetchData();
  }, [liYear]);

  const realTxs = useMemo(() => txs.filter(t => !t.er_oppgjor), [txs]);
  const brutto = useMemo(() => realTxs.filter(t => t.retning === 'inn').reduce((s, t) => s + Number(t.belop), 0), [realTxs]);
  const totalKostnader = useMemo(() => realTxs.filter(t => t.retning === 'ut').reduce((s, t) => s + Number(t.belop), 0), [realTxs]);
  const netto = brutto - totalKostnader;

  const oppgjor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txs.filter(t => t.er_oppgjor)) {
      const til = t.oppgjor_til || 'Ukjent';
      map[til] = (map[til] || 0) + Number(t.belop);
    }
    return map;
  }, [txs]);

  // Månedsdata: { [måned 0-11]: { inntekter, kostnader } }
  const maanedsData = useMemo(() => {
    const data: { inntekter: number; kostnader: number }[] = Array.from({ length: 12 }, () => ({ inntekter: 0, kostnader: 0 }));
    for (const t of realTxs) {
      const mnd = new Date(t.dato).getMonth();
      if (t.retning === 'inn') data[mnd].inntekter += Number(t.belop);
      else data[mnd].kostnader += Number(t.belop);
    }
    return data;
  }, [realTxs]);

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

      {/* Årsoversikt per eier */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Eier</TableHead>
                <TableHead className="text-right">Andel</TableHead>
                <TableHead className="text-right">Inntekter</TableHead>
                <TableHead className="text-right">Kostnader</TableHead>
                <TableHead className="text-right">Resultat</TableHead>
                <TableHead className="text-right">Mottatt</TableHead>
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
            «Mottatt» hentes fra oppgjørstransaksjoner. Differanse viser avvik mellom resultat og faktisk utbetalt.
          </p>
        </CardContent>
      </Card>

      {/* Måned for måned */}
      <Card>
        <CardHeader><CardTitle>Måned for måned</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2}>Måned</TableHead>
                <TableHead rowSpan={2} className="text-right">Inntekter</TableHead>
                <TableHead rowSpan={2} className="text-right">Kostnader</TableHead>
                <TableHead colSpan={aktive.length} className="text-center border-b-0 text-xs text-muted-foreground">Resultat per eier</TableHead>
                <TableHead rowSpan={2} className="text-right">Totalt</TableHead>
              </TableRow>
              <TableRow>
                {aktive.map(e => (
                  <TableHead key={e.id} className="text-right text-xs">{e.navn.split(' ')[0]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MAANEDER.map((mnd, i) => {
                const d = maanedsData[i];
                const resultat = d.inntekter - d.kostnader;
                const harData = d.inntekter > 0 || d.kostnader > 0;
                return (
                  <TableRow key={i} className={!harData ? 'opacity-40' : ''}>
                    <TableCell className="font-medium">{mnd}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">
                      {d.inntekter > 0 ? formatBelop(d.inntekter) : '–'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">
                      {d.kostnader > 0 ? formatBelop(d.kostnader) : '–'}
                    </TableCell>
                    {aktive.map(e => {
                      const eierResultat = Math.round(d.inntekter * e.inntektsandel_prosent / 100) - Math.round(d.kostnader * e.kostnadsandel_prosent / 100);
                      return (
                        <TableCell key={e.id} className={`text-right font-mono text-sm ${!harData ? '' : eierResultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {harData ? formatBelop(eierResultat) : '–'}
                        </TableCell>
                      );
                    })}
                    <TableCell className={`text-right font-mono text-sm font-semibold ${!harData ? '' : resultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {harData ? formatBelop(resultat) : '–'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Sum</TableCell>
                <TableCell className="text-right font-mono font-bold text-green-600">{formatBelop(brutto)}</TableCell>
                <TableCell className="text-right font-mono font-bold text-red-600">{formatBelop(totalKostnader)}</TableCell>
                {aktive.map(e => {
                  const eierResultat = Math.round(brutto * e.inntektsandel_prosent / 100) - Math.round(totalKostnader * e.kostnadsandel_prosent / 100);
                  return (
                    <TableCell key={e.id} className={`text-right font-mono font-bold text-sm ${eierResultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatBelop(eierResultat)}
                    </TableCell>
                  );
                })}
                <TableCell className={`text-right font-mono font-bold ${netto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBelop(netto)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Viser hver eiers resultat (inntekter − kostnader) per måned basert på deres andel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
