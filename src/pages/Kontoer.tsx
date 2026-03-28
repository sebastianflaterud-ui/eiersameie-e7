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
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Konto {
  id: string;
  kontonummer: string;
  navn: string | null;
  type: string | null;
  eier: string | null;
  aktiv: boolean | null;
}

export default function Kontoer() {
  const { user } = useAuth();
  const [kontoer, setKontoer] = useState<Konto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Konto | null>(null);
  const [form, setForm] = useState({ kontonummer: '', navn: '', type: '', eier: '', aktiv: true });

  const fetchKontoer = async () => {
    const { data } = await supabase.from('kontoer').select('*').order('kontonummer');
    if (data) setKontoer(data);
  };

  useEffect(() => { fetchKontoer(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ kontonummer: '', navn: '', type: '', eier: '', aktiv: true });
    setDialogOpen(true);
  };

  const openEdit = (k: Konto) => {
    setEditing(k);
    setForm({ kontonummer: k.kontonummer, navn: k.navn || '', type: k.type || '', eier: k.eier || '', aktiv: k.aktiv ?? true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.kontonummer) return;
    if (editing) {
      const { error } = await supabase.from('kontoer').update({
        kontonummer: form.kontonummer, navn: form.navn || null, type: form.type || null, eier: form.eier || null, aktiv: form.aktiv,
      }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Konto oppdatert');
    } else {
      const { error } = await supabase.from('kontoer').insert({
        user_id: user.id, kontonummer: form.kontonummer, navn: form.navn || null, type: form.type || null, eier: form.eier || null, aktiv: form.aktiv,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Konto opprettet');
    }
    setDialogOpen(false);
    fetchKontoer();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker?')) return;
    await supabase.from('kontoer').delete().eq('id', id);
    toast.success('Konto slettet');
    fetchKontoer();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kontoer</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ny konto</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kontonummer</TableHead>
            <TableHead>Navn</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Eier</TableHead>
            <TableHead>Aktiv</TableHead>
            <TableHead className="w-[100px]">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kontoer.map(k => (
            <TableRow key={k.id}>
              <TableCell className="font-mono">{k.kontonummer}</TableCell>
              <TableCell>{k.navn || '-'}</TableCell>
              <TableCell>{k.type || '-'}</TableCell>
              <TableCell>{k.eier || '-'}</TableCell>
              <TableCell><Badge variant={k.aktiv ? 'default' : 'secondary'}>{k.aktiv ? 'Aktiv' : 'Inaktiv'}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(k)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(k.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Rediger konto' : 'Ny konto'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Kontonummer</Label><Input value={form.kontonummer} onChange={e => setForm(p => ({ ...p, kontonummer: e.target.value }))} placeholder="XXXX.XX.XXXXX" /></div>
            <div className="space-y-1"><Label>Navn</Label><Input value={form.navn} onChange={e => setForm(p => ({ ...p, navn: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Type</Label><Input value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} placeholder="brukskonto, aksjesparekonto..." /></div>
            <div className="space-y-1"><Label>Eier</Label><Input value={form.eier} onChange={e => setForm(p => ({ ...p, eier: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.aktiv} onCheckedChange={v => setForm(p => ({ ...p, aktiv: v }))} /><Label>Aktiv</Label></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Lagre</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
