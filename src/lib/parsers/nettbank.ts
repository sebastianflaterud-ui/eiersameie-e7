import { ParsedTransaksjon } from '@/lib/klassifisering';
import { parseDatoDDMMYY, toDbDate, parseNorskBelop } from '@/lib/format';

/**
 * Parse tab-separated DNB nettbank data
 */
export function parseNettbankData(text: string, konto?: string): ParsedTransaksjon[] {
  const lines = text.trim().split('\n');
  const result: ParsedTransaksjon[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip header lines
    if (trimmed.toLowerCase().includes('dato') && trimmed.toLowerCase().includes('beløp')) continue;
    if (trimmed.toLowerCase().includes('fra konto') || trimmed.toLowerCase().includes('til konto')) continue;

    const cols = trimmed.split('\t');
    if (cols.length < 4) continue;

    const datoStr = cols[0].trim();
    const motpart = cols[1].trim();
    const _kategori = cols[2]?.trim(); // Ignore bank category
    const belopStr = cols[3]?.trim();

    if (!datoStr || !belopStr) continue;

    const dato = parseDatoDDMMYY(datoStr);
    if (!dato) continue;

    const belop = parseNorskBelop(belopStr);
    if (isNaN(belop)) continue;

    result.push({
      dato: toDbDate(dato),
      beskrivelse_bank: motpart || belopStr,
      belop: Math.abs(belop),
      retning: belop >= 0 ? 'inn' : 'ut',
      motpart_bank: motpart || undefined,
      konto: konto || undefined,
      kilde: 'nettbank_lim',
    });
  }

  return result;
}
