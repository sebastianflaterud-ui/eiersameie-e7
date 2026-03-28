import { ParsedTransaksjon } from '@/lib/klassifisering';
import { parseDatoDDMMYY, toDbDate, parseNorskBelop } from '@/lib/format';

/**
 * Detect if the pasted text is in the kontoutskrift block format:
 * Header: "DatoFra/TilKategori          Beløp    DD.MM.YY"
 * Then repeating blocks of: Name, Category/description, Amount + Date
 */
function isKontoutskriftFormat(text: string): boolean {
  const lines = text.trim().split('\n');
  // Check for header pattern
  if (lines.length > 0 && /dato.*fra.*kategori.*bel/i.test(lines[0].replace(/\s+/g, ' '))) return true;
  // Check for beløp+dato pattern on any line: "18.000,00 20.03.26"
  const belopDatoPattern = /^\d{1,3}(?:\.\d{3})*,\d{2}\s+\d{2}\.\d{2}\.\d{2}$/;
  let matchCount = 0;
  for (const line of lines) {
    if (belopDatoPattern.test(line.trim())) matchCount++;
    if (matchCount >= 2) return true;
  }
  return false;
}

/**
 * Parse kontoutskrift block format.
 * Lines come in groups: name, category (optional), "beløp dato"
 * Some entries end without a date (last entry).
 */
function parseKontoutskrift(text: string, konto?: string): ParsedTransaksjon[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result: ParsedTransaksjon[] = [];

  // Skip header line(s)
  let startIdx = 0;
  if (lines.length > 0 && /dato.*fra.*kategori.*bel/i.test(lines[0].replace(/\s+/g, ' '))) {
    startIdx = 1;
  }

  // Pattern: "18.000,00 20.03.26" or just "18.000,00" (last entry, no date)
  const belopDatoRegex = /^(\d{1,3}(?:\.\d{3})*,\d{2})\s*(\d{2}\.\d{2}\.\d{2})?$/;

  // Collect non-amount lines as context, then when we hit an amount line, emit a transaction
  let pendingLines: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(belopDatoRegex);

    if (match) {
      const belopStr = match[1];
      const datoStr = match[2];

      const belop = parseNorskBelop(belopStr);
      if (isNaN(belop)) { pendingLines = []; continue; }

      // Extract name and category from pending lines
      const motpart = pendingLines.length > 0 ? pendingLines[0] : '';
      const beskrivelse = pendingLines.length > 1 ? pendingLines.slice(1).join(' ').trim() : '';

      let dato: Date | null = null;
      if (datoStr) {
        dato = parseDatoDDMMYY(datoStr);
      }

      if (motpart) {
        result.push({
          dato: dato ? toDbDate(dato) : new Date().toISOString().slice(0, 10),
          beskrivelse_bank: beskrivelse && beskrivelse !== motpart
            ? `${motpart} — ${beskrivelse}`
            : motpart,
          belop: Math.abs(belop),
          retning: 'inn',
          motpart_bank: motpart || undefined,
          konto: konto || undefined,
          kilde: 'nettbank_lim',
        });
      }

      pendingLines = [];
    } else {
      pendingLines.push(line);
    }
  }

  return result;
}

/**
 * Parse tab-separated DNB nettbank data
 */
export function parseNettbankData(text: string, konto?: string): ParsedTransaksjon[] {
  // Auto-detect kontoutskrift block format
  if (isKontoutskriftFormat(text)) {
    return parseKontoutskrift(text, konto);
  }

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
    // cols[2] is the bank category — intentionally ignored
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
