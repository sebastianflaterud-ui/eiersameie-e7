import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAYS_BEFORE_FORFALL = 7;

function log(level: string, msg: string, data?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), fn: "auto-generer-fakturaer", level, msg, ...data };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function errorResponse(status: number, message: string, details?: string) {
  log("error", message, { status, details });
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getExpectedForMonth(lf: any, year: number, month: number): number {
  const mStart = new Date(year, month - 1, 1);
  const mEnd = new Date(year, month, 0);
  const lfStart = new Date(lf.innflytting);
  const lfEnd = lf.utflytting ? new Date(lf.utflytting) : null;
  if (lfStart > mEnd) return 0;
  if (lfEnd && lfEnd < mStart) return 0;
  const totalDays = daysInMonth(year, month);
  const effectiveStart = lfStart > mStart ? lfStart : mStart;
  const effectiveEnd = lfEnd && lfEnd < mEnd ? lfEnd : mEnd;
  const activeDays = effectiveEnd.getDate() - effectiveStart.getDate() + 1;
  if (activeDays >= totalDays) return Number(lf.avtalt_leie);
  return Math.round((Number(lf.avtalt_leie) / totalDays) * activeDays);
}

function formaterMaanedKort(month: number, year: number): string {
  const names = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${names[month - 1]}. ${String(year).slice(2)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);
  log("info", "Fakturagenerering startet", { requestId });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return errorResponse(500, "Mangler miljøvariabler for database");

    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + DAYS_BEFORE_FORFALL);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;

    log("info", "Målperiode beregnet", { requestId, targetYear, targetMonth, today: today.toISOString().slice(0, 10) });

    // Get all active leieforhold
    const { data: allLf, error: lfError } = await supabase.from('leieforhold').select('*').eq('status', 'aktiv');
    if (lfError) {
      return errorResponse(500, "Kunne ikke hente leieforhold", lfError.message);
    }
    if (!allLf || allLf.length === 0) {
      log("info", "Ingen aktive leieforhold funnet", { requestId });
      return new Response(JSON.stringify({ message: "Ingen aktive leieforhold", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("info", "Aktive leieforhold funnet", { requestId, antall: allLf.length });

    // Group by user_id
    const userIds = [...new Set(allLf.map(lf => lf.user_id))];
    let totalCreated = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      const userLfs = allLf.filter(lf => lf.user_id === userId);

      // Get leietakere for this user
      const { data: leietakere, error: ltError } = await supabase.from('leietakere').select('*').eq('user_id', userId);
      if (ltError) {
        log("warn", "Kunne ikke hente leietakere", { requestId, userId: userId.slice(0, 8), error: ltError.message });
        errors.push(`leietakere for ${userId.slice(0, 8)}: ${ltError.message}`);
        continue;
      }

      // Get existing fakturaer for this month/year
      const maanedStr = formaterMaanedKort(targetMonth, targetYear);
      const { data: existingFakturaer, error: efError } = await supabase
        .from('fakturaer').select('leietaker_id, maaned')
        .eq('user_id', userId).eq('aar', targetYear).eq('maaned', maanedStr);
      if (efError) {
        log("warn", "Kunne ikke hente eksisterende fakturaer", { requestId, error: efError.message });
      }
      const existingSet = new Set((existingFakturaer || []).map(f => `${f.leietaker_id}_${f.maaned}`));

      // Get next fakturanr
      const { data: lastFaktura } = await supabase
        .from('fakturaer').select('fakturanr')
        .eq('user_id', userId).eq('aar', targetYear)
        .order('fakturanr', { ascending: false }).limit(1);
      let nextNr = 1;
      if (lastFaktura && lastFaktura.length > 0) {
        const match = lastFaktura[0].fakturanr.match(/(\d+)$/);
        if (match) nextNr = parseInt(match[1]) + 1;
      }

      // Get betalingsmottakere
      const { data: bm } = await supabase.from('betalingsmottakere').select('*').eq('user_id', userId);

      for (const lf of userLfs) {
        const lt = (leietakere || []).find(l => l.id === lf.leietaker_id);
        if (!lt) {
          log("warn", "Leietaker ikke funnet for leieforhold", { requestId, leieforholdId: lf.id.slice(0, 8), leietakerId: lf.leietaker_id.slice(0, 8) });
          totalSkipped++;
          continue;
        }

        const forfallDag = lf.forfall_dag || lt.forfall_dag || 1;
        const forfall = new Date(targetYear, targetMonth - 1, Math.min(forfallDag, daysInMonth(targetYear, targetMonth)));

        // Only generate if forfall is within DAYS_BEFORE_FORFALL days from now
        const diffMs = forfall.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > DAYS_BEFORE_FORFALL) {
          totalSkipped++;
          continue;
        }

        const expected = getExpectedForMonth(lf, targetYear, targetMonth);
        if (expected <= 0) {
          totalSkipped++;
          continue;
        }

        const key = `${lt.id}_${maanedStr}`;
        if (existingSet.has(key)) {
          log("info", "Faktura finnes allerede, hopper over", { requestId, leietaker: lt.navn, maaned: maanedStr });
          totalSkipped++;
          continue;
        }

        const fakturanr = `F${targetYear}-${String(nextNr).padStart(3, '0')}`;

        const { data: inserted, error: insertError } = await supabase.from('fakturaer').insert({
          user_id: userId, fakturanr, leietaker_id: lt.id, leieforhold_id: lf.id,
          enhet_id: lf.enhet_id, maaned: maanedStr, aar: targetYear,
          belop: expected, forfall: forfall.toISOString().slice(0, 10),
          status: 'ikke_forfalt',
        }).select().single();

        if (insertError) {
          log("error", "Kunne ikke opprette faktura", { requestId, leietaker: lt.navn, error: insertError.message });
          errors.push(`faktura for ${lt.navn}: ${insertError.message}`);
          continue;
        }

        if (inserted) {
          log("info", "Faktura opprettet", { requestId, fakturanr, leietaker: lt.navn, belop: expected, maaned: maanedStr });

          const mottakere = (bm || []).filter(m => m.leieforhold_id === lf.id);
          if (mottakere.length > 0) {
            for (const m of mottakere) {
              const { error: mottakerError } = await supabase.from('faktura_mottakere').insert({
                user_id: userId, faktura_id: inserted.id,
                mottaker_navn: m.mottaker_navn, kontonummer: m.kontonummer || '',
                belop: m.belop, betalingsreferanse: maanedStr,
              });
              if (mottakerError) {
                log("warn", "Kunne ikke opprette fakturamottaker", { requestId, fakturanr, error: mottakerError.message });
              }
            }
          } else {
            const { error: defaultMottakerError } = await supabase.from('faktura_mottakere').insert({
              user_id: userId, faktura_id: inserted.id,
              mottaker_navn: 'Sebastian Flåterud', kontonummer: '12241835675',
              belop: expected, betalingsreferanse: maanedStr,
            });
            if (defaultMottakerError) {
              log("warn", "Kunne ikke opprette standard fakturamottaker", { requestId, fakturanr, error: defaultMottakerError.message });
            }
          }
          nextNr++;
          totalCreated++;
          existingSet.add(key);
        }
      }
    }

    const summary = {
      message: `${totalCreated} faktura(er) generert`,
      created: totalCreated,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
    };

    log("info", "Fakturagenerering fullført", { requestId, ...summary });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse(500, err.message || "Ukjent feil", err.stack?.slice(0, 300));
  }
});
