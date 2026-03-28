import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Eier {
  id: string;
  navn: string;
  type: string;
  orgnr: string | null;
  identifikator: string | null;
  epost: string | null;
  telefon: string | null;
  eierandel_prosent: number;
  inntektsandel_prosent: number;
  kostnadsandel_prosent: number;
  aktiv: boolean | null;
  gyldig_fra: string | null;
  gyldig_til: string | null;
  notater: string | null;
}

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

  const fetchEiere = async () => {
    const { data } = await supabase.from('eiere').select('*').order('opprettet');
    if (data) setEiere(data as any);
  };

  useEffect(() => { fetchEiere(); }, []);

  const aktive = eiere.filter(e => e.aktiv);
  const sumInntekt = aktive.reduce((s, e) => s + Number(e.inntektsandel_prosent), 0);
  const sumKostnad = aktive.reduce((s, e) => s + Number(e.kostnadsandel_prosent), 0);
  const sumEierandel = aktive.reduce((s, e) => s + Number(e.eierandel_prosent), 0);

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
    setDialogOpen(false);
    fetchEiere();
  };

  const deleteEier = async (id: string) => {
    if (!confirm('Slett denne eieren?')) return;
    await supabase.from('eiere').delete().eq('id', id);
    toast.success('Eier slettet');
    fetchEiere();
  };

  const formatPct = (n: number) => n.toFixed(2).replace('.', ',') + ' %';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eiere — Eiersameie E7</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ny eier</Button>
      </div>

      {sumInntekt !== 100 && aktive.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">Inntektsandeler summerer til {formatPct(sumInntekt)}. Skal være 100,00 %.</span>
        </div>
      )}
      {sumKostnad !== 100 && aktive.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">Kostnadsandeler summerer til {formatPct(sumKostnad)}. Skal være 100,00 %.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{aktive.length}</div><div className="text-sm text-muted-foreground">Aktive eiere</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatPct(sumEierandel)}</div><div className="text-sm text-muted-foreground">Total eierandel</div></CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{sumInntekt === 100 && sumKostnad === 100 ? <span className="text-green-600">OK</span> : <span className="text-red-600">Avvik</span>}</div>
          <div className="text-sm text-muted-foreground">Fordelingsstatus</div>
        </CardContent></Card>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>{/* ID label */}Personnr / Org.nr</TableHead>
              <TableHead className="text-right">Eierandel %</TableHead>
              <TableHead className="text-right">Inntektsandel %</TableHead>
              <TableHead className="text-right">Kostnadsandel %</TableHead>
              <TableHead>Gyldig fra</TableHead>
              <TableHead>Aktiv</TableHead>
              <TableHead>Handling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eiere.map(e => (
              <TableRow key={e.id} className={!e.aktiv ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{e.navn}</TableCell>
                <TableCell><Badge variant="outline">{e.type === 'aksjeselskap' ? 'AS' : 'Privat'}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{e.identifikator || e.orgnr || '-'}</TableCell>
                <TableCell className="text-right font-mono">{formatPct(e.eierandel_prosent)}</TableCell>
                <TableCell className="text-right font-mono">{formatPct(e.inntektsandel_prosent)}</TableCell>
                <TableCell className="text-right font-mono">{formatPct(e.kostnadsandel_prosent)}</TableCell>
                <TableCell className="text-sm">{e.gyldig_fra || '-'}</TableCell>
                <TableCell>{e.aktiv ? <Check className="h-4 w-4 text-green-600" /> : '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteEier(e.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
                <Input value={form.identifikator} onChange={e => setForm(p => ({ ...p, identifikator: e.target.value }))} placeholder={form.type === 'aksjeselskap' ? '9 siffer' : '11 siffer'} />
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
            <div className="flex items-center gap-2">
              <Switch checked={form.aktiv} onCheckedChange={v => setForm(p => ({ ...p, aktiv: v }))} />
              <Label>Aktiv</Label>
            </div>
            <div className="space-y-1"><Label>Notater</Label><Textarea value={form.notater} onChange={e => setForm(p => ({ ...p, notater: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button onClick={save}>{editId ? 'Lagre' : 'Opprett'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
