import { useState, useEffect, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { formatBelop, formatDato } from '@/lib/format';
import { toast } from 'sonner';
import { CheckCircle, Upload, Trash2, Paperclip, Sparkles, Loader2 } from 'lucide-react';

interface Transaksjon {
  id: string; dato: string; beskrivelse_bank: string; beskrivelse_egen: string | null;
  belop: number; retning: string; motpart_bank: string | null; motpart_egen: string | null;
  kategori: string; underkategori: string | null; klassifisering_status: string | null;
  konto: string | null; kilde: string; arkivref: string | null;
  inntektstype: string | null; utgiftstype: string | null; leverandor: string | null;
  kostnadstype: string | null; betalt_av: string | null; leie_for: string | null;
  leieperiode: string | null; enhet: string | null; notater: string | null;
  skatteaar: number | null; fradragsberettiget: boolean | null; bokforingsdato: string | null;
  er_oppgjor: boolean | null; oppgjor_til: string | null;
  mangler_underlag: boolean | null;
}

interface Bilag { id: string; filnavn: string; filtype: string; storage_path: string; }
interface Eier { id: string; navn: string; }

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
  const [eiere, setEiere] = useState<Eier[]>([]);
  const [bilagList, setBilagList] = useState<Bilag[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiClassifying, setAiClassifying] = useState(false);
  const [aiProgress, setAiProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    supabase.from('eiere').select('id, navn').then(({ data }) => { if (data) setEiere(data as Eier[]); });
  }, []);

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

  const fetchBilag = async (txId: string) => {
    const { data } = await supabase.from('bilag').select('*').eq('transaksjon_id', txId);
    if (data) setBilagList(data as Bilag[]);
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchItems(); }, [filter, page]);

  const quickClassify = async (id: string, kategori: string) => {
    await supabase.from('transaksjoner').update({ kategori: kategori as any, klassifisering_status: 'manuell' as any }).eq('id', id);
    toast.success(`Klassifisert som ${kategori}`);
    fetchItems(); fetchStats();
  };

  const bulkClassify = async (kategori: string) => {
    if (selected.size === 0) return;
    for (const id of selected) {
      await supabase.from('transaksjoner').update({ kategori: kategori as any, klassifisering_status: 'manuell' as any }).eq('id', id);
    }
    toast.success(`${selected.size} transaksjoner klassifisert`);
    setSelected(new Set()); fetchItems(); fetchStats();
  };

  const openDetail = (t: Transaksjon) => {
    setDetailItem(t);
    setDetailForm({
      kategori: t.kategori, underkategori: t.underkategori || '', motpart_egen: t.motpart_egen || '',
      kostnadstype: t.kostnadstype || '', inntektstype: t.inntektstype || '', utgiftstype: t.utgiftstype || '',
      leverandor: t.leverandor || '', betalt_av: t.betalt_av || '', leie_for: t.leie_for || '',
      leieperiode: t.leieperiode || '', enhet: t.enhet || '', beskrivelse_egen: t.beskrivelse_egen || '',
      notater: t.notater || '', skatteaar: t.skatteaar || '',
      er_oppgjor: t.er_oppgjor || false, oppgjor_til: t.oppgjor_til || '',
      betaler_eier: (t as any).betaler_eier || '', kostnadsbeskrivelse: (t as any).kostnadsbeskrivelse || '',
      mangler_underlag: t.mangler_underlag || false,
    });
    fetchBilag(t.id);
  };

  const saveDetail = async (status: string) => {
    if (!detailItem) return;
    const { error } = await supabase.from('transaksjoner').update({
      kategori: detailForm.kategori as any, underkategori: detailForm.underkategori || null,
      motpart_egen: detailForm.motpart_egen || null, kostnadstype: detailForm.kostnadstype || null,
      inntektstype: detailForm.inntektstype || null, utgiftstype: detailForm.utgiftstype || null,
      leverandor: detailForm.leverandor || null, betalt_av: detailForm.betalt_av || null,
      leie_for: detailForm.leie_for || null, leieperiode: detailForm.leieperiode || null,
      enhet: detailForm.enhet || null, beskrivelse_egen: detailForm.beskrivelse_egen || null,
      notater: detailForm.notater || null, skatteaar: detailForm.skatteaar ? Number(detailForm.skatteaar) : null,
      klassifisering_status: status as any,
      er_oppgjor: detailForm.er_oppgjor, oppgjor_til: detailForm.er_oppgjor ? (detailForm.oppgjor_til || null) : null,
      betaler_eier: detailForm.betaler_eier || null, kostnadsbeskrivelse: detailForm.kostnadsbeskrivelse || null,
      mangler_underlag: detailForm.mangler_underlag || false,
      // fradragsberettiget is handled by DB trigger based on mangler_underlag + kategori
    } as any).eq('id', detailItem.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Lagret');
    const currentIdx = items.findIndex(i => i.id === detailItem.id);
    if (status === 'manuell' && currentIdx < items.length - 1) { openDetail(items[currentIdx + 1]); }
    else { setDetailItem(null); }
    fetchItems(); fetchStats();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !detailItem || !user) return;
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} er over 10 MB`); continue; }
      const path = `${user.id}/${detailItem.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('bilag').upload(path, file);
      if (uploadError) { toast.error(`Opplastingsfeil: ${uploadError.message}`); continue; }
      await supabase.from('bilag').insert({
        user_id: user.id, transaksjon_id: detailItem.id,
        filnavn: file.name, filtype: file.type, filstorrelse: file.size, storage_path: path,
      });
    }
    setUploading(false);
    toast.success('Bilag lastet opp');
    fetchBilag(detailItem.id);
    e.target.value = '';
  };

  const deleteBilag = async (b: Bilag) => {
    await supabase.storage.from('bilag').remove([b.storage_path]);
    await supabase.from('bilag').delete().eq('id', b.id);
    toast.success('Bilag slettet');
    if (detailItem) fetchBilag(detailItem.id);
  };

  const applyAiResults = async (batch: { id: string }[], results: any[]) => {
    let updated = 0;
    for (const r of results) {
      const tx = batch[r.index - 1];
      if (!tx) continue;
      const updateData: Record<string, any> = {
        kategori: r.kategori,
        klassifisering_status: 'foreslått',
      };
      if (r.underkategori) updateData.underkategori = r.underkategori;
      if (r.motpart_egen) updateData.motpart_egen = r.motpart_egen;
      if (r.beskrivelse_egen) updateData.beskrivelse_egen = r.beskrivelse_egen;
      if (r.inntektstype) updateData.inntektstype = r.inntektstype;
      if (r.utgiftstype) updateData.utgiftstype = r.utgiftstype;
      if (r.kostnadstype) updateData.kostnadstype = r.kostnadstype;
      if (r.kostnadsbeskrivelse) updateData.kostnadsbeskrivelse = r.kostnadsbeskrivelse;
      if (r.leverandor) updateData.leverandor = r.leverandor;
      if (r.leie_for) updateData.leie_for = r.leie_for;
      if (r.leieperiode) updateData.leieperiode = r.leieperiode;
      if (r.enhet) updateData.enhet = r.enhet;
      const { error: upErr } = await supabase.from('transaksjoner').update(updateData as any).eq('id', tx.id);
      if (!upErr) updated++;
    }
    return updated;
  };

  const aiClassify = async (all = false) => {
    setAiClassifying(true);
    setAiProgress({ done: 0, total: 0 });

    try {
      // Fetch all unclassified transactions if running full batch
      let allTx: Transaksjon[];
      if (all) {
        const { data } = await supabase.from('transaksjoner').select('*')
          .or('kategori.eq.Uklassifisert,klassifisering_status.eq.foreslått,klassifisering_status.eq.auto')
          .not('klassifisering_status', 'in', '("manuell","bekreftet")')
          .order('dato', { ascending: false });
        allTx = (data || []) as Transaksjon[];
      } else {
        allTx = items.filter(i => i.klassifisering_status !== 'manuell' && i.klassifisering_status !== 'bekreftet');
      }

      if (allTx.length === 0) { toast.info('Ingen transaksjoner å klassifisere med AI'); setAiClassifying(false); return; }

      const batchSize = 20;
      const totalBatches = Math.ceil(allTx.length / batchSize);
      setAiProgress({ done: 0, total: allTx.length });
      let totalUpdated = 0;

      for (let i = 0; i < totalBatches; i++) {
        const chunk = allTx.slice(i * batchSize, (i + 1) * batchSize);
        const batch = chunk.map(t => ({
          id: t.id, dato: t.dato, belop: t.belop, retning: t.retning,
          beskrivelse_bank: t.beskrivelse_bank, motpart_bank: t.motpart_bank, konto: t.konto,
        }));

        try {
          const { data, error } = await supabase.functions.invoke('ai-klassifiser', { body: { transaksjoner: batch } });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          totalUpdated += await applyAiResults(batch, data.results || []);
        } catch (batchErr: any) {
          console.error(`Batch ${i + 1} feilet:`, batchErr);
          if (batchErr.message?.includes('429') || batchErr.message?.includes('mange')) {
            toast.error('Rate limit nådd — venter 10 sekunder...');
            await new Promise(r => setTimeout(r, 10000));
            i--; // retry this batch
            continue;
          }
        }
        setAiProgress({ done: Math.min((i + 1) * batchSize, allTx.length), total: allTx.length });
        // Small delay between batches to avoid rate limits
        if (i < totalBatches - 1) await new Promise(r => setTimeout(r, 1500));
      }

      toast.success(`AI klassifiserte ${totalUpdated} av ${allTx.length} transaksjoner`);
      fetchItems(); fetchStats();
    } catch (e: any) {
      toast.error(e.message || 'AI-klassifisering feilet');
    } finally {
      setAiClassifying(false);
      setAiProgress({ done: 0, total: 0 });
    }
  };

  const pct = stats.total > 0 ? Math.round((stats.klassifisert / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Datavasking</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">Totalt</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{stats.klassifisert}</div><div className="text-sm text-muted-foreground">Klassifisert</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{stats.uklassifisert}</div><div className="text-sm text-muted-foreground">Uklassifisert</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{stats.foreslått}</div><div className="text-sm text-muted-foreground">Foreslått</div></CardContent></Card>
      </div>
      <Progress value={pct} className="h-2" />
      {aiClassifying && aiProgress.total > 0 && (
        <div className="space-y-1">
          <Progress value={Math.round((aiProgress.done / aiProgress.total) * 100)} className="h-2" />
          <p className="text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
            AI klassifiserer: {aiProgress.done} av {aiProgress.total} transaksjoner...
          </p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{pct}% klassifisert</p>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filter} onValueChange={v => { setFilter(v as FilterType); setPage(0); }}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle ubehandlede</SelectItem>
            <SelectItem value="uklassifisert">Kun uklassifiserte</SelectItem>
            <SelectItem value="foreslått">Kun foreslåtte</SelectItem>
            <SelectItem value="auto">Kun autoklassifiserte</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => aiClassify(false)} disabled={aiClassifying}>
          {aiClassifying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {aiClassifying ? `${aiProgress.done}/${aiProgress.total}` : 'AI-klassifiser side'}
        </Button>
        <Button variant="outline" onClick={() => aiClassify(true)} disabled={aiClassifying}>
          <Sparkles className="h-4 w-4 mr-1" />
          AI-klassifiser alle
        </Button>
        {selected.size > 0 && (
          <div className="flex gap-1 ml-4">
            <span className="text-sm text-muted-foreground mr-2">{selected.size} valgt:</span>
            <Button size="sm" variant="outline" onClick={() => bulkClassify('Privat')}>Privat</Button>
            <Button size="sm" variant="outline" onClick={() => bulkClassify('Eiersameie E7')}>E7</Button>
            <Button size="sm" variant="outline" onClick={() => bulkClassify('Motivus AS')}>Motivus</Button>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><input type="checkbox" onChange={e => { if (e.target.checked) setSelected(new Set(items.map(i => i.id))); else setSelected(new Set()); }} /></TableHead>
              <TableHead>Dato</TableHead><TableHead>Motpart</TableHead><TableHead>Beskrivelse</TableHead>
              <TableHead className="text-right">Beløp</TableHead><TableHead>Kategori</TableHead><TableHead>Handling</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(t => (
              <TableRow key={t.id} className="cursor-pointer hover:bg-muted/80" onClick={() => openDetail(t)}>
                <TableCell onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(t.id)} onChange={e => { const next = new Set(selected); e.target.checked ? next.add(t.id) : next.delete(t.id); setSelected(next); }} /></TableCell>
                <TableCell className="font-mono text-xs">{formatDato(t.dato)}</TableCell>
                <TableCell className="text-sm">{t.motpart_egen || t.motpart_bank || '-'}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{t.beskrivelse_bank}</TableCell>
                <TableCell className={`text-right font-mono text-sm ${t.retning === 'inn' ? 'text-green-600' : 'text-red-600'}`}>{t.retning === 'ut' ? '-' : ''}{formatBelop(t.belop)}</TableCell>
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

              {/* Oppgjør section */}
              {detailItem.retning === 'ut' && detailForm.kategori === 'Eiersameie E7' && (
                <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                  <div className="font-medium text-sm">Oppgjør</div>
                  <div className="flex items-center gap-2">
                    <Switch checked={detailForm.er_oppgjor} onCheckedChange={v => setDetailForm(p => ({ ...p, er_oppgjor: v }))} />
                    <Label className="text-sm">Dette er et oppgjør/viderefordeling til medeier</Label>
                  </div>
                  {detailForm.er_oppgjor && (
                    <div className="space-y-1">
                      <Label>Oppgjør til</Label>
                      <Select value={detailForm.oppgjor_til} onValueChange={v => setDetailForm(p => ({ ...p, oppgjor_til: v }))}>
                        <SelectTrigger><SelectValue placeholder="Velg eier" /></SelectTrigger>
                        <SelectContent>
                          {eiere.map(e => <SelectItem key={e.id} value={e.navn}>{e.navn}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {detailItem.retning === 'inn' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="space-y-1"><Label>Inntektstype</Label><Input value={detailForm.inntektstype} onChange={e => setDetailForm(p => ({ ...p, inntektstype: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Betalt av</Label><Input value={detailForm.betalt_av} onChange={e => setDetailForm(p => ({ ...p, betalt_av: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Leie for</Label><Input value={detailForm.leie_for} onChange={e => setDetailForm(p => ({ ...p, leie_for: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Leieperiode</Label><Input value={detailForm.leieperiode} onChange={e => setDetailForm(p => ({ ...p, leieperiode: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Enhet</Label><Input value={detailForm.enhet} onChange={e => setDetailForm(p => ({ ...p, enhet: e.target.value }))} /></div>
                </div>
              )}
              {detailItem.retning === 'ut' && !detailForm.er_oppgjor && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="space-y-1"><Label>Utgiftstype</Label><Input value={detailForm.utgiftstype} onChange={e => setDetailForm(p => ({ ...p, utgiftstype: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Leverandør</Label><Input value={detailForm.leverandor} onChange={e => setDetailForm(p => ({ ...p, leverandor: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Kostnadstype</Label><Input value={detailForm.kostnadstype} onChange={e => setDetailForm(p => ({ ...p, kostnadstype: e.target.value }))} /></div>
                  </div>
                   {detailForm.kategori === 'Eiersameie E7' && (
                    <>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                      <Switch checked={detailForm.mangler_underlag} onCheckedChange={v => setDetailForm(p => ({ ...p, mangler_underlag: v }))} />
                      <Label className="text-sm">Mangler kvittering/underlag</Label>
                      {detailForm.mangler_underlag && <Badge variant="secondary" className="ml-auto text-xs">Ekskluderes fra skattemelding</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="space-y-1">
                        <Label>Betaler (hvem la ut)</Label>
                        <Select value={detailForm.betaler_eier || ''} onValueChange={v => setDetailForm(p => ({ ...p, betaler_eier: v }))}>
                          <SelectTrigger><SelectValue placeholder="Velg betaler" /></SelectTrigger>
                          <SelectContent>
                            {eiere.map(e => <SelectItem key={e.id} value={e.navn}>{e.navn}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Kostnadsbeskrivelse</Label>
                        <Input placeholder="F.eks. Terrassebord og skruer" value={detailForm.kostnadsbeskrivelse} onChange={e => setDetailForm(p => ({ ...p, kostnadsbeskrivelse: e.target.value }))} />
                      </div>
                    </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-1"><Label>Egen beskrivelse</Label><Input value={detailForm.beskrivelse_egen} onChange={e => setDetailForm(p => ({ ...p, beskrivelse_egen: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Notater</Label><Textarea value={detailForm.notater} onChange={e => setDetailForm(p => ({ ...p, notater: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Skatteår</Label><Input type="number" value={detailForm.skatteaar} onChange={e => setDetailForm(p => ({ ...p, skatteaar: e.target.value }))} /></div>

              {/* Bilag section */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm flex items-center gap-1"><Paperclip className="h-4 w-4" /> Bilag ({bilagList.length})</div>
                  <label className="cursor-pointer">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    <Button size="sm" variant="outline" asChild disabled={uploading}><span><Upload className="h-4 w-4 mr-1" />{uploading ? 'Laster opp...' : 'Last opp'}</span></Button>
                  </label>
                </div>
                {bilagList.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm bg-white rounded p-2">
                    <span>{b.filnavn}</span>
                    <Button size="sm" variant="ghost" onClick={() => deleteBilag(b)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
              </div>
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
