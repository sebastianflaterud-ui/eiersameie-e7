import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { detectSeparator, parseCsvHeaders, suggestMapping, parseCsvData, CsvMapping, CsvDefaults } from '@/lib/parsers/csv';
import { ParsedTransaksjon } from '@/lib/klassifisering';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

const DB_FIELDS = [
  { value: 'ignorer', label: 'Ignorer' },
  { value: 'dato', label: 'Dato' },
  { value: 'beskrivelse_bank', label: 'Beskrivelse' },
  { value: 'belop', label: 'Beløp' },
  { value: 'motpart_bank', label: 'Motpart' },
  { value: 'leie_for', label: 'Leie for' },
  { value: 'leieperiode', label: 'Leieperiode' },
  { value: 'enhet', label: 'Enhet' },
  { value: 'betalt_av', label: 'Betalt av' },
  { value: 'kid', label: 'KID' },
  { value: 'notater', label: 'Notater' },
];

interface Props {
  onParsed: (data: ParsedTransaksjon[]) => void;
}

export function CsvTab({ onParsed }: Props) {
  const [fileContent, setFileContent] = useState('');
  const [separator, setSeparator] = useState(';');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [defaults, setDefaults] = useState<CsvDefaults>({});
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [kontoer, setKontoer] = useState<{ kontonummer: string; navn: string | null }[]>([]);

  useEffect(() => {
    supabase.from('kontoer').select('kontonummer, navn').eq('aktiv', true).then(({ data }) => {
      if (data) setKontoer(data);
    });
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text);

      const sep = detectSeparator(text);
      setSeparator(sep);

      const hdrs = parseCsvHeaders(text, sep);
      setHeaders(hdrs);
      setMapping(suggestMapping(hdrs));

      // Preview first 5 rows
      const lines = text.trim().split('\n').slice(1, 6);
      setPreviewRows(lines.map(l => l.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))));
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
    else toast.error('Kun .csv-filer støttes');
  }, [handleFile]);

  const handleParse = () => {
    if (!fileContent) {
      toast.error('Last opp en CSV-fil først');
      return;
    }
    const parsed = parseCsvData(fileContent, separator, mapping, defaults);
    if (parsed.length === 0) {
      toast.error('Ingen transaksjoner funnet. Sjekk kolonnemapping.');
      return;
    }
    toast.success(`Parset ${parsed.length} transaksjoner`);
    onParsed(parsed);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {!fileContent ? (
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Dra og slipp CSV-fil her, eller klikk for å velge</p>
          </div>
        ) : (
          <>
            <div>
              <h3 className="font-semibold mb-3">Kolonnemapping</h3>
              <div className="grid grid-cols-2 gap-3">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="text-sm font-mono min-w-[120px] truncate">{h}</span>
                    <Select value={mapping[h] || 'ignorer'} onValueChange={v => setMapping(prev => ({ ...prev, [h]: v }))}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DB_FIELDS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Standardverdier for import</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kategori</Label>
                  <Select value={defaults.kategori || ''} onValueChange={v => setDefaults(p => ({ ...p, kategori: v || undefined }))}>
                    <SelectTrigger><SelectValue placeholder="Velg..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Privat">Privat</SelectItem>
                      <SelectItem value="Eiersameie E7">Eiersameie E7</SelectItem>
                      <SelectItem value="Motivus AS">Motivus AS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Retning</Label>
                  <Select value={defaults.retning || ''} onValueChange={v => setDefaults(p => ({ ...p, retning: (v as 'inn' | 'ut') || undefined }))}>
                    <SelectTrigger><SelectValue placeholder="Auto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inn">Inn</SelectItem>
                      <SelectItem value="ut">Ut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Konto</Label>
                  <Select value={defaults.konto || ''} onValueChange={v => setDefaults(p => ({ ...p, konto: v || undefined }))}>
                    <SelectTrigger><SelectValue placeholder="Velg..." /></SelectTrigger>
                    <SelectContent>
                      {kontoer.map(k => (
                        <SelectItem key={k.kontonummer} value={k.kontonummer}>{k.navn || k.kontonummer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {previewRows.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Forhåndsvisning (første {previewRows.length} rader)</h3>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map(h => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => <TableCell key={j} className="text-xs py-1">{cell}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleParse}>Parse data</Button>
              <Button variant="outline" onClick={() => { setFileContent(''); setHeaders([]); setMapping({}); }}>
                Velg ny fil
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
