import { ParsedTransaksjon } from '@/lib/klassifisering';
import { parseNorskBelop } from '@/lib/format';

export interface CsvMapping {
  [csvColumn: string]: string; // maps CSV column name → db field name or 'ignorer'
}

export interface CsvDefaults {
  kategori?: string;
  retning?: 'inn' | 'ut';
  konto?: string;
  inntektstype?: string;
}

export function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

export function parseCsvHeaders(text: string, separator: string): string[] {
  const firstLine = text.split('\n')[0] || '';
  return firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
}

export function suggestMapping(headers: string[]): CsvMapping {
  const mapping: CsvMapping = {};
  const suggestions: Record<string, string[]> = {
    dato: ['dato', 'date', 'betalingsdato', 'transaksjonsdato'],
    beskrivelse_bank: ['beskrivelse', 'forklaring', 'tekst', 'description'],
    belop: ['beløp', 'belop', 'sum', 'amount'],
    motpart_bank: ['motpart', 'fra/til', 'mottaker', 'avsender', 'leietaker'],
    leie_for: ['leie_for', 'leietaker'],
    leieperiode: ['måned', 'periode', 'leieperiode', 'month'],
    enhet: ['enhet', 'leilighet', 'unit'],
    betalt_av: ['betalt_av', 'betaler'],
    kid: ['kid', 'referanse'],
  };

  for (const header of headers) {
    const lower = header.toLowerCase();
    let matched = false;
    for (const [field, keywords] of Object.entries(suggestions)) {
      if (keywords.some(k => lower.includes(k))) {
        mapping[header] = field;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Check for kommentar/notater
      if (lower.includes('kommentar') || lower.includes('notat')) {
        mapping[header] = 'notater';
      } else if (lower.includes('metode') || lower.includes('kilde')) {
        mapping[header] = 'ignorer';
      } else {
        mapping[header] = 'ignorer';
      }
    }
  }
  return mapping;
}

export function parseCsvData(
  text: string,
  separator: string,
  mapping: CsvMapping,
  defaults: CsvDefaults
): ParsedTransaksjon[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  const result: ParsedTransaksjon[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};

    headers.forEach((h, idx) => {
      const field = mapping[h];
      if (field && field !== 'ignorer' && values[idx]) {
        row[field] = values[idx];
      }
    });

    if (!row.dato) continue;

    // Parse date - try multiple formats
    let dato = row.dato;
    if (dato.includes('.')) {
      const parts = dato.split('.');
      if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) {
          year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        }
        dato = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    let belop = 0;
    if (row.belop) {
      belop = parseNorskBelop(row.belop);
    }

    const retning = defaults.retning || (belop >= 0 ? 'inn' : 'ut');

    result.push({
      dato,
      beskrivelse_bank: row.beskrivelse_bank || row.motpart_bank || 'CSV import',
      belop: Math.abs(belop),
      retning,
      motpart_bank: row.motpart_bank || undefined,
      konto: defaults.konto || undefined,
      kilde: 'csv',
      kategori: defaults.kategori || undefined,
      inntektstype: defaults.inntektstype || undefined,
      kid: row.kid || undefined,
      betalt_av: row.betalt_av || undefined,
      leie_for: row.leie_for || undefined,
      leieperiode: row.leieperiode || undefined,
      enhet: row.enhet || undefined,
      notater: row.notater || undefined,
      beskrivelse_egen: row.beskrivelse_egen || undefined,
    });
  }

  return result;
}
