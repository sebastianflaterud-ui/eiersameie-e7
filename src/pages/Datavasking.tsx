import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { formatBelop, formatDato } from '@/lib/format';
import { toast } from 'sonner';
import { CheckCircle, SkipForward } from 'lucide-react';

interface Transaksjon {
  id: string;
  dato: string;
  beskrivelse_bank: string;
  beskrivelse_egen: string | null;
  belop: number;
  retning: string;
  motpart_bank: string | null;
  motpart_egen: string | null;
  kategori: string;
  underkategori: string | null;
  klassifisering_status: string | null;
  konto: string | null;
  kilde: string;
  arkivref: string | null;
  inntektstype: string | null;
  utgiftstype: string | null;
  leverandor: string | null;
  kostnadstype: string | null;
  betalt_av: string | null;
  leie_for: string | null;
  leieperiode: string | null;
  enhet: string | null;
  notater: string | null;
  skatteaar: number | null;
  fradragsberettiget: boolean | null;
  bokforingsdato: string | null;
}

type FilterType = 'alle' | 'uklassifisert' | 'foreslått' | 'auto';

export default function Datavasking() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, klassifisert: 0, uklassifisert: 0, foreslått: 0 });
  const [items, setItems] = useState<Transaksjon[]>([]);
  const [filter, setFilter] = useState<FilterType>('alle');
  const [detailItem, setDetailItem] = useState<Transaksjon | null>(null);
  const [detailForm, setDetailForm] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const fetchStats = async () => {
    const { count: total } = await supabase.from('transaksjoner').select('*', { count: 'exact', head: true });
    const { count: klassifisert } = await supabase.from('transaksjoner').select('*', { count: 'exact', head: true }).in('klassifisering_status', ['auto', 'manuell', 'bekreftet']);
    const { count: uklassifisert } = await supabase.from('transaksjoner').select('*', { count: 'exact', head: true }).eq('kategori', 'Uklassifisert');
    const { count: foreslått } = await supabase.from('transaksjoner').select('*', { count: 'exact', head: true }).eq('klassifisering_status', 'foreslått').neq('kategori', 'Uklassifisert');
    setStats({ total: total || 0, klassifisert: klassifisert || 0, uklassifisert: uklassifisert || 0, foreslått: foreslått || 0 });
  };

  const fetchItems = async () => {
    let query = supabase.from('transaksjoner').select('*');
    if (filter === 'uklassifisert') query = query.eq('kategori', 'Uklassifisert');
    else if (filter === 'foreslått') query = query.eq('klassifisering_status', 'foreslått');
    else if (filter === 'auto') query = query.eq('klassifisering_status', 'auto');
    else query = query.or('kategori.eq.Uklassifisert,klassifisering_status.eq.foreslått');
    
    const { data } = await query.order('dato', { ascending: false }).range(page * 25, (page + 1) * 25 - 1);
    if (data) setItems(data as Transaksjon[]);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchItems(); }, [filter, page]);

  const quickClassify = async (id: string, kategori: string) => {
    await supabase.from('transaksjoner').update({ kategori: kategori as any, klassifisering_status: 'manuell' as any }).eq('id', id);
    toast.success(`Klassifisert som ${kategori}`);
    fetchItems();
    fetchStats();
  };

  const bulkClassify = async (kategori: string) => {
    if (selected.size === 0) return;
    for (const id of selected) {
      await supabase.from('transaksjoner').update({ kategori: kategori as any, klassifisering_status: 'manuell' as any }).eq('id', id);
    }
    toast.success(`${selected.size} transaksjoner klassifisert som ${kategori}`);
    setSelected(new Set());
    fetchItems();
    fetchStats();
  };

  const openDetail = (t: Transaksjon) => {
    setDetailItem(t);
    setDetailForm({
      kategori: t.kategori,
      underkategori: t.underkategori || '',
      motpart_egen: t.motpart_egen || '',
      kostnadstype: t.kostnadstype || '',
      inntektstype: t.inntektstype || '',
      utgiftstype: t.utgiftstype || '',
      leverandor: t.leverandor || '',
      betalt_av: t.betalt_av || '',
      leie_for: t.leie_for || '',
      leieperiode: t.leieperiode || '',
      enhet: t.enhet || '',
      beskrivelse_egen: t.beskrivelse_egen || '',
      notater: t.notater || '',
      skatteaar: t.skatteaar || '',
    });
  };

  const saveDetail = async (status: string) => {
    if (!detailItem) return;
    const { error } = await supabase.from('transaksjoner').update({
      kategori: detailForm.kategori as any,
      underkategori: detailForm.underkategori || null,
      motpart_egen: detailForm.motpart_egen || null,
      kostnadstype: detailForm.kostnadstype || null,
      inntektstype: detailForm.inntektstype || null,
      utgiftstype: detailForm.utgiftstype || null,
      leverandor: detailForm.leverandor || null,
      betalt_av: detailForm.betalt_av || null,
      leie_for: detailForm.leie_for || null,
      leieperiode: detailForm.leieperiode || null,
      enhet: detailForm.enhet || null,
      beskrivelse_egen: detailForm.beskrivelse_egen || null,
      notater: detailForm.notater || null,
      skatteaar: detailForm.skatteaar ? Number(detailForm.skatteaar) : null,
      klassifisering_status: status as any,
    }).eq('id', detailItem.id);

    if (error) { toast.error(error.message); return; }
    toast.success('Lagret');

    // Move to next item
    const currentIdx = items.findIndex(i => i.id === detailItem.id);
    if (currentIdx < items.length - 1) {
      openDetail(items[currentIdx + 1]);
    } else {
      setDetailItem(null);
    }
    fetchItems();
    fetchStats();
  };

  const pct = stats.total > 0 ? Math.round((stats.klassifisert / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Datavasking</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">Totalt</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{stats.klassifisert}</div><div className="text-sm text-muted-foreground">Klassifisert</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{stats.uklassifisert}</div><div className="text-sm text-muted-foreground">Uklassifisert</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{stats.foreslått}</div><div className="text-sm text-muted-foreground">Foreslått</div></CardContent></Card>
      </div>
      <Progress value={pct} className="h-2" />
      <p className="text-sm text-muted-foreground">{pct}% klassifisert</p>

      {/* Filter & Bulk */}
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={v => { setFilter(v as FilterType); setPage(0); }}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle ubehandlede</SelectItem>
            <SelectItem value="uklassifisert">Kun uklassifiserte</SelectItem>
            <SelectItem value="foreslått">Kun foreslåtte</SelectItem>
            <SelectItem value="auto">Kun autoklassifiserte</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <div className="flex gap-1 ml-4">
            <span className="text-sm text-muted-foreground mr-2">{selected.size} valgt:</span>
            <Button size="sm" variant="outline" onClick={() => bulkClassify('Privat')}>Privat</Button>
            <Button size="sm" variant="outline" onClick={() => bulkClassify('Eiersameie E7')}>E7</Button>
            <Button size="sm" variant="outline" onClick={() => bulkClassify('Motivus AS')}>Motivus</Button>
          </div>
        )}
      </div>

      {/* Triage table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input type="checkbox" onChange={e => {
                  if (e.target.checked) setSelected(new Set(items.map(i => i.id)));
                  else setSelected(new Set());
                }} />
              </TableHead>
              <TableHead>Dato</TableHead>
              <TableHead>Motpart</TableHead>
              <TableHead>Beskrivelse</TableHead>
              <TableHead className="text-right">Beløp</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Handling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(t => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-muted/80" onClick={() => openDetail(t)}>
                <TableCell onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(t.id)} onChange={e => {
                    const next = new Set(selected);
                    e.target.checked ? next.add(t.id) : next.delete(t.id);
                    setSelected(next);
                  }} />
                </TableCell>
                <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                <TableCell className="text-sm">{t.motpart_egen || t.motpart_bank || '-'}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{t.beskrivelse_bank}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{t.kategori}</Badge></TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickClassify(t.id, 'Privat')}>Privat</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickClassify(t.id, 'Eiersameie E7')}>E7</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickClassify(t.id, 'Motivus AS')}>Motivus</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Forrige</Button>
        <Button variant="outline" size="sm" disabled={items.length < 25} onClick={() => setPage(p => p + 1)}>Neste</Button>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Transaksjon — {detailItem?.beskrivelse_bank}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              {/* Bank data (read-only) */}
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div className="font-medium text-xs text-muted-foreground mb-2">Bankdata (skrivebeskyttet)</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-muted-foreground">Dato:</span> {formatDato(detailItem.dato)}</div>
                  <div><span className="text-muted-foreground">Beløp:</span> <span className={detailItem.retning === 'inn' ? 'text-green-600' : 'text-red-600'}>{detailItem.retning === 'ut' ? '-' : ''}{formatBelop(detailItem.belop)}</span></div>
                  <div><span className="text-muted-foreground">Beskrivelse:</span> {detailItem.beskrivelse_bank}</div>
                  <div><span className="text-muted-foreground">Konto:</span> {detailItem.konto || '-'}</div>
                  <div><span className="text-muted-foreground">Kilde:</span> {detailItem.kilde}</div>
                  <div><span className="text-muted-foreground">Arkivref:</span> {detailItem.arkivref || '-'}</div>
                </div>
              </div>

              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Kategori</Label>
                  <Select value={detailForm.kategori} onValueChange={v => setDetailForm(p => ({ ...p, kategori: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uklassifisert">Uklassifisert</SelectItem>
                      <SelectItem value="Privat">Privat</SelectItem>
                      <SelectItem value="Eiersameie E7">Eiersameie E7</SelectItem>
                      <SelectItem value="Motivus AS">Motivus AS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Underkategori</Label><Input value={detailForm.underkategori} onChange={e => setDetailForm(p => ({ ...p, underkategori: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><Label>Motpart (egen)</Label><Input value={detailForm.motpart_egen} onChange={e => setDetailForm(p => ({ ...p, motpart_egen: e.target.value }))} /></div>

              {/* Dynamic fields */}
              {detailItem.retning === 'inn' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="space-y-1"><Label>Inntektstype</Label><Input value={detailForm.inntektstype} onChange={e => setDetailForm(p => ({ ...p, inntektstype: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Betalt av</Label><Input value={detailForm.betalt_av} onChange={e => setDetailForm(p => ({ ...p, betalt_av: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Leie for</Label><Input value={detailForm.leie_for} onChange={e => setDetailForm(p => ({ ...p, leie_for: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Leieperiode</Label><Input value={detailForm.leieperiode} onChange={e => setDetailForm(p => ({ ...p, leieperiode: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Enhet</Label><Input value={detailForm.enhet} onChange={e => setDetailForm(p => ({ ...p, enhet: e.target.value }))} /></div>
                </div>
              )}
              {detailItem.retning === 'ut' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="space-y-1"><Label>Utgiftstype</Label><Input value={detailForm.utgiftstype} onChange={e => setDetailForm(p => ({ ...p, utgiftstype: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Leverandør</Label><Input value={detailForm.leverandor} onChange={e => setDetailForm(p => ({ ...p, leverandor: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Kostnadstype</Label><Input value={detailForm.kostnadstype} onChange={e => setDetailForm(p => ({ ...p, kostnadstype: e.target.value }))} /></div>
                </div>
              )}

              <div className="space-y-1"><Label>Egen beskrivelse</Label><Input value={detailForm.beskrivelse_egen} onChange={e => setDetailForm(p => ({ ...p, beskrivelse_egen: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Notater</Label><Textarea value={detailForm.notater} onChange={e => setDetailForm(p => ({ ...p, notater: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Skatteår</Label><Input type="number" value={detailForm.skatteaar} onChange={e => setDetailForm(p => ({ ...p, skatteaar: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailItem(null)}>Avbryt</Button>
            <Button onClick={() => saveDetail('manuell')}>Lagre og neste</Button>
            <Button variant="secondary" onClick={() => { saveDetail('bekreftet'); setDetailItem(null); }}>
              <CheckCircle className="h-4 w-4 mr-1" />Bekreft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
