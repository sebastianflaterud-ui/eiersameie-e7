import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatBelop, formatDato } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, ArrowLeft, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Investering {
  id: string; user_id: string; navn: string; beskrivelse: string | null;
  periode_fra: string | null; periode_til: string | null; total_investering: number; opprettet: string;
}

interface Bidrag {
  id: string; user_id: string; investering_id: string; eier_navn: string;
  bidrag_belop: number; bidrag_prosent: number | null; betalt_av: string | null; notater: string | null;
}

const COLORS = ['hsl(220, 70%, 50%)', 'hsl(150, 60%, 45%)', 'hsl(40, 80%, 50%)', 'hsl(0, 70%, 55%)', 'hsl(280, 60%, 55%)'];

export default function InvesteringerPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Investering[]>([]);
  const [selected, setSelected] = useState<Investering | null>(null);
  const [bidrag, setBidrag] = useState<Bidrag[]>([]);
  const [mellomvaerende, setMellomvaerende] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showNewBidrag, setShowNewBidrag] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ navn: '', beskrivelse: '', periode_fra: '', periode_til: '', total_investering: '' });
  const [bidragForm, setBidragForm] = useState({ eier_navn: '', bidrag_belop: '', betalt_av: '', notater: '' });

  const userId = session?.user?.id;

  async function fetchAll() {
    if (!userId) return;
    const { data } = await supabase.from('investeringer').select('*').eq('user_id', userId).order('opprettet', { ascending: false });
    if (data) setItems(data as unknown as Investering[]);
  }

  async function fetchBidrag(invId: string) {
    const { data } = await supabase.from('investering_bidrag').select('*').eq('investering_id', invId);
    if (data) setBidrag(data as unknown as Bidrag[]);
  }

  async function fetchMellomvaerende() {
    if (!userId) return;
    const { data } = await supabase.from('mellomvaerende').select('*').eq('user_id', userId);
    if (data) setMellomvaerende(data);
  }

  useEffect(() => { fetchAll(); fetchMellomvaerende(); }, [userId]);
  useEffect(() => { if (selected) fetchBidrag(selected.id); }, [selected?.id]);

  async function saveInvestering() {
    if (!userId) return;
    const payload = {
      user_id: userId, navn: form.navn, beskrivelse: form.beskrivelse || null,
      periode_fra: form.periode_fra || null, periode_til: form.periode_til || null,
      total_investering: parseFloat(form.total_investering) || 0,
    };
    if (editing && selected) {
      await supabase.from('investeringer').update(payload).eq('id', selected.id);
      toast.success('Oppdatert');
    } else {
      await supabase.from('investeringer').insert(payload as any);
      toast.success('Opprettet');
    }
    setShowNew(false); setEditing(false); fetchAll();
  }

  async function saveBidrag() {
    if (!userId || !selected) return;
    const belop = parseFloat(bidragForm.bidrag_belop) || 0;
    const prosent = Number(selected.total_investering) > 0 ? (belop / Number(selected.total_investering)) * 100 : 0;
    await supabase.from('investering_bidrag').insert({
      user_id: userId, investering_id: selected.id, eier_navn: bidragForm.eier_navn,
      bidrag_belop: belop, bidrag_prosent: prosent,
      betalt_av: bidragForm.betalt_av || null, notater: bidragForm.notater || null,
    } as any);
    toast.success('Bidrag lagt til');
    setShowNewBidrag(false);
    setBidragForm({ eier_navn: '', bidrag_belop: '', betalt_av: '', notater: '' });
    fetchBidrag(selected.id);
  }

  async function deleteBidrag(id: string) {
    await supabase.from('investering_bidrag').delete().eq('id', id);
    toast.success('Slettet'); fetchBidrag(selected!.id);
  }

  const sumBidrag = bidrag.reduce((s, b) => s + Number(b.bidrag_belop), 0);
  const avvik = selected ? Math.abs(sumBidrag - Number(selected.total_investering)) > 0.01 : false;

  const pieData = bidrag.map(b => ({ name: b.eier_navn, value: Number(b.bidrag_belop), betaltAv: b.betalt_av }));

  function openEdit(inv: Investering) {
    setForm({ navn: inv.navn, beskrivelse: inv.beskrivelse || '', periode_fra: inv.periode_fra || '', periode_til: inv.periode_til || '', total_investering: String(inv.total_investering) });
    setEditing(true); setShowNew(true);
  }

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4 mr-1" />Tilbake</Button>
          <h1 className="text-2xl font-bold">{selected.navn}</h1>
          <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>Rediger</Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4">
            <div className="text-2xl font-bold font-mono">{formatBelop(selected.total_investering)}</div>
            <div className="text-sm text-muted-foreground">Total investering</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-2xl font-bold">{bidrag.length}</div>
            <div className="text-sm text-muted-foreground">Bidragsytere</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Periode</div>
            <div className="font-medium">{selected.periode_fra ? formatDato(selected.periode_fra) : '?'} — {selected.periode_til ? formatDato(selected.periode_til) : 'pågår'}</div>
          </CardContent></Card>
        </div>

        {selected.beskrivelse && <Card><CardContent className="pt-4 text-sm text-muted-foreground">{selected.beskrivelse}</CardContent></Card>}

        {avvik && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-700">Sum bidrag ({formatBelop(sumBidrag)}) avviker fra total investering ({formatBelop(selected.total_investering)}).</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Bidrag</CardTitle>
              <Dialog open={showNewBidrag} onOpenChange={setShowNewBidrag}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nytt bidrag</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nytt bidrag</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Eier</Label><Input value={bidragForm.eier_navn} onChange={e => setBidragForm(p => ({ ...p, eier_navn: e.target.value }))} placeholder="Navn på eier" /></div>
                    <div><Label>Bidratt beløp</Label><Input type="number" value={bidragForm.bidrag_belop} onChange={e => setBidragForm(p => ({ ...p, bidrag_belop: e.target.value }))} /></div>
                    <div><Label>Betalt av (om annen)</Label><Input value={bidragForm.betalt_av} onChange={e => setBidragForm(p => ({ ...p, betalt_av: e.target.value }))} placeholder="La tom hvis eier betalte selv" /></div>
                    <div><Label>Notater</Label><Input value={bidragForm.notater} onChange={e => setBidragForm(p => ({ ...p, notater: e.target.value }))} /></div>
                    <Button onClick={saveBidrag} className="w-full">Lagre</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Eier</TableHead><TableHead className="text-right">Beløp</TableHead><TableHead className="text-right">Andel</TableHead><TableHead>Betalt av</TableHead><TableHead></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {bidrag.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.eier_navn}</TableCell>
                      <TableCell className="text-right font-mono">{formatBelop(b.bidrag_belop)}</TableCell>
                      <TableCell className="text-right">{b.bidrag_prosent != null ? `${Number(b.bidrag_prosent).toFixed(1).replace('.', ',')} %` : '-'}</TableCell>
                      <TableCell>
                        {b.betalt_av && b.betalt_av !== b.eier_navn ? (
                          <Badge variant="outline" className="border-dashed border-orange-400 text-orange-700">{b.betalt_av}</Badge>
                        ) : <span className="text-muted-foreground">Selv</span>}
                      </TableCell>
                      <TableCell><Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteBidrag(b.id)}>Slett</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Fordeling</CardTitle></CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} strokeDasharray={pieData[i]?.betaltAv && pieData[i].betaltAv !== pieData[i].name ? '5 5' : undefined} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBelop(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">Ingen bidrag registrert</p>}
            </CardContent>
          </Card>
        </div>

        {mellomvaerende.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Relaterte mellomværender</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {mellomvaerende.map(mv => (
                <div key={mv.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50" onClick={() => navigate('/mellomvaerende')}>
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{mv.navn}</span>
                  <span className="text-sm text-muted-foreground">({formatBelop(mv.gjeldende_saldo)} utestående)</span>
                  <Badge className={mv.aktiv ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>{mv.aktiv ? 'Aktiv' : 'Innfridd'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investeringer</h1>
        <Dialog open={showNew} onOpenChange={(o) => { setShowNew(o); if (!o) setEditing(false); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Ny investering</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Rediger' : 'Ny'} investering</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Navn</Label><Input value={form.navn} onChange={e => setForm(p => ({ ...p, navn: e.target.value }))} /></div>
              <div><Label>Beskrivelse</Label><Textarea value={form.beskrivelse} onChange={e => setForm(p => ({ ...p, beskrivelse: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Periode fra</Label><Input type="date" value={form.periode_fra} onChange={e => setForm(p => ({ ...p, periode_fra: e.target.value }))} /></div>
                <div><Label>Periode til</Label><Input type="date" value={form.periode_til} onChange={e => setForm(p => ({ ...p, periode_til: e.target.value }))} /></div>
              </div>
              <div><Label>Total investering</Label><Input type="number" value={form.total_investering} onChange={e => setForm(p => ({ ...p, total_investering: e.target.value }))} /></div>
              <Button onClick={saveInvestering} className="w-full">Lagre</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow><TableHead>Navn</TableHead><TableHead>Periode</TableHead><TableHead className="text-right">Totalbeløp</TableHead><TableHead className="text-right">Bidragsytere</TableHead><TableHead></TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {items.map(inv => (
            <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(inv)}>
              <TableCell className="font-medium">{inv.navn}</TableCell>
              <TableCell className="text-sm">{inv.periode_fra ? formatDato(inv.periode_fra) : '?'} — {inv.periode_til ? formatDato(inv.periode_til) : 'pågår'}</TableCell>
              <TableCell className="text-right font-mono">{formatBelop(inv.total_investering)}</TableCell>
              <TableCell className="text-right">—</TableCell>
              <TableCell><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(inv); }}>Vis</Button></TableCell>
            </TableRow>
          ))}
          {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Ingen investeringer registrert</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
