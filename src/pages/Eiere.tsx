import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, Check, Plus, Pencil, Trash2, Building2, User, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatBelop } from '@/lib/format';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';

interface Eier {
  id: string; navn: string; type: string; orgnr: string | null; identifikator: string | null;
  epost: string | null; telefon: string | null; eierandel_prosent: number;
  inntektsandel_prosent: number; kostnadsandel_prosent: number; aktiv: boolean | null;
  gyldig_fra: string | null; gyldig_til: string | null; notater: string | null; sist_endret: string | null;
}

interface HistorikkEvent {
  id: string; dato: string; type: string; beskrivelse: string;
  detaljer: { id: string; eier_navn: string; andel_for: number; andel_etter: number; merknad: string | null }[];
}

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(280, 67%, 55%)', 'hsl(38, 92%, 50%)'];

const emptyForm = {
  navn: '', type: 'privatperson', orgnr: '', identifikator: '', epost: '', telefon: '',
  eierandel_prosent: 0, inntektsandel_prosent: 0, kostnadsandel_prosent: 0, aktiv: true,
  gyldig_fra: '', gyldig_til: '', notater: '',
};

export default function Eiere() {
  const { user } = useAuth();
  const [eiere, setEiere] = useState<Eier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState('oversikt');

  // Leieinntekter tab
  const [liYear, setLiYear] = useState(new Date().getFullYear());
  const [liData, setLiData] = useState<{ brutto: number; oppgjor: Record<string, number> }>({ brutto: 0, oppgjor: {} });

  // Verdisimulator
  const [totalVerdi, setTotalVerdi] = useState(10000000);

  // Historikk
  const [historikk, setHistorikk] = useState<HistorikkEvent[]>([]);

  // Registrer endring
  const [regMode, setRegMode] = useState<'enkel' | 'avansert'>('enkel');
  const [regForm, setRegForm] = useState({ dato: '', type: 'overføring', beskrivelse: '', fra: '', til: '', beregnFraVerdi: true, boligverdi: 10000000, kjopesum: 0, prosent: 0 });
  const [advAndeler, setAdvAndeler] = useState<Record<string, number>>({});

  const fetchEiere = async () => {
    const { data } = await supabase.from('eiere').select('*').order('opprettet');
    if (data) setEiere(data as any);
  };

  const fetchHistorikk = async () => {
    const { data: events } = await supabase.from('eier_historikk').select('*').order('dato', { ascending: false });
    if (!events) return;
    const { data: detaljer } = await supabase.from('eier_historikk_detaljer').select('*');
    const mapped = (events as any[]).map(ev => ({
      ...ev,
      detaljer: ((detaljer as any[]) || []).filter(d => d.historikk_id === ev.id).sort((a: any, b: any) => Math.abs(b.andel_etter - b.andel_for) - Math.abs(a.andel_etter - a.andel_for)),
    }));
    setHistorikk(mapped);
  };

  const fetchLeieinntekter = async () => {
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
    // Also check 'ut' oppgjør transactions
    const { data: utData } = await supabase.from('transaksjoner').select('*')
      .eq('kategori', 'Eiersameie E7').eq('retning', 'ut')
      .gte('dato', `${liYear}-01-01`).lte('dato', `${liYear}-12-31`);
    for (const t of (utData || []).filter(t => t.er_oppgjor)) {
      const til = (t as any).oppgjor_til || 'Ukjent';
      oppgjor[til] = (oppgjor[til] || 0) + Number(t.belop);
    }
    setLiData({ brutto, oppgjor });
  };

  useEffect(() => { fetchEiere(); fetchHistorikk(); }, []);
  useEffect(() => { fetchLeieinntekter(); }, [liYear]);

  const aktive = eiere.filter(e => e.aktiv);
  const sumEierandel = aktive.reduce((s, e) => s + Number(e.eierandel_prosent), 0);
  const sumInntekt = aktive.reduce((s, e) => s + Number(e.inntektsandel_prosent), 0);
  const sumKostnad = aktive.reduce((s, e) => s + Number(e.kostnadsandel_prosent), 0);

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: Eier) => {
    setEditId(e.id);
    setForm({
      navn: e.navn, type: e.type, orgnr: e.orgnr || '', identifikator: e.identifikator || '',
      epost: e.epost || '', telefon: e.telefon || '',
      eierandel_prosent: e.eierandel_prosent, inntektsandel_prosent: e.inntektsandel_prosent,
      kostnadsandel_prosent: e.kostnadsandel_prosent, aktiv: e.aktiv ?? true,
      gyldig_fra: e.gyldig_fra || '', gyldig_til: e.gyldig_til || '', notater: e.notater || '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const payload = {
      user_id: user.id, navn: form.navn, type: form.type as any,
      orgnr: form.orgnr || null, identifikator: form.identifikator || null,
      epost: form.epost || null, telefon: form.telefon || null,
      eierandel_prosent: form.eierandel_prosent,
      inntektsandel_prosent: form.inntektsandel_prosent, kostnadsandel_prosent: form.kostnadsandel_prosent,
      aktiv: form.aktiv, gyldig_fra: form.gyldig_fra || null, gyldig_til: form.gyldig_til || null,
      notater: form.notater || null,
    };
    const { error } = editId
      ? await supabase.from('eiere').update(payload).eq('id', editId)
      : await supabase.from('eiere').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? 'Eier oppdatert' : 'Eier opprettet');
    setDialogOpen(false); fetchEiere();
  };

  const deleteEier = async (id: string) => {
    if (!confirm('Slett denne eieren?')) return;
    await supabase.from('eiere').delete().eq('id', id);
    toast.success('Eier slettet'); fetchEiere();
  };

  const formatPct = (n: number) => n.toFixed(2).replace('.', ',') + ' %';
  const formatPct4 = (n: number) => n.toFixed(4).replace('.', ',') + ' %';

  // Register change logic
  const registerEnkel = async () => {
    if (!user || !regForm.dato || !regForm.fra || !regForm.til) { toast.error('Fyll inn alle felter'); return; }
    const pct = regForm.beregnFraVerdi
      ? (regForm.kjopesum / regForm.boligverdi) * 100
      : regForm.prosent;
    if (pct <= 0) { toast.error('Prosent må være > 0'); return; }
    const fraEier = aktive.find(e => e.navn === regForm.fra);
    const tilEier = aktive.find(e => e.navn === regForm.til);
    if (!fraEier || !tilEier) { toast.error('Ugyldig eier'); return; }
    if (fraEier.eierandel_prosent < pct) { toast.error(`${fraEier.navn} har kun ${formatPct(fraEier.eierandel_prosent)}`); return; }

    const { data: hist, error: hErr } = await supabase.from('eier_historikk').insert({
      user_id: user.id, dato: regForm.dato, type: regForm.type as any, beskrivelse: regForm.beskrivelse,
    }).select().single();
    if (hErr || !hist) { toast.error(hErr?.message || 'Feil'); return; }

    const detaljer = aktive.map(e => ({
      user_id: user.id, historikk_id: (hist as any).id, eier_navn: e.navn,
      andel_for: e.eierandel_prosent,
      andel_etter: e.navn === regForm.fra ? e.eierandel_prosent - pct
        : e.navn === regForm.til ? e.eierandel_prosent + pct
        : e.eierandel_prosent,
      merknad: e.navn === regForm.fra ? `Overført ${formatPct(pct)} til ${regForm.til}`
        : e.navn === regForm.til ? `Mottatt ${formatPct(pct)} fra ${regForm.fra}`
        : 'Uendret',
    }));
    await supabase.from('eier_historikk_detaljer').insert(detaljer);

    // Update eiere
    await supabase.from('eiere').update({
      eierandel_prosent: fraEier.eierandel_prosent - pct,
      kostnadsandel_prosent: fraEier.kostnadsandel_prosent - pct,
      sist_endret: regForm.dato,
    } as any).eq('id', fraEier.id);
    await supabase.from('eiere').update({
      eierandel_prosent: tilEier.eierandel_prosent + pct,
      kostnadsandel_prosent: tilEier.kostnadsandel_prosent + pct,
      sist_endret: regForm.dato,
    } as any).eq('id', tilEier.id);

    toast.success('Eierskapsendring registrert');
    fetchEiere(); fetchHistorikk();
    setRegForm({ dato: '', type: 'overføring', beskrivelse: '', fra: '', til: '', beregnFraVerdi: true, boligverdi: 10000000, kjopesum: 0, prosent: 0 });
  };

  const registerAvansert = async () => {
    if (!user || !regForm.dato) { toast.error('Velg dato'); return; }
    const sumNy = Object.values(advAndeler).reduce((s, v) => s + v, 0);
    if (Math.abs(sumNy - 100) > 0.01) { toast.error(`Total andel er ${formatPct(sumNy)}, må være 100,00 %`); return; }

    const { data: hist, error: hErr } = await supabase.from('eier_historikk').insert({
      user_id: user.id, dato: regForm.dato, type: regForm.type as any, beskrivelse: regForm.beskrivelse,
    }).select().single();
    if (hErr || !hist) { toast.error(hErr?.message || 'Feil'); return; }

    const detaljer = aktive.map(e => ({
      user_id: user.id, historikk_id: (hist as any).id, eier_navn: e.navn,
      andel_for: e.eierandel_prosent,
      andel_etter: advAndeler[e.navn] ?? e.eierandel_prosent,
      merknad: advAndeler[e.navn] !== undefined && advAndeler[e.navn] !== e.eierandel_prosent ? 'Endret' : 'Uendret',
    }));
    await supabase.from('eier_historikk_detaljer').insert(detaljer);

    for (const e of aktive) {
      const ny = advAndeler[e.navn];
      if (ny !== undefined && ny !== e.eierandel_prosent) {
        await supabase.from('eiere').update({
          eierandel_prosent: ny, kostnadsandel_prosent: ny, sist_endret: regForm.dato,
        } as any).eq('id', e.id);
      }
    }

    toast.success('Eierskapsendring registrert');
    fetchEiere(); fetchHistorikk();
  };

  const enkelPct = regForm.beregnFraVerdi && regForm.boligverdi > 0
    ? (regForm.kjopesum / regForm.boligverdi) * 100
    : regForm.prosent;

  const pieData = aktive.map((e, i) => ({ name: e.navn, value: e.eierandel_prosent, fill: COLORS[i % COLORS.length] }));

  const advSum = Object.values(advAndeler).reduce((s, v) => s + v, 0);
  const advSumOk = Math.abs(advSum - 100) < 0.01;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eiere — Eiersameie E7</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="oversikt">Oversikt</TabsTrigger>
          <TabsTrigger value="leieinntekter">Leieinntekter</TabsTrigger>
          <TabsTrigger value="verdisimulator">Verdisimulator</TabsTrigger>
          <TabsTrigger value="historikk">Historikk</TabsTrigger>
          <TabsTrigger value="registrer">Registrer endring</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: OVERSIKT ===== */}
        <TabsContent value="oversikt" className="space-y-6">
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
                <Card key={e.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openEdit(e)}>
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
              <Button onClick={openNew} variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" />Legg til eier</Button>
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB 2: LEIEINNTEKTER ===== */}
        <TabsContent value="leieinntekter" className="space-y-6">
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
        </TabsContent>

        {/* ===== TAB 3: VERDISIMULATOR ===== */}
        <TabsContent value="verdisimulator" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Boligens totalverdi</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Input type="number" value={totalVerdi} onChange={e => setTotalVerdi(Number(e.target.value))} className="w-[200px]" />
                <span className="text-muted-foreground">kr</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[5000000, 7500000, 10000000, 12500000, 15000000, 20000000].map(v => (
                  <Button key={v} variant={totalVerdi === v ? 'default' : 'outline'} size="sm" onClick={() => setTotalVerdi(v)}>
                    {(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)} mill
                  </Button>
                ))}
              </div>
              <Slider value={[totalVerdi]} onValueChange={v => setTotalVerdi(v[0])} min={1000000} max={30000000} step={100000} />
              <div className="text-sm text-muted-foreground">
                Verdi: {formatBelop(totalVerdi)}
              </div>
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
        </TabsContent>

        {/* ===== TAB 4: HISTORIKK ===== */}
        <TabsContent value="historikk" className="space-y-4">
          {historikk.length === 0 && (
            <div className="text-center text-muted-foreground py-8">Ingen eierskapsendringer registrert ennå.</div>
          )}
          {historikk.map(ev => {
            const gains = ev.detaljer.filter(d => d.andel_etter > d.andel_for);
            const losses = ev.detaljer.filter(d => d.andel_etter < d.andel_for);
            return (
              <Card key={ev.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{ev.dato}</span>
                      <Badge variant="outline">{ev.type}</Badge>
                    </div>
                    <span className="font-medium">{ev.beskrivelse}</span>
                  </div>

                  {(gains.length > 0 || losses.length > 0) && (
                    <div className="flex gap-4 text-sm">
                      {losses.map(d => (
                        <span key={d.eier_navn} className="flex items-center gap-1 text-red-600">
                          <ArrowDown className="h-3 w-3" />{d.eier_navn.split(' ')[0]} -{formatPct(d.andel_for - d.andel_etter)}
                        </span>
                      ))}
                      {gains.map(d => (
                        <span key={d.eier_navn} className="flex items-center gap-1 text-green-600">
                          <ArrowUp className="h-3 w-3" />{d.eier_navn.split(' ')[0]} +{formatPct(d.andel_etter - d.andel_for)}
                        </span>
                      ))}
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Eier</TableHead>
                        <TableHead className="text-right">Før</TableHead>
                        <TableHead className="text-right">Etter</TableHead>
                        <TableHead className="text-right">Endring</TableHead>
                        <TableHead>Merknad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ev.detaljer.map(d => {
                        const endring = d.andel_etter - d.andel_for;
                        return (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.eier_navn}</TableCell>
                            <TableCell className="text-right font-mono">{formatPct(d.andel_for)}</TableCell>
                            <TableCell className="text-right font-mono">{formatPct(d.andel_etter)}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${endring > 0 ? 'text-green-600' : endring < 0 ? 'text-red-600' : ''}`}>
                              {endring > 0 ? '+' : ''}{formatPct(endring)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{d.merknad || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ===== TAB 5: REGISTRER ENDRING ===== */}
        <TabsContent value="registrer" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Registrer eierskapsendring</h2>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Avansert</Label>
              <Switch checked={regMode === 'avansert'} onCheckedChange={v => { setRegMode(v ? 'avansert' : 'enkel'); if (v) { const m: Record<string, number> = {}; aktive.forEach(e => m[e.navn] = e.eierandel_prosent); setAdvAndeler(m); } }} />
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Virkningsdato</Label><Input type="date" value={regForm.dato} onChange={e => setRegForm(p => ({ ...p, dato: e.target.value }))} /></div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={regForm.type} onValueChange={v => setRegForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overføring">Overføring (kjøp/salg)</SelectItem>
                      <SelectItem value="justering">Justering</SelectItem>
                      <SelectItem value="annet">Annet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Beskrivelse</Label><Input value={regForm.beskrivelse} onChange={e => setRegForm(p => ({ ...p, beskrivelse: e.target.value }))} placeholder="F.eks. Sebastian selger til David" /></div>
              </div>

              {regMode === 'enkel' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Fra (selger)</Label>
                      <Select value={regForm.fra} onValueChange={v => setRegForm(p => ({ ...p, fra: v }))}>
                        <SelectTrigger><SelectValue placeholder="Velg eier" /></SelectTrigger>
                        <SelectContent>{aktive.map(e => <SelectItem key={e.id} value={e.navn}>{e.navn} ({formatPct(e.eierandel_prosent)})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Til (kjøper)</Label>
                      <Select value={regForm.til} onValueChange={v => setRegForm(p => ({ ...p, til: v }))}>
                        <SelectTrigger><SelectValue placeholder="Velg eier" /></SelectTrigger>
                        <SelectContent>{aktive.filter(e => e.navn !== regForm.fra).map(e => <SelectItem key={e.id} value={e.navn}>{e.navn} ({formatPct(e.eierandel_prosent)})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={regForm.beregnFraVerdi} onChange={() => setRegForm(p => ({ ...p, beregnFraVerdi: true }))} />
                        <span className="text-sm">Beregn fra verdi</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!regForm.beregnFraVerdi} onChange={() => setRegForm(p => ({ ...p, beregnFraVerdi: false }))} />
                        <span className="text-sm">Angi prosent direkte</span>
                      </label>
                    </div>
                    {regForm.beregnFraVerdi ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label>Boligens verdi (kr)</Label><Input type="number" value={regForm.boligverdi} onChange={e => setRegForm(p => ({ ...p, boligverdi: Number(e.target.value) }))} /></div>
                        <div className="space-y-1"><Label>Kjøpesum (kr)</Label><Input type="number" value={regForm.kjopesum} onChange={e => setRegForm(p => ({ ...p, kjopesum: Number(e.target.value) }))} /></div>
                      </div>
                    ) : (
                      <div className="space-y-1 max-w-[200px]"><Label>Prosent som overføres</Label><Input type="number" step="0.0001" value={regForm.prosent} onChange={e => setRegForm(p => ({ ...p, prosent: Number(e.target.value) }))} /></div>
                    )}
                  </div>

                  {regForm.fra && regForm.til && enkelPct > 0 && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="font-medium">Forhåndsvisning</div>
                      {aktive.map(e => {
                        const ny = e.navn === regForm.fra ? e.eierandel_prosent - enkelPct : e.navn === regForm.til ? e.eierandel_prosent + enkelPct : e.eierandel_prosent;
                        const endring = ny - e.eierandel_prosent;
                        return (
                          <div key={e.id} className="flex justify-between text-sm">
                            <span>{e.navn}</span>
                            <span className="font-mono">
                              {formatPct(e.eierandel_prosent)} → {formatPct(ny)}
                              {endring !== 0 && <span className={endring > 0 ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>({endring > 0 ? '+' : ''}{formatPct(endring)})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button onClick={registerEnkel} disabled={!regForm.dato || !regForm.fra || !regForm.til || enkelPct <= 0}>Registrer overføring</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {aktive.map(e => {
                      const ny = advAndeler[e.navn] ?? e.eierandel_prosent;
                      const endring = ny - e.eierandel_prosent;
                      return (
                        <div key={e.id} className="flex items-center gap-3">
                          <span className="w-48 font-medium">{e.navn}</span>
                          <span className="text-sm text-muted-foreground w-24">({formatPct(e.eierandel_prosent)})</span>
                          <Input type="number" step="0.0001" value={ny} className="w-32"
                            onChange={ev => setAdvAndeler(p => ({ ...p, [e.navn]: Number(ev.target.value) }))} />
                          <span className="text-sm w-16">%</span>
                          {endring !== 0 && <span className={`text-sm font-mono ${endring > 0 ? 'text-green-600' : 'text-red-600'}`}>{endring > 0 ? '+' : ''}{formatPct4(endring)}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className={`font-mono ${advSumOk ? 'text-green-600' : 'text-red-600'}`}>
                      Total: {formatPct4(advSum)} {advSumOk ? '✓' : '✗'}
                    </span>
                  </div>
                  <Button onClick={registerAvansert} disabled={!advSumOk || !regForm.dato}>
                    Registrer transaksjon ({aktive.filter(e => (advAndeler[e.navn] ?? e.eierandel_prosent) !== e.eierandel_prosent).length} parter)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Rediger eier' : 'Ny eier'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Navn</Label><Input value={form.navn} onChange={e => setForm(p => ({ ...p, navn: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privatperson">Privatperson</SelectItem>
                    <SelectItem value="aksjeselskap">Aksjeselskap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{form.type === 'aksjeselskap' ? 'Org.nr' : 'Personnr'}</Label>
                <Input value={form.identifikator} onChange={e => setForm(p => ({ ...p, identifikator: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>E-post</Label><Input type="email" value={form.epost} onChange={e => setForm(p => ({ ...p, epost: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Telefon</Label><Input value={form.telefon} onChange={e => setForm(p => ({ ...p, telefon: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Eierandel %</Label><Input type="number" step="0.01" value={form.eierandel_prosent} onChange={e => setForm(p => ({ ...p, eierandel_prosent: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Inntektsandel %</Label><Input type="number" step="0.01" value={form.inntektsandel_prosent} onChange={e => setForm(p => ({ ...p, inntektsandel_prosent: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Kostnadsandel %</Label><Input type="number" step="0.01" value={form.kostnadsandel_prosent} onChange={e => setForm(p => ({ ...p, kostnadsandel_prosent: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Gyldig fra</Label><Input type="date" value={form.gyldig_fra} onChange={e => setForm(p => ({ ...p, gyldig_fra: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Gyldig til</Label><Input type="date" value={form.gyldig_til} onChange={e => setForm(p => ({ ...p, gyldig_til: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.aktiv} onCheckedChange={v => setForm(p => ({ ...p, aktiv: v }))} /><Label>Aktiv</Label></div>
            <div className="space-y-1"><Label>Notater</Label><Textarea value={form.notater} onChange={e => setForm(p => ({ ...p, notater: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            {editId && <Button variant="destructive" onClick={() => { deleteEier(editId); setDialogOpen(false); }}><Trash2 className="h-4 w-4 mr-1" />Slett</Button>}
            <Button onClick={save}>{editId ? 'Lagre' : 'Opprett'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
