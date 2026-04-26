import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ArrowRight, TrendingDown, TrendingUp, Pencil, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HistorikkEvent, formatPct } from './types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportHistorikkCsv, exportHistorikkXlsx } from './historikkExport';

interface Props {
  historikk: HistorikkEvent[];
  onEdit?: (event: HistorikkEvent) => void;
}

export default function EiereHistorikk({ historikk, onEdit }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={historikk.length === 0}>
              <Download className="h-4 w-4 mr-2" />Eksporter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportHistorikkCsv(historikk)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />CSV (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportHistorikkXlsx(historikk)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {historikk.length === 0 && (
        <div className="text-center text-muted-foreground py-8">Ingen eierskapsendringer registrert ennå.</div>
      )}
      {historikk.map(ev => {
        const gains = ev.detaljer.filter(d => d.andel_etter > d.andel_for);
        const losses = ev.detaljer.filter(d => d.andel_etter < d.andel_for);
        return (
          <Card key={ev.id}>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-semibold">
                  {format(new Date(ev.dato), 'd. MMMM yyyy', { locale: nb })}
                </span>
                <Badge variant="outline" className={cn("font-normal capitalize", ev.type === 'oppstart' && 'bg-green-100 text-green-800 border-green-200')}>
                  {ev.type === 'oppstart' ? 'Opprinnelig' : ev.type === 'overføring' ? 'Overføring' : ev.type === 'justering' ? 'Justering' : ev.type}
                </Badge>
                {onEdit && (
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onEdit(ev)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Rediger
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground">{ev.beskrivelse}</p>

              {(gains.length > 0 || losses.length > 0) && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg flex-wrap">
                  <div className="flex flex-col gap-1">
                    {losses.map(d => (
                      <span key={d.eier_navn} className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        {d.eier_navn} <span className="font-bold">-{formatPct(d.andel_for - d.andel_etter)}</span>
                      </span>
                    ))}
                  </div>
                  {losses.length > 0 && gains.length > 0 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex flex-col gap-1">
                    {gains.map(d => (
                      <span key={d.eier_navn} className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        {d.eier_navn} <span className="font-bold">+{formatPct(d.andel_etter - d.andel_for)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {ev.detaljer.map(d => {
                  const endring = d.andel_etter - d.andel_for;
                  return (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {endring < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
                        {endring > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {endring === 0 && <div className="h-4 w-4" />}
                        <div>
                          <div className="font-medium">{d.eier_navn}</div>
                          <div className="text-xs text-muted-foreground">{d.merknad || 'Uendret'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-mono">
                        <span className="text-muted-foreground">{d.andel_for === 0 ? '-' : formatPct(d.andel_for)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold">{formatPct(d.andel_etter)}</span>
                        {endring !== 0 && (
                          <span className={cn("font-bold ml-1", endring > 0 ? 'text-green-600' : 'text-red-600')}>
                            ({endring > 0 ? '+' : ''}{formatPct(endring)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
