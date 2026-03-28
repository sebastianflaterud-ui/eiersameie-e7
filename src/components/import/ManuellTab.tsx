import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function ManuellTab() {
  const { user } = useAuth();
  const [retning, setRetning] = useState<'inn' | 'ut'>('ut');
  const [kontoer, setKontoer] = useState<{ kontonummer: string; navn: string | null }[]>([]);
  const [form, setForm] = useState({
    dato: '',
    beskrivelse_bank: '',
    belop: '',
    konto: '',
    motpart_bank: '',
    kategori: 'Uklassifisert',
    underkategori: '',
    inntektstype: '',
    utgiftstype: '',
    betalt_av: '',
    leie_for: '',
    leieperiode: '',
    enhet: '',
    leverandor: '',
    kostnadstype: '',
    notater: '',
  });

  useEffect(() => {
    supabase.from('kontoer').select('kontonummer, navn').eq('aktiv', true).then(({ data }) => {
      if (data) setKontoer(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.dato || !form.beskrivelse_bank || !form.belop) {
      toast.error('Fyll ut dato, beskrivelse og beløp');
      return;
    }

    const { error } = await supabase.from('transaksjoner').insert({
      user_id: user.id,
      dato: form.dato,
      beskrivelse_bank: form.beskrivelse_bank,
      belop: Math.abs(parseFloat(form.belop)),
      retning,
      konto: form.konto || null,
      motpart_bank: form.motpart_bank || null,
      kategori: form.kategori as any,
      underkategori: form.underkategori || null,
      inntektstype: form.inntektstype || null,
      utgiftstype: form.utgiftstype || null,
      betalt_av: form.betalt_av || null,
      leie_for: form.leie_for || null,
      leieperiode: form.leieperiode || null,
      enhet: form.enhet || null,
      leverandor: form.leverandor || null,
      kostnadstype: form.kostnadstype || null,
      notater: form.notater || null,
      kilde: 'manuell',
      klassifisering_status: 'manuell',
    });

    if (error) {
      toast.error('Kunne ikke lagre: ' + error.message);
    } else {
      toast.success('Transaksjon registrert!');
      setForm({
        dato: '', beskrivelse_bank: '', belop: '', konto: '', motpart_bank: '',
        kategori: 'Uklassifisert', underkategori: '', inntektstype: '', utgiftstype: '',
        betalt_av: '', leie_for: '', leieperiode: '', enhet: '', leverandor: '',
        kostnadstype: '', notater: '',
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Dato *</Label>
              <Input type="date" value={form.dato} onChange={e => setForm(p => ({ ...p, dato: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Retning *</Label>
              <Select value={retning} onValueChange={v => setRetning(v as 'inn' | 'ut')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inn">Inntekt (inn)</SelectItem>
                  <SelectItem value="ut">Utgift (ut)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Beløp *</Label>
              <Input type="number" step="0.01" value={form.belop} onChange={e => setForm(p => ({ ...p, belop: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Beskrivelse *</Label>
              <Input value={form.beskrivelse_bank} onChange={e => setForm(p => ({ ...p, beskrivelse_bank: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Motpart</Label>
              <Input value={form.motpart_bank} onChange={e => setForm(p => ({ ...p, motpart_bank: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Konto</Label>
              <Select value={form.konto} onValueChange={v => setForm(p => ({ ...p, konto: v }))}>
                <SelectTrigger><SelectValue placeholder="Velg..." /></SelectTrigger>
                <SelectContent>
                  {kontoer.map(k => (
                    <SelectItem key={k.kontonummer} value={k.kontonummer}>{k.navn || k.kontonummer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uklassifisert">Uklassifisert</SelectItem>
                  <SelectItem value="Privat">Privat</SelectItem>
                  <SelectItem value="Eiersameie E7">Eiersameie E7</SelectItem>
                  <SelectItem value="Motivus AS">Motivus AS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Underkategori</Label>
              <Input value={form.underkategori} onChange={e => setForm(p => ({ ...p, underkategori: e.target.value }))} />
            </div>
          </div>

          {retning === 'inn' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="col-span-2 text-sm font-medium text-green-700">Inntektsfelter</div>
              <div className="space-y-1">
                <Label>Inntektstype</Label>
                <Input value={form.inntektstype} onChange={e => setForm(p => ({ ...p, inntektstype: e.target.value }))} placeholder="F.eks. Leieinntekt, Lønn" />
              </div>
              <div className="space-y-1">
                <Label>Betalt av</Label>
                <Input value={form.betalt_av} onChange={e => setForm(p => ({ ...p, betalt_av: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Leie for (leietaker)</Label>
                <Input value={form.leie_for} onChange={e => setForm(p => ({ ...p, leie_for: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Leieperiode</Label>
                <Input value={form.leieperiode} onChange={e => setForm(p => ({ ...p, leieperiode: e.target.value }))} placeholder="F.eks. Januar 2025" />
              </div>
              <div className="space-y-1">
                <Label>Enhet</Label>
                <Input value={form.enhet} onChange={e => setForm(p => ({ ...p, enhet: e.target.value }))} placeholder="F.eks. 2. etg" />
              </div>
            </div>
          )}

          {retning === 'ut' && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="col-span-3 text-sm font-medium text-red-700">Utgiftsfelter</div>
              <div className="space-y-1">
                <Label>Utgiftstype</Label>
                <Input value={form.utgiftstype} onChange={e => setForm(p => ({ ...p, utgiftstype: e.target.value }))} placeholder="F.eks. Strøm, Mat" />
              </div>
              <div className="space-y-1">
                <Label>Leverandør</Label>
                <Input value={form.leverandor} onChange={e => setForm(p => ({ ...p, leverandor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Kostnadstype</Label>
                <Input value={form.kostnadstype} onChange={e => setForm(p => ({ ...p, kostnadstype: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Notater</Label>
            <Textarea value={form.notater} onChange={e => setForm(p => ({ ...p, notater: e.target.value }))} />
          </div>

          <Button type="submit">Registrer transaksjon</Button>
        </form>
      </CardContent>
    </Card>
  );
}
