/**
 * Norwegian formatting utilities for dates and amounts
 */

/** Format a number as Norwegian currency: 38.265,00 kr */
export function formatBelop(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0,00 kr';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00 kr';
  
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const [intPart, decPart = '00'] = abs.toFixed(2).split('.');
  
  // Add thousand separators with dots
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${isNegative ? '-' : ''}${formatted},${decPart} kr`;
}

/** Format date as DD.MM.YY */
export function formatDato(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  
  return `${day}.${month}.${year}`;
}

/** Format date as DD.MM.YYYY */
export function formatDatoFull(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}

/** Parse Norwegian amount string to number: "38.265,00" → 38265.00 */
export function parseNorskBelop(value: string): number {
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

/** Parse DD.MM.YY date to Date. Two-digit year: 00-49 → 2000s, 50-99 → 1900s */
export function parseDatoDDMMYY(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  let year = parseInt(match[3], 10);
  year = year < 50 ? 2000 + year : 1900 + year;
  
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  return d;
}

/** Format date as YYYY-MM-DD for database storage */
export function toDbDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
