import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const authHeader = req.headers.get("Authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Ikke autentisert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastMsg = messages[messages.length - 1]?.content || "";
    
    let txQuery = supabase.from("transaksjoner").select("*").eq("user_id", user.id).order("dato", { ascending: false }).limit(500);
    const yearMatch = lastMsg.match(/20\d{2}/);
    if (yearMatch) txQuery = txQuery.eq("skatteaar", parseInt(yearMatch[0]));

    const { data: txData } = await txQuery;
    const { data: abData } = await supabase.from("abonnementer").select("*").eq("user_id", user.id);
    const { data: eiereData } = await supabase.from("eiere").select("*").eq("user_id", user.id);
    const { data: mvDataRows } = await supabase.from("mellomvaerende").select("*").eq("user_id", user.id);
    const { data: mvBevData } = await supabase.from("mellomvaerende_bevegelser").select("*").eq("user_id", user.id).order("dato", { ascending: false }).limit(100);

    const txSummary = txData && txData.length > 0
      ? `Transaksjonsdata (${txData.length} rader):\n${JSON.stringify(txData.slice(0, 200), null, 0)}`
      : "Ingen transaksjoner funnet.";
    const abSummary = abData && abData.length > 0 ? `\n\nAbonnementer (${abData.length}):\n${JSON.stringify(abData, null, 0)}` : "";
    const eiereSummary = eiereData && eiereData.length > 0 ? `\n\nEiere:\n${JSON.stringify(eiereData, null, 0)}` : "";
    const mvSummary = mvDataRows && mvDataRows.length > 0 ? `\n\nMellomværende:\n${JSON.stringify(mvDataRows, null, 0)}` : "";
    const mvBevSummary = mvBevData && mvBevData.length > 0 ? `\n\nMellomværende bevegelser (siste 100):\n${JSON.stringify(mvBevData, null, 0)}` : "";

    const systemPrompt = `Du er en finansanalytiker som hjelper en norsk utleier med å analysere transaksjonsdata.
Svar alltid på norsk. Bruk norsk tallformat (38.265,00 kr). Datoformat DD.MM.YY.
Bruk markdown-tabeller for strukturert data. Vær konsis og direkte.
Vis alltid totaler og delsummer. Fremhev viktige funn eller avvik.

Kontekst:
- Kategorier: Privat, Eiersameie E7, Motivus AS
- Eiersameie E7: "Drift og vedlikehold" er fradragsberettiget. "Påkost" er IKKE fradragsberettiget.
- Leieinntekter har: leie_for (leietaker), leieperiode, enhet, betalt_av
- Eier: Sebastian Flåterud. Eiendom: Enerhøgdveien 7A, Nesodden.
- Selskap: Motivus AS. Kjærestens selskap: Multis EHF.
- Eiersameie E7 eies av fire parter: Sebastian Flåterud, Levi, David Lange-Nielsen og Motivus AS.
- Hver eier har tre separate prosentnøkler: eierandel, inntektsandel og kostnadsandel. Disse kan være ulike.
- Alle leieinntekter går via Sebastians konto og viderefordeles. Viderefordelinger er merket som "oppgjør" (er_oppgjor=true) og skal aldri telles som inntekt eller utgift.
- For skattemeldingen: hver eier rapporterer kun sin andel. Netto = (brutto inntekt × inntektsandel) minus (brutto fradrag × kostnadsandel).
- Kun "Drift og vedlikehold" er fradragsberettiget. "Påkost" legges til inngangsverdi (ikke fradrag).
- Utleie av bolig er alltid unntatt MVA, også for Motivus AS.
- Når bruker spør om "min" andel, bruk Sebastian Flåteruds andeler.
- Når bruker spør om skattemeldingsgrunnlag, vis alltid brutto OG eierens andel.

Tilleggskontekst mellomværende:
- Sebastian har to aktive lån der han er kreditor:
  1. Motivus AS skylder Sebastian for utlegg ved investering i E7. Nedbetales ved at Sebastian beholder Motivus sin leieandel.
  2. David Lange-Nielsen skylder Sebastian for kjøp av økt eierandel. Nedbetales ved at Sebastian beholder Davids leieandel.
- Begge lånene nedbetales automatisk gjennom tilbakeholdte leieinntekter.
- Når et lån er innfridd begynner debitor å motta sin leieandel.
- Data finnes i mellomvaerende og mellomvaerende_bevegelser tabellene.
- Typiske spørsmål: "Hvor mye skylder David meg?", "Når er Motivus-lånet nedbetalt?", "Vis nedbetalingshistorikk for David", "Hva er total utestående?"

${txSummary}${abSummary}${eiereSummary}${mvSummary}${mvBevSummary}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "For mange forespørsler." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Kreditter brukt opp." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI-feil: " + errText }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content || "Ingen respons.";
    return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Ukjent feil" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
