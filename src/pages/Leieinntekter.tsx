import { useState, useEffect, useMemo } from 'react';
import { YearSelect } from '@/components/YearSelect';
import { LeieforholdTab } from '@/components/leieinntekter/LeieforholdTab';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatBelop, formatDato } from '@/lib/format';
import { forslaaMaaned, formaterMaanedKort } from '@/lib/maanedsforslag';
import { toast } from 'sonner';
import { Plus, Download, FileText, Check, X, AlertTriangle, Link2 } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getExpectedForMonth(lf: any, year: number, month: number): number {
  const mStart = new Date(year, month - 1, 1);
  const mEnd = new Date(year, month, 0);
  const lfStart = new Date(lf.innflytting);
  const lfEnd = lf.utflytting ? new Date(lf.utflytting) : null;
  if (lfStart > mEnd) return 0;
  if (lfEnd && lfEnd < mStart) return 0;
  const totalDays = daysInMonth(year, month);
  const effectiveStart = lfStart > mStart ? lfStart : mStart;
  const effectiveEnd = lfEnd && lfEnd < mEnd ? lfEnd : mEnd;
  const activeDays = effectiveEnd.getDate() - effectiveStart.getDate() + 1;
  if (activeDays >= totalDays) return Number(lf.avtalt_leie);
  return Math.round((Number(lf.avtalt_leie) / totalDays) * activeDays);
}

