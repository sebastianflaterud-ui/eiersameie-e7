import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAYS_BEFORE_FORFALL = 7;

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + DAYS_BEFORE_FORFALL);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;

    // Get all active leieforhold with leietaker info
    const { data: allLf } = await supabase.from('leieforhold').select('*').eq('status', 'aktiv');
    if (!allLf || allLf.length === 0) {
      return new Response(JSON.stringify({ message: "Ingen aktive leieforhold", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user_id
    const userIds = [...new Set(allLf.map(lf => lf.user_id))];
    let totalCreated = 0;

    for (const userId of userIds) {
      const userLfs = allLf.filter(lf => lf.user_id === userId);

      // Get leietakere for this user
      const { data: leietakere } = await supabase.from('leietakere').select('*').eq('user_id', userId);

      // Get existing fakturaer for this month/year
      const maanedStr = formaterMaanedKort(targetMonth, targetYear);
      const { data: existingFakturaer } = await supabase.from('fakturaer').select('leietaker_id, maaned').eq('user_id', userId).eq('aar', targetYear).eq('maaned', maanedStr);
      const existingSet = new Set((existingFakturaer || []).map(f => `${f.leietaker_id}_${f.maaned}`));

      // Get next fakturanr
      const { data: lastFaktura } = await supabase.from('fakturaer').select('fakturanr').eq('user_id', userId).eq('aar', targetYear).order('fakturanr', { ascending: false }).limit(1);
      let nextNr = 1;
      if (lastFaktura && lastFaktura.length > 0) {
        const match = lastFaktura[0].fakturanr.match(/(\d+)$/);
        if (match) nextNr = parseInt(match[1]) + 1;
      }

      // Get betalingsmottakere
      const { data: bm } = await supabase.from('betalingsmottakere').select('*').eq('user_id', userId);

      for (const lf of userLfs) {
        const lt = (leietakere || []).find(l => l.id === lf.leietaker_id);
        if (!lt) continue;

        const forfallDag = lf.forfall_dag || lt.forfall_dag || 1;
        const forfall = new Date(targetYear, targetMonth - 1, Math.min(forfallDag, daysInMonth(targetYear, targetMonth)));

        // Only generate if forfall is within DAYS_BEFORE_FORFALL days from now
        const diffMs = forfall.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > DAYS_BEFORE_FORFALL) continue;

        const expected = getExpectedForMonth(lf, targetYear, targetMonth);
        if (expected <= 0) continue;

        const key = `${lt.id}_${maanedStr}`;
        if (existingSet.has(key)) continue;

        const fakturanr = `F${targetYear}-${String(nextNr).padStart(3, '0')}`;

        const { data: inserted } = await supabase.from('fakturaer').insert({
          user_id: userId, fakturanr, leietaker_id: lt.id, leieforhold_id: lf.id,
          enhet_id: lf.enhet_id, maaned: maanedStr, aar: targetYear,
          belop: expected, forfall: forfall.toISOString().slice(0, 10),
          status: 'ikke_forfalt',
        }).select().single();

        if (inserted) {
          const mottakere = (bm || []).filter(m => m.leieforhold_id === lf.id);
          if (mottakere.length > 0) {
            for (const m of mottakere) {
              await supabase.from('faktura_mottakere').insert({
                user_id: userId, faktura_id: inserted.id,
                mottaker_navn: m.mottaker_navn, kontonummer: m.kontonummer || '',
                belop: m.belop, betalingsreferanse: maanedStr,
              });
            }
          } else {
            await supabase.from('faktura_mottakere').insert({
              user_id: userId, faktura_id: inserted.id,
              mottaker_navn: 'Sebastian Flåterud', kontonummer: '12241835675',
              belop: expected, betalingsreferanse: maanedStr,
            });
          }
          nextNr++;
          totalCreated++;
          existingSet.add(key);
        }
      }
    }

    return new Response(JSON.stringify({ message: `${totalCreated} faktura(er) generert`, created: totalCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
