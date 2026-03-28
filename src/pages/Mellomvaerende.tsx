import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatBelop, formatDato } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, ArrowLeft, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

interface Mellomvaerende {
  id: string; user_id: string; navn: string; debitor: string; kreditor: string;
  type: string; opprinnelig_belop: number; gjeldende_saldo: number; valuta: string;
  startdato: string; innfridd_dato: string | null; rente_prosent: number;
  beskrivelse: string | null; aktiv: boolean; opprettet: string; oppdatert: string;
}

interface Bevegelse {
  id: string; user_id: string; mellomvaerende_id: string; dato: string;
  belop: number; type: string; beskrivelse: string | null;
  transaksjon_id: string | null; opprettet: string;
}

export default function MellomvaerendePage() {
  const { session } = useAuth();
  const [items, setItems] = useState<Mellomvaerende[]>([]);
  const [selected, setSelected] = useState<Mellomvaerende | null>(null);
  const [bevegelser, setBevegelser] = useState<Bevegelse[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showNewBev, setShowNewBev] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ navn: '', debitor: '', kreditor: '', type: 'lån', opprinnelig_belop: '', gjeldende_saldo: '', startdato: '', rente_prosent: '0', beskrivelse: '' });
  const [bevForm, setBevForm] = useState({ dato: new Date().toISOString().split('T')[0], belop: '', type: 'nedbetaling', beskrivelse: '' });

  const userId = session?.user?.id;

  async function fetchAll() {
    if (!userId) return;
    const { data } = await supabase.from('mellomvaerende').select('*').eq('user_id', userId).order('opprettet', { ascending: false });
    if (data) setItems(data as unknown as Mellomvaerende[]);
  }

  async function fetchBevegelser(mvId: string) {
    const { data } = await supabase.from('mellomvaerende_bevegelser').select('*').eq('mellomvaerende_id', mvId).order('dato', { ascending: false });
    if (data) setBevegelser(data as unknown as Bevegelse[]);
  }

  useEffect(() => { fetchAll(); }, [userId]);

  useEffect(() => { if (selected) fetchBevegelser(selected.id); }, [selected?.id]);

  const totals = useMemo(() => {
    const aktive = items.filter(i => i.aktiv);
    const totalUtestaaende = aktive.reduce((s, i) => s + Number(i.gjeldende_saldo), 0);
    const totalNedbetalt = items.reduce((s, i) => s + (Number(i.opprinnelig_belop) - Number(i.gjeldende_saldo)), 0);
    return { aktive: aktive.length, utestaaende: totalUtestaaende, nedbetalt: totalNedbetalt };
  }, [items]);

  async function saveMV() {
    if (!userId) return;
    const payload = {
      user_id: userId, navn: form.navn, debitor: form.debitor, kreditor: form.kreditor,
      type: form.type, opprinnelig_belop: parseFloat(form.opprinnelig_belop) || 0,
      gjeldende_saldo: parseFloat(form.gjeldende_saldo) || 0,
      startdato: form.startdato, rente_prosent: parseFloat(form.rente_prosent) || 0,
      beskrivelse: form.beskrivelse || null,
    };
    if (editing && selected) {
      const { opprinnelig_belop, gjeldende_saldo, rente_prosent, ...rest } = payload;
      await supabase.from('mellomvaerende').update({ ...rest, opprinnelig_belop, gjeldende_saldo, rente_prosent }).eq('id', selected.id);
      toast.success('Oppdatert');
    } else {
      await supabase.from('mellomvaerende').insert(payload as any);
      toast.success('Opprettet');
    }
    setShowNew(false); setEditing(false);
    fetchAll();
  }

  async function saveBevegelse() {
    if (!userId || !selected) return;
    const belop = parseFloat(bevForm.belop) || 0;
    await supabase.from('mellomvaerende_bevegelser').insert({
      user_id: userId, mellomvaerende_id: selected.id,
      dato: bevForm.dato, belop, type: bevForm.type, beskrivelse: bevForm.beskrivelse || null,
    } as any);

    // Update saldo
    let newSaldo = Number(selected.gjeldende_saldo);
    if (bevForm.type === 'utbetaling') newSaldo += belop;
    else if (bevForm.type === 'nedbetaling') newSaldo -= belop;
    else if (bevForm.type === 'rente') newSaldo += belop;
    else newSaldo += belop; // justering

    const updates: any = { gjeldende_saldo: Math.max(0, newSaldo) };
    if (newSaldo <= 0) { updates.aktiv = false; updates.innfridd_dato = bevForm.dato; }
    await supabase.from('mellomvaerende').update(updates).eq('id', selected.id);

    toast.success('Bevegelse registrert');
    setShowNewBev(false);
    setBevForm({ dato: new Date().toISOString().split('T')[0], belop: '', type: 'nedbetaling', beskrivelse: '' });
    fetchAll();
    fetchBevegelser(selected.id);
    // Refresh selected
    const { data } = await supabase.from('mellomvaerende').select('*').eq('id', selected.id).single();
    if (data) setSelected(data as unknown as Mellomvaerende);
  }

  async function deleteBevegelse(bev: Bevegelse) {
    await supabase.from('mellomvaerende_bevegelser').delete().eq('id', bev.id);
    toast.success('Slettet');
    fetchBevegelser(selected!.id);
  }

  // Computed values for selected
  const beregnetSaldo = useMemo(() => {
    if (!selected) return 0;
    let s = Number(selected.opprinnelig_belop);
    for (const b of [...bevegelser].sort((a, c) => a.dato.localeCompare(c.dato))) {
      if (b.type === 'utbetaling') s += Number(b.belop);
      else if (b.type === 'nedbetaling') s -= Number(b.belop);
      else if (b.type === 'rente') s += Number(b.belop);
      else s += Number(b.belop);
    }
    return s;
  }, [selected, bevegelser]);

  const saldoAvvik = selected ? Math.abs(beregnetSaldo - Number(selected.gjeldende_saldo)) > 0.01 : false;

  const prognose = useMemo(() => {
    if (!selected || Number(selected.gjeldende_saldo) <= 0) return null;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentNedbetalinger = bevegelser
      .filter(b => b.type === 'nedbetaling' && new Date(b.dato) >= sixMonthsAgo);
    if (recentNedbetalinger.length === 0) return null;
    const totalNedbet = recentNedbetalinger.reduce((s, b) => s + Number(b.belop), 0);
    const months = Math.max(1, 6);
    const avgPerMonth = totalNedbet / months;
    if (avgPerMonth <= 0) return null;
    const remainingMonths = Math.ceil(Number(selected.gjeldende_saldo) / avgPerMonth);
    const est = new Date();
    est.setMonth(est.getMonth() + remainingMonths);
    const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
    return { dato: `${monthNames[est.getMonth()]} ${est.getFullYear()}`, avgPerMonth };
  }, [selected, bevegelser]);

  const progress = selected && Number(selected.opprinnelig_belop) > 0
    ? Math.min(100, ((Number(selected.opprinnelig_belop) - Number(selected.gjeldende_saldo)) / Number(selected.opprinnelig_belop)) * 100)
    : 0;

  const bevTypeColors: Record<string, string> = {
    utbetaling: 'bg-red-100 text-red-800', nedbetaling: 'bg-green-100 text-green-800',
    rente: 'bg-blue-100 text-blue-800', justering: 'bg-gray-100 text-gray-800',
  };

  function openEdit(mv: Mellomvaerende) {
    setForm({
      navn: mv.navn, debitor: mv.debitor, kreditor: mv.kreditor, type: mv.type,
      opprinnelig_belop: String(mv.opprinnelig_belop), gjeldende_saldo: String(mv.gjeldende_saldo),
      startdato: mv.startdato, rente_prosent: String(mv.rente_prosent), beskrivelse: mv.beskrivelse || '',
    });
    setEditing(true); setShowNew(true);
  }

  // Running saldo for table
  const bevegelserMedSaldo = useMemo(() => {
    if (!selected) return [];
    const sorted = [...bevegelser].sort((a, b) => a.dato.localeCompare(b.dato));
    let s = Number(selected.opprinnelig_belop);
    const result: (Bevegelse & { saldoEtter: number })[] = [];
    for (const b of sorted) {
      if (b.type === 'utbetaling') s += Number(b.belop);
      else if (b.type === 'nedbetaling') s -= Number(b.belop);
      else if (b.type === 'rente') s += Number(b.belop);
      else s += Number(b.belop);
      result.push({ ...b, saldoEtter: s });
    }
    return result.reverse();
  }, [selected, bevegelser]);

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4 mr-1" />Tilbake</Button>
          <h1 className="text-2xl font-bold">{selected.navn}</h1>
          <Badge className={selected.aktiv ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
            {selected.aktiv ? 'Aktiv' : 'Innfridd'}
          </Badge>
        </div>

        {!selected.aktiv && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Mellomværendet er innfridd!
              {selected.debitor === 'Motivus AS' && ' Motivus AS skal nå begynne å motta sin andel av leieinntektene.'}
              {selected.debitor === 'David Lange-Nielsen' && ' David Lange-Nielsen skal nå begynne å motta sin andel av leieinntektene.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informasjon</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Debitor:</span><span className="font-medium">{selected.debitor}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Kreditor:</span><span className="font-medium">{selected.kreditor}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span>{selected.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Startdato:</span><span>{formatDato(selected.startdato)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rente:</span><span>{String(selected.rente_prosent).replace('.', ',')} %</span></div>
              {selected.beskrivelse && <p className="text-muted-foreground pt-2 border-t">{selected.beskrivelse}</p>}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => openEdit(selected)}>Rediger</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Saldooversikt</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="font-mono space-y-1">
                <div className="flex justify-between"><span>Opprinnelig beløp:</span><span>{formatBelop(selected.opprinnelig_belop)}</span></div>
                <div className="flex justify-between"><span>Nedbetalt totalt:</span><span className="text-green-600">-{formatBelop(Number(selected.opprinnelig_belop) - Number(selected.gjeldende_saldo))}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Gjeldende saldo:</span><span>{formatBelop(selected.gjeldende_saldo)}</span></div>
              </div>
              <Progress value={progress} className="h-3" />
              <span className="text-xs text-muted-foreground">{progress.toFixed(0)} % nedbetalt</span>

              {saldoAvvik && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span>Beregnet saldo ({formatBelop(beregnetSaldo)}) avviker fra lagret saldo.</span>
                  <Button size="sm" variant="outline" onClick={async () => {
                    await supabase.from('mellomvaerende').update({ gjeldende_saldo: Math.max(0, beregnetSaldo) } as any).eq('id', selected.id);
                    const { data } = await supabase.from('mellomvaerende').select('*').eq('id', selected.id).single();
                    if (data) setSelected(data as unknown as Mellomvaerende);
                    fetchAll();
                    toast.success('Saldo korrigert');
                  }}>Korriger</Button>
                </div>
              )}

              {prognose && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  <span>Estimert innfridd: <strong>{prognose.dato}</strong> (basert på gjennomsnittlig {formatBelop(prognose.avgPerMonth)}/mnd)</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Bevegelseshistorikk</CardTitle>
            <Dialog open={showNewBev} onOpenChange={setShowNewBev}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Ny bevegelse</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ny bevegelse</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Dato</Label><Input type="date" value={bevForm.dato} onChange={e => setBevForm(p => ({ ...p, dato: e.target.value }))} /></div>
                  <div><Label>Beløp</Label><Input type="number" value={bevForm.belop} onChange={e => setBevForm(p => ({ ...p, belop: e.target.value }))} /></div>
                  <div><Label>Type</Label>
                    <Select value={bevForm.type} onValueChange={v => setBevForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utbetaling">Utbetaling</SelectItem>
                        <SelectItem value="nedbetaling">Nedbetaling</SelectItem>
                        <SelectItem value="rente">Rente</SelectItem>
                        <SelectItem value="justering">Justering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Beskrivelse</Label><Input value={bevForm.beskrivelse} onChange={e => setBevForm(p => ({ ...p, beskrivelse: e.target.value }))} /></div>
                  <Button onClick={saveBevegelse} className="w-full">Lagre</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Beløp</TableHead>
                  <TableHead className="text-right">Saldo etter</TableHead><TableHead>Beskrivelse</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bevegelserMedSaldo.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{formatDato(b.dato)}</TableCell>
                    <TableCell><Badge className={bevTypeColors[b.type] || ''}>{b.type}</Badge></TableCell>
                    <TableCell className={`text-right font-mono ${b.type === 'nedbetaling' ? 'text-green-600' : b.type === 'utbetaling' ? 'text-red-600' : ''}`}>
                      {b.type === 'nedbetaling' ? '-' : ''}{formatBelop(b.belop)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(b.saldoEtter)}</TableCell>
                    <TableCell className="text-sm">{b.beskrivelse || '-'}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteBevegelse(b)}>Slett</Button></TableCell>
                  </TableRow>
                ))}
                {bevegelserMedSaldo.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Ingen bevegelser registrert</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mellomværende</h1>
        <Dialog open={showNew} onOpenChange={(o) => { setShowNew(o); if (!o) setEditing(false); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nytt mellomværende</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Rediger' : 'Nytt'} mellomværende</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Navn</Label><Input value={form.navn} onChange={e => setForm(p => ({ ...p, navn: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Debitor</Label><Input value={form.debitor} onChange={e => setForm(p => ({ ...p, debitor: e.target.value }))} /></div>
                <div><Label>Kreditor</Label><Input value={form.kreditor} onChange={e => setForm(p => ({ ...p, kreditor: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Opprinnelig beløp</Label><Input type="number" value={form.opprinnelig_belop} onChange={e => setForm(p => ({ ...p, opprinnelig_belop: e.target.value }))} /></div>
                <div><Label>Gjeldende saldo</Label><Input type="number" value={form.gjeldende_saldo} onChange={e => setForm(p => ({ ...p, gjeldende_saldo: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Startdato</Label><Input type="date" value={form.startdato} onChange={e => setForm(p => ({ ...p, startdato: e.target.value }))} /></div>
                <div><Label>Rente %</Label><Input type="number" value={form.rente_prosent} onChange={e => setForm(p => ({ ...p, rente_prosent: e.target.value }))} /></div>
              </div>
              <div><Label>Beskrivelse</Label><Textarea value={form.beskrivelse} onChange={e => setForm(p => ({ ...p, beskrivelse: e.target.value }))} /></div>
              <Button onClick={saveMV} className="w-full">Lagre</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{totals.aktive}</div>
          <div className="text-sm text-muted-foreground">Aktive mellomværender</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-red-600">{formatBelop(totals.utestaaende)}</div>
          <div className="text-sm text-muted-foreground">Totalt utestående</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{formatBelop(totals.nedbetalt)}</div>
          <div className="text-sm text-muted-foreground">Nedbetalt totalt</div>
        </CardContent></Card>
      </div>

      <div className="grid gap-4">
        {items.map(mv => {
          const p = Number(mv.opprinnelig_belop) > 0
            ? Math.min(100, ((Number(mv.opprinnelig_belop) - Number(mv.gjeldende_saldo)) / Number(mv.opprinnelig_belop)) * 100) : 0;
          return (
            <Card key={mv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(mv)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{mv.navn}</h3>
                    <p className="text-sm text-muted-foreground">{mv.debitor} → {mv.kreditor}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono">{formatBelop(mv.gjeldende_saldo)}</div>
                    <Badge className={mv.aktiv ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                      {mv.aktiv ? 'Aktiv' : 'Innfridd'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Opprinnelig: {formatBelop(mv.opprinnelig_belop)}</span>
                  <Progress value={p} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">{p.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-muted-foreground text-center py-8">Ingen mellomværender opprettet ennå.</p>}
      </div>
    </div>
  );
}
