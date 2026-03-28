/**
 * Smart month suggestion for rent payments.
 * Given a transaction date and tenant's due day, suggests which month the payment is for.
 */
export function forslaaMaaned(
  transaksjonDato: string,
  forfallDag: number
): { maaned: string; aar: number; maanedNr: number; konfidens: 'høy' | 'medium' | 'lav' } {
  const d = new Date(transaksjonDato);
  const dag = d.getDate();
  const maaned = d.getMonth(); // 0-indexed
  const aar = d.getFullYear();

  const MAANEDER = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

  let targetMonth = maaned;
  let targetYear = aar;
  let konfidens: 'høy' | 'medium' | 'lav' = 'høy';

  if (forfallDag <= 5) {
    // Due early in month: payments from ~20th prev month to ~10th this month = this month
    if (dag >= 20) {
      // Late in month → next month's rent
      targetMonth = maaned + 1;
      if (targetMonth > 11) { targetMonth = 0; targetYear++; }
      konfidens = dag >= 25 ? 'høy' : 'medium';
    } else if (dag <= 10) {
      // Early in month → this month
      konfidens = 'høy';
    } else {
      // Mid month → ambiguous
      konfidens = 'lav';
    }
  } else if (forfallDag >= 10 && forfallDag <= 20) {
    // Due mid-month
    if (dag >= forfallDag - 10 && dag <= forfallDag + 15) {
      // Within window → this month
      konfidens = Math.abs(dag - forfallDag) <= 5 ? 'høy' : 'medium';
    } else if (dag < forfallDag - 10) {
      // Very early → could be previous month late payment
      targetMonth = maaned - 1;
      if (targetMonth < 0) { targetMonth = 11; targetYear--; }
      konfidens = 'lav';
    } else {
      // Very late → next month early
      targetMonth = maaned + 1;
      if (targetMonth > 11) { targetMonth = 0; targetYear++; }
      konfidens = 'lav';
    }
  } else {
    // Due late in month (>20)
    if (dag >= forfallDag - 10) {
      konfidens = Math.abs(dag - forfallDag) <= 5 ? 'høy' : 'medium';
    } else if (dag <= 10) {
      // Early next month → still this month's rent (late)
      konfidens = 'medium';
    } else {
      konfidens = 'lav';
    }
  }

  return {
    maaned: `${MAANEDER[targetMonth]}. ${String(targetYear).slice(2)}`,
    aar: targetYear,
    maanedNr: targetMonth + 1,
    konfidens,
  };
}

export function formaterMaanedKort(maanedNr: number, aar: number): string {
  const MAANEDER = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${MAANEDER[maanedNr - 1]}. ${String(aar).slice(2)}`;
}