export default function Leieinntekter() {
  const { session } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [leietakere, setLeietakere] = useState<any[]>([]);
  const [leieforhold, setLeieforhold] = useState<any[]>([]);
  const [enheter, setEnheter] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [fakturaer, setFakturaer] = useState<any[]>([]);
  const [fakturaBetalinger, setFakturaBetalinger] = useState<any[]>([]);
  const [fakturaMottakere, setFakturaMottakere] = useState<any[]>([]);
  const [fakturaJusteringer, setFakturaJusteringer] = useState<any[]>([]);
  const [betalingsmottakere, setBetalingsmottakere] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('alle');
  const [justeringDialog, setJusteringDialog] = useState<{ open: boolean; fakturaId: string; type: string; fraVerdi: string; tilVerdi: string }>({ open: false, fakturaId: '', type: '', fraVerdi: '', tilVerdi: '' });
  const [justeringKommentar, setJusteringKommentar] = useState('');
  // Settings
  const [genDagerFor, setGenDagerFor] = useState(7);
  const [fakturaPrefiks, setFakturaPrefiks] = useState('F');
  // New mottaker
  const [nyMottaker, setNyMottaker] = useState({ navn: '', kontonummer: '', epost: '', telefon: '' });
  const [mottakerListe, setMottakerListe] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, [year]);

  async function fetchAll() {
    const [
      { data: lt }, { data: lf }, { data: en }, { data: tx },
      { data: fk }, { data: fb }, { data: fm }, { data: fj }, { data: bm }
    ] = await Promise.all([
      supabase.from('leietakere').select('*'),
      supabase.from('leieforhold').select('*'),
      supabase.from('enheter').select('*'),
      supabase.from('transaksjoner').select('*').eq('kategori', 'Eiersameie E7').eq('retning', 'inn').gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`).order('dato', { ascending: false }),
      supabase.from('fakturaer').select('*').eq('aar', year).order('forfall'),
      supabase.from('faktura_betalinger').select('*'),
      supabase.from('faktura_mottakere').select('*'),
      supabase.from('faktura_justeringer').select('*').order('opprettet', { ascending: false }),
      supabase.from('betalingsmottakere').select('*'),
    ]);
    setLeietakere(lt || []);
    setLeieforhold(lf || []);
    setEnheter(en || []);
    setTxs(tx || []);
    setFakturaer(fk || []);
    setFakturaBetalinger(fb || []);
    setFakturaMottakere(fm || []);
    setFakturaJusteringer(fj || []);
    setBetalingsmottakere(bm || []);
    // Load mottaker-liste from betalingsmottakere unique names
    const unique = new Map<string, any>();
    (bm || []).forEach((m: any) => { if (!unique.has(m.mottaker_navn)) unique.set(m.mottaker_navn, m); });
    setMottakerListe(Array.from(unique.values()));
  }

  const aktivLeietakere = leietakere.filter(l => l.naavaerende);

  // ===== ÅRSOVERSIKT DATA =====
  type MonthData = { expected: number; actual: number };
  type TenantRow = { id: string; navn: string; months: MonthData[]; totalExpected: number; totalActual: number };

  const tenantRows: TenantRow[] = useMemo(() => aktivLeietakere.map(lt => {
    const lfs = leieforhold.filter(l => l.leietaker_id === lt.id);
    const months: MonthData[] = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      let expected = 0;
      for (const lf of lfs) expected += getExpectedForMonth(lf, year, month);
      const actual = txs
        .filter(t => {
          const tMonth = parseInt(t.dato.slice(5, 7));
          const matchName = (t.leie_for || t.motpart_egen || t.motpart_bank || '').toLowerCase();
          return tMonth === month && matchName.includes(lt.navn.split(' ')[0].toLowerCase());
        })
        .reduce((s, t) => s + Number(t.belop), 0);
      return { expected, actual };
    });
    return { id: lt.id, navn: lt.navn, months, totalExpected: months.reduce((s, m) => s + m.expected, 0), totalActual: months.reduce((s, m) => s + m.actual, 0) };
  }).filter(r => r.totalExpected > 0 || r.totalActual > 0), [aktivLeietakere, leieforhold, txs, year]);

  const totalExpected = tenantRows.reduce((s, r) => s + r.totalExpected, 0);
  const totalActual = tenantRows.reduce((s, r) => s + r.totalActual, 0);
  const totalOutstanding = tenantRows.reduce((s, r) => s + r.months.reduce((ms, m) => ms + Math.max(0, m.expected - m.actual), 0), 0);

  // ===== CHART DATA =====
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const expected = tenantRows.reduce((s, r) => s + r.months[i].expected, 0);
      const actual = tenantRows.reduce((s, r) => s + r.months[i].actual, 0);
      const isPast = new Date(year, month - 1) < now;
      const forfalt = isPast ? Math.max(0, expected - actual) : 0;
      return { name: MONTHS[i], innbetalt: actual, venter: !isPast && month === now.getMonth() + 1 && year === now.getFullYear() ? Math.max(0, expected - actual) : 0, prognose: !isPast && !(month === now.getMonth() + 1 && year === now.getFullYear()) ? expected : 0, forfalt };
    });
  }, [tenantRows, year]);

  function cellColor(m: MonthData) {
    if (m.expected === 0 && m.actual === 0) return 'bg-muted/30 text-muted-foreground';
    if (m.actual >= m.expected) return 'bg-green-50 text-green-700';
    if (m.actual > 0) return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-600';
  }

  // ===== FAKTURA GENERATION =====
  async function genererFakturaer(targetMonth: number, targetYear: number) {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    // Get next fakturanr
    const { data: existing } = await supabase.from('fakturaer').select('fakturanr').eq('aar', targetYear).order('fakturanr', { ascending: false }).limit(1);
    let nextNr = 1;
    if (existing && existing.length > 0) {
      const last = existing[0].fakturanr;
      const match = last.match(/(\d+)$/);
      if (match) nextNr = parseInt(match[1]) + 1;
    }

    let created = 0;
    for (const lt of aktivLeietakere) {
      const lfs = leieforhold.filter(l => l.leietaker_id === lt.id && l.status === 'aktiv');
      for (const lf of lfs) {
        const expected = getExpectedForMonth(lf, targetYear, targetMonth);
        if (expected <= 0) continue;
        // Check if faktura already exists
        const maanedStr = formaterMaanedKort(targetMonth, targetYear);
        const exists = fakturaer.find(f => f.leietaker_id === lt.id && f.maaned === maanedStr && f.aar === targetYear);
        if (exists) continue;

        const forfallDag = lf.forfall_dag || lt.forfall_dag || 1;
        const forfall = new Date(targetYear, targetMonth - 1, Math.min(forfallDag, daysInMonth(targetYear, targetMonth)));
        const fakturanr = `${fakturaPrefiks}${targetYear}-${String(nextNr).padStart(3, '0')}`;

        const enhet = enheter.find(e => e.id === lf.enhet_id);

        const { data: inserted } = await supabase.from('fakturaer').insert({
          user_id: userId, fakturanr, leietaker_id: lt.id, leieforhold_id: lf.id,
          enhet_id: lf.enhet_id, maaned: maanedStr, aar: targetYear,
          belop: expected, forfall: forfall.toISOString().slice(0, 10),
          status: forfall < new Date() ? 'forfalt' : 'ikke_forfalt',
        }).select().single();

        if (inserted) {
          // Copy betalingsmottakere from leieforhold
          const mottakere = betalingsmottakere.filter(m => m.leieforhold_id === lf.id);
          if (mottakere.length > 0) {
            for (const m of mottakere) {
              await supabase.from('faktura_mottakere').insert({
                user_id: userId, faktura_id: inserted.id,
                mottaker_navn: m.mottaker_navn, kontonummer: m.kontonummer || '',
                belop: m.belop, betalingsreferanse: maanedStr,
              });
            }
          } else {
            // Default to Sebastian
            await supabase.from('faktura_mottakere').insert({
              user_id: userId, faktura_id: inserted.id,
              mottaker_navn: 'Sebastian Flåterud', kontonummer: '12241835675',
              belop: expected, betalingsreferanse: maanedStr,
            });
          }
          nextNr++;
          created++;
        }
      }
    }
    toast.success(`${created} faktura${created !== 1 ? 'er' : ''} generert for ${MONTH_NAMES[targetMonth - 1]} ${targetYear}`);
    fetchAll();
  }

  // ===== KOBLING =====
  const kobletTxIds = new Set(fakturaBetalinger.map(fb => fb.transaksjon_id).filter(Boolean));
  const ukobletBetalinger = txs.filter(t => !kobletTxIds.has(t.id));
  const ukobletFakturaer = fakturaer.filter(f => f.status !== 'betalt' && f.status !== 'avskrevet');

  async function kobleBetaling(fakturaId: string, transaksjonId: string, belop: number) {
    if (!session?.user?.id) return;
    await supabase.from('faktura_betalinger').insert({
      user_id: session.user.id, faktura_id: fakturaId, transaksjon_id: transaksjonId, belop, dato: new Date().toISOString().slice(0, 10),
    });
    // Update faktura
    const faktura = fakturaer.find(f => f.id === fakturaId);
    if (faktura) {
      const nyBetalt = Number(faktura.betalt_belop || 0) + belop;
      const nyStatus = nyBetalt >= Number(faktura.belop) ? 'betalt' : 'delbetalt';
      await supabase.from('fakturaer').update({ betalt_belop: nyBetalt, status: nyStatus, betalt_dato: new Date().toISOString().slice(0, 10) }).eq('id', fakturaId);
    }
    toast.success('Betaling koblet');
    fetchAll();
  }

  async function avskrivFaktura(fakturaId: string) {
    setJusteringDialog({ open: true, fakturaId, type: 'avskrevet', fraVerdi: 'forfalt', tilVerdi: 'avskrevet' });
  }

  async function lagreJustering() {
    if (!session?.user?.id || !justeringKommentar) return;
    await supabase.from('faktura_justeringer').insert({
      user_id: session.user.id, faktura_id: justeringDialog.fakturaId,
      type: 'status_endret', fra_verdi: justeringDialog.fraVerdi, til_verdi: justeringDialog.tilVerdi,
      kommentar: justeringKommentar, utfort_av: 'Sebastian',
    });
    if (justeringDialog.type === 'avskrevet') {
      await supabase.from('fakturaer').update({ status: 'avskrevet' }).eq('id', justeringDialog.fakturaId);
    }
    setJusteringDialog({ open: false, fakturaId: '', type: '', fraVerdi: '', tilVerdi: '' });
    setJusteringKommentar('');
    toast.success('Justering lagret');
    fetchAll();
  }

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      ikke_forfalt: 'bg-muted text-muted-foreground',
      forfalt: 'bg-red-100 text-red-700',
      betalt: 'bg-green-100 text-green-700',
      delbetalt: 'bg-yellow-100 text-yellow-700',
      avskrevet: 'bg-slate-100 text-slate-500',
    };
    const labels: Record<string, string> = {
      ikke_forfalt: 'Ikke forfalt', forfalt: 'Forfalt', betalt: 'Betalt', delbetalt: 'Delbetalt', avskrevet: 'Avskrevet',
    };
    return <Badge variant="outline" className={colors[status] || ''}>{labels[status] || status}</Badge>;
  }

  const filteredFakturaer = statusFilter === 'alle' ? fakturaer : fakturaer.filter(f => f.status === statusFilter);

  // Måneds-view data
  const maanedData = useMemo(() => {
    return aktivLeietakere.map(lt => {
      const lfs = leieforhold.filter(l => l.leietaker_id === lt.id);
      let expected = 0;
      for (const lf of lfs) expected += getExpectedForMonth(lf, year, selectedMonth);
      const actual = txs
        .filter(t => {
          const tMonth = parseInt(t.dato.slice(5, 7));
          const matchName = (t.leie_for || t.motpart_egen || '').toLowerCase();
          return tMonth === selectedMonth && matchName.includes(lt.navn.split(' ')[0].toLowerCase());
        })
        .reduce((s, t) => s + Number(t.belop), 0);
      const enhet = lfs.length > 0 ? enheter.find(e => e.id === lfs[0].enhet_id) : null;
      return { navn: lt.navn, enhet: enhet?.navn || '—', expected, actual };
    }).filter(r => r.expected > 0);
  }, [aktivLeietakere, leieforhold, txs, enheter, year, selectedMonth]);

  const maanedBetalt = maanedData.filter(d => d.actual >= d.expected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leieinntekter</h1>
        <YearSelect value={year} onChange={setYear} />
      </div>

      <Tabs defaultValue="leieforhold">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="leieforhold">Leieforhold</TabsTrigger>
          <TabsTrigger value="fakturaer">Fakturaer</TabsTrigger>
          <TabsTrigger value="betalinger">Betalinger</TabsTrigger>
          <TabsTrigger value="kobling">Kobling</TabsTrigger>
          <TabsTrigger value="maaned">Måned</TabsTrigger>
          <TabsTrigger value="aarsoversikt">Årsoversikt</TabsTrigger>
          <TabsTrigger value="innstillinger">Innstillinger</TabsTrigger>
        </TabsList>

        {/* ===== LEIEFORHOLD ===== */}
        <TabsContent value="leieforhold">
          <LeieforholdTab />
        </TabsContent>

        {/* ===== ÅRSOVERSIKT ===== */}
        <TabsContent value="aarsoversikt" className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{formatBelop(totalExpected)}</div><div className="text-sm text-muted-foreground">Forventet inntekt</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{formatBelop(totalActual)}</div><div className="text-sm text-muted-foreground">Faktisk betalt</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className={`text-2xl font-bold ${totalActual >= totalExpected ? 'text-green-600' : 'text-red-600'}`}>{formatBelop(totalActual - totalExpected)}</div><div className="text-sm text-muted-foreground">Differanse</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatBelop(totalOutstanding)}</div><div className="text-sm text-muted-foreground">Utestående</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Inntekter {year}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <RTooltip formatter={(v: number) => formatBelop(v)} />
                  <Legend />
                  <Bar dataKey="innbetalt" stackId="a" fill="hsl(221, 83%, 53%)" name="Innbetalt" />
                  <Bar dataKey="venter" stackId="a" fill="hsl(220, 14%, 70%)" name="Venter" />
                  <Bar dataKey="prognose" stackId="a" fill="hsl(280, 40%, 75%)" name="Prognose" />
                  <Bar dataKey="forfalt" stackId="a" fill="hsl(0, 84%, 60%)" name="Forfalt" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
                            <div className="cursor-default">{m.expected === 0 && m.actual === 0 ? '—' : formatBelop(m.actual)}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-1">
                              <div>Forventet: {formatBelop(m.expected)}</div>
                              <div>Betalt: {formatBelop(m.actual)}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono font-bold text-xs">{formatBelop(row.totalActual)} / {formatBelop(row.totalExpected)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== MÅNED ===== */}
        <TabsContent value="maaned" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => genererFakturaer(selectedMonth, year)}><Plus className="h-4 w-4 mr-2" />Generer krav</Button>
          </div>
          <p className="text-sm text-muted-foreground">{maanedBetalt} av {maanedData.length} betalt | {formatBelop(maanedData.reduce((s, d) => s + d.actual, 0))} av {formatBelop(maanedData.reduce((s, d) => s + d.expected, 0))}</p>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Leietaker</TableHead><TableHead>Enhet</TableHead><TableHead className="text-right">Forventet</TableHead><TableHead className="text-right">Betalt</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {maanedData.map(d => (
                  <TableRow key={d.navn}>
                    <TableCell className="font-medium">{d.navn}</TableCell>
                    <TableCell>{d.enhet}</TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(d.expected)}</TableCell>
                    <TableCell className="text-right font-mono">{d.actual > 0 ? formatBelop(d.actual) : '—'}</TableCell>
                    <TableCell>{d.actual >= d.expected ? statusBadge('betalt') : d.actual > 0 ? statusBadge('delbetalt') : statusBadge('forfalt')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== FAKTURAER ===== */}
        <TabsContent value="fakturaer" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle</SelectItem>
                <SelectItem value="ikke_forfalt">Ikke forfalt</SelectItem>
                <SelectItem value="forfalt">Forfalt</SelectItem>
                <SelectItem value="betalt">Betalt</SelectItem>
                <SelectItem value="delbetalt">Delbetalt</SelectItem>
                <SelectItem value="avskrevet">Avskrevet</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filteredFakturaer.length} faktura{filteredFakturaer.length !== 1 ? 'er' : ''}</span>
          </div>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fakturanr</TableHead><TableHead>Leietaker</TableHead><TableHead>Måned</TableHead>
                  <TableHead className="text-right">Beløp</TableHead><TableHead>Forfall</TableHead><TableHead>Status</TableHead><TableHead>Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFakturaer.map(f => {
                  const lt = leietakere.find(l => l.id === f.leietaker_id);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-sm">{f.fakturanr}</TableCell>
                      <TableCell>{lt?.navn || '—'}</TableCell>
                      <TableCell>{f.maaned}</TableCell>
                      <TableCell className="text-right font-mono">{formatBelop(f.belop)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDato(f.forfall)}</TableCell>
                      <TableCell>{statusBadge(f.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(f.status === 'forfalt' || f.status === 'ikke_forfalt') && (
                            <Button size="sm" variant="ghost" onClick={() => avskrivFaktura(f.id)}>Avskriv</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredFakturaer.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Ingen fakturaer funnet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== BETALINGER ===== */}
        <TabsContent value="betalinger" className="space-y-4">
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Dato</TableHead><TableHead>Leietaker</TableHead><TableHead>Periode</TableHead><TableHead>Enhet</TableHead><TableHead className="text-right">Beløp</TableHead><TableHead>Koblet</TableHead></TableRow></TableHeader>
              <TableBody>
                {txs.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                    <TableCell>{t.leie_for || t.motpart_egen || '—'}</TableCell>
                    <TableCell>{t.leieperiode || '—'}</TableCell>
                    <TableCell>{t.enhet || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatBelop(t.belop)}</TableCell>
                    <TableCell>{kobletTxIds.has(t.id) ? <Badge variant="outline" className="bg-green-100 text-green-700"><Check className="h-3 w-3 mr-1" />Koblet</Badge> : <Badge variant="outline" className="bg-muted text-muted-foreground">Ukoblet</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ===== KOBLING ===== */}
        <TabsContent value="kobling" className="space-y-6">
          {ukobletFakturaer.length > 0 && (
            <div>
              <h3 className="font-semibold text-red-600 mb-2">Fakturaer uten betaling ({ukobletFakturaer.length})</h3>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Fakturanr</TableHead><TableHead>Leietaker</TableHead><TableHead>Måned</TableHead><TableHead className="text-right">Beløp</TableHead><TableHead>Status</TableHead><TableHead>Koble</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ukobletFakturaer.map(f => {
                      const lt = leietakere.find(l => l.id === f.leietaker_id);
                      // Find matching ukoblet betaling
                      const match = ukobletBetalinger.find(t => {
                        const name = (t.leie_for || t.motpart_egen || '').toLowerCase();
                        return lt && name.includes(lt.navn.split(' ')[0].toLowerCase());
                      });
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-mono text-sm">{f.fakturanr}</TableCell>
                          <TableCell>{lt?.navn || '—'}</TableCell>
                          <TableCell>{f.maaned}</TableCell>
                          <TableCell className="text-right font-mono">{formatBelop(f.belop)}</TableCell>
                          <TableCell>{statusBadge(f.status)}</TableCell>
                          <TableCell>
                            {match ? (
                              <Button size="sm" variant="outline" onClick={() => kobleBetaling(f.id, match.id, Number(match.belop))}>
                                <Link2 className="h-3 w-3 mr-1" />Koble ({formatBelop(match.belop)})
                              </Button>
                            ) : <span className="text-xs text-muted-foreground">Ingen match</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {ukobletBetalinger.length > 0 ? (
            <div>
              <h3 className="font-semibold text-yellow-600 mb-2">Betalinger uten faktura ({ukobletBetalinger.length})</h3>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Dato</TableHead><TableHead>Betaler</TableHead><TableHead className="text-right">Beløp</TableHead><TableHead>Foreslått måned</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ukobletBetalinger.map(t => {
                      const name = t.leie_for || t.motpart_egen || '';
                      const lt = leietakere.find(l => name.toLowerCase().includes(l.navn.split(' ')[0].toLowerCase()));
                      const forslag = lt ? forslaaMaaned(t.dato, lt.forfall_dag || 1) : null;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                          <TableCell>{name || '—'}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">{formatBelop(t.belop)}</TableCell>
                          <TableCell>
                            {forslag && (
                              <Badge variant="outline" className={
                                forslag.konfidens === 'høy' ? 'bg-green-100 text-green-700' :
                                forslag.konfidens === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-600'
                              }>{forslag.maaned} ({forslag.konfidens})</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 py-4"><Check className="h-5 w-5" />Alle betalinger er matchet med fakturaer</div>
          )}

          {/* Koblede fakturaer */}
          {fakturaer.filter(f => f.status === 'betalt' || f.status === 'delbetalt').length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 mb-2">Koblede fakturaer</h3>
              <div className="space-y-2">
                {fakturaer.filter(f => f.status === 'betalt' || f.status === 'delbetalt').map(f => {
                  const lt = leietakere.find(l => l.id === f.leietaker_id);
                  const betalinger = fakturaBetalinger.filter(fb => fb.faktura_id === f.id);
                  return (
                    <Card key={f.id}>
                      <CardContent className="py-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{f.fakturanr}</span>
                            <span className="font-medium">{lt?.navn}</span>
                            <span className="text-muted-foreground text-sm">{f.maaned}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{formatBelop(f.belop)}</span>
                            {statusBadge(f.status)}
                          </div>
                        </div>
                        {betalinger.map(b => (
                          <div key={b.id} className="flex items-center gap-2 text-sm text-muted-foreground pl-4">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Betalt {formatDato(b.dato)}</span>
                            <span className="font-mono">{formatBelop(b.belop)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>


        {/* ===== INNSTILLINGER ===== */}
        <TabsContent value="innstillinger" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Faktureringsoppsett</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Dager før forfall for generering</label>
                  <Input type="number" value={genDagerFor} onChange={e => setGenDagerFor(Number(e.target.value))} className="w-[100px] mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Fakturanummer-prefiks</label>
                  <Input value={fakturaPrefiks} onChange={e => setFakturaPrefiks(e.target.value)} className="w-[100px] mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Betalingsmottakere</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Navn</TableHead><TableHead>Kontonummer</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {mottakerListe.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{m.mottaker_navn}</TableCell>
                        <TableCell className="font-mono">{m.kontonummer || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {mottakerListe.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-4">Ingen mottakere registrert. Legg til via leietakermodulen.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Justering dialog */}
      <Dialog open={justeringDialog.open} onOpenChange={open => !open && setJusteringDialog({ open: false, fakturaId: '', type: '', fraVerdi: '', tilVerdi: '' })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bekreft justering</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Endring: <strong>{justeringDialog.fraVerdi}</strong> → <strong>{justeringDialog.tilVerdi}</strong></p>
            <Textarea placeholder="Kommentar (påkrevd)" value={justeringKommentar} onChange={e => setJusteringKommentar(e.target.value)} />
            <Button onClick={lagreJustering} disabled={!justeringKommentar} className="w-full">Lagre justering</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
