import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Play } from 'lucide-react';

interface Regel {
  id: string;
  monster: string;
  monster_type: string | null;
  motpart: string | null;
  kategori: string | null;
  underkategori: string | null;
  kostnadstype: string | null;
  inntektstype: string | null;
  utgiftstype: string | null;
  prioritet: number | null;
  aktiv: boolean | null;
}

export default function Regler() {
  const { user } = useAuth();
  const [regler, setRegler] = useState<Regel[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Regel | null>(null);
  const [form, setForm] = useState({
    monster: '', monster_type: 'inneholder', motpart: '', kategori: '', underkategori: '',
    kostnadstype: '', inntektstype: '', utgiftstype: '', prioritet: '0', aktiv: true,
  });

  const fetchRegler = async () => {
    const { data } = await supabase.from('klassifiseringsregler').select('*').order('prioritet', { ascending: false });
    if (data) setRegler(data);
  };

  useEffect(() => { fetchRegler(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ monster: '', monster_type: 'inneholder', motpart: '', kategori: '', underkategori: '', kostnadstype: '', inntektstype: '', utgiftstype: '', prioritet: '0', aktiv: true });
    setDialogOpen(true);
  };

  const openEdit = (r: Regel) => {
    setEditing(r);
    setForm({
      monster: r.monster, monster_type: r.monster_type || 'inneholder', motpart: r.motpart || '',
      kategori: r.kategori || '', underkategori: r.underkategori || '', kostnadstype: r.kostnadstype || '',
      inntektstype: r.inntektstype || '', utgiftstype: r.utgiftstype || '',
      prioritet: String(r.prioritet ?? 0), aktiv: r.aktiv ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.monster) return;
    const payload = {
      monster: form.monster, monster_type: form.monster_type as any, motpart: form.motpart || null,
      kategori: form.kategori || null, underkategori: form.underkategori || null,
      kostnadstype: form.kostnadstype || null, inntektstype: form.inntektstype || null,
      utgiftstype: form.utgiftstype || null, prioritet: parseInt(form.prioritet) || 0, aktiv: form.aktiv,
    };
    if (editing) {
      const { error } = await supabase.from('klassifiseringsregler').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Regel oppdatert');
    } else {
      const { error } = await supabase.from('klassifiseringsregler').insert({ ...payload, user_id: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success('Regel opprettet');
    }
    setDialogOpen(false);
    fetchRegler();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker?')) return;
    await supabase.from('klassifiseringsregler').delete().eq('id', id);
    toast.success('Regel slettet');
    fetchRegler();
  };

  const handleRunRules = async () => {
    if (!user) return;
    const { data: regler } = await supabase.from('klassifiseringsregler').select('*').eq('aktiv', true);
    if (!regler || regler.length === 0) { toast.error('Ingen aktive regler'); return; }

    const { data: transaksjoner } = await supabase.from('transaksjoner')
      .select('id, beskrivelse_bank, motpart_bank')
      .not('klassifisering_status', 'in', '("manuell","bekreftet")');

    if (!transaksjoner || transaksjoner.length === 0) { toast.info('Ingen transaksjoner å klassifisere'); return; }

    const sortedRules = regler.sort((a, b) => (b.prioritet ?? 0) - (a.prioritet ?? 0));
    let updated = 0;

    for (const t of transaksjoner) {
      const searchText = `${t.beskrivelse_bank} ${t.motpart_bank ?? ''}`.toLowerCase();
      for (const r of sortedRules) {
        const monster = r.monster.toLowerCase();
        let match = false;
        if (r.monster_type === 'eksakt') match = searchText === monster;
        else if (r.monster_type === 'starter_med') match = searchText.startsWith(monster);
        else match = searchText.includes(monster);

        if (match) {
          await supabase.from('transaksjoner').update({
            kategori: (r.kategori || 'Uklassifisert') as any,
            underkategori: r.underkategori || null,
            motpart_egen: r.motpart || null,
            kostnadstype: r.kostnadstype || null,
            inntektstype: r.inntektstype || null,
            utgiftstype: r.utgiftstype || null,
            klassifisering_status: 'auto' as any,
          }).eq('id', t.id);
          updated++;
          break;
        }
      }
    }

    toast.success(`${updated} av ${transaksjoner.length} transaksjoner oppdatert`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Klassifiseringsregler</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunRules}><Play className="h-4 w-4 mr-1" />Kjør regler på nytt</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ny regel</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mønster</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Motpart</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Underkategori</TableHead>
              <TableHead>Prioritet</TableHead>
              <TableHead>Aktiv</TableHead>
              <TableHead className="w-[100px]">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regler.map(r => (
              <TableRow key={r.id} className={!r.aktiv ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-sm">{r.monster}</TableCell>
                <TableCell className="text-xs">{r.monster_type}</TableCell>
                <TableCell>{r.motpart || '-'}</TableCell>
                <TableCell><Badge variant="outline">{r.kategori || '-'}</Badge></TableCell>
                <TableCell className="text-sm">{r.underkategori || '-'}</TableCell>
                <TableCell className="font-mono">{r.prioritet}</TableCell>
                <TableCell><Badge variant={r.aktiv ? 'default' : 'secondary'}>{r.aktiv ? 'Ja' : 'Nei'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Rediger regel' : 'Ny regel'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Mønster *</Label><Input value={form.monster} onChange={e => setForm(p => ({ ...p, monster: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.monster_type} onValueChange={v => setForm(p => ({ ...p, monster_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inneholder">Inneholder</SelectItem>
                    <SelectItem value="starter_med">Starter med</SelectItem>
                    <SelectItem value="eksakt">Eksakt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Motpart</Label><Input value={form.motpart} onChange={e => setForm(p => ({ ...p, motpart: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v }))}>
                  <SelectTrigger><SelectValue placeholder="Velg..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Privat">Privat</SelectItem>
                    <SelectItem value="Eiersameie E7">Eiersameie E7</SelectItem>
                    <SelectItem value="Motivus AS">Motivus AS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Underkategori</Label><Input value={form.underkategori} onChange={e => setForm(p => ({ ...p, underkategori: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Inntektstype</Label><Input value={form.inntektstype} onChange={e => setForm(p => ({ ...p, inntektstype: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Utgiftstype</Label><Input value={form.utgiftstype} onChange={e => setForm(p => ({ ...p, utgiftstype: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Kostnadstype</Label><Input value={form.kostnadstype} onChange={e => setForm(p => ({ ...p, kostnadstype: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Prioritet</Label><Input type="number" value={form.prioritet} onChange={e => setForm(p => ({ ...p, prioritet: e.target.value }))} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.aktiv} onCheckedChange={v => setForm(p => ({ ...p, aktiv: v }))} /><Label>Aktiv</Label></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Lagre</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
