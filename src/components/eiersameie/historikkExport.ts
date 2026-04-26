import * as XLSX from 'xlsx';
import { HistorikkEvent } from './types';

interface Row {
  Dato: string;
  Type: string;
  Beskrivelse: string;
  Eier: string;
  'Andel før (%)': number;
  'Andel etter (%)': number;
  'Endring (%)': number;
  Merknad: string;
}

function buildRows(historikk: HistorikkEvent[]): Row[] {
  const rows: Row[] = [];
  for (const ev of historikk) {
    for (const d of ev.detaljer) {
      rows.push({
        Dato: ev.dato,
        Type: ev.type,
        Beskrivelse: ev.beskrivelse,
        Eier: d.eier_navn,
        'Andel før (%)': Number(d.andel_for),
        'Andel etter (%)': Number(d.andel_etter),
        'Endring (%)': Number((d.andel_etter - d.andel_for).toFixed(4)),
        Merknad: d.merknad || '',
      });
    }
  }
  return rows;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportHistorikkCsv(historikk: HistorikkEvent[]) {
  const rows = buildRows(historikk);
  const ws = XLSX.utils.json_to_sheet(rows);
  // Use semicolon for Norwegian Excel compatibility
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `eierhistorikk-${today()}.csv`);
}

export function exportHistorikkXlsx(historikk: HistorikkEvent[]) {
  const rows = buildRows(historikk);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 24 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Eierhistorikk');
  XLSX.writeFile(wb, `eierhistorikk-${today()}.xlsx`);
}
