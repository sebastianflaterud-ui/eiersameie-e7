import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, addMonths, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, addYears } from 'date-fns';
import { nb } from 'date-fns/locale';
import { CalendarIcon, Plus, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KalenderHendelse {
  id: string;
  tittel: string;
  beskrivelse: string | null;
  dato: string;
  gjentakelse: string | null;
  kategori: string;
  prioritet: string | null;
  fullfort: boolean;
  fullfort_dato: string | null;
  paaminnelse_dager: number | null;
  enhet_id: string | null;
}

interface AutoEvent {
  tittel: string;
  dato: Date;
  kategori: string;
  auto: true;
}

const KATEGORI_FARGER: Record<string, string> = {
  vedlikehold: 'bg-orange-100 text-orange-800 border-orange-200',
  leietaker: 'bg-blue-100 text-blue-800 border-blue-200',
  økonomi: 'bg-green-100 text-green-800 border-green-200',
  forsikring: 'bg-purple-100 text-purple-800 border-purple-200',
  offentlig: 'bg-gray-100 text-gray-800 border-gray-200',
  annet: 'bg-slate-100 text-slate-800 border-slate-200',
};

const PRIORITET_FARGER: Record<string, string> = {
  lav: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  høy: 'bg-orange-100 text-orange-600',
  kritisk: 'bg-red-100 text-red-600',
};

export default function Kalender() {
  const { session } = useAuth();
  const [hendelser, setHendelser] = useState<KalenderHendelse[]>([]);
  const [leieforhold, setLeieforhold] = useState<any[]>([]);
  const [leietakere, setLeietakere] = useState<any[]>([]);
  const [abonnementer, setAbonnementer] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [listDays, setListDays] = useState(30);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ tittel: '', beskrivelse: '', dato: '', gjentakelse: 'ingen', kategori: 'vedlikehold', prioritet: 'normal', paaminnelse_dager: 7 });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [{ data: h }, { data: lf }, { data: lt }, { data: ab }] = await Promise.all([
      supabase.from('kalender_hendelser').select('*').order('dato'),
      supabase.from('leieforhold').select('*'),
      supabase.from('leietakere').select('*'),
      supabase.from('abonnementer').select('*').eq('aktiv', true),
    ]);
    setHendelser(h || []);
    setLeieforhold(lf || []);
    setLeietakere(lt || []);
    setAbonnementer(ab || []);
  }

  // Auto events from leieforhold
  const autoEvents: AutoEvent[] = useMemo(() => {
    const events: AutoEvent[] = [];
    const today = new Date();
    const horizon = addMonths(today, 6);

    for (const lf of leieforhold) {
      if (lf.status !== 'aktiv') continue;
      const lt = leietakere.find(l => l.id === lf.leietaker_id);
      if (!lt) continue;
      const forfallDag = lf.forfall_dag || 1;

      // Monthly rent due dates
      let d = startOfMonth(today);
      while (d <= horizon) {
        const dueDate = new Date(d.getFullYear(), d.getMonth(), Math.min(forfallDag, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
        if (dueDate >= today && dueDate <= horizon) {
          events.push({ tittel: `Husleie forfall: ${lt.navn}`, dato: dueDate, kategori: 'økonomi', auto: true });
        }
        d = addMonths(d, 1);
      }

      // KPI warning (11 months after move-in)
      const innflytting = new Date(lf.innflytting);
      const kpiWarning = addMonths(innflytting, 11);
      if (kpiWarning >= today && kpiWarning <= horizon) {
        events.push({ tittel: `KPI-varsling: ${lt.navn}`, dato: kpiWarning, kategori: 'leietaker', auto: true });
      }
      const kpiDate = addMonths(innflytting, 12);
      if (kpiDate >= today && kpiDate <= horizon) {
        events.push({ tittel: `KPI-regulering: ${lt.navn}`, dato: kpiDate, kategori: 'leietaker', auto: true });
      }

      // Planned move-out
      if (lf.utflytting) {
        const utflytting = new Date(lf.utflytting);
        if (utflytting >= today && utflytting <= horizon) {
          events.push({ tittel: `Planlagt utflytting: ${lt.navn}`, dato: utflytting, kategori: 'leietaker', auto: true });
        }
      }
    }

    // From subscriptions
    for (const ab of abonnementer) {
      if (ab.trekkdato) {
        let d = startOfMonth(today);
        while (d <= horizon) {
          const dueDate = new Date(d.getFullYear(), d.getMonth(), Math.min(ab.trekkdato, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
          if (dueDate >= today && dueDate <= horizon) {
            events.push({ tittel: `Abonnement: ${ab.navn}`, dato: dueDate, kategori: 'økonomi', auto: true });
          }
          d = addMonths(d, 1);
        }
      }
    }

    return events;
  }, [leieforhold, leietakere, abonnementer]);

  const allEvents = useMemo(() => {
    const manual = hendelser.map(h => ({
      id: h.id,
      tittel: h.tittel,
      dato: new Date(h.dato),
      kategori: h.kategori,
      prioritet: h.prioritet || 'normal',
      fullfort: h.fullfort,
      auto: false as const,
      gjentakelse: h.gjentakelse,
      beskrivelse: h.beskrivelse,
    }));
    const auto = autoEvents.map((e, i) => ({
      id: `auto-${i}`,
      tittel: e.tittel,
      dato: e.dato,
      kategori: e.kategori,
      prioritet: 'normal' as string,
      fullfort: false,
      auto: true as const,
      gjentakelse: null as string | null,
      beskrivelse: null as string | null,
    }));
    return [...manual, ...auto].sort((a, b) => a.dato.getTime() - b.dato.getTime());
  }, [hendelser, autoEvents]);

  const overdueCount = allEvents.filter(e => !e.fullfort && isBefore(e.dato, new Date()) && !e.auto).length;

  async function handleComplete(id: string, gjentakelse: string | null) {
    const h = hendelser.find(e => e.id === id);
    if (!h) return;

    await supabase.from('kalender_hendelser').update({ fullfort: true, fullfort_dato: new Date().toISOString().slice(0, 10) }).eq('id', id);

    // Create next occurrence if recurring
    if (gjentakelse && gjentakelse !== 'ingen' && session?.user?.id) {
      const currentDate = new Date(h.dato);
      let nextDate: Date;
      switch (gjentakelse) {
        case 'månedlig': nextDate = addMonths(currentDate, 1); break;
        case 'kvartalsvis': nextDate = addMonths(currentDate, 3); break;
        case 'halvårlig': nextDate = addMonths(currentDate, 6); break;
        case 'årlig': nextDate = addYears(currentDate, 1); break;
        default: nextDate = addMonths(currentDate, 1);
      }
      await supabase.from('kalender_hendelser').insert({
        user_id: session.user.id,
        tittel: h.tittel,
        beskrivelse: h.beskrivelse,
        dato: nextDate.toISOString().slice(0, 10),
        gjentakelse: h.gjentakelse,
        kategori: h.kategori,
        prioritet: h.prioritet,
        paaminnelse_dager: h.paaminnelse_dager,
        enhet_id: h.enhet_id,
      });
    }
    toast.success('Hendelse fullført');
    fetchAll();
  }

  async function handleCreate() {
    if (!session?.user?.id || !newEvent.tittel || !newEvent.dato) return;
    await supabase.from('kalender_hendelser').insert({
      user_id: session.user.id,
      ...newEvent,
      paaminnelse_dager: newEvent.paaminnelse_dager,
    });
    setDialogOpen(false);
    setNewEvent({ tittel: '', beskrivelse: '', dato: '', gjentakelse: 'ingen', kategori: 'vedlikehold', prioritet: 'normal', paaminnelse_dager: 7 });
    toast.success('Hendelse opprettet');
    fetchAll();
  }

  // Month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // Monday = 0

  const listEvents = allEvents.filter(e => {
    const now = new Date();
    const horizon = addDays(now, listDays);
    return e.dato >= addDays(now, -1) && e.dato <= horizon;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Ny hendelse</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ny kalenderhendelse</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Tittel" value={newEvent.tittel} onChange={e => setNewEvent(p => ({ ...p, tittel: e.target.value }))} />
              <Textarea placeholder="Beskrivelse" value={newEvent.beskrivelse} onChange={e => setNewEvent(p => ({ ...p, beskrivelse: e.target.value }))} />
              <Input type="date" value={newEvent.dato} onChange={e => setNewEvent(p => ({ ...p, dato: e.target.value }))} />
              <div className="grid grid-cols-2 gap-4">
                <Select value={newEvent.gjentakelse} onValueChange={v => setNewEvent(p => ({ ...p, gjentakelse: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingen">Ingen gjentakelse</SelectItem>
                    <SelectItem value="månedlig">Månedlig</SelectItem>
                    <SelectItem value="kvartalsvis">Kvartalsvis</SelectItem>
                    <SelectItem value="halvårlig">Halvårlig</SelectItem>
                    <SelectItem value="årlig">Årlig</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newEvent.kategori} onValueChange={v => setNewEvent(p => ({ ...p, kategori: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vedlikehold">Vedlikehold</SelectItem>
                    <SelectItem value="leietaker">Leietaker</SelectItem>
                    <SelectItem value="økonomi">Økonomi</SelectItem>
                    <SelectItem value="forsikring">Forsikring</SelectItem>
                    <SelectItem value="offentlig">Offentlig</SelectItem>
                    <SelectItem value="annet">Annet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select value={newEvent.prioritet} onValueChange={v => setNewEvent(p => ({ ...p, prioritet: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lav">Lav</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="høy">Høy</SelectItem>
                    <SelectItem value="kritisk">Kritisk</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Påminnelse (dager)" value={newEvent.paaminnelse_dager} onChange={e => setNewEvent(p => ({ ...p, paaminnelse_dager: Number(e.target.value) }))} />
              </div>
              <Button onClick={handleCreate} className="w-full">Opprett hendelse</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-700 font-medium">{overdueCount} forfalt{overdueCount > 1 ? 'e' : ''} hendelse{overdueCount > 1 ? 'r' : ''} som ikke er fullført</span>
        </div>
      )}

      <Tabs defaultValue="liste">
        <TabsList>
          <TabsTrigger value="liste">Listevisning</TabsTrigger>
          <TabsTrigger value="måned">Månedsvisning</TabsTrigger>
        </TabsList>

        <TabsContent value="liste" className="space-y-4">
          <div className="flex gap-2">
            {[30, 60, 90].map(d => (
              <Button key={d} variant={listDays === d ? 'default' : 'outline'} size="sm" onClick={() => setListDays(d)}>
                {d} dager
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {listEvents.length === 0 && <p className="text-muted-foreground py-8 text-center">Ingen hendelser de neste {listDays} dagene</p>}
            {listEvents.map(e => (
              <Card key={e.id} className={cn('transition-colors', e.fullfort && 'opacity-50')}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono text-muted-foreground w-20">
                      {format(e.dato, 'dd.MM.yy')}
                    </div>
                    <Badge variant="outline" className={KATEGORI_FARGER[e.kategori] || ''}>
                      {e.kategori}
                    </Badge>
                    {e.auto && <Badge variant="secondary" className="text-[10px]">Auto</Badge>}
                    <Badge variant="outline" className={PRIORITET_FARGER[e.prioritet] || ''}>
                      {e.prioritet}
                    </Badge>
                    <span className={cn('font-medium', e.fullfort && 'line-through')}>{e.tittel}</span>
                    {e.gjentakelse && e.gjentakelse !== 'ingen' && (
                      <span className="text-xs text-muted-foreground">({e.gjentakelse})</span>
                    )}
                  </div>
                  {!e.auto && !e.fullfort && (
                    <Button size="sm" variant="outline" onClick={() => handleComplete(e.id, e.gjentakelse)}>
                      <Check className="h-3 w-3 mr-1" />Fullfør
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="måned" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold w-40 text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: nb })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50">
              {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(d => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="border-t border-r min-h-[80px] bg-muted/20" />
              ))}
              {daysInMonth.map(day => {
                const dayEvents = allEvents.filter(e => isSameDay(e.dato, day));
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className={cn('border-t border-r min-h-[80px] p-1', isToday && 'bg-primary/5')}>
                    <div className={cn('text-xs font-medium mb-1', isToday && 'text-primary font-bold')}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className={cn('text-[10px] px-1 py-0.5 rounded truncate', KATEGORI_FARGER[e.kategori] || 'bg-muted')}>
                          {e.tittel}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} til</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
