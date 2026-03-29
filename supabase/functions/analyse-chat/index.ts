import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function log(level: string, msg: string, data?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), fn: "analyse-chat", level, msg, ...data };
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID().slice(0, 8);
  log("info", "Chat-forespørsel mottatt", { requestId });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "Mangler autorisasjonsheader");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseKey) return errorResponse(500, "Mangler miljøvariabler for database");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Ikke autentisert", authError?.message);
    }
    log("info", "Bruker autentisert", { requestId, userId: user.id.slice(0, 8) });

    // Input validation
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "Ugyldig JSON i forespørsel");
    }

    const { messages } = body as { messages?: unknown[] };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse(400, "Meldinger mangler eller er tomme");
    }
    if (messages.length > 50) {
      return errorResponse(400, "For mange meldinger i samtalen", `Mottok ${messages.length}`);
    }

    const lastMsg = (messages[messages.length - 1] as any)?.content || "";
    log("info", "Henter kontekstdata", { requestId, meldinger: messages.length, siste: lastMsg.slice(0, 60) });

    // Fetch context data with error handling per query
    let txQuery = supabase.from("transaksjoner").select("*").eq("user_id", user.id).order("dato", { ascending: false }).limit(500);
    const yearMatch = lastMsg.match(/20\d{2}/);
    if (yearMatch) txQuery = txQuery.eq("skatteaar", parseInt(yearMatch[0]));

    const startTime = Date.now();
    const [txRes, abRes, eiereRes, mvRes, mvBevRes, enheterRes, leietakereRes, leieforholdRes, fakturaRes] = await Promise.all([
      txQuery,
      supabase.from("abonnementer").select("*").eq("user_id", user.id),
      supabase.from("eiere").select("*").eq("user_id", user.id),
      supabase.from("mellomvaerende").select("*").eq("user_id", user.id),
      supabase.from("mellomvaerende_bevegelser").select("*").eq("user_id", user.id).order("dato", { ascending: false }).limit(100),
      supabase.from("enheter").select("*").eq("user_id", user.id),
      supabase.from("leietakere").select("*").eq("user_id", user.id),
      supabase.from("leieforhold").select("*").eq("user_id", user.id),
      supabase.from("fakturaer").select("*").eq("user_id", user.id).order("forfall", { ascending: false }).limit(100),
    ]);
    const dbDurationMs = Date.now() - startTime;

    // Log any query errors but continue with available data
    const queryErrors: string[] = [];
    if (txRes.error) queryErrors.push(`transaksjoner: ${txRes.error.message}`);
    if (abRes.error) queryErrors.push(`abonnementer: ${abRes.error.message}`);
    if (eiereRes.error) queryErrors.push(`eiere: ${eiereRes.error.message}`);
    if (mvRes.error) queryErrors.push(`mellomvaerende: ${mvRes.error.message}`);
    if (mvBevRes.error) queryErrors.push(`mellomvaerende_bevegelser: ${mvBevRes.error.message}`);
    if (enheterRes.error) queryErrors.push(`enheter: ${enheterRes.error.message}`);
    if (leietakereRes.error) queryErrors.push(`leietakere: ${leietakereRes.error.message}`);
    if (leieforholdRes.error) queryErrors.push(`leieforhold: ${leieforholdRes.error.message}`);
    if (fakturaRes.error) queryErrors.push(`fakturaer: ${fakturaRes.error.message}`);

    if (queryErrors.length > 0) log("warn", "Noen spørringer feilet", { requestId, errors: queryErrors });

    log("info", "Kontekstdata hentet", {
      requestId,
      dbDurationMs,
      transaksjoner: txRes.data?.length || 0,
      leietakere: leietakereRes.data?.length || 0,
      fakturaer: fakturaRes.data?.length || 0,
    });

    const txData = txRes.data || [];
    const abData = abRes.data || [];
    const eiereData = eiereRes.data || [];
    const mvDataRows = mvRes.data || [];
    const mvBevData = mvBevRes.data || [];
    const enheterData = enheterRes.data || [];
    const leietakereData = leietakereRes.data || [];
    const leieforholdData = leieforholdRes.data || [];
    const fakturaData = fakturaRes.data || [];

    const txSummary = txData.length > 0
      ? `Transaksjonsdata (${txData.length} rader):\n${JSON.stringify(txData.slice(0, 200), null, 0)}`
      : "Ingen transaksjoner funnet.";
    const abSummary = abData.length > 0 ? `\n\nAbonnementer (${abData.length}):\n${JSON.stringify(abData, null, 0)}` : "";
    const eiereSummary = eiereData.length > 0 ? `\n\nEiere:\n${JSON.stringify(eiereData, null, 0)}` : "";
    const mvSummary = mvDataRows.length > 0 ? `\n\nMellomværende:\n${JSON.stringify(mvDataRows, null, 0)}` : "";
    const mvBevSummary = mvBevData.length > 0 ? `\n\nMellomværende bevegelser (siste 100):\n${JSON.stringify(mvBevData, null, 0)}` : "";
    const enheterSummary = enheterData.length > 0 ? `\n\nEnheter:\n${JSON.stringify(enheterData, null, 0)}` : "";
    const leietakereSummary = leietakereData.length > 0 ? `\n\nLeietakere:\n${JSON.stringify(leietakereData, null, 0)}` : "";
    const leieforholdSummary = leieforholdData.length > 0 ? `\n\nLeieforhold:\n${JSON.stringify(leieforholdData, null, 0)}` : "";
    const fakturaSummary = fakturaData.length > 0 ? `\n\nFakturaer (${fakturaData.length}):\n${JSON.stringify(fakturaData, null, 0)}` : "";

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

