import { useState, useEffect } from 'react';
import { YearSelect } from '@/components/YearSelect';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBelop, formatDato } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Handshake, AlertTriangle } from 'lucide-react';
import EiereTab from '@/components/eiersameie/EiereTab';

interface Eier { id: string; navn: string; inntektsandel_prosent: number; kostnadsandel_prosent: number; aktiv: boolean | null; }

export default function Eiersameie() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [txs, setTxs] = useState<any[]>([]);
  const [eiere, setEiere] = useState<Eier[]>([]);
  const [selectedEier, setSelectedEier] = useState<string>('alle');
  const [stats, setStats] = useState({ total: 0, fradrag: 0, ikkeFradrag: 0, inntekter: 0, manglerUnderlagAntall: 0, manglerUnderlagSum: 0 });
  const [chartData, setChartData] = useState<{ name: string; belop: number }[]>([]);
  const [kostnadTyper, setKostnadTyper] = useState<{ type: string; underkategori: string; antall: number; sum: number }[]>([]);
  const [mvData, setMvData] = useState<any[]>([]);
  const [oppgjorData, setOppgjorData] = useState<{ eier: string; betalt: number; andel: number; diff: number }[]>([]);
  const [detaljertKostnader, setDetaljertKostnader] = useState<any[]>([]);
  const [mainTab, setMainTab] = useState('oversikt');

  useEffect(() => {
    supabase.from('eiere').select('*').eq('aktiv', true).then(({ data }) => { if (data) setEiere(data as Eier[]); });
    supabase.from('mellomvaerende').select('*').eq('aktiv', true).then(({ data }) => { if (data) setMvData(data); });
  }, []);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7')
        .gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`)
        .order('dato', { ascending: false });
      if (!data) return;

      const realTxs = data.filter(t => !t.er_oppgjor);
      setTxs(data);

      const utgifter = realTxs.filter(t => t.retning === 'ut');
      const inntekter = realTxs.filter(t => t.retning === 'inn');
      const manglerUnderlag = utgifter.filter(t => t.mangler_underlag);
      const manglerSum = manglerUnderlag.reduce((s, t) => s + Number(t.belop), 0);
      const fradrag = utgifter.filter(t => t.fradragsberettiget).reduce((s, t) => s + Number(t.belop), 0);
      const total = utgifter.reduce((s, t) => s + Number(t.belop), 0);
      setStats({ total, fradrag, ikkeFradrag: total - fradrag, inntekter: inntekter.reduce((s, t) => s + Number(t.belop), 0), manglerUnderlagAntall: manglerUnderlag.length, manglerUnderlagSum: manglerSum });

      const byUk: Record<string, number> = {};
      for (const t of utgifter) { const uk = t.underkategori || 'Annet'; byUk[uk] = (byUk[uk] || 0) + Number(t.belop); }
      setChartData(Object.entries(byUk).map(([name, belop]) => ({ name, belop })));

      const ktMap: Record<string, { underkategori: string; antall: number; sum: number }> = {};
      for (const t of utgifter) {
        const key = t.kostnadstype || t.utgiftstype || 'Uspesifisert';
        if (!ktMap[key]) ktMap[key] = { underkategori: t.underkategori || '-', antall: 0, sum: 0 };
        ktMap[key].antall++; ktMap[key].sum += Number(t.belop);
      }
      setKostnadTyper(Object.entries(ktMap).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.sum - a.sum));

      setDetaljertKostnader(utgifter);
    }
    fetch();
  }, [year]);

  useEffect(() => {
    if (eiere.length === 0 || detaljertKostnader.length === 0) { setOppgjorData([]); return; }
    const totalKostnader = detaljertKostnader.reduce((s, t) => s + Number(t.belop), 0);
    const result = eiere.map(e => {
      const betalt = detaljertKostnader
        .filter(t => t.betaler_eier === e.navn)
        .reduce((s, t) => s + Number(t.belop), 0);
      const andel = Math.round(totalKostnader * e.kostnadsandel_prosent / 100);
      return { eier: e.navn, betalt, andel, diff: betalt - andel };
    });
    setOppgjorData(result);
  }, [eiere, detaljertKostnader]);

  const currentEier = eiere.find(e => e.navn === selectedEier);
  const isPerEier = selectedEier !== 'alle';
  const kAndel = currentEier ? currentEier.kostnadsandel_prosent / 100 : 1;
  const iAndel = currentEier ? currentEier.inntektsandel_prosent / 100 : 1;
  const formatPct = (n: number) => n.toFixed(1).replace('.', ',') + ' %';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eiersameie</h1>
        <div className="flex gap-2">
          <Select value={selectedEier} onValueChange={setSelectedEier}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Vis for eier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle (brutto)</SelectItem>
              {eiere.map(e => <SelectItem key={e.id} value={e.navn}>{e.navn}</SelectItem>)}
            </SelectContent>
          </Select>
          <YearSelect value={year} onChange={setYear} />
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="oversikt">Oversikt</TabsTrigger>
          <TabsTrigger value="eiere">Eiere</TabsTrigger>
        </TabsList>

        <TabsContent value="oversikt" className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{formatBelop(isPerEier ? Math.round(stats.total * kAndel) : stats.total)}</div>
              <div className="text-sm text-muted-foreground">{isPerEier ? `Kostnader (din andel ${formatPct(currentEier!.kostnadsandel_prosent)})` : 'Totale kostnader'}</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{formatBelop(isPerEier ? Math.round(stats.fradrag * kAndel) : stats.fradrag)}</div>
              <div className="text-sm text-muted-foreground">Fradragsberettiget</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{formatBelop(isPerEier ? Math.round(stats.ikkeFradrag * kAndel) : stats.ikkeFradrag)}</div>
              <div className="text-sm text-muted-foreground">Ikke fradragsberettiget</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{formatBelop(isPerEier ? Math.round(stats.inntekter * iAndel) : stats.inntekter)}</div>
              <div className="text-sm text-muted-foreground">{isPerEier ? `Leieinntekter (din andel ${formatPct(currentEier!.inntektsandel_prosent)})` : 'Leieinntekter'}</div>
            </CardContent></Card>
          </div>

          {stats.manglerUnderlagAntall > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{stats.manglerUnderlagAntall} kostnader ({formatBelop(stats.manglerUnderlagSum)}) mangler underlag</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Totale kostnader (inkl. uten underlag):</span>
                  <span className="ml-2 font-mono font-medium">{formatBelop(isPerEier ? Math.round(stats.total * kAndel) : stats.total)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Kostnader med underlag (skattemessig):</span>
                  <span className="ml-2 font-mono font-medium">{formatBelop(isPerEier ? Math.round((stats.total - stats.manglerUnderlagSum) * kAndel) : stats.total - stats.manglerUnderlagSum)}</span>
                </div>
              </div>
            </div>
          )}

          {mvData.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer" onClick={() => navigate('/mellomvaerende')}>
              <Handshake className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Aktive mellomværender: {mvData.map(mv => `${mv.debitor} (${formatBelop(mv.gjeldende_saldo)} utestående)`).join(', ')}. Se detaljer →
              </span>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Eieroppgjør {year}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Beregner hva hver eier skylder eller har til gode basert på hvem som betalte og kostnadsandel.</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Eier</TableHead>
                    <TableHead className="text-right">Har betalt totalt</TableHead>
                    <TableHead className="text-right">Andel av kostnader</TableHead>
                    <TableHead className="text-right">Differanse</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oppgjorData.map(o => (
                    <TableRow key={o.eier}>
                      <TableCell className="font-medium">{o.eier}</TableCell>
                      <TableCell className="text-right font-mono">{formatBelop(o.betalt)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBelop(o.andel)}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${o.diff > 0 ? 'text-green-600' : o.diff < 0 ? 'text-red-600' : ''}`}>
                        {o.diff > 0 ? '+' : ''}{formatBelop(o.diff)}
                      </TableCell>
                      <TableCell>
                        {o.diff > 0 && <Badge className="bg-green-100 text-green-800">Til gode</Badge>}
                        {o.diff < 0 && <Badge className="bg-red-100 text-red-800">Skylder</Badge>}
                        {o.diff === 0 && <Badge variant="outline">Oppgjort</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {detaljertKostnader.some(t => !t.betaler_eier) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  ⚠️ {detaljertKostnader.filter(t => !t.betaler_eier).length} kostnader mangler betaler. Gå til Datavasking for å sette «Betaler» på E7-utgifter.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Detaljert kostnadsoppstilling {year}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dato</TableHead>
                      <TableHead>Kostnadsbeskrivelse</TableHead>
                      <TableHead>Underkategori</TableHead>
                      <TableHead className="text-right">Beløp</TableHead>
                      <TableHead>Betaler</TableHead>
                      {eiere.map(e => <TableHead key={e.id} className="text-right text-xs">{e.navn.split(' ')[0]}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detaljertKostnader.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                        <TableCell className="text-sm">{t.kostnadsbeskrivelse || t.beskrivelse_bank}</TableCell>
                        <TableCell className="text-sm">{t.underkategori || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-600">{formatBelop(t.belop)}</TableCell>
                        <TableCell className="text-sm">{t.betaler_eier ? t.betaler_eier.split(' ')[0] : <span className="text-yellow-600">?</span>}</TableCell>
                        {eiere.map(e => (
                          <TableCell key={e.id} className="text-right font-mono text-xs">
                            {formatBelop(Math.round(Number(t.belop) * e.kostnadsandel_prosent / 100))}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {detaljertKostnader.length > 0 && (
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>Totalt</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{formatBelop(detaljertKostnader.reduce((s, t) => s + Number(t.belop), 0))}</TableCell>
                        <TableCell></TableCell>
                        {eiere.map(e => (
                          <TableCell key={e.id} className="text-right font-mono text-xs">
                            {formatBelop(Math.round(detaljertKostnader.reduce((s, t) => s + Number(t.belop), 0) * e.kostnadsandel_prosent / 100))}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Kostnader per type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" /><YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => formatBelop(v)} />
                  <Bar dataKey="belop" fill="hsl(0, 84%, 60%)" name="Kostnad" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Kostnader per kostnadstype</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Kostnadstype</TableHead><TableHead>Underkategori</TableHead><TableHead className="text-right">Antall</TableHead><TableHead className="text-right">Sum</TableHead></TableRow></TableHeader>
                <TableBody>
                  {kostnadTyper.map(k => (
                    <TableRow key={k.type}>
                      <TableCell>{k.type}</TableCell><TableCell>{k.underkategori}</TableCell>
                      <TableCell className="text-right">{k.antall}</TableCell>
                      <TableCell className="text-right font-mono">{formatBelop(isPerEier ? Math.round(k.sum * kAndel) : k.sum)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Alle transaksjoner {year}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Dato</TableHead><TableHead>Beskrivelse</TableHead><TableHead>Underkategori</TableHead>
                    <TableHead className="text-right">Beløp</TableHead><TableHead>Betaler</TableHead><TableHead>Fradrag</TableHead><TableHead>Oppgjør</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {txs.map(t => (
                      <TableRow key={t.id} className={t.er_oppgjor ? 'bg-gray-50' : ''}>
                        <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                        <TableCell className="text-sm">{t.kostnadsbeskrivelse || t.beskrivelse_bank}</TableCell>
                        <TableCell className="text-sm">{t.underkategori || '-'}</TableCell>
                        <TableCell className={`text-right font-mono text-sm ${t.er_oppgjor ? 'text-gray-500' : t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}
                        </TableCell>
                        <TableCell className="text-sm">{t.retning === 'ut' && !t.er_oppgjor ? (t.betaler_eier || <span className="text-yellow-600">?</span>) : '-'}</TableCell>
                        <TableCell>
                          {t.retning === 'ut' && !t.er_oppgjor && (
                            <Badge variant={t.fradragsberettiget ? 'default' : 'secondary'} className={t.fradragsberettiget ? 'bg-green-100 text-green-800' : ''}>
                              {t.fradragsberettiget ? 'Ja' : 'Nei'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {t.er_oppgjor && <Badge className="bg-gray-200 text-gray-700">Oppgjør</Badge>}
                            {t.mangler_underlag && <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">Mangler underlag</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eiere">
          <EiereTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
