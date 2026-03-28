import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBelop, formatDato } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Wrench } from 'lucide-react';

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(221, 83%, 53%)', 'hsl(45, 93%, 47%)', 'hsl(280, 67%, 52%)'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({ inntekter: 0, utgifter: 0, uklassifisert: 0 });
  const [monthlyData, setMonthlyData] = useState<{ name: string; inntekter: number; utgifter: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ inn: { name: string; value: number }[]; ut: { name: string; value: number }[] }>({ inn: [], ut: [] });
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [kalenderHendelser, setKalenderHendelser] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: txs } = await supabase.from('transaksjoner').select('*')
        .gte('dato', startDate).lte('dato', endDate);

      if (!txs) return;

      const inntekter = txs.filter(t => t.retning === 'inn').reduce((s, t) => s + Number(t.belop), 0);
      const utgifter = txs.filter(t => t.retning === 'ut').reduce((s, t) => s + Number(t.belop), 0);
      const uklassifisert = txs.filter(t => t.kategori === 'Uklassifisert').length;
      setStats({ inntekter, utgifter, uklassifisert });

      // Monthly
      const months: Record<string, { inntekter: number; utgifter: number }> = {};
      for (let m = 1; m <= 12; m++) {
        const key = String(m).padStart(2, '0');
        months[key] = { inntekter: 0, utgifter: 0 };
      }
      for (const t of txs) {
        const m = t.dato.slice(5, 7);
        if (months[m]) {
          if (t.retning === 'inn') months[m].inntekter += Number(t.belop);
          else months[m].utgifter += Number(t.belop);
        }
      }
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
      setMonthlyData(Object.entries(months).map(([k, v], i) => ({ name: monthNames[i], ...v })));

      // Categories
      const catInn: Record<string, number> = {};
      const catUt: Record<string, number> = {};
      for (const t of txs) {
        if (t.retning === 'inn') catInn[t.kategori] = (catInn[t.kategori] || 0) + Number(t.belop);
        else catUt[t.kategori] = (catUt[t.kategori] || 0) + Number(t.belop);
      }
      setCategoryData({
        inn: Object.entries(catInn).map(([name, value]) => ({ name, value })),
        ut: Object.entries(catUt).map(([name, value]) => ({ name, value })),
      });

      // Recent
      const sorted = [...txs].sort((a, b) => b.dato.localeCompare(a.dato)).slice(0, 10);
      setRecentTx(sorted);

      // Kalender
      const today = new Date().toISOString().slice(0, 10);
      const horizon = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
      const { data: kh } = await supabase.from('kalender_hendelser').select('*')
        .eq('fullfort', false).gte('dato', today).lte('dato', horizon).order('dato').limit(5);
      setKalenderHendelser(kh || []);
    }
    fetch();
  }, [year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-[100px]" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{formatBelop(stats.inntekter)}</div><div className="text-sm text-muted-foreground">Brutto inntekter</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{formatBelop(stats.utgifter)}</div><div className="text-sm text-muted-foreground">Totale utgifter</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className={`text-2xl font-bold ${stats.inntekter - stats.utgifter >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBelop(stats.inntekter - stats.utgifter)}</div><div className="text-sm text-muted-foreground">Netto</div></CardContent></Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/datavasking')}><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{stats.uklassifisert}</div><div className="text-sm text-muted-foreground">Uklassifiserte</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Inntekter vs utgifter per måned</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatBelop(v)} />
              <Legend />
              <Bar dataKey="inntekter" fill="hsl(142, 76%, 36%)" name="Inntekter" />
              <Bar dataKey="utgifter" fill="hsl(0, 84%, 60%)" name="Utgifter" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Inntekter per kategori</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData.inn} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.inn.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatBelop(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Utgifter per kategori</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData.ut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.ut.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatBelop(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {kalenderHendelser.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />Kommende vedlikehold</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kalenderHendelser.map(h => (
                <div key={h.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{formatDato(h.dato)}</span>
                    <span className="text-sm font-medium">{h.tittel}</span>
                  </div>
                  <Badge variant="outline" className={
                    h.prioritet === 'kritisk' ? 'bg-red-50 text-red-600' :
                    h.prioritet === 'høy' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                  }>{h.prioritet}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Siste 10 transaksjoner</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dato</TableHead>
                <TableHead>Beskrivelse</TableHead>
                <TableHead className="text-right">Beløp</TableHead>
                <TableHead>Kategori</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTx.map(t => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate('/transaksjoner')}>
                  <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                  <TableCell className="text-sm">{t.beskrivelse_bank}</TableCell>
                  <TableCell className={`text-right font-mono text-sm ${t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}
                  </TableCell>
                  <TableCell className="text-sm">{t.kategori}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
