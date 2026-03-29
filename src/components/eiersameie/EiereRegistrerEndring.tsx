import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Eier, formatPct, formatPct4 } from './types';

interface Props {
  aktive: Eier[];
  onChanged: () => void;
}

export default function EiereRegistrerEndring({ aktive, onChanged }: Props) {
  const { user } = useAuth();
  const [regMode, setRegMode] = useState<'enkel' | 'avansert'>('enkel');
  const [regForm, setRegForm] = useState({ dato: '', type: 'overføring', beskrivelse: '', fra: '', til: '', beregnFraVerdi: true, boligverdi: 10000000, kjopesum: 0, prosent: 0 });
  const [advAndeler, setAdvAndeler] = useState<Record<string, number>>({});

  const enkelPct = regForm.beregnFraVerdi && regForm.boligverdi > 0
    ? (regForm.kjopesum / regForm.boligverdi) * 100
    : regForm.prosent;

  const advSum = Object.values(advAndeler).reduce((s, v) => s + v, 0);
  const advSumOk = Math.abs(advSum - 100) < 0.01;

  const registerEnkel = async () => {
    if (!user || !regForm.dato || !regForm.fra || !regForm.til) { toast.error('Fyll inn alle felter'); return; }
    const pct = enkelPct;
    if (pct <= 0) { toast.error('Prosent må være > 0'); return; }
    const fraEier = aktive.find(e => e.navn === regForm.fra);
    const tilEier = aktive.find(e => e.navn === regForm.til);
    if (!fraEier || !tilEier) { toast.error('Ugyldig eier'); return; }
    if (fraEier.eierandel_prosent < pct) { toast.error(`${fraEier.navn} har kun ${formatPct(fraEier.eierandel_prosent)}`); return; }

    const { data: hist, error: hErr } = await supabase.from('eier_historikk').insert({
      user_id: user.id, dato: regForm.dato, type: regForm.type as any, beskrivelse: regForm.beskrivelse,
    }).select().single();
    if (hErr || !hist) { toast.error(hErr?.message || 'Feil'); return; }

    const detaljer = aktive.map(e => ({
      user_id: user.id, historikk_id: (hist as any).id, eier_navn: e.navn,
      andel_for: e.eierandel_prosent,
      andel_etter: e.navn === regForm.fra ? e.eierandel_prosent - pct
        : e.navn === regForm.til ? e.eierandel_prosent + pct
        : e.eierandel_prosent,
      merknad: e.navn === regForm.fra ? `Overført ${formatPct(pct)} til ${regForm.til}`
        : e.navn === regForm.til ? `Mottatt ${formatPct(pct)} fra ${regForm.fra}`
        : 'Uendret',
    }));
    await supabase.from('eier_historikk_detaljer').insert(detaljer);

    await supabase.from('eiere').update({
      eierandel_prosent: fraEier.eierandel_prosent - pct,
      kostnadsandel_prosent: fraEier.kostnadsandel_prosent - pct,
      sist_endret: regForm.dato,
    } as any).eq('id', fraEier.id);
    await supabase.from('eiere').update({
      eierandel_prosent: tilEier.eierandel_prosent + pct,
      kostnadsandel_prosent: tilEier.kostnadsandel_prosent + pct,
      sist_endret: regForm.dato,
    } as any).eq('id', tilEier.id);

    toast.success('Eierskapsendring registrert');
    onChanged();
    setRegForm({ dato: '', type: 'overføring', beskrivelse: '', fra: '', til: '', beregnFraVerdi: true, boligverdi: 10000000, kjopesum: 0, prosent: 0 });
  };

  const registerAvansert = async () => {
    if (!user || !regForm.dato) { toast.error('Velg dato'); return; }
    const sumNy = Object.values(advAndeler).reduce((s, v) => s + v, 0);
    if (Math.abs(sumNy - 100) > 0.01) { toast.error(`Total andel er ${formatPct(sumNy)}, må være 100,00 %`); return; }

    const { data: hist, error: hErr } = await supabase.from('eier_historikk').insert({
      user_id: user.id, dato: regForm.dato, type: regForm.type as any, beskrivelse: regForm.beskrivelse,
    }).select().single();
    if (hErr || !hist) { toast.error(hErr?.message || 'Feil'); return; }

    const detaljer = aktive.map(e => ({
      user_id: user.id, historikk_id: (hist as any).id, eier_navn: e.navn,
      andel_for: e.eierandel_prosent,
      andel_etter: advAndeler[e.navn] ?? e.eierandel_prosent,
      merknad: advAndeler[e.navn] !== undefined && advAndeler[e.navn] !== e.eierandel_prosent ? 'Endret' : 'Uendret',
    }));
    await supabase.from('eier_historikk_detaljer').insert(detaljer);

    for (const e of aktive) {
      const ny = advAndeler[e.navn];
      if (ny !== undefined && ny !== e.eierandel_prosent) {
        await supabase.from('eiere').update({
          eierandel_prosent: ny, kostnadsandel_prosent: ny, sist_endret: regForm.dato,
        } as any).eq('id', e.id);
      }
    }

    toast.success('Eierskapsendring registrert');
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Registrer eierskapsendring</h2>
          <p className="text-sm text-muted-foreground">Fyll ut feltene under for å registrere en overføring av eierandeler</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Avansert</Label>
          <Switch checked={regMode === 'avansert'} onCheckedChange={v => { setRegMode(v ? 'avansert' : 'enkel'); if (v) { const m: Record<string, number> = {}; aktive.forEach(e => m[e.navn] = e.eierandel_prosent); setAdvAndeler(m); } }} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Virkningsdato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !regForm.dato && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {regForm.dato ? format(new Date(regForm.dato), 'd. MMMM yyyy', { locale: nb }) : 'Velg dato'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={regForm.dato ? new Date(regForm.dato) : undefined} onSelect={d => setRegForm(p => ({ ...p, dato: d ? format(d, 'yyyy-MM-dd') : '' }))} locale={nb} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={regForm.type} onValueChange={v => setRegForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="overføring">Overføring (kjøp/salg)</SelectItem>
                  <SelectItem value="justering">Justering</SelectItem>
                  <SelectItem value="annet">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Beskrivelse</Label><Input value={regForm.beskrivelse} onChange={e => setRegForm(p => ({ ...p, beskrivelse: e.target.value }))} placeholder="F.eks. Sebastian selger til David" /></div>
          </div>

          {regMode === 'enkel' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fra (selger)</Label>
                  <Select value={regForm.fra} onValueChange={v => setRegForm(p => ({ ...p, fra: v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg eier" /></SelectTrigger>
                    <SelectContent>{aktive.map(e => <SelectItem key={e.id} value={e.navn}>{e.navn} ({formatPct(e.eierandel_prosent)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Til (kjøper)</Label>
                  <Select value={regForm.til} onValueChange={v => setRegForm(p => ({ ...p, til: v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg eier" /></SelectTrigger>
                    <SelectContent>{aktive.filter(e => e.navn !== regForm.fra).map(e => <SelectItem key={e.id} value={e.navn}>{e.navn} ({formatPct(e.eierandel_prosent)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={regForm.beregnFraVerdi} onChange={() => setRegForm(p => ({ ...p, beregnFraVerdi: true }))} />
                    <span className="text-sm">Beregn fra verdi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!regForm.beregnFraVerdi} onChange={() => setRegForm(p => ({ ...p, beregnFraVerdi: false }))} />
                    <span className="text-sm">Angi prosent direkte</span>
                  </label>
                </div>
                {regForm.beregnFraVerdi ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Boligens verdi (kr)</Label><Input type="number" value={regForm.boligverdi} onChange={e => setRegForm(p => ({ ...p, boligverdi: Number(e.target.value) }))} /></div>
                    <div className="space-y-1"><Label>Kjøpesum (kr)</Label><Input type="number" value={regForm.kjopesum} onChange={e => setRegForm(p => ({ ...p, kjopesum: Number(e.target.value) }))} /></div>
                  </div>
                ) : (
                  <div className="space-y-1 max-w-[200px]"><Label>Prosent som overføres</Label><Input type="number" step="0.0001" value={regForm.prosent} onChange={e => setRegForm(p => ({ ...p, prosent: Number(e.target.value) }))} /></div>
                )}
              </div>

              {regForm.fra && regForm.til && enkelPct > 0 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="font-medium">Forhåndsvisning</div>
                  {aktive.map(e => {
                    const ny = e.navn === regForm.fra ? e.eierandel_prosent - enkelPct : e.navn === regForm.til ? e.eierandel_prosent + enkelPct : e.eierandel_prosent;
                    const endring = ny - e.eierandel_prosent;
                    return (
                      <div key={e.id} className="flex justify-between text-sm">
                        <span>{e.navn}</span>
                        <span className="font-mono">
                          {formatPct(e.eierandel_prosent)} → {formatPct(ny)}
                          {endring !== 0 && <span className={endring > 0 ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>({endring > 0 ? '+' : ''}{formatPct(endring)})</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button onClick={registerEnkel} disabled={!regForm.dato || !regForm.fra || !regForm.til || enkelPct <= 0}>Registrer overføring</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {aktive.map(e => {
                  const ny = advAndeler[e.navn] ?? e.eierandel_prosent;
                  const endring = ny - e.eierandel_prosent;
                  return (
                    <div key={e.id} className="flex items-center gap-3">
                      <span className="w-48 font-medium">{e.navn}</span>
                      <span className="text-sm text-muted-foreground w-24">({formatPct(e.eierandel_prosent)})</span>
                      <Input type="number" step="0.0001" value={ny} className="w-32"
                        onChange={ev => setAdvAndeler(p => ({ ...p, [e.navn]: Number(ev.target.value) }))} />
                      <span className="text-sm w-16">%</span>
                      {endring !== 0 && <span className={`text-sm font-mono ${endring > 0 ? 'text-green-600' : 'text-red-600'}`}>{endring > 0 ? '+' : ''}{formatPct4(endring)}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 items-center">
                <span className={`font-mono ${advSumOk ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {formatPct4(advSum)} {advSumOk ? '✓' : '✗'}
                </span>
              </div>
              <Button onClick={registerAvansert} disabled={!advSumOk || !regForm.dato}>
                Registrer transaksjon ({aktive.filter(e => (advAndeler[e.navn] ?? e.eierandel_prosent) !== e.eierandel_prosent).length} parter)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
