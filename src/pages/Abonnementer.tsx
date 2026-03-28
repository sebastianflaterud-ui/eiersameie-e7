import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBelop } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Abonnement {
  id: string;
  navn: string;
  leverandor: string;
  beskrivelse: string | null;
  kategori: string;
  type: string | null;
  belop_original: number;
  valuta: string | null;
  belop_nok: number;
  faktureringsperiode: string | null;
  trekkdato: number | null;
  betalingskort: string | null;
  nettside: string | null;
  aktiv: boolean | null;
  startdato: string | null;
  sluttdato: string | null;
  notater: string | null;
}

const kategoriColors: Record<string, string> = {
  'Privat': 'bg-blue-100 text-blue-800',
  'Motivus AS': 'bg-purple-100 text-purple-800',
  'Multis EHF': 'bg-green-100 text-green-800',
};

function toMonthly(belop: number, periode: string | null): number {
  switch (periode) {
    case 'kvartalsvis': return belop / 3;
    case 'halvårlig': return belop / 6;
    case 'årlig': return belop / 12;
    default: return belop;
  }
}

export default function Abonnementer() {
  const { user } = useAuth();
  const [items, setItems] = useState<Abonnement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Abonnement | null>(null);
  const [filterKategori, setFilterKategori] = useState<string>('alle');
  const [filterAktiv, setFilterAktiv] = useState<string>('aktiv');
  const [form, setForm] = useState({
    navn: '', leverandor: '', beskrivelse: '', kategori: 'Privat', type: '',
    belop_original: '', valuta: 'NOK', belop_nok: '', faktureringsperiode: 'månedlig',
    trekkdato: '', betalingskort: '', nettside: '', aktiv: true,
    startdato: '', sluttdato: '', notater: '',
  });

  const fetchItems = async () => {
    let query = supabase.from('abonnementer').select('*').order('navn');
    if (filterAktiv === 'aktiv') query = query.eq('aktiv', true);
    else if (filterAktiv === 'inaktiv') query = query.eq('aktiv', false);
    if (filterKategori !== 'alle') query = query.eq('kategori', filterKategori);
    const { data } = await query;
    if (data) setItems(data as Abonnement[]);
  };

  useEffect(() => { fetchItems(); }, [filterKategori, filterAktiv]);

  const aktive = items.filter(i => i.aktiv);
  const totalMaanedlig = aktive.reduce((s, i) => s + toMonthly(i.belop_nok, i.faktureringsperiode), 0);
  const privatSum = aktive.filter(i => i.kategori === 'Privat').reduce((s, i) => s + toMonthly(i.belop_nok, i.faktureringsperiode), 0);
  const motivusSum = aktive.filter(i => i.kategori === 'Motivus AS').reduce((s, i) => s + toMonthly(i.belop_nok, i.faktureringsperiode), 0);
  const multisSum = aktive.filter(i => i.kategori === 'Multis EHF').reduce((s, i) => s + toMonthly(i.belop_nok, i.faktureringsperiode), 0);

  const openNew = () => {
    setEditing(null);
    setForm({ navn: '', leverandor: '', beskrivelse: '', kategori: 'Privat', type: '', belop_original: '', valuta: 'NOK', belop_nok: '', faktureringsperiode: 'månedlig', trekkdato: '', betalingskort: '', nettside: '', aktiv: true, startdato: '', sluttdato: '', notater: '' });
    setDialogOpen(true);
  };

  const openEdit = (a: Abonnement) => {
    setEditing(a);
    setForm({
      navn: a.navn, leverandor: a.leverandor, beskrivelse: a.beskrivelse || '', kategori: a.kategori,
      type: a.type || '', belop_original: String(a.belop_original), valuta: a.valuta || 'NOK',
      belop_nok: String(a.belop_nok), faktureringsperiode: a.faktureringsperiode || 'månedlig',
      trekkdato: a.trekkdato ? String(a.trekkdato) : '', betalingskort: a.betalingskort || '',
      nettside: a.nettside || '', aktiv: a.aktiv ?? true, startdato: a.startdato || '',
      sluttdato: a.sluttdato || '', notater: a.notater || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.navn || !form.leverandor || !form.belop_nok) { toast.error('Fyll ut påkrevde felter'); return; }
    const payload = {
      navn: form.navn, leverandor: form.leverandor, beskrivelse: form.beskrivelse || null,
      kategori: form.kategori as any, type: form.type || null,
      belop_original: parseFloat(form.belop_original) || parseFloat(form.belop_nok),
      valuta: form.valuta, belop_nok: parseFloat(form.belop_nok),
      faktureringsperiode: form.faktureringsperiode as any, trekkdato: form.trekkdato ? parseInt(form.trekkdato) : null,
      betalingskort: form.betalingskort || null, nettside: form.nettside || null, aktiv: form.aktiv,
      startdato: form.startdato || null, sluttdato: form.sluttdato || null, notater: form.notater || null,
    };
    if (editing) {
      const { error } = await supabase.from('abonnementer').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Abonnement oppdatert');
    } else {
      const { error } = await supabase.from('abonnementer').insert({ ...payload, user_id: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success('Abonnement opprettet');
    }
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker?')) return;
    await supabase.from('abonnementer').delete().eq('id', id);
    toast.success('Slettet');
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Abonnementer</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nytt abonnement</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatBelop(totalMaanedlig)}</div><div className="text-sm text-muted-foreground">Totalt månedlig</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{formatBelop(privatSum)}</div><div className="text-sm text-muted-foreground">Privat</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-purple-600">{formatBelop(motivusSum)}</div><div className="text-sm text-muted-foreground">Motivus AS</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{formatBelop(multisSum)}</div><div className="text-sm text-muted-foreground">Multis EHF</div></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Select value={filterKategori} onValueChange={setFilterKategori}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle kategorier</SelectItem>
            <SelectItem value="Privat">Privat</SelectItem>
            <SelectItem value="Motivus AS">Motivus AS</SelectItem>
            <SelectItem value="Multis EHF">Multis EHF</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAktiv} onValueChange={setFilterAktiv}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle</SelectItem>
            <SelectItem value="aktiv">Aktive</SelectItem>
            <SelectItem value="inaktiv">Inaktive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Leverandør</TableHead>
              <TableHead className="text-right">Beløp (NOK)</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Trekkdato</TableHead>
              <TableHead>Kort</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Aktiv</TableHead>
              <TableHead className="w-[100px]">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(a => (
              <TableRow key={a.id} className={!a.aktiv ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{a.navn}</TableCell>
                <TableCell>{a.leverandor}</TableCell>
                <TableCell className="text-right font-mono">{formatBelop(a.belop_nok)}{a.valuta !== 'NOK' && <span className="text-xs text-muted-foreground ml-1">({a.belop_original} {a.valuta})</span>}</TableCell>
                <TableCell className="text-sm">{a.faktureringsperiode}</TableCell>
                <TableCell className="text-sm">{a.trekkdato ? `${a.trekkdato}.` : '-'}</TableCell>
                <TableCell className="text-sm">{a.betalingskort || '-'}</TableCell>
                <TableCell><Badge className={kategoriColors[a.kategori] || ''}>{a.kategori}</Badge></TableCell>
                <TableCell><Badge variant={a.aktiv ? 'default' : 'secondary'}>{a.aktiv ? 'Ja' : 'Nei'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editing ? 'Rediger abonnement' : 'Nytt abonnement'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Navn *</Label><Input value={form.navn} onChange={e => setForm(p => ({ ...p, navn: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Leverandør *</Label><Input value={form.leverandor} onChange={e => setForm(p => ({ ...p, leverandor: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Beskrivelse</Label><Textarea value={form.beskrivelse} onChange={e => setForm(p => ({ ...p, beskrivelse: e.target.value }))} placeholder="Hva gjør denne tjenesten?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Privat">Privat</SelectItem>
                    <SelectItem value="Motivus AS">Motivus AS</SelectItem>
                    <SelectItem value="Multis EHF">Multis EHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Type</Label><Input value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} placeholder="AI-verktøy, Hosting..." /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Beløp original *</Label><Input type="number" step="0.01" value={form.belop_original} onChange={e => setForm(p => ({ ...p, belop_original: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Valuta</Label>
                <Select value={form.valuta} onValueChange={v => setForm(p => ({ ...p, valuta: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['NOK', 'USD', 'EUR', 'ISK', 'DKK', 'SEK', 'GBP'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Beløp NOK *</Label><Input type="number" step="0.01" value={form.belop_nok} onChange={e => setForm(p => ({ ...p, belop_nok: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Faktureringsperiode</Label>
                <Select value={form.faktureringsperiode} onValueChange={v => setForm(p => ({ ...p, faktureringsperiode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="månedlig">Månedlig</SelectItem>
                    <SelectItem value="kvartalsvis">Kvartalsvis</SelectItem>
                    <SelectItem value="halvårlig">Halvårlig</SelectItem>
                    <SelectItem value="årlig">Årlig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Trekkdato (1-31)</Label><Input type="number" min="1" max="31" value={form.trekkdato} onChange={e => setForm(p => ({ ...p, trekkdato: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Betalingskort</Label><Input value={form.betalingskort} onChange={e => setForm(p => ({ ...p, betalingskort: e.target.value }))} placeholder="Visa 2355" /></div>
            </div>
            <div className="space-y-1"><Label>Nettside</Label><Input value={form.nettside} onChange={e => setForm(p => ({ ...p, nettside: e.target.value }))} type="url" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Startdato</Label><Input type="date" value={form.startdato} onChange={e => setForm(p => ({ ...p, startdato: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Sluttdato</Label><Input type="date" value={form.sluttdato} onChange={e => setForm(p => ({ ...p, sluttdato: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.aktiv} onCheckedChange={v => setForm(p => ({ ...p, aktiv: v }))} /><Label>Aktiv</Label></div>
            <div className="space-y-1"><Label>Notater</Label><Textarea value={form.notater} onChange={e => setForm(p => ({ ...p, notater: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Lagre</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
