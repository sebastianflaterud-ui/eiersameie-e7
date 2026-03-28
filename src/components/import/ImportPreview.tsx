import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParsedTransaksjon, KlassifiseringsRegel, klassifiserAlle, beregnDuplikatHash } from '@/lib/klassifisering';
import { formatBelop, formatDato } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Props {
  data: ParsedTransaksjon[];
  onBack: () => void;
  onImportDone: () => void;
}

export function ImportPreview({ data, onBack, onImportDone }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ParsedTransaksjon[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      if (!user) return;

      // Fetch rules
      const { data: regler } = await supabase
        .from('klassifiseringsregler')
        .select('*')
        .eq('aktiv', true);

      // Classify
      let classified = klassifiserAlle(data, (regler || []) as KlassifiseringsRegel[]);

      // Calculate dedup hashes
      classified = classified.map(t => ({
        ...t,
        duplikat_hash: beregnDuplikatHash(t),
      }));

      // Check for duplicates in DB
      const hashes = classified.map(t => t.duplikat_hash!);
      const { data: existing } = await supabase
        .from('transaksjoner')
        .select('duplikat_hash')
        .in('duplikat_hash', hashes);

      const existingHashes = new Set((existing || []).map(e => e.duplikat_hash));

      classified = classified.map(t => ({
        ...t,
        erDuplikat: existingHashes.has(t.duplikat_hash!),
      }));

      setItems(classified);
      setLoading(false);
    }

    prepare();
  }, [data, user]);

  const nye = items.filter(i => !i.erDuplikat);
  const duplikater = items.filter(i => i.erDuplikat);
  const autoKlassifisert = items.filter(i => i.klassifisering_status === 'auto');

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);

    const toImport = nye;
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize).map(t => ({
        user_id: user.id,
        dato: t.dato,
        bokforingsdato: t.bokforingsdato || null,
        beskrivelse_bank: t.beskrivelse_bank,
        belop: t.belop,
        retning: t.retning,
        motpart_bank: t.motpart_bank || null,
        motpart_egen: t.motpart_egen || null,
        konto: t.konto || null,
        kategori: (t.kategori || 'Uklassifisert') as any,
        underkategori: t.underkategori || null,
        kostnadstype: t.kostnadstype || null,
        inntektstype: t.inntektstype || null,
        utgiftstype: t.utgiftstype || null,
        betalt_av: t.betalt_av || null,
        leie_for: t.leie_for || null,
        leieperiode: t.leieperiode || null,
        enhet: t.enhet || null,
        leverandor: t.leverandor || null,
        kilde: t.kilde as any,
        arkivref: t.arkivref || null,
        kid: t.kid || null,
        valuta: t.valuta || 'NOK',
        valutakurs: t.valutakurs || null,
        original_belop: t.original_belop || null,
        klassifisering_status: (t.klassifisering_status || 'foreslått') as any,
        duplikat_hash: t.duplikat_hash || null,
        notater: t.notater || null,
        beskrivelse_egen: t.beskrivelse_egen || null,
      }));

      const { error } = await supabase.from('transaksjoner').insert(batch);
      if (error) {
        toast.error(`Feil ved import: ${error.message}`);
        setImporting(false);
        return;
      }

      imported += batch.length;
      setProgress(Math.round((imported / toImport.length) * 100));
    }

    toast.success(`${imported} transaksjoner importert, ${duplikater.length} hoppet over`);
    setImporting(false);
    onImportDone();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Analyserer transaksjoner...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tilbake
        </Button>
        <h2 className="text-lg font-semibold">Forhåndsvisning</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{nye.length}</div>
            <div className="text-sm text-muted-foreground">Nye transaksjoner</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{duplikater.length}</div>
            <div className="text-sm text-muted-foreground">Duplikater (hoppes over)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{autoKlassifisert.length}</div>
            <div className="text-sm text-muted-foreground">Auto-klassifisert</div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Dato</TableHead>
              <TableHead>Beskrivelse</TableHead>
              <TableHead>Motpart</TableHead>
              <TableHead className="text-right">Beløp</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Konto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t, i) => (
              <TableRow key={i} className={t.erDuplikat ? 'bg-orange-50 opacity-60' : t.retning === 'inn' ? 'bg-green-50/50' : 'bg-red-50/50'}>
                <TableCell>
                  {t.erDuplikat && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                </TableCell>
                <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">{t.beskrivelse_bank}</TableCell>
                <TableCell className="text-sm">{t.motpart_bank || t.motpart_egen || '-'}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}
                </TableCell>
                <TableCell>
                  <Badge variant={t.klassifisering_status === 'auto' ? 'default' : 'secondary'} className={t.klassifisering_status === 'auto' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}>
                    {t.kategori || 'Uklassifisert'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.konto || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {importing && <Progress value={progress} className="h-2" />}

      <div className="flex gap-2">
        <Button onClick={handleImport} disabled={importing || nye.length === 0}>
          <Check className="h-4 w-4 mr-1" />
          {importing ? `Importerer... ${progress}%` : `Importer ${nye.length} transaksjoner`}
        </Button>
      </div>
    </div>
  );
}
