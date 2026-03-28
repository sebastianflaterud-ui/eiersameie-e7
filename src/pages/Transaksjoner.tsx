import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBelop, formatDato } from '@/lib/format';
import { Download, X } from 'lucide-react';

interface Transaksjon {
  id: string;
  dato: string;
  beskrivelse_bank: string;
  belop: number;
  retning: string;
  motpart_bank: string | null;
  motpart_egen: string | null;
  kategori: string;
  underkategori: string | null;
  klassifisering_status: string | null;
  konto: string | null;
  inntektstype: string | null;
  utgiftstype: string | null;
  leverandor: string | null;
  kostnadstype: string | null;
  betalt_av: string | null;
  leie_for: string | null;
  leieperiode: string | null;
  enhet: string | null;
  kilde: string;
  fradragsberettiget: boolean | null;
}

type ColumnPreset = 'kompakt' | 'inntekter' | 'utgifter' | 'alle';

const statusColors: Record<string, string> = {
  auto: 'bg-blue-100 text-blue-800',
  'foreslått': 'bg-yellow-100 text-yellow-800',
  manuell: 'bg-purple-100 text-purple-800',
  bekreftet: 'bg-green-100 text-green-800',
};

export default function Transaksjoner() {
  const [data, setData] = useState<Transaksjon[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [preset, setPreset] = useState<ColumnPreset>('kompakt');
  const [filters, setFilters] = useState({
    search: '',
    kategori: [] as string[],
    retning: '',
    konto: '',
    status: [] as string[],
    datoFra: '',
    datoTil: '',
  });
  const [kontoer, setKontoer] = useState<{ kontonummer: string; navn: string | null }[]>([]);

  useEffect(() => {
    supabase.from('kontoer').select('kontonummer, navn').then(({ data }) => { if (data) setKontoer(data); });
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, perPage, filters]);

  const fetchData = async () => {
    let query = supabase.from('transaksjoner').select('*', { count: 'exact' });

    if (filters.search) query = query.or(`beskrivelse_bank.ilike.%${filters.search}%,motpart_bank.ilike.%${filters.search}%,motpart_egen.ilike.%${filters.search}%`);
    if (filters.kategori.length) query = query.in('kategori', filters.kategori);
    if (filters.retning) query = query.eq('retning', filters.retning);
    if (filters.konto) query = query.eq('konto', filters.konto);
    if (filters.status.length) query = query.in('klassifisering_status', filters.status);
    if (filters.datoFra) query = query.gte('dato', filters.datoFra);
    if (filters.datoTil) query = query.lte('dato', filters.datoTil);

    query = query.order('dato', { ascending: false }).range(page * perPage, (page + 1) * perPage - 1);

    const { data, count } = await query;
    if (data) setData(data as Transaksjon[]);
    if (count !== null) setTotal(count);
  };

  const totalBelop = data.reduce((sum, t) => sum + (t.retning === 'inn' ? t.belop : -t.belop), 0);
  const hasFilters = filters.search || filters.kategori.length || filters.retning || filters.konto || filters.status.length || filters.datoFra || filters.datoTil;

  const clearFilters = () => setFilters({ search: '', kategori: [], retning: '', konto: '', status: [], datoFra: '', datoTil: '' });

  const exportCsv = () => {
    const headers = ['Dato', 'Beskrivelse', 'Motpart', 'Beløp', 'Retning', 'Kategori', 'Underkategori', 'Status'];
    const rows = data.map(t => [t.dato, t.beskrivelse_bank, t.motpart_bank || t.motpart_egen || '', t.belop, t.retning, t.kategori, t.underkategori || '', t.klassifisering_status || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaksjoner.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaksjoner</h1>
        <div className="flex gap-2">
          <Select value={preset} onValueChange={v => setPreset(v as ColumnPreset)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kompakt">Kompakt</SelectItem>
              <SelectItem value="inntekter">Inntekter</SelectItem>
              <SelectItem value="utgifter">Utgifter</SelectItem>
              <SelectItem value="alle">Alle kolonner</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Søk..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} className="w-[200px]" />
        <Input type="date" value={filters.datoFra} onChange={e => setFilters(p => ({ ...p, datoFra: e.target.value }))} className="w-[150px]" />
        <Input type="date" value={filters.datoTil} onChange={e => setFilters(p => ({ ...p, datoTil: e.target.value }))} className="w-[150px]" />
        <Select value={filters.retning || 'alle'} onValueChange={v => setFilters(p => ({ ...p, retning: v === 'alle' ? '' : v }))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle</SelectItem>
            <SelectItem value="inn">Inn</SelectItem>
            <SelectItem value="ut">Ut</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.konto || 'alle'} onValueChange={v => setFilters(p => ({ ...p, konto: v === 'alle' ? '' : v }))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Konto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle kontoer</SelectItem>
            {kontoer.map(k => <SelectItem key={k.kontonummer} value={k.kontonummer}>{k.navn || k.kontonummer}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Fjern filtre</Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dato</TableHead>
              <TableHead>Motpart</TableHead>
              <TableHead>Beskrivelse</TableHead>
              {(preset === 'inntekter' || preset === 'alle') && <TableHead>Inntektstype</TableHead>}
              {(preset === 'inntekter' || preset === 'alle') && <TableHead>Leie for</TableHead>}
              {(preset === 'inntekter' || preset === 'alle') && <TableHead>Periode</TableHead>}
              {(preset === 'utgifter' || preset === 'alle') && <TableHead>Utgiftstype</TableHead>}
              {(preset === 'utgifter' || preset === 'alle') && <TableHead>Leverandør</TableHead>}
              {preset === 'alle' && <TableHead>Underkategori</TableHead>}
              <TableHead className="text-right">Beløp</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(t => (
              <TableRow key={t.id} className={t.retning === 'inn' ? 'bg-green-50/30' : 'bg-red-50/30'}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{formatDato(t.dato)}</TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">{t.motpart_egen || t.motpart_bank || '-'}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{t.beskrivelse_bank}</TableCell>
                {(preset === 'inntekter' || preset === 'alle') && <TableCell className="text-sm">{t.inntektstype || '-'}</TableCell>}
                {(preset === 'inntekter' || preset === 'alle') && <TableCell className="text-sm">{t.leie_for || '-'}</TableCell>}
                {(preset === 'inntekter' || preset === 'alle') && <TableCell className="text-sm">{t.leieperiode || '-'}</TableCell>}
                {(preset === 'utgifter' || preset === 'alle') && <TableCell className="text-sm">{t.utgiftstype || '-'}</TableCell>}
                {(preset === 'utgifter' || preset === 'alle') && <TableCell className="text-sm">{t.leverandor || '-'}</TableCell>}
                {preset === 'alle' && <TableCell className="text-sm">{t.underkategori || '-'}</TableCell>}
                <TableCell className={`text-right font-mono text-sm whitespace-nowrap ${t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{t.kategori}</Badge></TableCell>
                <TableCell>
                  <Badge className={`text-xs ${statusColors[t.klassifisering_status || ''] || ''}`}>
                    {t.klassifisering_status || '-'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {total} transaksjoner | Netto: <span className={`font-mono font-medium ${totalBelop >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBelop(totalBelop)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(0); }}>
            <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>Side {page + 1} av {Math.max(1, Math.ceil(total / perPage))}</span>
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Forrige</Button>
          <Button variant="outline" size="sm" disabled={(page + 1) * perPage >= total} onClick={() => setPage(p => p + 1)}>Neste</Button>
        </div>
      </div>
    </div>
  );
}
