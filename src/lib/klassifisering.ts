/**
 * Classification engine — matches transactions against rules
 */

export interface KlassifiseringsRegel {
  id: string;
  monster: string;
  monster_type: string | null;
  motpart: string | null;
  kategori: string | null;
  underkategori: string | null;
  kostnadstype: string | null;
  inntektstype: string | null;
  utgiftstype: string | null;
  prioritet: number | null;
  aktiv: boolean | null;
}

export interface ParsedTransaksjon {
  dato: string;
  bokforingsdato?: string;
  beskrivelse_bank: string;
  belop: number;
  retning: 'inn' | 'ut';
  motpart_bank?: string;
  konto?: string;
  arkivref?: string;
  kilde: 'pdf' | 'csv' | 'nettbank_lim' | 'manuell';
  valuta?: string;
  valutakurs?: number;
  original_belop?: number;
  kid?: string;
  // Classification results
  kategori?: string;
  underkategori?: string;
  kostnadstype?: string;
  inntektstype?: string;
  utgiftstype?: string;
  motpart_egen?: string;
  klassifisering_status?: string;
  // Dedup
  duplikat_hash?: string;
  erDuplikat?: boolean;
  // Extra fields for specific imports
  betalt_av?: string;
  leie_for?: string;
  leieperiode?: string;
  enhet?: string;
  leverandor?: string;
  beskrivelse_egen?: string;
}

function matchesRule(tekst: string, regel: KlassifiseringsRegel): boolean {
  const lower = tekst.toLowerCase();
  const monster = regel.monster.toLowerCase();

  switch (regel.monster_type) {
    case 'eksakt':
      return lower === monster;
    case 'starter_med':
      return lower.startsWith(monster);
    case 'inneholder':
    default:
      return lower.includes(monster);
  }
}

export function klassifiserTransaksjon(
  t: ParsedTransaksjon,
  regler: KlassifiseringsRegel[]
): ParsedTransaksjon {
  const aktiveRegler = regler
    .filter(r => r.aktiv !== false)
    .sort((a, b) => (b.prioritet ?? 0) - (a.prioritet ?? 0));

  const searchText = `${t.beskrivelse_bank} ${t.motpart_bank ?? ''}`;

  for (const regel of aktiveRegler) {
    if (matchesRule(searchText, regel)) {
      return {
        ...t,
        kategori: regel.kategori ?? 'Uklassifisert',
        underkategori: regel.underkategori ?? undefined,
        kostnadstype: regel.kostnadstype ?? undefined,
        inntektstype: regel.inntektstype ?? undefined,
        utgiftstype: regel.utgiftstype ?? undefined,
        motpart_egen: regel.motpart ?? undefined,
        klassifisering_status: 'auto',
      };
    }
  }

  return {
    ...t,
    kategori: 'Uklassifisert',
    klassifisering_status: 'foreslått',
  };
}

export function klassifiserAlle(
  transaksjoner: ParsedTransaksjon[],
  regler: KlassifiseringsRegel[]
): ParsedTransaksjon[] {
  return transaksjoner.map(t => klassifiserTransaksjon(t, regler));
}

export function beregnDuplikatHash(t: ParsedTransaksjon): string {
  const desc = (t.beskrivelse_bank || '').trim().toLowerCase();
  return `${t.dato}_${t.konto || ''}_${t.belop}_${desc}`;
}
