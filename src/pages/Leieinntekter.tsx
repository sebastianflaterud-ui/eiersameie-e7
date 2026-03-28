import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatBelop } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

interface Leieforhold {
  id: string;
  leietaker_id: string;
  innflytting: string;
  utflytting: string | null;
  avtalt_leie: number;
  status: string;
}

interface Leietaker {
  id: string;
  navn: string;
  naavaerende: boolean;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getExpectedForMonth(lf: Leieforhold, year: number, month: number): number {
  const mStart = new Date(year, month - 1, 1);
  const mEnd = new Date(year, month, 0);
  const lfStart = new Date(lf.innflytting);
  const lfEnd = lf.utflytting ? new Date(lf.utflytting) : null;

  if (lfStart > mEnd) return 0;
  if (lfEnd && lfEnd < mStart) return 0;

  const totalDays = daysInMonth(year, month);
  const effectiveStart = lfStart > mStart ? lfStart : mStart;
  const effectiveEnd = lfEnd && lfEnd < mEnd ? lfEnd : mEnd;

  const startDay = effectiveStart.getDate();
  const endDay = effectiveEnd.getDate();
  const activeDays = endDay - startDay + 1;

  if (activeDays >= totalDays) return Number(lf.avtalt_leie);
  return Math.round((Number(lf.avtalt_leie) / totalDays) * activeDays);
}

export default function Leieinntekter() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [leieforhold, setLeieforhold] = useState<Leieforhold[]>([]);
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const [{ data: lt }, { data: lf }, { data: tx }] = await Promise.all([
        supabase.from('leietakere').select('*').eq('naavaerende', true),
        supabase.from('leieforhold').select('*'),
        supabase.from('transaksjoner').select('*')
          .eq('kategori', 'Eiersameie E7').eq('retning', 'inn')
          .gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`)
          .order('dato', { ascending: false }),
      ]);
      setLeietakere(lt || []);
      setLeieforhold(lf || []);
      setTxs(tx || []);
    }
    fetch();
  }, [year]);

  // Build expected and actual matrices
  type MonthData = { expected: number; actual: number };
  type TenantRow = { navn: string; months: MonthData[]; totalExpected: number; totalActual: number };

  const tenantRows: TenantRow[] = leietakere.map(lt => {
    const lfs = leieforhold.filter(l => l.leietaker_id === lt.id);
    const months: MonthData[] = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      // Expected: sum from all leieforhold active this month
      let expected = 0;
      for (const lf of lfs) {
        expected += getExpectedForMonth(lf, year, month);
      }
      // Actual: match transactions
      const actual = txs
        .filter(t => {
          const tMonth = parseInt(t.dato.slice(5, 7));
          const matchName = (t.leie_for || t.motpart_egen || t.motpart_bank || '').toLowerCase();
          return tMonth === month && matchName.includes(lt.navn.split(' ')[0].toLowerCase());
        })
        .reduce((s, t) => s + Number(t.belop), 0);
      return { expected, actual };
    });
    return {
      navn: lt.navn,
      months,
      totalExpected: months.reduce((s, m) => s + m.expected, 0),
      totalActual: months.reduce((s, m) => s + m.actual, 0),
    };
  }).filter(r => r.totalExpected > 0 || r.totalActual > 0);

  const totalExpected = tenantRows.reduce((s, r) => s + r.totalExpected, 0);
  const totalActual = tenantRows.reduce((s, r) => s + r.totalActual, 0);
  const totalOutstanding = tenantRows.reduce((s, r) => {
    return s + r.months.reduce((ms, m) => ms + Math.max(0, m.expected - m.actual), 0);
  }, 0);

  const monthTotals = Array.from({ length: 12 }, (_, i) => ({
    expected: tenantRows.reduce((s, r) => s + r.months[i].expected, 0),
    actual: tenantRows.reduce((s, r) => s + r.months[i].actual, 0),
  }));

  function cellColor(m: MonthData) {
    if (m.expected === 0 && m.actual === 0) return 'bg-muted/30 text-muted-foreground';
    if (m.actual >= m.expected) return 'bg-green-50 text-green-700';
    if (m.actual > 0) return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-600';
  }

  function statusText(m: MonthData) {
    if (m.expected === 0) return 'Ingen leieforhold';
    if (m.actual >= m.expected) return 'OK';
    if (m.actual > 0) return 'Delbetalt';
    return 'Mangler';
  }

  // Outstanding per tenant
  const outstanding = tenantRows
    .map(r => {
      const ute = r.months.reduce((s, m) => s + Math.max(0, m.expected - m.actual), 0);
      const mndCount = r.months.filter(m => m.expected > 0 && m.actual < m.expected).length;
      const lastPayment = txs
        .filter(t => (t.leie_for || t.motpart_egen || '').toLowerCase().includes(r.navn.split(' ')[0].toLowerCase()))
        .sort((a, b) => b.dato.localeCompare(a.dato))[0];
      return { navn: r.navn, ute, mndCount, lastPayment: lastPayment?.dato || null };
    })
    .filter(o => o.ute > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leieinntekter</h1>
        <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-[100px]" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{formatBelop(totalExpected)}</div>
          <div className="text-sm text-muted-foreground">Forventet inntekt</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{formatBelop(totalActual)}</div>
          <div className="text-sm text-muted-foreground">Faktisk betalt</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className={`text-2xl font-bold ${totalActual >= totalExpected ? 'text-green-600' : 'text-red-600'}`}>
            {formatBelop(totalActual - totalExpected)}
          </div>
          <div className="text-sm text-muted-foreground">Differanse</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatBelop(totalOutstanding)}
          </div>
          <div className="text-sm text-muted-foreground">Utestående</div>
        </CardContent></Card>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10">Leietaker</TableHead>
              {MONTHS.map(m => <TableHead key={m} className="text-center min-w-[80px]">{m}</TableHead>)}
              <TableHead className="text-right font-bold">Totalt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenantRows.map(row => (
              <TableRow key={row.navn}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium">{row.navn}</TableCell>
                {row.months.map((m, i) => (
                  <TableCell key={i} className={`text-center font-mono text-xs p-1 ${cellColor(m)}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          {m.expected === 0 && m.actual === 0
                            ? '—'
                            : formatBelop(m.actual)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <div>Forventet: {formatBelop(m.expected)}</div>
                          <div>Betalt: {formatBelop(m.actual)}</div>
                          <div>Status: {statusText(m)}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono font-bold text-xs">
                  {formatBelop(row.totalActual)} / {formatBelop(row.totalExpected)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell className="sticky left-0 bg-background z-10">Sum</TableCell>
              {monthTotals.map((m, i) => (
                <TableCell key={i} className="text-center font-mono text-xs">
                  {m.actual > 0 ? formatBelop(m.actual) : '—'}
                </TableCell>
              ))}
              <TableCell className="text-right font-mono text-xs">
                {formatBelop(totalActual)} / {formatBelop(totalExpected)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {outstanding.length > 0 && (
        <div className="border rounded-lg overflow-auto">
          <h3 className="p-4 font-semibold text-red-600">Utestående per leietaker</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leietaker</TableHead>
                <TableHead className="text-right">Utestående</TableHead>
                <TableHead className="text-center">Antall måneder</TableHead>
                <TableHead>Siste betaling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstanding.map(o => (
                <TableRow key={o.navn}>
                  <TableCell className="font-medium">{o.navn}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{formatBelop(o.ute)}</TableCell>
                  <TableCell className="text-center">{o.mndCount} mnd</TableCell>
                  <TableCell className="font-mono text-xs">{o.lastPayment || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="border rounded-lg overflow-auto">
        <h3 className="p-4 font-semibold">Alle leieinntekter {year}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead>Leietaker</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Enhet</TableHead>
              <TableHead className="text-right">Beløp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.dato}</TableCell>
                <TableCell>{t.leie_for || t.motpart_egen || t.motpart_bank || '—'}</TableCell>
                <TableCell>{t.leieperiode || '—'}</TableCell>
                <TableCell>{t.enhet || '—'}</TableCell>
                <TableCell className="text-right font-mono text-green-600">{formatBelop(t.belop)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
