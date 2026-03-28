import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBelop, formatDato } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Eiersameie() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [txs, setTxs] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, fradrag: 0, ikkeFradrag: 0, inntekter: 0 });
  const [chartData, setChartData] = useState<{ name: string; belop: number }[]>([]);
  const [kostnadTyper, setKostnadTyper] = useState<{ type: string; underkategori: string; antall: number; sum: number }[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('transaksjoner').select('*')
        .eq('kategori', 'Eiersameie E7')
        .gte('dato', `${year}-01-01`).lte('dato', `${year}-12-31`)
        .order('dato', { ascending: false });

      if (!data) return;
      setTxs(data);

      const utgifter = data.filter(t => t.retning === 'ut');
      const inntekter = data.filter(t => t.retning === 'inn');
      const fradrag = utgifter.filter(t => t.fradragsberettiget).reduce((s, t) => s + Number(t.belop), 0);
      const total = utgifter.reduce((s, t) => s + Number(t.belop), 0);
      setStats({ total, fradrag, ikkeFradrag: total - fradrag, inntekter: inntekter.reduce((s, t) => s + Number(t.belop), 0) });

      // Chart by underkategori
      const byUk: Record<string, number> = {};
      for (const t of utgifter) {
        const uk = t.underkategori || 'Annet';
        byUk[uk] = (byUk[uk] || 0) + Number(t.belop);
      }
      setChartData(Object.entries(byUk).map(([name, belop]) => ({ name, belop })));

      // Cost types
      const ktMap: Record<string, { underkategori: string; antall: number; sum: number }> = {};
      for (const t of utgifter) {
        const key = t.kostnadstype || t.utgiftstype || 'Uspesifisert';
        if (!ktMap[key]) ktMap[key] = { underkategori: t.underkategori || '-', antall: 0, sum: 0 };
        ktMap[key].antall++;
        ktMap[key].sum += Number(t.belop);
      }
      setKostnadTyper(Object.entries(ktMap).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.sum - a.sum));
    }
    fetch();
  }, [year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Eiersameie E7</h1>
        <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-[100px]" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{formatBelop(stats.total)}</div><div className="text-sm text-muted-foreground">Totale kostnader</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{formatBelop(stats.fradrag)}</div><div className="text-sm text-muted-foreground">Fradragsberettiget</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{formatBelop(stats.ikkeFradrag)}</div><div className="text-sm text-muted-foreground">Ikke fradragsberettiget</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{formatBelop(stats.inntekter)}</div><div className="text-sm text-muted-foreground">Leieinntekter</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Kostnader per type</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatBelop(v)} />
              <Bar dataKey="belop" fill="hsl(0, 84%, 60%)" name="Kostnad" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kostnader per kostnadstype</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kostnadstype</TableHead>
                <TableHead>Underkategori</TableHead>
                <TableHead className="text-right">Antall</TableHead>
                <TableHead className="text-right">Sum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kostnadTyper.map(k => (
                <TableRow key={k.type}>
                  <TableCell>{k.type}</TableCell>
                  <TableCell>{k.underkategori}</TableCell>
                  <TableCell className="text-right">{k.antall}</TableCell>
                  <TableCell className="text-right font-mono">{formatBelop(k.sum)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alle E7-transaksjoner {year}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Beskrivelse</TableHead>
                  <TableHead>Underkategori</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                  <TableHead>Fradrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                    <TableCell className="text-sm">{t.beskrivelse_bank}</TableCell>
                    <TableCell className="text-sm">{t.underkategori || '-'}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}
                    </TableCell>
                    <TableCell>
                      {t.retning === 'ut' && (
                        <Badge variant={t.fradragsberettiget ? 'default' : 'secondary'} className={t.fradragsberettiget ? 'bg-green-100 text-green-800' : ''}>
                          {t.fradragsberettiget ? 'Ja' : 'Nei'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
