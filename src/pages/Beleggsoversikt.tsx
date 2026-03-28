import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatBelop } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

interface Enhet { id: string; navn: string; status: string; boenhet: string | null; etasje: string | null; disponert_av: string | null; }
interface Leieforhold {
  id: string; leietaker_id: string; enhet_id: string; innflytting: string;
  utflytting: string | null; avtalt_leie: number; status: string;
}
interface Leietaker { id: string; navn: string; }

export default function Beleggsoversikt() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [leieforhold, setLeieforhold] = useState<Leieforhold[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [txs, setTxs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [e, lf, lt, tx] = await Promise.all([
      supabase.from('enheter').select('id, navn, status, boenhet, etasje, disponert_av').eq('aktiv', true).order('navn'),
      supabase.from('leieforhold').select('*'),
      supabase.from('leietakere').select('id, navn'),
      supabase.from('transaksjoner').select('dato, belop, enhet, leie_for, motpart_egen, motpart_bank')
        .eq('kategori', 'Eiersameie E7').eq('retning', 'inn')
        .gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`),
    ]);
    if (e.data) setEnheter(e.data as Enhet[]);
    if (lf.data) setLeieforhold(lf.data as Leieforhold[]);
    if (lt.data) setLeietakere(lt.data as Leietaker[]);
    if (tx.data) setTxs(tx.data);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const getLt = (id: string) => leietakere.find(l => l.id === id);

  const getOccupant = (enhetId: string, month: number): { leietaker: Leietaker | undefined; leie: number } | null => {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    for (const lf of leieforhold) {
      if (lf.enhet_id !== enhetId) continue;
      const inn = new Date(lf.innflytting);
      const ut = lf.utflytting ? new Date(lf.utflytting) : new Date(2099, 0, 1);
      if (inn <= monthEnd && ut >= monthStart) {
        return { leietaker: getLt(lf.leietaker_id), leie: lf.avtalt_leie };
      }
    }
    return null;
  };

  const boenheter = [...new Set(enheter.map(e => e.boenhet).filter(Boolean))] as string[];
  const utleieEnheter = enheter.filter(e => !e.disponert_av);

  const actualPerMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return txs.filter(t => parseInt(t.dato.slice(5, 7)) === m).reduce((s, t) => s + Number(t.belop), 0);
  });

  const expectedPerMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return utleieEnheter.reduce((s, e) => {
      const occ = getOccupant(e.id, m);
      return s + (occ ? occ.leie : 0);
    }, 0);
  });

  const occupiedPerMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return utleieEnheter.filter(e => getOccupant(e.id, m) !== null).length;
  });

  const totalActual = actualPerMonth.reduce((s, v) => s + v, 0);
  const avgOccupancy = utleieEnheter.length > 0 ? occupiedPerMonth.reduce((s, v) => s + v, 0) / 12 : 0;
  const avgOccPct = utleieEnheter.length > 0 ? (avgOccupancy / utleieEnheter.length) * 100 : 0;
  const ledigeEnhetsmnd = occupiedPerMonth.reduce((s, v) => s + (utleieEnheter.length - v), 0);

  const renderBoenhetSection = (boenhet: string) => {
    const boEnheter = enheter.filter(e => e.boenhet === boenhet);
    const utleie = boEnheter.filter(e => !e.disponert_av);
    const eierEnheter = boEnheter.filter(e => !!e.disponert_av);

    const boenhetExpected = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return utleie.reduce((s, e) => {
        const occ = getOccupant(e.id, m);
        return s + (occ ? occ.leie : 0);
      }, 0);
    });

    return (
      <div key={boenhet} className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">{boenhet}</h3>
        {utleie.map(e => (
          <TableRow key={e.id}>
            <TableCell className="sticky left-0 bg-background font-medium">
              {e.navn} {e.etasje && <span className="text-xs text-muted-foreground">({e.etasje})</span>}
            </TableCell>
            {Array.from({ length: 12 }, (_, i) => {
              const occ = getOccupant(e.id, i + 1);
              const firstName = occ?.leietaker?.navn?.split(' ')[0] || '';
              return (
                <TableCell key={i} className={`text-center text-xs ${occ ? 'bg-green-50 text-green-700' : 'bg-muted/30 text-muted-foreground'}`}>
                  {occ ? (
                    <Tooltip>
                      <TooltipTrigger asChild><span className="cursor-default">{firstName}</span></TooltipTrigger>
                      <TooltipContent>
                        <p>{occ.leietaker?.navn}</p>
                        <p className="font-mono">{formatBelop(occ.leie)}/mnd</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : '-'}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
        {eierEnheter.map(e => (
          <TableRow key={e.id} className="bg-blue-50/50">
            <TableCell className="sticky left-0 bg-blue-50/50 font-medium text-blue-700">
              {e.navn} {e.etasje && <span className="text-xs">({e.etasje})</span>}
            </TableCell>
            {Array.from({ length: 12 }, (_, i) => (
              <TableCell key={i} className="text-center text-xs text-blue-600 bg-blue-50/50">
                {e.disponert_av?.split(' ')[0]}
              </TableCell>
            ))}
          </TableRow>
        ))}
        <TableRow className="font-medium text-xs">
          <TableCell className="sticky left-0 bg-background text-muted-foreground">↳ Forventet</TableCell>
          {boenhetExpected.map((v, i) => (
            <TableCell key={i} className="text-center font-mono">{v > 0 ? formatBelop(v) : '-'}</TableCell>
          ))}
        </TableRow>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Beleggsoversikt</h1>
        <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-[100px]" />
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background min-w-[150px]">Enhet</TableHead>
              {MONTHS.map(m => <TableHead key={m} className="text-center min-w-[90px]">{m}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {boenheter.map(boenhet => {
              const boEnheter = enheter.filter(e => e.boenhet === boenhet);
              const utleie = boEnheter.filter(e => !e.disponert_av);
              const eierEnh = boEnheter.filter(e => !!e.disponert_av);
              const boenhetExpected = Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                return utleie.reduce((s, e) => { const occ = getOccupant(e.id, m); return s + (occ ? occ.leie : 0); }, 0);
              });

              return [
                <TableRow key={`header-${boenhet}`} className="bg-muted/50">
                  <TableCell colSpan={13} className="sticky left-0 bg-muted/50 font-semibold text-sm py-2">{boenhet}</TableCell>
                </TableRow>,
                ...utleie.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="sticky left-0 bg-background font-medium text-sm">
                      {e.navn} {e.etasje && <span className="text-xs text-muted-foreground">({e.etasje})</span>}
                    </TableCell>
                    {Array.from({ length: 12 }, (_, i) => {
                      const occ = getOccupant(e.id, i + 1);
                      const firstName = occ?.leietaker?.navn?.split(' ')[0] || '';
                      return (
                        <TableCell key={i} className={`text-center text-xs ${occ ? 'bg-green-50 text-green-700' : 'bg-muted/30 text-muted-foreground'}`}>
                          {occ ? (
                            <Tooltip>
                              <TooltipTrigger asChild><span className="cursor-default">{firstName}</span></TooltipTrigger>
                              <TooltipContent><p>{occ.leietaker?.navn}</p><p className="font-mono">{formatBelop(occ.leie)}/mnd</p></TooltipContent>
                            </Tooltip>
                          ) : '-'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )),
                ...eierEnh.map(e => (
                  <TableRow key={e.id} className="bg-blue-50/30">
                    <TableCell className="sticky left-0 bg-blue-50/30 font-medium text-sm text-blue-700">
                      {e.navn} {e.etasje && <span className="text-xs">({e.etasje})</span>}
                    </TableCell>
                    {Array.from({ length: 12 }, (_, i) => (
                      <TableCell key={i} className="text-center text-xs text-blue-500 bg-blue-50/30 italic">
                        {e.disponert_av?.split(' ')[0]}
                      </TableCell>
                    ))}
                  </TableRow>
                )),
                <TableRow key={`sub-${boenhet}`} className="border-b-2">
                  <TableCell className="sticky left-0 bg-background text-xs text-muted-foreground font-medium">↳ Forventet</TableCell>
                  {boenhetExpected.map((v, i) => (
                    <TableCell key={i} className="text-center font-mono text-xs">{v > 0 ? formatBelop(v) : '-'}</TableCell>
                  ))}
                </TableRow>,
              ];
            })}

            <TableRow className="border-t-2 font-medium">
              <TableCell className="sticky left-0 bg-background">Utleid totalt</TableCell>
              {occupiedPerMonth.map((v, i) => (
                <TableCell key={i} className="text-center">{v} / {utleieEnheter.length}</TableCell>
              ))}
            </TableRow>

            <TableRow className="font-medium">
              <TableCell className="sticky left-0 bg-background">Forventet inntekt</TableCell>
              {expectedPerMonth.map((v, i) => (
                <TableCell key={i} className="text-center font-mono text-xs">{v > 0 ? formatBelop(v) : '-'}</TableCell>
              ))}
            </TableRow>

            <TableRow className="font-medium">
              <TableCell className="sticky left-0 bg-background">Faktisk inntekt</TableCell>
              {actualPerMonth.map((v, i) => (
                <TableCell key={i} className={`text-center font-mono text-xs ${v >= expectedPerMonth[i] && expectedPerMonth[i] > 0 ? 'text-green-600' : v < expectedPerMonth[i] ? 'text-red-600' : ''}`}>
                  {v > 0 ? formatBelop(v) : '-'}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><div className="text-xl font-bold">{avgOccupancy.toFixed(1)} av {utleieEnheter.length}</div><div className="text-sm text-muted-foreground">Gj.sn. belegg</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xl font-bold">{avgOccPct.toFixed(0)} %</div><div className="text-sm text-muted-foreground">Beleggsprosent</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xl font-bold font-mono">{formatBelop(totalActual / 12)}</div><div className="text-sm text-muted-foreground">Gj.sn. mnd inntekt</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xl font-bold font-mono text-green-600">{formatBelop(totalActual)}</div><div className="text-sm text-muted-foreground">Total leieinntekt</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xl font-bold text-yellow-600">{ledigeEnhetsmnd}</div><div className="text-sm text-muted-foreground">Ledige enhetsmåneder</div></CardContent></Card>
      </div>
    </div>
  );
}
