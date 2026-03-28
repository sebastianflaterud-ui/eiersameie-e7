import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBelop } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

export default function Leieinntekter() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7').eq('retning', 'inn')
        .gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`)
        .order('dato', { ascending: false });

      if (!data) return;
      setTxs(data);

      const m: Record<string, Record<string, number>> = {};
      for (const t of data) {
        const tenant = t.leie_for || t.motpart_egen || t.motpart_bank || 'Ukjent';
        const month = parseInt(t.dato.slice(5, 7));
        if (!m[tenant]) m[tenant] = {};
        m[tenant][month] = (m[tenant][month] || 0) + Number(t.belop);
      }
      setMatrix(m);
    }
    fetch();
  }, [year]);

  const tenants = Object.keys(matrix).sort();
  const totalPerTenant = tenants.map(t => Object.values(matrix[t]).reduce((s, v) => s + v, 0));
  const totalPerMonth = Array.from({ length: 12 }, (_, i) =>
    tenants.reduce((s, t) => s + (matrix[t][i + 1] || 0), 0)
  );
  const grandTotal = totalPerTenant.reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leieinntekter</h1>
        <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-[100px]" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{formatBelop(grandTotal)}</div><div className="text-sm text-muted-foreground">Brutto leieinntekter</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{tenants.length}</div><div className="text-sm text-muted-foreground">Leietakere</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatBelop(grandTotal / 12)}</div><div className="text-sm text-muted-foreground">Gjennomsnitt per måned</div></CardContent></Card>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Leietaker</TableHead>
              {MONTHS.map(m => <TableHead key={m} className="text-center min-w-[80px]">{m}</TableHead>)}
              <TableHead className="text-right font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant, ti) => (
              <TableRow key={tenant}>
                <TableCell className="sticky left-0 bg-background font-medium">{tenant}</TableCell>
                {Array.from({ length: 12 }, (_, i) => {
                  const val = matrix[tenant][i + 1] || 0;
                  return (
                    <TableCell key={i} className={`text-center font-mono text-sm ${val > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-400'}`}>
                      {val > 0 ? formatBelop(val) : '-'}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-mono font-bold">{formatBelop(totalPerTenant[ti])}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell className="sticky left-0 bg-background">Sum</TableCell>
              {totalPerMonth.map((v, i) => (
                <TableCell key={i} className="text-center font-mono text-sm">{v > 0 ? formatBelop(v) : '-'}</TableCell>
              ))}
              <TableCell className="text-right font-mono">{formatBelop(grandTotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="border rounded-lg overflow-auto">
        <h3 className="p-4 font-semibold">Alle leieinntekter {year}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead>Leietaker</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Enhet</TableHead>
              <TableHead className="text-right">Beløp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.dato}</TableCell>
                <TableCell>{t.leie_for || t.motpart_egen || t.motpart_bank || '-'}</TableCell>
                <TableCell>{t.leieperiode || '-'}</TableCell>
                <TableCell>{t.enhet || '-'}</TableCell>
                <TableCell className="text-right font-mono text-green-600">{formatBelop(t.belop)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
