import { ParsedTransaksjon } from '@/lib/klassifisering';

/**
 * DNB PDF kontoutskrift parser
 * Uses pdfjs-dist for text extraction
 */

interface PdfPage {
  text: string;
  lines: string[];
}

export async function extractPdfText(file: File): Promise<PdfPage[]> {
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by Y position to reconstruct lines
    const items = content.items as Array<{
      str: string;
      transform: number[];
    }>;

    const lineMap = new Map<number, { x: number; text: string }[]>();

    for (const item of items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, text: item.str });
    }

    // Sort by Y descending (top of page first), then X ascending
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const lines: string[] = [];

    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      lines.push(lineItems.map(i => i.text).join(' '));
    }

    pages.push({
      text: lines.join('\n'),
      lines,
    });
  }

  return pages;
}

function extractKontonummer(text: string): string | null {
  const match = text.match(/Kontoutskrift\s+for\s+(\d{4}\.\d{2}\.\d{5})/i);
  return match ? match[1] : null;
}

function parseDnbDate(dateStr: string): string | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    const match2 = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!match2) return null;
    const year = parseInt(match2[3]) < 50 ? `20${match2[3]}` : `19${match2[3]}`;
    return `${year}-${match2[2]}-${match2[1]}`;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseNorskTall(str: string): number {
  const cleaned = str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

export function parseDnbPdf(pages: PdfPage[]): ParsedTransaksjon[] {
  const transaksjoner: ParsedTransaksjon[] = [];
  let currentKonto: string | null = null;

  for (const page of pages) {
    // Check for account number on this page
    const kontoMatch = extractKontonummer(page.text);
    if (kontoMatch) {
      currentKonto = kontoMatch;
    }

    for (let i = 0; i < page.lines.length; i++) {
      const line = page.lines[i].trim();

      // Also check for account number in individual lines
      if (!currentKonto) {
        const lineKonto = extractKontonummer(line);
        if (lineKonto) currentKonto = lineKonto;
      }

      // Try to match a transaction line
      // DNB format: DD.MM.YYYY DD.MM.YYYY Description Amount(out) Amount(in) Arkivref
      // Sometimes amounts are in different columns

      // Pattern: starts with date
      const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})?\s*/);
      if (!dateMatch) continue;

      const datoBruk = parseDnbDate(dateMatch[1]);
      if (!datoBruk) continue;

      const datoBokforing = dateMatch[2] ? parseDnbDate(dateMatch[2]) : undefined;
      const rest = line.slice(dateMatch[0].length).trim();

      // Try to extract amounts and arkivref from the end
      // Look for patterns like: "description  1.234,56  987654" or "description  1.234,56  2.345,67  987654"
      const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})?\s*(\d{6,})?$/;
      const singleAmountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(\d{6,})?$/;

      let beskrivelse = rest;
      let belop = 0;
      let retning: 'inn' | 'ut' = 'ut';
      let arkivref: string | undefined;
      let valuta: string | undefined;
      let valutakurs: number | undefined;
      let originalBelop: number | undefined;

      const doubleMatch = rest.match(amountPattern);
      if (doubleMatch) {
        beskrivelse = rest.slice(0, doubleMatch.index).trim();
        const amount1 = parseNorskTall(doubleMatch[1]);
        const amount2 = doubleMatch[2] ? parseNorskTall(doubleMatch[2]) : null;
        arkivref = doubleMatch[3] || undefined;

        if (amount2 !== null) {
          // Two amounts: first is out, second is in
          if (amount2 > 0) {
            belop = amount2;
            retning = 'inn';
          } else {
            belop = amount1;
            retning = 'ut';
          }
        } else {
          belop = Math.abs(amount1);
          retning = amount1 < 0 ? 'ut' : 'ut'; // Single amount in out column
        }
      } else {
        const singleMatch = rest.match(singleAmountPattern);
        if (singleMatch) {
          beskrivelse = rest.slice(0, singleMatch.index).trim();
          belop = Math.abs(parseNorskTall(singleMatch[1]));
          arkivref = singleMatch[2] || undefined;
          retning = 'ut'; // Default, will check context
        } else {
          continue; // No amount found, skip
        }
      }

      if (belop === 0 || isNaN(belop)) continue;

      // Check next line(s) for foreign currency info
      // Pattern: "Valutakurs: 0,0959 Isk 14.790,00"
      if (i + 1 < page.lines.length) {
        const nextLine = page.lines[i + 1].trim();
        const fxMatch = nextLine.match(/Valutakurs:\s*([\d,]+)\s+(\w{3})\s+([\d.,]+)/i);
        if (fxMatch) {
          valutakurs = parseNorskTall(fxMatch[1]);
          valuta = fxMatch[2].toUpperCase();
          originalBelop = parseNorskTall(fxMatch[3]);
          i++; // Skip the forex line
        }
      }

      // Determine direction from context - check if amount is in "inn" column position
      // For DNB, if there are two amount columns, right one is "inn"
      // Simple heuristic: if description contains payment-like words, it's likely "ut"
      if (doubleMatch && doubleMatch[2]) {
        const amt2 = parseNorskTall(doubleMatch[2]);
        if (amt2 > 0) {
          belop = amt2;
          retning = 'inn';
        }
      }

      transaksjoner.push({
        dato: datoBruk,
        bokforingsdato: datoBokforing || undefined,
        beskrivelse_bank: beskrivelse,
        belop,
        retning,
        motpart_bank: beskrivelse, // Use description as motpart initially
        konto: currentKonto || undefined,
        arkivref,
        kilde: 'pdf',
        valuta: valuta || 'NOK',
        valutakurs,
        original_belop: originalBelop,
      });
    }
  }

  return transaksjoner;
}
