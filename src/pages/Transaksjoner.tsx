import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatBelop, formatDato } from '@/lib/format';
import { Download, X, Paperclip } from 'lucide-react';

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
  er_oppgjor: boolean | null;
  oppgjor_til: string | null;
}

type ColumnPreset = 'kompakt' | 'inntekter' | 'utgifter' | 'skattemelding' | 'alle';

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
  const [hideOppgjor, setHideOppgjor] = useState(false);
  const [bilagMap, setBilagMap] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: '', kategori: [] as string[], retning: '', konto: '', status: [] as string[], datoFra: '', datoTil: '',
  });
  const [kontoer, setKontoer] = useState<{ kontonummer: string; navn: string | null }[]>([]);

  useEffect(() => {
    supabase.from('kontoer').select('kontonummer, navn').then(({ data }) => { if (data) setKontoer(data); });
  }, []);

  useEffect(() => { fetchData(); }, [page, perPage, filters, hideOppgjor, preset]);

  const fetchData = async () => {
    let query = supabase.from('transaksjoner').select('*', { count: 'exact' });

    if (filters.search) query = query.or(`beskrivelse_bank.ilike.%${filters.search}%,motpart_bank.ilike.%${filters.search}%,motpart_egen.ilike.%${filters.search}%`);
    if (filters.kategori.length) query = query.in('kategori', filters.kategori);
    if (filters.retning) query = query.eq('retning', filters.retning);
    if (filters.konto) query = query.eq('konto', filters.konto);
    if (filters.status.length) query = query.in('klassifisering_status', filters.status);
    if (filters.datoFra) query = query.gte('dato', filters.datoFra);
    if (filters.datoTil) query = query.lte('dato', filters.datoTil);
    if (hideOppgjor) query = query.or('er_oppgjor.is.null,er_oppgjor.eq.false');
    if (preset === 'skattemelding') {
      query = query.eq('kategori', 'Eiersameie E7').or('er_oppgjor.is.null,er_oppgjor.eq.false');
    }

    query = query.order('dato', { ascending: false }).range(page * perPage, (page + 1) * perPage - 1);

    const { data: txData, count } = await query;
    if (txData) {
      setData(txData as Transaksjon[]);
      // Fetch bilag counts for visible transactions
      const ids = txData.map((t: any) => t.id);
      if (ids.length > 0) {
        const { data: bilagData } = await supabase.from('bilag').select('transaksjon_id').in('transaksjon_id', ids);
        if (bilagData) setBilagMap(new Set(bilagData.map((b: any) => b.transaksjon_id)));
      }
    }
    if (count !== null) setTotal(count);
  };

  const totalBelop = data.reduce((sum, t) => sum + (t.retning === 'inn' ? t.belop : -t.belop), 0);
  const hasFilters = filters.search || filters.kategori.length || filters.retning || filters.konto || filters.status.length || filters.datoFra || filters.datoTil;
  const clearFilters = () => setFilters({ search: '', kategori: [], retning: '', konto: '', status: [], datoFra: '', datoTil: '' });

  const exportCsv = () => {
    const headers = ['Dato', 'Beskrivelse', 'Motpart', 'Beløp', 'Retning', 'Kategori', 'Underkategori', 'Status', 'Oppgjør'];
    const rows = data.map(t => [t.dato, t.beskrivelse_bank, t.motpart_bank || t.motpart_egen || '', t.belop, t.retning, t.kategori, t.underkategori || '', t.klassifisering_status || '', t.er_oppgjor ? 'Ja' : '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transaksjoner.csv'; a.click();
  };

  const showFradrag = preset === 'skattemelding' || preset === 'alle';
  const showBilag = preset === 'skattemelding' || preset === 'alle';
  const showOppgjor = preset !== 'skattemelding';
  const showBetaler = preset === 'utgifter' || preset === 'skattemelding' || preset === 'alle';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transaksjoner</h1>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 mr-2">
            <Switch id="hide-oppgjor" checked={hideOppgjor} onCheckedChange={setHideOppgjor} />
            <Label htmlFor="hide-oppgjor" className="text-sm">Skjul oppgjør</Label>
          </div>
          <Select value={preset} onValueChange={v => setPreset(v as ColumnPreset)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kompakt">Kompakt</SelectItem>
              <SelectItem value="inntekter">Inntekter</SelectItem>
              <SelectItem value="utgifter">Utgifter</SelectItem>
              <SelectItem value="skattemelding">Skattemelding</SelectItem>
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
        {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Fjern filtre</Button>}
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
              {(preset === 'utgifter' || preset === 'alle' || preset === 'skattemelding') && <TableHead>Utgiftstype</TableHead>}
              {(preset === 'utgifter' || preset === 'alle' || preset === 'skattemelding') && <TableHead>Leverandør</TableHead>}
              {(preset === 'alle' || preset === 'skattemelding') && <TableHead>Underkategori</TableHead>}
              {(preset === 'alle' || preset === 'skattemelding') && <TableHead>Kostnadstype</TableHead>}
              {showBetaler && <TableHead>Betaler</TableHead>}
              {showBetaler && <TableHead>Kostnadsbeskr.</TableHead>}
              <TableHead className="text-right">Beløp</TableHead>
              <TableHead>Kategori</TableHead>
              {showOppgjor && <TableHead>Oppgjør</TableHead>}
              {showFradrag && <TableHead>Fradrag</TableHead>}
              {showBilag && <TableHead>Bilag</TableHead>}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(t => (
              <TableRow key={t.id} className={t.er_oppgjor ? 'bg-gray-50' : t.retning === 'inn' ? 'bg-green-50/30' : 'bg-red-50/30'}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{formatDato(t.dato)}</TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">{t.motpart_egen || t.motpart_bank || '-'}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{t.beskrivelse_bank}</TableCell>
                {(preset === 'inntekter' || preset === 'alle') && <TableCell className="text-sm">{t.inntektstype || '-'}</TableCell>}
                {(preset === 'inntekter' || preset === 'alle') && <TableCell className="text-sm">{t.leie_for || '-'}</TableCell>}
                {(preset === 'inntekter' || preset === 'alle') && <TableCell className="text-sm">{t.leieperiode || '-'}</TableCell>}
                {(preset === 'utgifter' || preset === 'alle' || preset === 'skattemelding') && <TableCell className="text-sm">{t.utgiftstype || '-'}</TableCell>}
                {(preset === 'utgifter' || preset === 'alle' || preset === 'skattemelding') && <TableCell className="text-sm">{t.leverandor || '-'}</TableCell>}
                {(preset === 'alle' || preset === 'skattemelding') && <TableCell className="text-sm">{t.underkategori || '-'}</TableCell>}
                {(preset === 'alle' || preset === 'skattemelding') && <TableCell className="text-sm">{t.kostnadstype || '-'}</TableCell>}
                {showBetaler && <TableCell className="text-sm">{(t as any).betaler_eier || '-'}</TableCell>}
                {showBetaler && <TableCell className="text-sm max-w-[150px] truncate">{(t as any).kostnadsbeskrivelse || '-'}</TableCell>}
                <TableCell className={`text-right font-mono text-sm whitespace-nowrap ${t.er_oppgjor ? 'text-gray-500' : t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{t.kategori}</Badge></TableCell>
                {showOppgjor && <TableCell>{t.er_oppgjor && <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Oppgjør</Badge>}</TableCell>}
                {showFradrag && <TableCell>{t.retning === 'ut' && <Badge className={t.fradragsberettiget ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}>{t.fradragsberettiget ? 'Ja' : 'Nei'}</Badge>}</TableCell>}
                {showBilag && <TableCell>{bilagMap.has(t.id) && <Paperclip className="h-4 w-4 text-blue-500" />}</TableCell>}
                <TableCell><Badge className={`text-xs ${statusColors[t.klassifisering_status || ''] || ''}`}>{t.klassifisering_status || '-'}</Badge></TableCell>
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
