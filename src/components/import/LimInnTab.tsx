import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { parseNettbankData } from '@/lib/parsers/nettbank';
import { ParsedTransaksjon } from '@/lib/klassifisering';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onParsed: (data: ParsedTransaksjon[]) => void;
}

export function LimInnTab({ onParsed }: Props) {
  const [text, setText] = useState('');
  const [konto, setKonto] = useState<string>('');
  const [kontoer, setKontoer] = useState<{ kontonummer: string; navn: string | null }[]>([]);

  useEffect(() => {
    supabase.from('kontoer').select('kontonummer, navn').eq('aktiv', true).then(({ data }) => {
      if (data) setKontoer(data);
    });
  }, []);

  const handleParse = () => {
    if (!text.trim()) {
      toast.error('Lim inn transaksjoner først');
      return;
    }
    const parsed = parseNettbankData(text, konto || undefined);
    if (parsed.length === 0) {
      toast.error('Kunne ikke parse data. Sjekk formatet.');
      return;
    }
    toast.success(`Parset ${parsed.length} transaksjoner`);
    onParsed(parsed);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label>Konto (valgfritt)</Label>
          <Select value={konto} onValueChange={setKonto}>
            <SelectTrigger>
              <SelectValue placeholder="Velg konto..." />
            </SelectTrigger>
            <SelectContent>
              {kontoer.map(k => (
                <SelectItem key={k.kontonummer} value={k.kontonummer}>
                  {k.navn || k.kontonummer} ({k.kontonummer})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Transaksjoner</Label>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"Lim inn transaksjoner fra nettbanken her...\n\nFormat 1: Dato[TAB]Fra/Til[TAB]Kategori[TAB]Beløp\nFormat 2: Kontoutskrift (navn, kategori, beløp+dato per blokk)"}
            className="min-h-[300px] font-mono text-sm"
          />
        </div>
        <Button onClick={handleParse}>Parse data</Button>
      </CardContent>
    </Card>
  );
}