Skattemessig struktur E7:
- E7 er tomannsbolig med 2 boenheter. Ikke flermannsbolig. Under næringsgrensen.
- All leieinntekt er skattepliktig som kapitalinntekt (22% av netto). 50%-regelen er ikke oppfylt.
- Boenhet 1: Hovedhuset. Bofellesskap med felles kontrakt. 6 soverom totalt. Rom 1-4 og Hybel 2 utleid. Rom 5 (Sebastian) og Rom 6 (David) eiernes egne rom.
- Boenhet 2: Bileiligheten (Hybel 1). Selvstendig enhet. Egen kontrakt. 18.000 kr/mnd.
- Felles kontrakt for bofellesskapet = 1 boenhet. Individuell kontrakt for bileiligheten = 1 boenhet. Totalt 2.
- 3 utleiere: Sebastian, David og Motivus AS. Levi er ikke utleier (0% inntektsandel).
- Kontraktsdata finnes i kontrakter, kontrakt_leietakere og kontrakt_hendelser tabellene.

Eiere med andeler:
- Sebastian Flåterud (42,63% eierandel, 46,70% inntektsandel, 42,63% kostnadsandel)
- David Lange-Nielsen (32,70% eierandel, 32,70% inntektsandel, 32,70% kostnadsandel)
- Motivus AS org.nr 990144834 (20,60% eierandel, 20,60% inntektsandel, 20,60% kostnadsandel)
- Levi Flåterud (4,07% eierandel, 0% inntektsandel, 4,07% kostnadsandel)

Sebastians inntektsandel er 46,70% fordi Levi har overført sin inntektsrett (4,07%) til Sebastian.

VIKTIG skattemessig prinsipp:
- Alle leieinntekter går via Sebastians bankkonto. Han viderefordeler til medeiere.
- Akkurat nå tilbakeholder Sebastian andelen til David og Motivus AS som nedbetaling av lån.
- MEN skattemessig er Davids andel (32,70%) fortsatt DAVIDS skattepliktige inntekt.
- Samme for Motivus AS: 20,60% er selskapets inntekt i regnskapet.
- Utleie av bolig er alltid unntatt MVA, også for Motivus AS.
- Når bruker spør om "min" inntekt, bruk Sebastian Flåteruds andeler.

