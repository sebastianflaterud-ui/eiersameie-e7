import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBelop, formatDato } from '@/lib/format';
import { AlertTriangle, Download, Paperclip, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

interface Eier { id: string; navn: string; type: string; inntektsandel_prosent: number; kostnadsandel_prosent: number; aktiv: boolean | null; }

export default function Skatt() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [eiere, setEiere] = useState<Eier[]>([]);
  const [selectedEier, setSelectedEier] = useState<string>('alle');
  const [leieMatrix, setLeieMatrix] = useState<Record<string, Record<string, number>>>({});
  const [fradragKostnader, setFradragKostnader] = useState<any[]>([]);
  const [ikkeFradrag, setIkkeFradrag] = useState<any[]>([]);
  const [oppgjorTxs, setOppgjorTxs] = useState<any[]>([]);
  const [uklassifisertCount, setUklassifisertCount] = useState(0);
  const [totals, setTotals] = useState({ brutto: 0, fradrag: 0, netto: 0 });
  const [bilagStats, setBilagStats] = useState({ med: 0, uten: 0 });
  const [mvData, setMvData] = useState<any[]>([]);
  const [mvBevegelser, setMvBevegelser] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('eiere').select('*').eq('aktiv', true).then(({ data }) => {
      if (data) setEiere(data as Eier[]);
    });
  }, []);

  useEffect(() => {
    async function fetch() {
      const { data: e7Data } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7').eq('skatteaar', year);
      if (!e7Data) return;

      const { count } = await supabase.from('transaksjoner').select('*', { count: 'exact', head: true })
        .eq('kategori', 'Uklassifisert').eq('skatteaar', year);
      setUklassifisertCount(count || 0);

      // Separate oppgjør
      const realTxs = e7Data.filter(t => !t.er_oppgjor);
      const oppgjor = e7Data.filter(t => t.er_oppgjor);
      setOppgjorTxs(oppgjor);

      // Lease matrix from real txs only
      const inntekter = realTxs.filter(t => t.retning === 'inn');
      const m: Record<string, Record<string, number>> = {};
      for (const t of inntekter) {
        const tenant = t.leie_for || t.motpart_egen || t.motpart_bank || 'Ukjent';
        const month = parseInt(t.dato.slice(5, 7));
        if (!m[tenant]) m[tenant] = {};
        m[tenant][month] = (m[tenant][month] || 0) + Number(t.belop);
      }
      setLeieMatrix(m);

      const brutto = inntekter.reduce((s, t) => s + Number(t.belop), 0);
      const fradrag = realTxs.filter(t => t.retning === 'ut' && t.fradragsberettiget);
      setFradragKostnader(fradrag);
      const fradragSum = fradrag.reduce((s, t) => s + Number(t.belop), 0);
      const ikke = realTxs.filter(t => t.retning === 'ut' && !t.fradragsberettiget);
      setIkkeFradrag(ikke);
      setTotals({ brutto, fradrag: fradragSum, netto: brutto - fradragSum });

      // Bilag stats
      const txIds = e7Data.map(t => t.id);
      if (txIds.length > 0) {
        const { data: bilagData } = await supabase.from('bilag').select('transaksjon_id').in('transaksjon_id', txIds);
        const withBilag = new Set((bilagData || []).map((b: any) => b.transaksjon_id));
        setBilagStats({ med: withBilag.size, uten: txIds.length - withBilag.size });
      }

      // Mellomværende data
      const { data: mvRows } = await supabase.from('mellomvaerende').select('*').eq('aktiv', true);
      if (mvRows) setMvData(mvRows);
      const { data: bevRows } = await supabase.from('mellomvaerende_bevegelser').select('*');
      if (bevRows) setMvBevegelser(bevRows);
    }
    fetch();
  }, [year]);

  const tenants = Object.keys(leieMatrix).sort();
  const currentEier = eiere.find(e => e.navn === selectedEier);
  const inntektsAndel = currentEier ? currentEier.inntektsandel_prosent / 100 : 1;
  const kostnadsAndel = currentEier ? currentEier.kostnadsandel_prosent / 100 : 1;
  const isPerEier = selectedEier !== 'alle';

  const formatPct = (n: number) => n.toFixed(1).replace('.', ',') + ' %';

  const exportCsv = () => {
    const label = isPerEier ? selectedEier : 'Alle (brutto)';
    const rows = [
      [`Skattemeldingsgrunnlag ${year} — ${label}`], [],
      ['Brutto leieinntekter E7', String(totals.brutto)],
      ...(isPerEier ? [
        [`Inntektsandel ${formatPct(currentEier!.inntektsandel_prosent)}`, String(Math.round(totals.brutto * inntektsAndel))],
        [`Kostnadsandel ${formatPct(currentEier!.kostnadsandel_prosent)}`, String(Math.round(totals.fradrag * kostnadsAndel))],
        ['Netto skattepliktig', String(Math.round(totals.brutto * inntektsAndel - totals.fradrag * kostnadsAndel))],
      ] : [
        ['Fradragsberettigede kostnader', String(totals.fradrag)],
        ['Netto', String(totals.netto)],
      ]),
      [], ['--- Fradragsberettigede kostnader ---'], ['Dato', 'Beskrivelse', 'Kostnadstype', 'Leverandør', 'Beløp'],
      ...fradragKostnader.map(t => [t.dato, t.beskrivelse_bank, t.kostnadstype || '', t.leverandor || '', String(t.belop)]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `skattemeldingsgrunnlag_${year}_${selectedEier}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skattemeldingsgrunnlag</h1>
        <div className="flex gap-2">
          <Select value={selectedEier} onValueChange={setSelectedEier}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Vis for eier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle (brutto)</SelectItem>
              {eiere.map(e => <SelectItem key={e.id} value={e.navn}>{e.navn}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      {uklassifisertCount > 0 && (
        <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer" onClick={() => navigate('/datavasking')}>
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span className="text-orange-700">{uklassifisertCount} uklassifiserte transaksjoner for {year}.</span>
        </div>
      )}

      {/* Section 1: Brutto leieinntekter */}
      <Card>
        <CardHeader><CardTitle>Seksjon 1: Brutto leieinntekter (hele E7)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leietaker</TableHead>
                  {MONTHS.map(m => <TableHead key={m} className="text-center min-w-[70px]">{m}</TableHead>)}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map(tenant => (
                  <TableRow key={tenant}>
                    <TableCell className="font-medium">{tenant}</TableCell>
                    {Array.from({ length: 12 }, (_, i) => {
                      const val = leieMatrix[tenant][i + 1] || 0;
                      return <TableCell key={i} className={`text-center font-mono text-xs ${val > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>{val > 0 ? formatBelop(val) : '-'}</TableCell>;
                    })}
                    <TableCell className="text-right font-mono font-bold">{formatBelop(Object.values(leieMatrix[tenant]).reduce((s, v) => s + v, 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Eierens andel av leieinntekter */}
      {isPerEier && currentEier && (
        <Card>
          <CardHeader><CardTitle>Seksjon 2: Din andel av leieinntekter</CardTitle></CardHeader>
          <CardContent>
            <div className="font-mono text-lg space-y-2 p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between"><span>Brutto leieinntekter E7:</span><span>{formatBelop(totals.brutto)}</span></div>
              <div className="flex justify-between"><span>× Din inntektsandel:</span><span>{formatPct(currentEier.inntektsandel_prosent)}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold"><span>= Din andel leieinntekter:</span><span className="text-green-600">{formatBelop(Math.round(totals.brutto * inntektsAndel))}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Fradragsberettigede kostnader */}
      <Card>
        <CardHeader><CardTitle>Seksjon 3: Fradragsberettigede kostnader (Drift og vedlikehold)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead><TableHead>Beskrivelse</TableHead><TableHead>Kostnadstype</TableHead><TableHead>Leverandør</TableHead><TableHead className="text-right">Beløp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fradragKostnader.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.dato}</TableCell>
                  <TableCell className="text-sm">{t.beskrivelse_bank}</TableCell>
                  <TableCell className="text-sm">{t.kostnadstype || t.utgiftstype || '-'}</TableCell>
                  <TableCell className="text-sm">{t.leverandor || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{formatBelop(t.belop)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 4: Eierens andel av fradrag */}
      {isPerEier && currentEier && (
        <Card>
          <CardHeader><CardTitle>Seksjon 4: Din andel av fradrag</CardTitle></CardHeader>
          <CardContent>
            <div className="font-mono text-lg space-y-2 p-4 bg-red-50 rounded-lg">
              <div className="flex justify-between"><span>Brutto fradragsberettigede kostnader E7:</span><span className="text-red-600">-{formatBelop(totals.fradrag)}</span></div>
              <div className="flex justify-between"><span>× Din kostnadsandel:</span><span>{formatPct(currentEier.kostnadsandel_prosent)}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold"><span>= Din andel fradrag:</span><span className="text-red-600">-{formatBelop(Math.round(totals.fradrag * kostnadsAndel))}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Netto skattepliktig */}
      <Card>
        <CardHeader><CardTitle>Seksjon 5: Oppsummering{isPerEier ? ` — ${selectedEier}` : ''}</CardTitle></CardHeader>
        <CardContent>
          <div className="font-mono text-lg space-y-2 p-4 bg-muted rounded-lg">
            {isPerEier && currentEier ? (
              <>
                <div className="flex justify-between"><span>Din andel leieinntekter:</span><span className="text-green-600">{formatBelop(Math.round(totals.brutto * inntektsAndel))}</span></div>
                <div className="flex justify-between"><span>- Din andel fradrag:</span><span className="text-red-600">-{formatBelop(Math.round(totals.fradrag * kostnadsAndel))}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-xl">
                  <span>= Netto skattepliktig inntekt:</span>
                  <span className="text-green-600">{formatBelop(Math.round(totals.brutto * inntektsAndel - totals.fradrag * kostnadsAndel))}</span>
                </div>
                <div className="flex justify-between text-base text-muted-foreground pt-1">
                  <span>Skatt (22%):</span>
                  <span>{formatBelop(Math.round((totals.brutto * inntektsAndel - totals.fradrag * kostnadsAndel) * 0.22))}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between"><span>Brutto leieinntekter:</span><span className="text-green-600">{formatBelop(totals.brutto)}</span></div>
                <div className="flex justify-between"><span>- Fradragsberettigede kostnader:</span><span className="text-red-600">-{formatBelop(totals.fradrag)}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-xl">
                  <span>= Netto skattepliktig inntekt:</span>
                  <span className={totals.netto >= 0 ? 'text-green-600' : 'text-red-600'}>{formatBelop(totals.netto)}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Ikke-fradragsberettigede */}
      {ikkeFradrag.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Seksjon 6: Ikke-fradragsberettigede kostnader (Påkost/Annet)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Dato</TableHead><TableHead>Beskrivelse</TableHead><TableHead>Underkategori</TableHead><TableHead className="text-right">Beløp</TableHead></TableRow></TableHeader>
              <TableBody>
                {ikkeFradrag.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.dato}</TableCell>
                    <TableCell className="text-sm">{t.beskrivelse_bank}</TableCell>
                    <TableCell className="text-sm">{t.underkategori || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(t.belop)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {isPerEier && currentEier && (
              <div className="mt-2 text-sm text-muted-foreground">
                Din andel ({formatPct(currentEier.kostnadsandel_prosent)}): {formatBelop(Math.round(ikkeFradrag.reduce((s, t) => s + Number(t.belop), 0) * kostnadsAndel))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 7: Oppgjørsoversikt */}
      {oppgjorTxs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Seksjon 7: Oppgjørsoversikt</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Dato</TableHead><TableHead>Beskrivelse</TableHead><TableHead>Oppgjør til</TableHead><TableHead className="text-right">Beløp</TableHead></TableRow></TableHeader>
              <TableBody>
                {oppgjorTxs.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.dato}</TableCell>
                    <TableCell className="text-sm">{t.beskrivelse_bank}</TableCell>
                    <TableCell className="text-sm">{t.oppgjor_til || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(t.belop)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section: Mellomværende */}
      {isPerEier && currentEier && mvData.filter(mv => mv.kreditor === selectedEier).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" />Mellomværende (skatteåret {year})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Mellomværende</TableHead><TableHead className="text-right">Saldo 01.01</TableHead><TableHead className="text-right">Nedbetalinger i året</TableHead><TableHead className="text-right">Saldo 31.12</TableHead></TableRow></TableHeader>
              <TableBody>
                {mvData.filter(mv => mv.kreditor === selectedEier).map(mv => {
                  const bevs = mvBevegelser.filter(b => b.mellomvaerende_id === mv.id);
                  const yearBevs = bevs.filter(b => b.dato >= `${year}-01-01` && b.dato <= `${year}-12-31`);
                  const afterJan1 = bevs.filter(b => b.dato >= `${year}-01-01`);
                  const nedbetalingerYear = yearBevs.filter(b => b.type === 'nedbetaling').reduce((s: number, b: any) => s + Number(b.belop), 0);
                  // Saldo 31.12 = gjeldende_saldo (approx) for current year
                  const saldo3112 = Number(mv.gjeldende_saldo);
                  const saldo0101 = saldo3112 + nedbetalingerYear;
                  return (
                    <TableRow key={mv.id}>
                      <TableCell className="font-medium">{mv.navn}</TableCell>
                      <TableCell className="text-right font-mono">{formatBelop(saldo0101)}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">-{formatBelop(nedbetalingerYear)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatBelop(saldo3112)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold">
                  <TableCell>Totalt utestående</TableCell>
                  <TableCell></TableCell><TableCell></TableCell>
                  <TableCell className="text-right font-mono">{formatBelop(mvData.filter(mv => mv.kreditor === selectedEier).reduce((s: number, mv: any) => s + Number(mv.gjeldende_saldo), 0))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground mt-2">Dokumenterer hvorfor Sebastian mottar mer enn sin egen inntektsandel av leien.</p>
          </CardContent>
        </Card>
      )}

      {/* Section 8: Bilagsstatus */}
      <Card>
        <CardHeader><CardTitle>Seksjon 8: Bilagsstatus</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-green-600" /><span>{bilagStats.med} med bilag</span></div>
            <div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-red-500" /><span>{bilagStats.uten} uten bilag</span></div>
          </div>
          {bilagStats.uten > 0 && (
            <div className="mt-2 flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer" onClick={() => navigate('/transaksjoner')}>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700">{bilagStats.uten} transaksjoner mangler bilag. Skatteetaten krever dokumentasjon.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
