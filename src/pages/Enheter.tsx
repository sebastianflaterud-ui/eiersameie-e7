import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBelop, formatDato } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, DoorOpen, Edit, ArrowLeft } from 'lucide-react';

interface Enhet {
  id: string; navn: string; type: string; beskrivelse: string | null;
  maanedsleie_standard: number | null; areal_kvm: number | null; etasje: string | null;
  fasiliteter: string | null; status: string; aktiv: boolean | null;
}

interface Leieforhold {
  id: string; leietaker_id: string; enhet_id: string; innflytting: string;
  utflytting: string | null; avtalt_leie: number; depositum: number | null;
  depositumskonto: string | null; leiekontrakt_signert: boolean | null;
  status: string; notater: string | null;
}

interface Leietaker { id: string; navn: string; }

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    utleid: { label: 'Utleid', variant: 'default' },
    ledig: { label: 'Ledig', variant: 'secondary' },
    vedlikehold: { label: 'Vedlikehold', variant: 'destructive' },
    ikke_i_bruk: { label: 'Ikke i bruk', variant: 'outline' },
  };
  const m = map[s] || { label: s, variant: 'outline' as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

const typeBadge = (t: string) => <Badge variant="outline" className="text-xs">{t === 'hybel' ? 'Hybel' : t === 'rom' ? 'Rom' : t === 'leilighet' ? 'Leilighet' : 'Annet'}</Badge>;

export default function Enheter() {
  const { user } = useAuth();
  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [leieforhold, setLeieforhold] = useState<Leieforhold[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [selected, setSelected] = useState<Enhet | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const [e, lf, lt] = await Promise.all([
      supabase.from('enheter').select('*').eq('aktiv', true).order('navn'),
      supabase.from('leieforhold').select('*').order('innflytting', { ascending: false }),
      supabase.from('leietakere').select('id, navn'),
    ]);
    if (e.data) setEnheter(e.data as Enhet[]);
    if (lf.data) setLeieforhold(lf.data as Leieforhold[]);
    if (lt.data) setLeietakere(lt.data as Leietaker[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getAktivtLeieforhold = (enhetId: string) => leieforhold.find(l => l.enhet_id === enhetId && l.status === 'aktiv');
  const getLeietaker = (id: string) => leietakere.find(l => l.id === id);
  const getHistorikk = (enhetId: string) => leieforhold.filter(l => l.enhet_id === enhetId);

  const utleid = enheter.filter(e => e.status === 'utleid').length;
  const ledig = enheter.filter(e => e.status === 'ledig').length;
  const belegg = enheter.length > 0 ? (utleid / enheter.length) * 100 : 0;

  const saveNew = async () => {
    if (!user || !form.navn) return;
    const { error } = await supabase.from('enheter').insert({
      user_id: user.id, navn: form.navn, type: form.type || 'rom',
      beskrivelse: form.beskrivelse || null, maanedsleie_standard: form.maanedsleie_standard ? Number(form.maanedsleie_standard) : null,
      areal_kvm: form.areal_kvm ? Number(form.areal_kvm) : null, etasje: form.etasje || null,
      fasiliteter: form.fasiliteter || null, status: form.status || 'ledig',
    });
    if (error) { toast.error('Feil: ' + error.message); return; }
    toast.success('Enhet opprettet');
    setShowNew(false); setForm({}); load();
  };

  const saveEdit = async () => {
    if (!selected) return;
    const { error } = await supabase.from('enheter').update({
      navn: form.navn, type: form.type, beskrivelse: form.beskrivelse || null,
      maanedsleie_standard: form.maanedsleie_standard ? Number(form.maanedsleie_standard) : null,
      areal_kvm: form.areal_kvm ? Number(form.areal_kvm) : null, etasje: form.etasje || null,
      fasiliteter: form.fasiliteter || null, status: form.status,
    }).eq('id', selected.id);
    if (error) { toast.error('Feil: ' + error.message); return; }
    toast.success('Enhet oppdatert');
    setEditing(false); setSelected(null); load();
  };

  if (selected && !editing) {
    const historikk = getHistorikk(selected.id);
    const aktivt = getAktivtLeieforhold(selected.id);
    const aktivLeietaker = aktivt ? getLeietaker(aktivt.leietaker_id) : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">{selected.navn}</h1>
          {typeBadge(selected.type)}
          {statusBadge(selected.status)}
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setForm(selected); setEditing(true); }}>
            <Edit className="h-4 w-4 mr-1" /> Rediger
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Standard månedsleie</div><div className="text-xl font-bold">{selected.maanedsleie_standard ? formatBelop(selected.maanedsleie_standard) : '-'}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Areal</div><div className="text-xl font-bold">{selected.areal_kvm ? `${selected.areal_kvm} m²` : '-'}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Etasje</div><div className="text-xl font-bold">{selected.etasje || '-'}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Status</div><div className="text-xl">{statusBadge(selected.status)}</div></CardContent></Card>
        </div>

        {selected.beskrivelse && <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">{selected.beskrivelse}</p></CardContent></Card>}

        {aktivt && aktivLeietaker && (
          <Card>
            <CardHeader><CardTitle className="text-base">Nåværende leieforhold</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Leietaker:</span> <span className="font-medium">{aktivLeietaker.navn}</span></div>
                <div><span className="text-muted-foreground">Innflytting:</span> <span className="font-medium">{formatDato(aktivt.innflytting)}</span></div>
                <div><span className="text-muted-foreground">Avtalt leie:</span> <span className="font-medium">{formatBelop(aktivt.avtalt_leie)}</span></div>
                <div><span className="text-muted-foreground">Depositum:</span> <span className="font-medium">{aktivt.depositum ? formatBelop(aktivt.depositum) : '-'}</span></div>
              </div>
              {aktivt.leiekontrakt_signert ? <Badge variant="default">Kontrakt signert</Badge> : <Badge variant="destructive">Kontrakt ikke signert</Badge>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Leieforholdshistorikk</CardTitle></CardHeader>
          <CardContent>
            {historikk.length === 0 ? <p className="text-sm text-muted-foreground">Ingen leieforhold registrert.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leietaker</TableHead>
                    <TableHead>Innflytting</TableHead>
                    <TableHead>Utflytting</TableHead>
                    <TableHead>Varighet</TableHead>
                    <TableHead className="text-right">Avtalt leie</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historikk.map(h => {
                    const lt = getLeietaker(h.leietaker_id);
                    const start = new Date(h.innflytting);
                    const end = h.utflytting ? new Date(h.utflytting) : new Date();
                    const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{lt?.navn || '-'}</TableCell>
                        <TableCell>{formatDato(h.innflytting)}</TableCell>
                        <TableCell>{h.utflytting ? formatDato(h.utflytting) : '-'}</TableCell>
                        <TableCell>{months} mnd</TableCell>
                        <TableCell className="text-right font-mono">{formatBelop(h.avtalt_leie)}</TableCell>
                        <TableCell><Badge variant={h.status === 'aktiv' ? 'default' : 'secondary'}>{h.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const enhetForm = (onSave: () => void, title: string) => (
    <Dialog open onOpenChange={() => { setShowNew(false); setEditing(false); setForm({}); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Navn</Label><Input value={form.navn || ''} onChange={e => setForm(f => ({ ...f, navn: e.target.value }))} /></div>
          <div><Label>Type</Label>
            <Select value={form.type || 'rom'} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hybel">Hybel</SelectItem>
                <SelectItem value="rom">Rom</SelectItem>
                <SelectItem value="leilighet">Leilighet</SelectItem>
                <SelectItem value="annet">Annet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Beskrivelse</Label><Textarea value={form.beskrivelse || ''} onChange={e => setForm(f => ({ ...f, beskrivelse: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Standard månedsleie</Label><Input type="number" value={form.maanedsleie_standard || ''} onChange={e => setForm(f => ({ ...f, maanedsleie_standard: e.target.value }))} /></div>
            <div><Label>Areal (m²)</Label><Input type="number" value={form.areal_kvm || ''} onChange={e => setForm(f => ({ ...f, areal_kvm: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Etasje</Label><Input value={form.etasje || ''} onChange={e => setForm(f => ({ ...f, etasje: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status || 'ledig'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utleid">Utleid</SelectItem>
                  <SelectItem value="ledig">Ledig</SelectItem>
                  <SelectItem value="vedlikehold">Vedlikehold</SelectItem>
                  <SelectItem value="ikke_i_bruk">Ikke i bruk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Fasiliteter</Label><Textarea value={form.fasiliteter || ''} onChange={e => setForm(f => ({ ...f, fasiliteter: e.target.value }))} /></div>
        </div>
        <DialogFooter><Button onClick={onSave}>Lagre</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Enheter</h1>
        <Button onClick={() => { setForm({}); setShowNew(true); }}><Plus className="h-4 w-4 mr-1" /> Ny enhet</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{enheter.length}</div><div className="text-sm text-muted-foreground">Totalt enheter</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{utleid}</div><div className="text-sm text-muted-foreground">Utleid</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{ledig}</div><div className="text-sm text-muted-foreground">Ledig</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{belegg.toFixed(0)} %</div><div className="text-sm text-muted-foreground">Beleggsprosent</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enheter.map(e => {
          const aktivt = getAktivtLeieforhold(e.id);
          const lt = aktivt ? getLeietaker(aktivt.leietaker_id) : null;
          return (
            <Card key={e.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelected(e)}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{e.navn}</h3>
                  {typeBadge(e.type)}
                </div>
                {statusBadge(e.status)}
                {lt && aktivt && (
                  <div className="text-sm space-y-1 pt-1 border-t">
                    <div className="text-muted-foreground">Leietaker: <span className="text-foreground font-medium">{lt.navn}</span></div>
                    <div className="text-muted-foreground">Avtalt leie: <span className="text-foreground font-mono">{formatBelop(aktivt.avtalt_leie)}</span></div>
                  </div>
                )}
                {e.maanedsleie_standard && e.maanedsleie_standard > 0 && (
                  <div className="text-xs text-muted-foreground">Standard: {formatBelop(e.maanedsleie_standard)}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showNew && enhetForm(saveNew, 'Ny enhet')}
      {editing && enhetForm(saveEdit, 'Rediger enhet')}
    </div>
  );
}
