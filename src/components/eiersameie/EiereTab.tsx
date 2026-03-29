import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Pencil, Trash2, Building2, User, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Eier, HistorikkEvent } from './types';
import EiereOversikt from './EiereOversikt';
import EiereLeieinntekter from './EiereLeieinntekter';
import EiereVerdisimulator from './EiereVerdisimulator';
import EiereHistorikk from './EiereHistorikk';
import EiereRegistrerEndring from './EiereRegistrerEndring';

const emptyForm = {
  navn: '', type: 'privatperson', orgnr: '', identifikator: '', epost: '', telefon: '',
  eierandel_prosent: 0, inntektsandel_prosent: 0, kostnadsandel_prosent: 0, aktiv: true,
  gyldig_fra: '', gyldig_til: '', notater: '',
};

export default function EiereTab() {
  const { user } = useAuth();
  const [eiere, setEiere] = useState<Eier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState('oversikt');
  const [historikk, setHistorikk] = useState<HistorikkEvent[]>([]);

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

  useEffect(() => { fetchEiere(); fetchHistorikk(); }, []);

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

  const handleChanged = () => { fetchEiere(); fetchHistorikk(); };

  return (
    <div className="space-y-6 mt-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="oversikt" className="gap-1.5"><User className="h-4 w-4" />Oversikt</TabsTrigger>
          <TabsTrigger value="leieinntekter" className="gap-1.5">Leieinntekter</TabsTrigger>
          <TabsTrigger value="historikk" className="gap-1.5"><CalendarIcon className="h-4 w-4" />Historikk</TabsTrigger>
          <TabsTrigger value="registrer" className="gap-1.5"><Plus className="h-4 w-4" />Registrer endring</TabsTrigger>
          <TabsTrigger value="verdisimulator" className="gap-1.5"><Building2 className="h-4 w-4" />Verdisimulator</TabsTrigger>
        </TabsList>

        <TabsContent value="oversikt" className="space-y-6">
          <EiereOversikt aktive={aktive} sumEierandel={sumEierandel} sumInntekt={sumInntekt} sumKostnad={sumKostnad} onOpenNew={openNew} onOpenEdit={openEdit} />
        </TabsContent>

        <TabsContent value="leieinntekter" className="space-y-6">
          <EiereLeieinntekter aktive={aktive} />
        </TabsContent>

        <TabsContent value="verdisimulator" className="space-y-6">
          <EiereVerdisimulator aktive={aktive} sumEierandel={sumEierandel} />
        </TabsContent>

        <TabsContent value="historikk" className="space-y-4">
          <EiereHistorikk historikk={historikk} />
        </TabsContent>

        <TabsContent value="registrer" className="space-y-6">
          <EiereRegistrerEndring aktive={aktive} onChanged={handleChanged} />
        </TabsContent>
      </Tabs>

      {/* Eier dialog */}
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
              <div className="space-y-1">
                <Label>Gyldig fra</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.gyldig_fra && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.gyldig_fra ? format(new Date(form.gyldig_fra), 'd. MMM yyyy', { locale: nb }) : 'Velg dato'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.gyldig_fra ? new Date(form.gyldig_fra) : undefined} onSelect={d => setForm(p => ({ ...p, gyldig_fra: d ? format(d, 'yyyy-MM-dd') : '' }))} locale={nb} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Gyldig til</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.gyldig_til && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.gyldig_til ? format(new Date(form.gyldig_til), 'd. MMM yyyy', { locale: nb }) : 'Velg dato'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.gyldig_til ? new Date(form.gyldig_til) : undefined} onSelect={d => setForm(p => ({ ...p, gyldig_til: d ? format(d, 'yyyy-MM-dd') : '' }))} locale={nb} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
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
