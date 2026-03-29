export interface Eier {
  id: string; navn: string; type: string; orgnr: string | null; identifikator: string | null;
  epost: string | null; telefon: string | null; eierandel_prosent: number;
  inntektsandel_prosent: number; kostnadsandel_prosent: number; aktiv: boolean | null;
  gyldig_fra: string | null; gyldig_til: string | null; notater: string | null; sist_endret: string | null;
}

export interface HistorikkEvent {
  id: string; dato: string; type: string; beskrivelse: string;
  detaljer: { id: string; eier_navn: string; andel_for: number; andel_etter: number; merknad: string | null }[];
}

export const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(280, 67%, 55%)', 'hsl(38, 92%, 50%)'];

export const formatPct = (n: number) => n.toFixed(2).replace('.', ',') + ' %';
export const formatPct4 = (n: number) => n.toFixed(4).replace('.', ',') + ' %';
