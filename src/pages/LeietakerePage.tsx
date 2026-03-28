import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBelop, formatDato } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, ArrowLeft, Edit, User, Mail, Phone, CreditCard, Calendar, Hash, Trash2 } from 'lucide-react';

interface Leietaker {
  id: string; navn: string; epost: string | null; telefon: string | null;
  personnr: string | null; fodselsdato: string | null; naavaerende: boolean | null;
  notater: string | null; konto_id: string | null; forfall_dag: number | null;
}

interface LeieforholdRow {
  id: string; leietaker_id: string; enhet_id: string; innflytting: string;
  utflytting: string | null; avtalt_leie: number; depositum: number | null;
  status: string; notater: string | null; forfall_dag: number | null;
  kontrakt_id: string | null;
}

interface Enhet { id: string; navn: string; boenhet: string | null; etasje: string | null; }

interface Betalingsmottaker {
  id: string; leieforhold_id: string; mottaker_navn: string;
  kontonummer: string | null; belop: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

export default function LeietakerePage() {
  const { user } = useAuth();
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [leieforhold, setLeieforhold] = useState<LeieforholdRow[]>([]);
  const [mottakere, setMottakere] = useState<Betalingsmottaker[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [selected, setSelected] = useState<Leietaker | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showNewPeriode, setShowNewPeriode] = useState(false);
  const [showAddMottaker, setShowAddMottaker] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [periodeForm, setPeriodeForm] = useState<Record<string, any>>({});
  const [mottakerForm, setMottakerForm] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<'alle' | 'nåværende' | 'tidligere'>('alle');
  const [year, setYear] = useState(new Date().getFullYear());
  const [eiere, setEiere] = useState<{ navn: string; identifikator: string | null }[]>([]);

  const load = useCallback(async () => {
    const [lt, e, lf, m, ei] = await Promise.all([
      supabase.from('leietakere').select('*').order('navn'),
      supabase.from('enheter').select('id, navn, boenhet, etasje'),
      supabase.from('leieforhold').select('*').order('innflytting', { ascending: false }),
      supabase.from('betalingsmottakere').select('*'),
      supabase.from('eiere').select('navn, identifikator').eq('aktiv', true),
    ]);
    if (lt.data) setLeietakere(lt.data as Leietaker[]);
    if (e.data) setEnheter(e.data as Enhet[]);
    if (lf.data) setLeieforhold(lf.data as LeieforholdRow[]);
    if (m.data) setMottakere(m.data as Betalingsmottaker[]);
    if (ei.data) setEiere(ei.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    supabase.from('transaksjoner').select('*')
      .eq('kategori', 'Eiersameie E7').eq('retning', 'inn')
      .gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`)
      .order('dato', { ascending: false })
      .then(({ data }) => { if (data) setTxs(data); });
  }, [selected, year]);

  const getEnhet = (id: string) => enheter.find(e => e.id === id);
  const getLeieforholdFor = (id: string) => leieforhold.filter(l => l.leietaker_id === id);

  const today = new Date().toISOString().split('T')[0];

  const getGjeldendePeriode = (leietakerId: string): LeieforholdRow | undefined => {
    return leieforhold.find(lf =>
      lf.leietaker_id === leietakerId &&
      lf.innflytting <= today &&
      (lf.utflytting === null || lf.utflytting >= today)
    );
  };

  const getForsteInnflytting = (leietakerId: string): string | null => {
    const perioder = getLeieforholdFor(leietakerId);
    if (perioder.length === 0) return null;
    return perioder.reduce((min, p) => p.innflytting < min ? p.innflytting : min, perioder[0].innflytting);
  };

  const beregnLeietid = (innflytting: string): string => {
    const start = new Date(innflytting);
    const now = new Date();
    const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years > 0) return `${years} år, ${months} mnd`;
    return `${months} mnd`;
  };

  const naavaerende = leietakere.filter(l => l.naavaerende).length;
  const tidligere = leietakere.filter(l => !l.naavaerende).length;

  const filtered = leietakere.filter(l => {
    if (filter === 'nåværende') return l.naavaerende;
    if (filter === 'tidligere') return !l.naavaerende;
    return true;
  });

  const saveNew = async () => {
    if (!user || !form.navn) return;
    const { error } = await supabase.from('leietakere').insert({
      user_id: user.id, navn: form.navn, epost: form.epost || null,
      telefon: form.telefon || null, personnr: form.personnr || null,
      fodselsdato: form.fodselsdato || null, naavaerende: form.naavaerende === 'true',
      notater: form.notater || null, forfall_dag: Number(form.forfall_dag) || 1,
      konto_id: form.konto_id || null,
    });
    if (error) { toast.error('Feil: ' + error.message); return; }
    toast.success('Leietaker opprettet'); setShowNew(false); setForm({}); load();
  };

  const saveEdit = async () => {
    if (!selected) return;
    const { error } = await supabase.from('leietakere').update({
      navn: form.navn, epost: form.epost || null, telefon: form.telefon || null,
      personnr: form.personnr || null, fodselsdato: form.fodselsdato || null,
      naavaerende: form.naavaerende === 'true' || form.naavaerende === true,
      notater: form.notater || null, forfall_dag: Number(form.forfall_dag) || 1,
      konto_id: form.konto_id || null,
    }).eq('id', selected.id);
    if (error) { toast.error('Feil: ' + error.message); return; }
    toast.success('Leietaker oppdatert'); setEditing(false);
    const updated = { ...selected, ...form, naavaerende: form.naavaerende === 'true' || form.naavaerende === true };
    setSelected(updated as Leietaker);
    load();
  };

  const saveNewPeriode = async () => {
    if (!user || !selected || !periodeForm.enhet_id || !periodeForm.innflytting || !periodeForm.avtalt_leie) return;
    // Auto-close previous open period
    const perioder = getLeieforholdFor(selected.id);
    const openPeriode = perioder.find(p => p.utflytting === null && p.status === 'aktiv');
    if (openPeriode) {
      const dayBefore = new Date(periodeForm.innflytting);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await supabase.from('leieforhold').update({
        utflytting: dayBefore.toISOString().split('T')[0], status: 'avsluttet'
      }).eq('id', openPeriode.id);
    }
    const { error } = await supabase.from('leieforhold').insert({
      user_id: user.id, leietaker_id: selected.id, enhet_id: periodeForm.enhet_id,
      innflytting: periodeForm.innflytting, utflytting: periodeForm.utflytting || null,
      avtalt_leie: Number(periodeForm.avtalt_leie), depositum: Number(periodeForm.depositum) || 0,
      forfall_dag: Number(periodeForm.forfall_dag) || selected.forfall_dag || 1,
      status: 'aktiv', notater: periodeForm.beskrivelse || 'Oppstart',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Leieperiode opprettet'); setShowNewPeriode(false); setPeriodeForm({}); load();
  };

  const avsluttPeriode = async (lf: LeieforholdRow) => {
    await supabase.from('leieforhold').update({
      utflytting: today, status: 'avsluttet'
    }).eq('id', lf.id);
    toast.success('Periode avsluttet'); load();
  };

  const slettPeriode = async (lf: LeieforholdRow) => {
    await supabase.from('leieforhold').delete().eq('id', lf.id);
    toast.success('Periode slettet'); load();
  };

  const saveAddMottaker = async () => {
    if (!user || !mottakerForm.leieforhold_id || !mottakerForm.mottaker_navn || !mottakerForm.belop) return;
    const { error } = await supabase.from('betalingsmottakere').insert({
      user_id: user.id, leieforhold_id: mottakerForm.leieforhold_id,
      mottaker_navn: mottakerForm.mottaker_navn, kontonummer: mottakerForm.kontonummer || null,
      belop: Number(mottakerForm.belop),
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Mottaker lagt til'); setShowAddMottaker(false); setMottakerForm({}); load();
  };

  const slettMottaker = async (id: string) => {
    await supabase.from('betalingsmottakere').delete().eq('id', id);
    toast.success('Mottaker slettet'); load();
  };

  // ── Detail View ──
  if (selected && !editing) {
    const perioder = getLeieforholdFor(selected.id);
    const gjeldende = getGjeldendePeriode(selected.id);
    const forsteInnflytting = getForsteInnflytting(selected.id);
    const gjeldEnhet = gjeldende ? getEnhet(gjeldende.enhet_id) : null;

    // Payment history
    const tenantTxs = txs.filter(t =>
      (t.leie_for || t.motpart_egen || t.motpart_bank || '').toLowerCase().includes(selected.navn.split(' ')[0].toLowerCase())
    );

    // Betalingsmatrise
    const monthlyPayments: Record<number, number> = {};
    for (const t of tenantTxs) {
      const m = parseInt(t.dato.slice(5, 7));
      monthlyPayments[m] = (monthlyPayments[m] || 0) + Number(t.belop);
    }

    // Betalingsmottakere for gjeldende periode
    const gjeldendeMottakere = gjeldende ? mottakere.filter(m => m.leieforhold_id === gjeldende.id) : [];
    const sumMottakere = gjeldendeMottakere.reduce((s, m) => s + m.belop, 0);

    // Varslingsfrist & regulering
    const varslingsfrist = forsteInnflytting ? (() => {
      const d = new Date(forsteInnflytting);
      d.setMonth(d.getMonth() + 11);
      return formatDato(d);
    })() : null;
    const regulering = forsteInnflytting ? (() => {
      const d = new Date(forsteInnflytting);
      d.setMonth(d.getMonth() + 12);
      return formatDato(d);
    })() : null;

    // Nyeste periode (for utflytting display)
    const nyeste = perioder.length > 0 ? perioder[0] : null;
    const utflyttingDisplay = nyeste?.utflytting
      ? (nyeste.utflytting < today ? formatDato(nyeste.utflytting) : formatDato(nyeste.utflytting))
      : '—';

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{selected.navn}</h1>
              <Badge variant={selected.naavaerende ? 'default' : 'secondary'}>
                {selected.naavaerende ? 'Aktiv' : 'Tidligere'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {gjeldEnhet && <Badge variant="outline">{gjeldEnhet.navn}</Badge>}
              {gjeldende && <span className="text-primary font-semibold">{formatBelop(gjeldende.avtalt_leie)}/mnd</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setForm({ ...selected, naavaerende: String(selected.naavaerende), forfall_dag: String(selected.forfall_dag || 1) });
            setEditing(true);
          }}>
            <Edit className="h-4 w-4 mr-1" /> Rediger
          </Button>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 flex items-start gap-2">
            <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><div className="text-xs text-muted-foreground">Personnr</div><div className="font-medium text-sm">{selected.personnr || 'Ikke satt'}</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><div className="text-xs text-muted-foreground">Telefon</div><div className="font-medium text-sm">{selected.telefon || 'Ikke satt'}</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><div className="text-xs text-muted-foreground">Konto-ID</div><div className="font-medium text-sm">{selected.konto_id || 'Ikke satt'}</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-start gap-2">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><div className="text-xs text-muted-foreground">E-post</div><div className="font-medium text-sm">{selected.epost || 'Ikke satt'}</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><div className="text-xs text-muted-foreground">Forfall</div><div className="font-medium text-sm">{selected.forfall_dag || 1}. hver måned</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><div className="text-xs text-muted-foreground">Depositum</div><div className="font-medium text-sm">{gjeldende?.depositum ? formatBelop(gjeldende.depositum) : 'Ikke registrert'}</div></div>
          </CardContent></Card>
        </div>

        {/* Status boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Innflytting</div>
            <div className="text-lg font-bold">{forsteInnflytting ? formatDato(forsteInnflytting) : '—'}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Utflytting</div>
            <div className="text-lg font-bold">{utflyttingDisplay}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Leietid</div>
            <div className="text-lg font-bold">{forsteInnflytting ? beregnLeietid(forsteInnflytting) : '—'}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Gjeldende leie</div>
            <div className="text-lg font-bold font-mono">{gjeldende ? formatBelop(gjeldende.avtalt_leie) : '—'}</div>
          </CardContent></Card>
        </div>

        {varslingsfrist && regulering && (
          <p className="text-xs text-muted-foreground">
            Varslingsfrist KPI: {varslingsfrist} · Tidligste regulering: {regulering}
          </p>
        )}

        {/* Husleie og leieperioder */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Husleie og leieperioder</CardTitle>
              <Button size="sm" onClick={() => {
                const lastPeriode = perioder.find(p => p.utflytting);
                const nextDay = lastPeriode?.utflytting ? (() => {
                  const d = new Date(lastPeriode.utflytting); d.setDate(d.getDate() + 1);
                  return d.toISOString().split('T')[0];
                })() : '';
                setPeriodeForm({ enhet_id: gjeldende?.enhet_id || '', innflytting: nextDay, forfall_dag: String(selected.forfall_dag || 1) });
                setShowNewPeriode(true);
              }}>
                <Plus className="h-4 w-4 mr-1" /> Ny
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {perioder.length === 0 ? <p className="text-sm text-muted-foreground">Ingen leieperioder registrert.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-right">Beløp</TableHead><TableHead>Fra</TableHead>
                  <TableHead>Til</TableHead><TableHead>Beskrivelse</TableHead><TableHead>Enhet</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {perioder.map(p => {
                    const isGjeldende = p.innflytting <= today && (p.utflytting === null || p.utflytting >= today);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-right font-mono font-medium">{formatBelop(p.avtalt_leie)}</TableCell>
                        <TableCell>{formatDato(p.innflytting)}</TableCell>
                        <TableCell>
                          {isGjeldende && p.utflytting === null
                            ? <Badge variant="default" className="text-xs">Gjeldende</Badge>
                            : p.utflytting ? formatDato(p.utflytting) : '—'
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.notater || '—'}</TableCell>
                        <TableCell className="text-sm">{getEnhet(p.enhet_id)?.navn || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {isGjeldende && p.status === 'aktiv' && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => avsluttPeriode(p)}>Avslutt</Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => slettPeriode(p)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Betalingsmottakere */}
        {gjeldende && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Betalingsmottakere</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gjelder for: {gjeldEnhet?.navn} (fra {formatDato(gjeldende.innflytting)})
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  setMottakerForm({ leieforhold_id: gjeldende.id, belop: String(gjeldende.avtalt_leie) });
                  setShowAddMottaker(true);
                }}>
                  <Plus className="h-4 w-4 mr-1" /> Legg til
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {gjeldendeMottakere.length === 0 ? <p className="text-sm text-muted-foreground">Ingen mottakere registrert.</p> : (
                <>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Mottaker</TableHead><TableHead>Kontonummer</TableHead>
                      <TableHead className="text-right">Beløp</TableHead><TableHead></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {gjeldendeMottakere.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.mottaker_navn}</TableCell>
                          <TableCell className="font-mono text-sm">{m.kontonummer || '—'}</TableCell>
                          <TableCell className="text-right font-mono">{formatBelop(m.belop)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => slettMottaker(m.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-2 text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">Sum betalinger:</span>
                    <span className="font-mono font-medium">{formatBelop(sumMottakere)}</span>
                    {gjeldende && sumMottakere !== gjeldende.avtalt_leie && (
                      <Badge variant="destructive" className="text-xs">Avvik fra gjeldende leie ({formatBelop(gjeldende.avtalt_leie)})</Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Betalingsmatrise */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Betalingsmatrise {year}</CardTitle>
              <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-[100px]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  {MONTHS.map(m => <TableHead key={m} className="text-center min-w-[70px]">{m}</TableHead>)}
                  <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow>
                    {Array.from({ length: 12 }, (_, i) => {
                      const val = monthlyPayments[i + 1] || 0;
                      return (
                        <TableCell key={i} className={`text-center font-mono text-sm ${val > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-400'}`}>
                          {val > 0 ? formatBelop(val) : '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono font-bold">
                      {formatBelop(Object.values(monthlyPayments).reduce((s, v) => s + v, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Betalingshistorikk */}
        {tenantTxs.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Betalingshistorikk {year}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Dato</TableHead><TableHead>Beskrivelse</TableHead><TableHead>Periode</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tenantTxs.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                      <TableCell className="text-sm">{t.beskrivelse_egen || t.beskrivelse_bank}</TableCell>
                      <TableCell className="text-sm">{t.leieperiode || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{formatBelop(t.belop)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* New periode dialog */}
        {showNewPeriode && (
          <Dialog open onOpenChange={() => { setShowNewPeriode(false); setPeriodeForm({}); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Ny leieperiode</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Enhet</Label>
                  <Select value={periodeForm.enhet_id || ''} onValueChange={v => setPeriodeForm(f => ({ ...f, enhet_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg enhet" /></SelectTrigger>
                    <SelectContent>{enheter.filter(e => !e.boenhet?.includes('ikke')).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.navn} {e.etasje ? `(${e.etasje})` : ''}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Beløp</Label><Input type="number" value={periodeForm.avtalt_leie || ''} onChange={e => setPeriodeForm(f => ({ ...f, avtalt_leie: e.target.value }))} /></div>
                  <div><Label>Depositum</Label><Input type="number" value={periodeForm.depositum || ''} onChange={e => setPeriodeForm(f => ({ ...f, depositum: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fra</Label><Input type="date" value={periodeForm.innflytting || ''} onChange={e => setPeriodeForm(f => ({ ...f, innflytting: e.target.value }))} /></div>
                  <div><Label>Til (valgfri)</Label><Input type="date" value={periodeForm.utflytting || ''} onChange={e => setPeriodeForm(f => ({ ...f, utflytting: e.target.value }))} /></div>
                </div>
                <div><Label>Beskrivelse</Label>
                  <Select value={periodeForm.beskrivelse || ''} onValueChange={v => setPeriodeForm(f => ({ ...f, beskrivelse: v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oppstart">Oppstart</SelectItem>
                      <SelectItem value="Indeksregulering">Indeksregulering</SelectItem>
                      <SelectItem value="Ny avtale">Ny avtale</SelectItem>
                      <SelectItem value="Annet">Annet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={saveNewPeriode}>Lagre</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add mottaker dialog */}
        {showAddMottaker && (
          <Dialog open onOpenChange={() => { setShowAddMottaker(false); setMottakerForm({}); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Legg til betalingsmottaker</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Mottaker</Label>
                  <Select value={mottakerForm.mottaker_navn || ''} onValueChange={v => setMottakerForm(f => ({ ...f, mottaker_navn: v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg mottaker" /></SelectTrigger>
                    <SelectContent>{eiere.map(e => (
                      <SelectItem key={e.navn} value={e.navn}>{e.navn}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div><Label>Kontonummer</Label><Input value={mottakerForm.kontonummer || ''} onChange={e => setMottakerForm(f => ({ ...f, kontonummer: e.target.value }))} /></div>
                <div><Label>Beløp</Label><Input type="number" value={mottakerForm.belop || ''} onChange={e => setMottakerForm(f => ({ ...f, belop: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button onClick={saveAddMottaker}>Lagre</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // ── Edit Form Dialog ──
  const leietakerForm = (onSave: () => void, title: string) => (
    <Dialog open onOpenChange={() => { setShowNew(false); setEditing(false); setForm({}); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Navn</Label><Input value={form.navn || ''} onChange={e => setForm(f => ({ ...f, navn: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>E-post</Label><Input type="email" value={form.epost || ''} onChange={e => setForm(f => ({ ...f, epost: e.target.value }))} /></div>
            <div><Label>Telefon</Label><Input value={form.telefon || ''} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Personnummer</Label><Input value={form.personnr || ''} onChange={e => setForm(f => ({ ...f, personnr: e.target.value }))} /></div>
            <div><Label>Fødselsdato</Label><Input type="date" value={form.fodselsdato || ''} onChange={e => setForm(f => ({ ...f, fodselsdato: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Forfall (dag i måned)</Label><Input type="number" min="1" max="31" value={form.forfall_dag || '1'} onChange={e => setForm(f => ({ ...f, forfall_dag: e.target.value }))} /></div>
            <div><Label>Konto-ID</Label><Input value={form.konto_id || ''} onChange={e => setForm(f => ({ ...f, konto_id: e.target.value }))} /></div>
          </div>
          <div><Label>Status</Label>
            <Select value={form.naavaerende || 'false'} onValueChange={v => setForm(f => ({ ...f, naavaerende: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Nåværende</SelectItem>
                <SelectItem value="false">Tidligere</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notater</Label><Textarea value={form.notater || ''} onChange={e => setForm(f => ({ ...f, notater: e.target.value }))} /></div>
        </div>
        <DialogFooter><Button onClick={onSave}>Lagre</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── List View ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leietakere</h1>
        <Button onClick={() => { setForm({}); setShowNew(true); }}><Plus className="h-4 w-4 mr-1" /> Ny leietaker</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{leietakere.length}</div><div className="text-sm text-muted-foreground">Totalt leietakere</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{naavaerende}</div><div className="text-sm text-muted-foreground">Nåværende</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-muted-foreground">{tidligere}</div><div className="text-sm text-muted-foreground">Tidligere</div></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {(['alle', 'nåværende', 'tidligere'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Navn</TableHead><TableHead>Enhet</TableHead>
            <TableHead className="text-right">Gjeldende leie</TableHead>
            <TableHead>Innflytting</TableHead><TableHead>Forfall</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(l => {
              const gj = getGjeldendePeriode(l.id);
              const enhet = gj ? getEnhet(gj.enhet_id) : null;
              const forste = getForsteInnflytting(l.id);
              return (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(l)}>
                  <TableCell className="font-medium">{l.navn}</TableCell>
                  <TableCell>{enhet?.navn || '-'}</TableCell>
                  <TableCell className="text-right font-mono">{gj ? formatBelop(gj.avtalt_leie) : '-'}</TableCell>
                  <TableCell>{forste ? formatDato(forste) : '-'}</TableCell>
                  <TableCell>{l.forfall_dag || 1}.</TableCell>
                  <TableCell><Badge variant={l.naavaerende ? 'default' : 'secondary'}>{l.naavaerende ? 'Aktiv' : 'Tidligere'}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showNew && leietakerForm(saveNew, 'Ny leietaker')}
      {editing && leietakerForm(saveEdit, 'Rediger leietaker')}
    </div>
  );
}
