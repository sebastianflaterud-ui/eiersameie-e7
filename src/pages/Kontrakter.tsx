import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBelop, formatDato, formatDatoFull } from '@/lib/format';
import { toast } from 'sonner';
import { ArrowLeft, Plus, FileText, Download, UserPlus, UserMinus, Edit2, Calendar } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { LeiekontraktPDF } from '@/components/kontrakter/LeiekontraktPDF';

interface Kontrakt {
  id: string; navn: string; boenhet: string; type: string; startdato: string; sluttdato: string | null;
  oppsigelsestid_mnd: number; depositum_multiplier: number; inkludert_i_leie: string | null;
  ikke_inkludert: string | null; betalingskonto: string | null; kontrakt_status: string;
  saerlige_bestemmelser: string | null; ordensregler: string | null; notater: string | null;
}
interface KontraktLeietaker {
  id: string; kontrakt_id: string; leietaker_id: string; enhet_id: string;
  maanedsleie: number; depositum: number; innflytting: string; utflytting: string | null; aktiv: boolean;
}
interface Hendelse {
  id: string; kontrakt_id: string; leietaker_id: string | null; hendelse_type: string;
  beskrivelse: string | null; dato: string;
}
interface Versjon {
  id: string; kontrakt_id: string; versjon: number; endring_beskrivelse: string | null;
  storage_path: string; generert_dato: string;
}
interface Leietaker { id: string; navn: string; epost: string | null; telefon: string | null; personnr: string | null; }
interface Enhet { id: string; navn: string; boenhet: string | null; etasje: string | null; markedsleie_estimat: number | null; disponert_av: string | null; }
interface Eier { id: string; navn: string; type: string; inntektsandel_prosent: number; identifikator: string | null; epost: string | null; telefon: string | null; }

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'aktiv') return 'default';
  if (s === 'oppsagt') return 'destructive';
  return 'secondary';
};

