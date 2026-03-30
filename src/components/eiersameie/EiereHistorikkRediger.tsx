import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { HistorikkEvent } from './types';

interface Props {
  event: HistorikkEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function EiereHistorikkRediger({ event, open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const [dato, setDato] = useState('');
  const [type, setType] = useState('overføring');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [detaljer, setDetaljer] = useState<{ id: string; eier_navn: string; andel_for: number; andel_etter: number; merknad: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync state when event changes
  const resetForm = (ev: HistorikkEvent) => {
    setDato(ev.dato);
    setType(ev.type);
    setBeskrivelse(ev.beskrivelse);
    setDetaljer(ev.detaljer.map(d => ({
      id: d.id,
      eier_navn: d.eier_navn,
      andel_for: d.andel_for,
      andel_etter: d.andel_etter,
      merknad: d.merknad || '',
    })));
  };

  // Reset form when dialog opens with new event
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && event) {
      resetForm(event);
    }
    onOpenChange(isOpen);
  };

  // Also reset if event changes while open
  if (open && event && dato !== event.dato && beskrivelse !== event.beskrivelse && detaljer.length === 0) {
    resetForm(event);
  }

  const updateDetalj = (idx: number, field: string, value: string | number) => {
    setDetaljer(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const save = async () => {
    if (!user || !event) return;
    setSaving(true);
    try {
      // Update the historikk event
      const { error: evErr } = await supabase.from('eier_historikk').update({
        dato, type, beskrivelse,
      }).eq('id', event.id);
      if (evErr) throw evErr;

      // Update each detalj
      for (const d of detaljer) {
        const { error: dErr } = await supabase.from('eier_historikk_detaljer').update({
          andel_for: d.andel_for,
          andel_etter: d.andel_etter,
          merknad: d.merknad || null,
        }).eq('id', d.id);
        if (dErr) throw dErr;
      }

      toast.success('Historikk-hendelse oppdatert');
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Kunne ikke lagre');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!event || !confirm('Er du sikker på at du vil slette denne hendelsen?')) return;
    setSaving(true);
    try {
      await supabase.from('eier_historikk_detaljer').delete().eq('historikk_id', event.id);
      await supabase.from('eier_historikk').delete().eq('id', event.id);
      toast.success('Hendelse slettet');
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Kunne ikke slette');
    } finally {
      setSaving(false);
    }
  };

  const sumEtter = detaljer.reduce((s, d) => s + Number(d.andel_etter), 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Rediger historikk-hendelse</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Dato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dato && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dato ? format(new Date(dato), 'd. MMM yyyy', { locale: nb }) : 'Velg dato'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dato ? new Date(dato) : undefined} onSelect={d => setDato(d ? format(d, 'yyyy-MM-dd') : '')} locale={nb} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oppstart">Opprinnelig</SelectItem>
                  <SelectItem value="overføring">Overføring</SelectItem>
                  <SelectItem value="justering">Justering</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Beskrivelse</Label>
            <Textarea value={beskrivelse} onChange={e => setBeskrivelse(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Andeler per eier</Label>
            {detaljer.map((d, i) => (
              <div key={d.id} className="grid grid-cols-[1fr_80px_80px_1fr] gap-2 items-end">
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">Eier</Label>}
                  <Input value={d.eier_navn} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">Før %</Label>}
                  <Input type="number" step="0.01" value={d.andel_for} onChange={e => updateDetalj(i, 'andel_for', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">Etter %</Label>}
                  <Input type="number" step="0.01" value={d.andel_etter} onChange={e => updateDetalj(i, 'andel_etter', Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">Merknad</Label>}
                  <Input value={d.merknad} onChange={e => updateDetalj(i, 'merknad', e.target.value)} placeholder="Valgfri" />
                </div>
              </div>
            ))}
            {detaljer.length > 0 && (
              <div className={cn("text-xs font-medium text-right", Math.abs(sumEtter - 100) > 0.01 ? 'text-destructive' : 'text-muted-foreground')}>
                Sum etter: {sumEtter.toFixed(2)} %
                {Math.abs(sumEtter - 100) > 0.01 && ' (må være 100 %)'}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="destructive" size="sm" onClick={deleteEvent} disabled={saving}>
            <Trash2 className="h-4 w-4 mr-1" />Slett
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={save} disabled={saving || Math.abs(sumEtter - 100) > 0.01}>
            {saving ? 'Lagrer…' : 'Lagre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
