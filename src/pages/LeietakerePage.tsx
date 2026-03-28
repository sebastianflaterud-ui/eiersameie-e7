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
import { Plus, ArrowLeft, Edit } from 'lucide-react';

interface Leietaker {
  id: string; navn: string; epost: string | null; telefon: string | null;
  personnr: string | null; fodselsdato: string | null; naavaerende: boolean | null;
  notater: string | null;
}

interface Enhet { id: string; navn: string; }

interface LeieforholdRow {
  id: string; leietaker_id: string; enhet_id: string; innflytting: string;
  utflytting: string | null; avtalt_leie: number; depositum: number | null;
  depositumskonto: string | null; leiekontrakt_signert: boolean | null;
  status: string; notater: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

export default function LeietakerePage() {
  const { user } = useAuth();
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [leieforhold, setLeieforhold] = useState<LeieforholdRow[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [selected, setSelected] = useState<Leietaker | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<'alle' | 'nåværende' | 'tidligere'>('alle');
  const [year, setYear] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    const [lt, e, lf] = await Promise.all([
      supabase.from('leietakere').select('*').order('navn'),
      supabase.from('enheter').select('id, navn'),
      supabase.from('leieforhold').select('*').order('innflytting', { ascending: false }),
    ]);
    if (lt.data) setLeietakere(lt.data as Leietaker[]);
    if (e.data) setEnheter(e.data as Enhet[]);
    if (lf.data) setLeieforhold(lf.data as LeieforholdRow[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load txs when a tenant is selected
  useEffect(() => {
    if (!selected) return;
    supabase.from('transaksjoner').select('*')
      .eq('kategori', 'Eiersameie E7').eq('retning', 'inn')
      .gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`)
      .order('dato', { ascending: false })
      .then(({ data }) => { if (data) setTxs(data); });
  }, [selected, year]);

  const getEnhet = (id: string) => enheter.find(e => e.id === id);
  const getLeieforholdForLeietaker = (id: string) => leieforhold.filter(l => l.leietaker_id === id);
  const getAktivtLeieforhold = (id: string) => leieforhold.find(l => l.leietaker_id === id && l.status === 'aktiv');

  const filtered = leietakere.filter(l => {
    if (filter === 'nåværende') return l.naavaerende;
    if (filter === 'tidligere') return !l.naavaerende;
    return true;
  });

  const naavaerende = leietakere.filter(l => l.naavaerende).length;
  const tidligere = leietakere.filter(l => !l.naavaerende).length;

  const saveNew = async () => {
    if (!user || !form.navn) return;
    const { error } = await supabase.from('leietakere').insert({
      user_id: user.id, navn: form.navn, epost: form.epost || null,
      telefon: form.telefon || null, personnr: form.personnr || null,
      fodselsdato: form.fodselsdato || null, naavaerende: form.naavaerende === 'true',
      notater: form.notater || null,
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
      notater: form.notater || null,
    }).eq('id', selected.id);
    if (error) { toast.error('Feil: ' + error.message); return; }
    toast.success('Leietaker oppdatert'); setEditing(false); setSelected(null); load();
  };

  if (selected && !editing) {
    const lfs = getLeieforholdForLeietaker(selected.id);
    const aktivt = getAktivtLeieforhold(selected.id);
    const aktivEnhet = aktivt ? getEnhet(aktivt.enhet_id) : null;
    const tenantTxs = txs.filter(t => (t.leie_for || t.motpart_egen || t.motpart_bank || '').toLowerCase().includes(selected.navn.split(' ')[0].toLowerCase()));

    // Payment matrix
    const monthlyPayments: Record<number, number> = {};
    for (const t of tenantTxs) {
      const m = parseInt(t.dato.slice(5, 7));
      monthlyPayments[m] = (monthlyPayments[m] || 0) + Number(t.belop);
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">{selected.navn}</h1>
          <Badge variant={selected.naavaerende ? 'default' : 'secondary'}>{selected.naavaerende ? 'Nåværende' : 'Tidligere'}</Badge>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setForm({ ...selected, naavaerende: String(selected.naavaerende) }); setEditing(true); }}>
            <Edit className="h-4 w-4 mr-1" /> Rediger
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Card><CardContent className="pt-4"><div className="text-muted-foreground">E-post</div><div className="font-medium">{selected.epost || '-'}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-muted-foreground">Telefon</div><div className="font-medium">{selected.telefon || '-'}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-muted-foreground">Personnr</div><div className="font-medium">{selected.personnr || '-'}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-muted-foreground">Fødselsdato</div><div className="font-medium">{selected.fodselsdato ? formatDato(selected.fodselsdato) : '-'}</div></CardContent></Card>
        </div>

        {aktivt && aktivEnhet && (
          <Card>
            <CardHeader><CardTitle className="text-base">Aktivt leieforhold</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Enhet:</span> <span className="font-medium">{aktivEnhet.navn}</span></div>
                <div><span className="text-muted-foreground">Innflytting:</span> <span className="font-medium">{formatDato(aktivt.innflytting)}</span></div>
                <div><span className="text-muted-foreground">Avtalt leie:</span> <span className="font-mono font-medium">{formatBelop(aktivt.avtalt_leie)}</span></div>
                <div><span className="text-muted-foreground">Depositum:</span> <span className="font-mono font-medium">{aktivt.depositum ? formatBelop(aktivt.depositum) : '-'}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Leiehistorikk</CardTitle></CardHeader>
          <CardContent>
            {lfs.length === 0 ? <p className="text-sm text-muted-foreground">Ingen leieforhold registrert.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Enhet</TableHead><TableHead>Innflytting</TableHead><TableHead>Utflytting</TableHead>
                  <TableHead>Varighet</TableHead><TableHead className="text-right">Avtalt leie</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {lfs.map(l => {
                    const enhet = getEnhet(l.enhet_id);
                    const start = new Date(l.innflytting);
                    const end = l.utflytting ? new Date(l.utflytting) : new Date();
                    const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{enhet?.navn || '-'}</TableCell>
                        <TableCell>{formatDato(l.innflytting)}</TableCell>
                        <TableCell>{l.utflytting ? formatDato(l.utflytting) : '-'}</TableCell>
                        <TableCell>{months} mnd</TableCell>
                        <TableCell className="text-right font-mono">{formatBelop(l.avtalt_leie)}</TableCell>
                        <TableCell><Badge variant={l.status === 'aktiv' ? 'default' : 'secondary'}>{l.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
                    <TableCell className="text-right font-mono font-bold">{formatBelop(Object.values(monthlyPayments).reduce((s, v) => s + v, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

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
      </div>
    );
  }

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
            <TableHead>Navn</TableHead><TableHead>Enhet</TableHead><TableHead>Innflytting</TableHead>
            <TableHead className="text-right">Avtalt leie</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(l => {
              const aktivt = getAktivtLeieforhold(l.id);
              const enhet = aktivt ? getEnhet(aktivt.enhet_id) : null;
              return (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(l)}>
                  <TableCell className="font-medium">{l.navn}</TableCell>
                  <TableCell>{enhet?.navn || '-'}</TableCell>
                  <TableCell>{aktivt ? formatDato(aktivt.innflytting) : '-'}</TableCell>
                  <TableCell className="text-right font-mono">{aktivt ? formatBelop(aktivt.avtalt_leie) : '-'}</TableCell>
                  <TableCell><Badge variant={l.naavaerende ? 'default' : 'secondary'}>{l.naavaerende ? 'Nåværende' : 'Tidligere'}</Badge></TableCell>
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
