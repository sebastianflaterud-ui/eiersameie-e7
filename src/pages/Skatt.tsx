import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBelop } from '@/lib/format';
import { AlertTriangle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

export default function Skatt() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [leieMatrix, setLeieMatrix] = useState<Record<string, Record<string, number>>>({});
  const [fradragKostnader, setFradragKostnader] = useState<any[]>([]);
  const [ikkeFradrag, setIkkeFradrag] = useState<any[]>([]);
  const [uklassifisertCount, setUklassifisertCount] = useState(0);
  const [totals, setTotals] = useState({ brutto: 0, fradrag: 0, netto: 0 });

  useEffect(() => {
    async function fetch() {
      const { data: e7Data } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7').eq('skatteaar', year);

      if (!e7Data) return;

      // Unclassified warning
      const { count } = await supabase.from('transaksjoner').select('*', { count: 'exact', head: true })
        .eq('kategori', 'Uklassifisert').eq('skatteaar', year);
      setUklassifisertCount(count || 0);

      // Lease matrix
      const inntekter = e7Data.filter(t => t.retning === 'inn');
      const m: Record<string, Record<string, number>> = {};
      for (const t of inntekter) {
        const tenant = t.leie_for || t.motpart_egen || t.motpart_bank || 'Ukjent';
        const month = parseInt(t.dato.slice(5, 7));
        if (!m[tenant]) m[tenant] = {};
        m[tenant][month] = (m[tenant][month] || 0) + Number(t.belop);
      }
      setLeieMatrix(m);

      const brutto = inntekter.reduce((s, t) => s + Number(t.belop), 0);

      // Deductible costs
      const fradrag = e7Data.filter(t => t.retning === 'ut' && t.fradragsberettiget);
      setFradragKostnader(fradrag);
      const fradragSum = fradrag.reduce((s, t) => s + Number(t.belop), 0);

      // Non-deductible
      const ikke = e7Data.filter(t => t.retning === 'ut' && !t.fradragsberettiget);
      setIkkeFradrag(ikke);

      setTotals({ brutto, fradrag: fradragSum, netto: brutto - fradragSum });
    }
    fetch();
  }, [year]);

  const tenants = Object.keys(leieMatrix).sort();

  const exportCsv = () => {
    const rows = [
      ['Skattemeldingsgrunnlag ' + year],
      [],
      ['Brutto leieinntekter', String(totals.brutto)],
      ['Fradragsberettigede kostnader', String(totals.fradrag)],
      ['Netto skattepliktig inntekt', String(totals.netto)],
      [],
      ['--- Fradragsberettigede kostnader ---'],
      ['Dato', 'Beskrivelse', 'Kostnadstype', 'Leverandør', 'Beløp'],
      ...fradragKostnader.map(t => [t.dato, t.beskrivelse_bank, t.kostnadstype || '', t.leverandor || '', String(t.belop)]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skattemeldingsgrunnlag_${year}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skattemeldingsgrunnlag</h1>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Eksporter CSV</Button>
        </div>
      </div>

      {uklassifisertCount > 0 && (
        <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer" onClick={() => navigate('/datavasking')}>
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span className="text-orange-700">{uklassifisertCount} uklassifiserte transaksjoner for {year}. Klassifiser dem for komplett grunnlag.</span>
        </div>
      )}

      {/* Section 1: Lease income matrix */}
      <Card>
        <CardHeader><CardTitle>Seksjon 1: Brutto leieinntekter</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leietaker</TableHead>
                  {MONTHS.map(m => <TableHead key={m} className="text-center min-w-[70px]">{m}</TableHead>)}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map(tenant => (
                  <TableRow key={tenant}>
                    <TableCell className="font-medium">{tenant}</TableCell>
                    {Array.from({ length: 12 }, (_, i) => {
                      const val = leieMatrix[tenant][i + 1] || 0;
                      return <TableCell key={i} className={`text-center font-mono text-xs ${val > 0 ? 'text-green-700' : 'text-muted-foreground'}`}>{val > 0 ? formatBelop(val) : '-'}</TableCell>;
                    })}
                    <TableCell className="text-right font-mono font-bold">{formatBelop(Object.values(leieMatrix[tenant]).reduce((s, v) => s + v, 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Deductible costs */}
      <Card>
        <CardHeader><CardTitle>Seksjon 2: Fradragsberettigede kostnader (Drift og vedlikehold)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead>
                <TableHead>Beskrivelse</TableHead>
                <TableHead>Kostnadstype</TableHead>
                <TableHead>Leverandør</TableHead>
                <TableHead className="text-right">Beløp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fradragKostnader.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.dato}</TableCell>
                  <TableCell className="text-sm">{t.beskrivelse_bank}</TableCell>
                  <TableCell className="text-sm">{t.kostnadstype || t.utgiftstype || '-'}</TableCell>
                  <TableCell className="text-sm">{t.leverandor || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{formatBelop(t.belop)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 3: Non-deductible */}
      {ikkeFradrag.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Seksjon 3: Ikke-fradragsberettigede kostnader (Påkost/Annet)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Beskrivelse</TableHead>
                  <TableHead>Underkategori</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ikkeFradrag.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.dato}</TableCell>
                    <TableCell className="text-sm">{t.beskrivelse_bank}</TableCell>
                    <TableCell className="text-sm">{t.underkategori || '-'}</TableCell>
                    <TableCell className="text-right font-mono">{formatBelop(t.belop)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Summary */}
      <Card>
        <CardHeader><CardTitle>Seksjon 4: Oppsummering</CardTitle></CardHeader>
        <CardContent>
          <div className="font-mono text-lg space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between">
              <span>Brutto leieinntekter:</span>
              <span className="text-green-600">{formatBelop(totals.brutto)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Fradragsberettigede kostnader:</span>
              <span className="text-red-600">-{formatBelop(totals.fradrag)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-xl">
              <span>= Netto skattepliktig inntekt:</span>
              <span className={totals.netto >= 0 ? 'text-green-600' : 'text-red-600'}>{formatBelop(totals.netto)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