Mellomværende:
- Sebastian har to aktive lån der han er kreditor:
  1. Motivus AS skylder Sebastian for utlegg ved investering i E7.
  2. David Lange-Nielsen skylder Sebastian for kjøp av økt eierandel.
- Begge nedbetales gjennom tilbakeholdte leieinntekter.

For skattemeldingen: netto = (brutto inntekt × inntektsandel) minus (brutto fradrag × kostnadsandel).
Kun "Drift og vedlikehold" er fradragsberettiget. "Påkost" legges til inngangsverdi.

E7 kostnadsoppgjør:
- Hver E7-utgift har en betaler_eier (hvem som la ut) og en kostnadsbeskrivelse.
- Kostnader fordeles mellom eierne etter kostnadsandel, uavhengig av hvem som betalte.
- Appen beregner hva hver eier skylder eller har til gode.
- Typiske spørsmål: "Hva skylder David meg?", "Hvem har betalt mest for E7 i 2025?", "Vis kostnadsoppgjør for 2025", "Hva har vi brukt på vedlikehold i år?"

Eierhistorikk:
- Eierandelene har endret seg over tid basert på investeringsbidrag og avtaler.
- 7. mars 2025: To justeringer. Først byggekostnadsjustering (David overbidro, Sebastian og Levi underbidro). Deretter konvertering av midler (Sebastian overførte 4,55% til David).
- Historikken finnes i eier_historikk og eier_historikk_detaljer tabellene.
- Verdisimulatoren beregner eierverdi basert på boligens totalverdi × eierandel.
- Typiske spørsmål: "Hva var Davids eierandel i 2024?", "Vis eierhistorikk", "Hva er min andel verdt hvis boligen er verdt 15 mill?", "Hvem har økt sin andel mest?"

Betalingsoppfølging og kalender:
- Leieinntekter-siden viser forventet vs faktisk betalt per leietaker per måned.
- Forventet beregnes fra leieforhold. Faktisk fra transaksjoner.
- Utestående = forventet minus betalt der betalt < forventet.
- Boligkalenderen har vedlikeholdspåminnelser og automatiske datoer fra leieforhold.

Fakturering og betalingsoppfølging:
- Fakturaer genereres automatisk for husleie basert på aktive leieforhold.
- Hver faktura har fakturanummer (F2026-001), leietaker, måned, beløp, forfall og status.
- Betalinger fra banken kobles til fakturaer. Ubetalte fakturaer markeres som forfalt.
- Smart månedsforslag: basert på betalingsdato og leietakers forfall_dag.
- Justeringer logges med kommentar.
- Data finnes i fakturaer, faktura_betalinger, faktura_mottakere og faktura_justeringer tabellene.
- Typiske spørsmål: "Hvem har ikke betalt for mars?", "Vis alle forfalte fakturaer", "Generer faktura for april", "Hva er utestående totalt?", "Vis betalingshistorikk for Camilla"

${txSummary}${abSummary}${eiereSummary}${mvSummary}${mvBevSummary}${enheterSummary}${leietakereSummary}${leieforholdSummary}${fakturaSummary}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse(500, "LOVABLE_API_KEY ikke konfigurert");

    const aiStartTime = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 4096,
      }),
    });

    const aiDurationMs = Date.now() - aiStartTime;
    log("info", "AI-respons mottatt", { requestId, status: aiResponse.status, durationMs: aiDurationMs });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) return errorResponse(429, "For mange forespørsler.");
      if (aiResponse.status === 402) return errorResponse(402, "Kreditter brukt opp.");
      return errorResponse(500, "AI-gateway feil", `Status ${aiResponse.status}: ${errText.slice(0, 200)}`);
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      log("warn", "Tom AI-respons", { requestId, choices: JSON.stringify(result.choices).slice(0, 200) });
      return new Response(JSON.stringify({ content: "Beklager, fikk ingen respons fra AI. Prøv igjen." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("info", "Chat fullført", { requestId, responsLengde: content.length, totalMs: Date.now() - startTime });

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return errorResponse(500, e.message || "Ukjent feil", e.stack?.slice(0, 300));
  }
});