export default function Kontrakter() {
  const { user } = useAuth();
  const [kontrakter, setKontrakter] = useState<Kontrakt[]>([]);
  const [kontraktLeietakere, setKontraktLeietakere] = useState<KontraktLeietaker[]>([]);
  const [hendelser, setHendelser] = useState<Hendelse[]>([]);
  const [versjoner, setVersjoner] = useState<Versjon[]>([]);
  const [leietakere, setLeietakere] = useState<Leietaker[]>([]);
  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [eiere, setEiere] = useState<Eier[]>([]);
  const [selected, setSelected] = useState<Kontrakt | null>(null);
  const [showAddLt, setShowAddLt] = useState(false);
  const [addLtForm, setAddLtForm] = useState<Record<string, any>>({});
  const [editingLeie, setEditingLeie] = useState<string | null>(null);
  const [newLeie, setNewLeie] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const [k, kl, h, v, lt, en, ei] = await Promise.all([
      supabase.from('kontrakter').select('*').order('navn'),
      supabase.from('kontrakt_leietakere').select('*'),
      supabase.from('kontrakt_hendelser').select('*').order('dato', { ascending: false }),
      supabase.from('kontrakt_versjoner').select('*').order('versjon', { ascending: false }),
      supabase.from('leietakere').select('id, navn, epost, telefon, personnr'),
      supabase.from('enheter').select('id, navn, boenhet, etasje, markedsleie_estimat, disponert_av').eq('aktiv', true),
      supabase.from('eiere').select('*').eq('aktiv', true),
    ]);
    if (k.data) setKontrakter(k.data as Kontrakt[]);
    if (kl.data) setKontraktLeietakere(kl.data as KontraktLeietaker[]);
    if (h.data) setHendelser(h.data as Hendelse[]);
    if (v.data) setVersjoner(v.data as Versjon[]);
    if (lt.data) setLeietakere(lt.data as Leietaker[]);
    if (en.data) setEnheter(en.data as Enhet[]);
    if (ei.data) setEiere(ei.data as Eier[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getLt = (id: string) => leietakere.find(l => l.id === id);
  const getEnhet = (id: string) => enheter.find(e => e.id === id);
  const utleiere = eiere.filter(e => e.inntektsandel_prosent > 0);

  const generatePDF = async (kontrakt: Kontrakt, changeSummary?: string) => {
    if (!user) return;
    setGenerating(true);
    try {
      const aktiveLt = kontraktLeietakere.filter(kl => kl.kontrakt_id === kontrakt.id && kl.aktiv);
      const tidligereLt = kontraktLeietakere.filter(kl => kl.kontrakt_id === kontrakt.id && !kl.aktiv);
      const kontraktVersjoner = versjoner.filter(v => v.kontrakt_id === kontrakt.id);
      const versjonNr = (kontraktVersjoner.length > 0 ? Math.max(...kontraktVersjoner.map(v => v.versjon)) : 0) + 1;

      const pdfData = {
        kontrakt, utleiere, aktiveLt, tidligereLt,
        leietakere, enheter, versjonNr,
        dato: new Date().toISOString(),
      };

      const blob = await pdf(<LeiekontraktPDF data={pdfData} />).toBlob();
      const filename = `kontrakt_${kontrakt.id}_v${versjonNr}.pdf`;
      const { error: uploadError } = await supabase.storage.from('kontrakter').upload(filename, blob, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('kontrakt_versjoner').insert({
        user_id: user.id, kontrakt_id: kontrakt.id, versjon: versjonNr,
        endring_beskrivelse: changeSummary || 'Manuell generering',
        storage_path: filename,
      });
      if (insertError) throw insertError;

      toast.success(`PDF versjon ${versjonNr} generert`);
      load();
    } catch (e: any) {
      toast.error('Feil ved PDF-generering: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadVersion = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('kontrakter').download(storagePath);
    if (error) { toast.error('Kunne ikke laste ned'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a'); a.href = url; a.download = storagePath; a.click();
  };

  const addLeietaker = async () => {
    if (!user || !selected || !addLtForm.leietaker_id || !addLtForm.enhet_id) return;
    const enhet = getEnhet(addLtForm.enhet_id);
    const leie = Number(addLtForm.maanedsleie || enhet?.markedsleie_estimat || 0);
    const dep = leie * (selected.depositum_multiplier || 2);

    const { error } = await supabase.from('kontrakt_leietakere').insert({
      user_id: user.id, kontrakt_id: selected.id,
      leietaker_id: addLtForm.leietaker_id, enhet_id: addLtForm.enhet_id,
      maanedsleie: leie, depositum: dep,
      innflytting: addLtForm.innflytting || new Date().toISOString().split('T')[0],
    });
    if (error) { toast.error(error.message); return; }

    await supabase.from('kontrakt_hendelser').insert({
      user_id: user.id, kontrakt_id: selected.id, leietaker_id: addLtForm.leietaker_id,
      hendelse_type: 'leietaker_lagt_til',
      beskrivelse: `${getLt(addLtForm.leietaker_id)?.navn} lagt til i ${enhet?.navn}`,
      dato: addLtForm.innflytting || new Date().toISOString().split('T')[0],
    });

    setShowAddLt(false); setAddLtForm({});
    await load();
    await generatePDF(selected, `Leietaker lagt til: ${getLt(addLtForm.leietaker_id)?.navn}`);
  };

  const removeLeietaker = async (kl: KontraktLeietaker) => {
    if (!user || !selected) return;
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('kontrakt_leietakere').update({ aktiv: false, utflytting: today }).eq('id', kl.id);
    await supabase.from('kontrakt_hendelser').insert({
      user_id: user.id, kontrakt_id: selected.id, leietaker_id: kl.leietaker_id,
      hendelse_type: 'leietaker_fjernet',
      beskrivelse: `${getLt(kl.leietaker_id)?.navn} fjernet fra ${getEnhet(kl.enhet_id)?.navn}`,
      dato: today,
    });
    await load();
    await generatePDF(selected, `Leietaker fjernet: ${getLt(kl.leietaker_id)?.navn}`);
  };

  const updateLeie = async (kl: KontraktLeietaker) => {
    if (!user || !selected) return;
    const newVal = Number(newLeie);
    if (isNaN(newVal) || newVal <= 0) return;
    const oldLeie = kl.maanedsleie;
    await supabase.from('kontrakt_leietakere').update({ maanedsleie: newVal, depositum: newVal * (selected.depositum_multiplier || 2) }).eq('id', kl.id);
    await supabase.from('kontrakt_hendelser').insert({
      user_id: user.id, kontrakt_id: selected.id, leietaker_id: kl.leietaker_id,
      hendelse_type: 'leie_endret',
      beskrivelse: `Leie endret fra ${formatBelop(oldLeie)} til ${formatBelop(newVal)} for ${getLt(kl.leietaker_id)?.navn}`,
      dato: new Date().toISOString().split('T')[0],
    });
    setEditingLeie(null); setNewLeie('');
    await load();
    await generatePDF(selected, `Leieendring: ${getLt(kl.leietaker_id)?.navn}`);
  };

  // Detail view
  if (selected) {
    const aktiveLt = kontraktLeietakere.filter(kl => kl.kontrakt_id === selected.id && kl.aktiv);
    const tidligereLt = kontraktLeietakere.filter(kl => kl.kontrakt_id === selected.id && !kl.aktiv);
    const kontraktHendelser = hendelser.filter(h => h.kontrakt_id === selected.id);
    const kontraktVersjoner = versjoner.filter(v => v.kontrakt_id === selected.id);
    const totalLeie = aktiveLt.reduce((s, kl) => s + kl.maanedsleie, 0);
    const availableEnheter = enheter.filter(e => e.boenhet === selected.boenhet && !e.disponert_av && !aktiveLt.some(kl => kl.enhet_id === e.id));

    const hendelseBadge = (type: string) => {
      const colors: Record<string, string> = {
        leietaker_lagt_til: 'bg-green-100 text-green-800',
        leietaker_fjernet: 'bg-red-100 text-red-800',
        leie_endret: 'bg-blue-100 text-blue-800',
        kontrakt_opprettet: 'bg-purple-100 text-purple-800',
        oppsigelse: 'bg-orange-100 text-orange-800',
        annet: 'bg-gray-100 text-gray-800',
      };
      const labels: Record<string, string> = {
        leietaker_lagt_til: 'Ny leietaker',
        leietaker_fjernet: 'Leietaker fjernet',
        leie_endret: 'Leieendring',
        kontrakt_opprettet: 'Opprettet',
        oppsigelse: 'Oppsigelse',
        annet: 'Annet',
      };
      return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || colors.annet}`}>{labels[type] || type}</span>;
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">{selected.navn}</h1>
          <Badge variant={statusVariant(selected.kontrakt_status)}>{selected.kontrakt_status}</Badge>
        </div>

        {/* Kontraktsinformasjon */}
        <Card>
          <CardHeader><CardTitle className="text-base">Kontraktsinformasjon</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Boenhet:</span><br /><span className="font-medium">{selected.boenhet}</span></div>
              <div><span className="text-muted-foreground">Type:</span><br /><span className="font-medium">{selected.type === 'langtid' ? 'Langtidsleie' : 'Korttidsleie'}</span></div>
              <div><span className="text-muted-foreground">Startdato:</span><br /><span className="font-medium">{formatDato(selected.startdato)}</span></div>
              <div><span className="text-muted-foreground">Oppsigelsestid:</span><br /><span className="font-medium">{selected.oppsigelsestid_mnd} mnd</span></div>
              <div><span className="text-muted-foreground">Depositum:</span><br /><span className="font-medium">{selected.depositum_multiplier}× månedsleie</span></div>
              <div><span className="text-muted-foreground">Betalingskonto:</span><br /><span className="font-medium font-mono">{selected.betalingskonto}</span></div>
              <div><span className="text-muted-foreground">Inkludert:</span><br /><span className="font-medium">{selected.inkludert_i_leie}</span></div>
              <div><span className="text-muted-foreground">Ikke inkludert:</span><br /><span className="font-medium">{selected.ikke_inkludert}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Utleiere */}
        <Card>
          <CardHeader><CardTitle className="text-base">Utleiere</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {utleiere.map(e => (
                <div key={e.id} className="p-3 border rounded-lg text-sm space-y-1">
                  <div className="font-semibold">{e.navn}</div>
                  {e.type === 'aksjeselskap' && e.identifikator && <div className="text-muted-foreground">Org.nr: {e.identifikator}</div>}
                  {e.epost && <div className="text-muted-foreground">{e.epost}</div>}
                  {e.telefon && <div className="text-muted-foreground">{e.telefon}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Aktive leietakere */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aktive leietakere ({aktiveLt.length})</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-mono">Total: {formatBelop(totalLeie)}/mnd</span>
                <Button size="sm" onClick={() => setShowAddLt(true)}><UserPlus className="h-4 w-4 mr-1" />Legg til</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {aktiveLt.length === 0 ? <p className="text-sm text-muted-foreground">Ingen aktive leietakere.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Leietaker</TableHead><TableHead>Rom</TableHead><TableHead>Etasje</TableHead>
                  <TableHead className="text-right">Månedsleie</TableHead><TableHead className="text-right">Depositum</TableHead>
                  <TableHead>Innflytting</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {aktiveLt.map(kl => {
                    const lt = getLt(kl.leietaker_id);
                    const enhet = getEnhet(kl.enhet_id);
                    return (
                      <TableRow key={kl.id}>
                        <TableCell className="font-medium">{lt?.navn}</TableCell>
                        <TableCell>{enhet?.navn}</TableCell>
                        <TableCell>{enhet?.etasje || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {editingLeie === kl.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Input type="number" value={newLeie} onChange={e => setNewLeie(e.target.value)} className="w-24 h-7 text-right" />
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => updateLeie(kl)}>✓</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingLeie(null)}>✗</Button>
                            </div>
                          ) : (
                            <span className="cursor-pointer hover:underline" onClick={() => { setEditingLeie(kl.id); setNewLeie(String(kl.maanedsleie)); }}>
                              {formatBelop(kl.maanedsleie)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatBelop(kl.depositum)}</TableCell>
                        <TableCell>{formatDato(kl.innflytting)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => removeLeietaker(kl)}>
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tidligere leietakere */}
        {tidligereLt.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Tidligere leietakere</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Leietaker</TableHead><TableHead>Rom</TableHead><TableHead>Innflytting</TableHead>
                  <TableHead>Utflytting</TableHead><TableHead className="text-right">Siste leie</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tidligereLt.map(kl => {
                    const lt = getLt(kl.leietaker_id);
                    const enhet = getEnhet(kl.enhet_id);
                    return (
                      <TableRow key={kl.id}>
                        <TableCell>{lt?.navn}</TableCell>
                        <TableCell>{enhet?.navn}</TableCell>
                        <TableCell>{formatDato(kl.innflytting)}</TableCell>
                        <TableCell>{kl.utflytting ? formatDato(kl.utflytting) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{formatBelop(kl.maanedsleie)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Hendelseslogg */}
        <Card>
          <CardHeader><CardTitle className="text-base">Hendelseslogg</CardTitle></CardHeader>
          <CardContent>
            {kontraktHendelser.length === 0 ? <p className="text-sm text-muted-foreground">Ingen hendelser.</p> : (
              <div className="space-y-2">
                {kontraktHendelser.map(h => (
                  <div key={h.id} className="flex items-start gap-3 p-2 border-b last:border-0">
                    <div className="text-xs text-muted-foreground font-mono w-20 shrink-0">{formatDato(h.dato)}</div>
                    {hendelseBadge(h.hendelse_type)}
                    <span className="text-sm">{h.beskrivelse}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDF-versjoner */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">PDF-versjoner</CardTitle>
              <Button size="sm" onClick={() => generatePDF(selected)} disabled={generating}>
                <FileText className="h-4 w-4 mr-1" />{generating ? 'Genererer...' : 'Generer ny PDF'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {kontraktVersjoner.length === 0 ? <p className="text-sm text-muted-foreground">Ingen versjoner generert.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Versjon</TableHead><TableHead>Dato</TableHead><TableHead>Endring</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {kontraktVersjoner.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">v{v.versjon}</TableCell>
                      <TableCell>{formatDato(v.generert_dato)}</TableCell>
                      <TableCell className="text-sm">{v.endring_beskrivelse}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => downloadVersion(v.storage_path)}><Download className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add leietaker dialog */}
        {showAddLt && (
          <Dialog open onOpenChange={() => { setShowAddLt(false); setAddLtForm({}); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Legg til leietaker</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Leietaker</Label>
                  <Select value={addLtForm.leietaker_id || ''} onValueChange={v => setAddLtForm(f => ({ ...f, leietaker_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Velg leietaker" /></SelectTrigger>
                    <SelectContent>{leietakere.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.navn}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Enhet</Label>
                  <Select value={addLtForm.enhet_id || ''} onValueChange={v => {
                    const enhet = getEnhet(v);
                    setAddLtForm(f => ({ ...f, enhet_id: v, maanedsleie: enhet?.markedsleie_estimat || '' }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Velg enhet" /></SelectTrigger>
                    <SelectContent>{availableEnheter.map(e => <SelectItem key={e.id} value={e.id}>{e.navn} {e.etasje ? `(${e.etasje})` : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Månedsleie</Label><Input type="number" value={addLtForm.maanedsleie || ''} onChange={e => setAddLtForm(f => ({ ...f, maanedsleie: e.target.value }))} /></div>
                  <div><Label>Innflytting</Label><Input type="date" value={addLtForm.innflytting || ''} onChange={e => setAddLtForm(f => ({ ...f, innflytting: e.target.value }))} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={addLeietaker}>Legg til</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kontrakter</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kontrakter.map(k => {
          const aktiveLt = kontraktLeietakere.filter(kl => kl.kontrakt_id === k.id && kl.aktiv);
          const totalLeie = aktiveLt.reduce((s, kl) => s + kl.maanedsleie, 0);
          return (
            <Card key={k.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelected(k)}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{k.navn}</h3>
                  <Badge variant={statusVariant(k.kontrakt_status)}>{k.kontrakt_status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{k.boenhet}</div>
                <div className="flex items-center gap-4 text-sm">
                  <span>{aktiveLt.length} leietakere</span>
                  <span className="font-mono">{formatBelop(totalLeie)}/mnd</span>
                  <span className="text-muted-foreground">Fra {formatDato(k.startdato)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
