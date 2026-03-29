import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function log(level: string, msg: string, data?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), fn: "ai-klassifiser", level, msg, ...data };
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
  log("info", "Forespørsel mottatt", { requestId });

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

    const { transaksjoner } = body as { transaksjoner?: unknown };
    if (!transaksjoner || !Array.isArray(transaksjoner) || transaksjoner.length === 0) {
      return errorResponse(400, "Ingen transaksjoner å klassifisere");
    }
    if (transaksjoner.length > 100) {
      return errorResponse(400, "Maks 100 transaksjoner per forespørsel", `Mottok ${transaksjoner.length}`);
    }

    log("info", "Klassifiserer transaksjoner", { requestId, antall: transaksjoner.length });

    // Fetch context data
    const [reglerRes, leietakereRes, enheterRes] = await Promise.all([
      supabase.from("klassifiseringsregler").select("monster, motpart, kategori, underkategori, inntektstype, utgiftstype").eq("user_id", user.id).eq("aktiv", true),
      supabase.from("leietakere").select("navn, naavaerende, forfall_dag").eq("user_id", user.id),
      supabase.from("enheter").select("navn, type, boenhet, status").eq("user_id", user.id),
    ]);

    if (reglerRes.error) log("warn", "Kunne ikke hente regler", { error: reglerRes.error.message });
    if (leietakereRes.error) log("warn", "Kunne ikke hente leietakere", { error: leietakereRes.error.message });
    if (enheterRes.error) log("warn", "Kunne ikke hente enheter", { error: enheterRes.error.message });

    const regler = reglerRes.data || [];
    const leietakere = leietakereRes.data || [];
    const enheter = enheterRes.data || [];

    const txList = transaksjoner.map((t: any, i: number) =>
      `${i + 1}. [${t.retning}] ${t.dato} | ${t.belop} kr | "${t.beskrivelse_bank}" | motpart_bank: "${t.motpart_bank || ''}" | konto: "${t.konto || ''}"`
    ).join("\n");

    const systemPrompt = `Du er en norsk klassifiseringsassistent for en utleier av bolig (Enerhøgdveien 7A, Nesodden).

KATEGORIER (velg én):
- "Privat" — personlige utgifter/inntekter
- "Eiersameie E7" — alt som gjelder eiendommen (vedlikehold, strøm, kommunale, leieinntekter)
- "Motivus AS" — selskapstransaksjoner (lønn, utbytte)
- "Uklassifisert" — kun hvis du virkelig ikke kan gjette

UNDERKATEGORIER for Eiersameie E7:
- "Drift og vedlikehold" — løpende kostnader (strøm, forsikring, kommunale avgifter, vedlikehold)
- "Påkost" — oppgraderinger som øker verdi
- "Leieinntekt" — for innbetalinger fra leietakere (underkategori, ikke inntektstype)

UNDERKATEGORIER for Privat:
- "Mat", "Transport", "Abonnement", "Forsikring", "Trygd/Pensjon", "Overføring", "Inkasso", "Lønn", etc.

KJENTE LEIETAKERE:
${leietakere.map(l => `- ${l.navn} (${l.naavaerende ? 'nåværende' : 'tidligere'}, forfall dag ${l.forfall_dag})`).join("\n")}

ENHETER:
${enheter.map(e => `- ${e.navn} (${e.type}, ${e.boenhet}, ${e.status})`).join("\n")}

EKSISTERENDE REGLER (for å forstå mønstre):
${regler.slice(0, 30).map(r => `"${r.monster}" → ${r.kategori}/${r.underkategori || ''} motpart: ${r.motpart || ''}`).join("\n")}

VIKTIG:
- Innbetalinger som matcher leietakernavn = "Eiersameie E7" + underkategori "Leieinntekt" + sett leie_for til leietakernavn
- Fuzzy-match på navn: "CAMILLA DE BRUYN W" = "Camilla de Bruyn Walle", "IDA KEMI" = "Ida Kemiläinen Pettersén"
- For leieinntekter: estimer leieperiode fra betalingsdato (f.eks. betaling 23.03.26 med forfall 23 → "2026-03")
- Sett motpart_egen til normalisert fullt navn fra leietakerlisten
- For utgifter: gjett leverandør og utgiftstype basert på beskrivelse

MOTPARTSNORMALISERING — Sett ALLTID motpart_egen til et normalisert, lesbart navn:
- Bankbeskrivelser forkorter navn. Bruk leietakerlisten for fuzzy-match.
- For bedrifter: bruk vanlig skrivemåte. "REMA 1000 TANUM" → "Rema 1000". "CIRCLE K NESODDTAN" → "Circle K". "APPLE.COM/BILL" → "Apple".
- For privatpersoner som ikke er leietakere: gjett fullt navn fra motpart_bank. "PERS HANSEN" → "Pers Hansen".
- Fjern stedsnavn, filial-koder og store bokstaver. Gjør det pent og lesbart.

BESKRIVELSE_EGEN — Tolk bankbeskrivelsen til en lesbar, kort norsk beskrivelse:
- "AVIS CAR RENTAL" → "Leiebil"
- "SAS SCANDINAVIAN" → "Flybillett"
- "REMA 1000 TANUM" → "Dagligvarer"
- "CIRCLE K NESODDTAN" → "Drivstoff"
- "GOOGLE *CLOUD" → "Skytjeneste"
- "VIPPS *FINN.NO" → "Finn.no-kjøp"
- "PLANTASJEN VINTER" → "Hage/planter"
- "JULA NORGE AS" → "Byggevarer"
- Bruk kort, naturlig norsk. Ikke gjenta firmanavn — beskriv hva det er.

KOSTNADSBESKRIVELSE — For E7-utgifter, beskriv hva kostnaden gjelder (f.eks. "Strøm mars", "Kommunale avgifter Q1", "Terrassebord og skruer").

Svar med JSON-array. Hvert element:
{
  "index": <1-basert>,
  "kategori": "...",
  "underkategori": "..." eller null,
  "motpart_egen": "..." eller null,
  "beskrivelse_egen": "..." eller null,
  "inntektstype": "..." eller null,
  "utgiftstype": "..." eller null,
  "kostnadstype": "..." eller null,
  "kostnadsbeskrivelse": "..." eller null,
  "leverandor": "..." eller null,
  "leie_for": "..." eller null,
  "leieperiode": "YYYY-MM" eller null,
  "enhet": "..." eller null,
  "confidence": "høy" | "middels" | "lav"
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse(500, "LOVABLE_API_KEY ikke konfigurert");

    const aiStartTime = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Klassifiser disse ${transaksjoner.length} transaksjonene:\n\n${txList}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_transactions",
            description: "Return classification results for transactions",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number" },
                      kategori: { type: "string" },
                      underkategori: { type: "string" },
                      motpart_egen: { type: "string" },
                      beskrivelse_egen: { type: "string", description: "Kort norsk beskrivelse av hva transaksjonen er" },
                      inntektstype: { type: "string" },
                      utgiftstype: { type: "string" },
                      kostnadstype: { type: "string" },
                      kostnadsbeskrivelse: { type: "string", description: "For E7-kostnader, hva det gjelder" },
                      leverandor: { type: "string" },
                      leie_for: { type: "string" },
                      leieperiode: { type: "string" },
                      enhet: { type: "string" },
                      confidence: { type: "string", enum: ["høy", "middels", "lav"] },
                    },
                    required: ["index", "kategori", "confidence"],
                  },
                },
              },
              required: ["results"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_transactions" } },
      }),
    });

    const aiDurationMs = Date.now() - aiStartTime;
    log("info", "AI-respons mottatt", { requestId, status: aiResponse.status, durationMs: aiDurationMs });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) return errorResponse(429, "For mange forespørsler. Prøv igjen om litt.");
      if (aiResponse.status === 402) return errorResponse(402, "AI-kreditter brukt opp.");
      return errorResponse(500, "AI-gateway feil", `Status ${aiResponse.status}: ${errText.slice(0, 200)}`);
    }

    const result = await aiResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      log("error", "AI returnerte ingen tool_call", { requestId, choices: JSON.stringify(result.choices).slice(0, 200) });
      return errorResponse(500, "Ingen klassifisering returnert fra AI");
    }

    let parsed: { results: unknown[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      log("error", "Kunne ikke parse AI-respons", { requestId, raw: toolCall.function.arguments.slice(0, 200) });
      return errorResponse(500, "Ugyldig respons fra AI");
    }

    if (!parsed.results || !Array.isArray(parsed.results)) {
      return errorResponse(500, "AI returnerte ugyldig format");
    }

    log("info", "Klassifisering fullført", {
      requestId,
      antallInput: transaksjoner.length,
      antallOutput: parsed.results.length,
      durationMs: aiDurationMs,
    });

    return new Response(JSON.stringify({ results: parsed.results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return errorResponse(500, e.message || "Ukjent feil", e.stack?.slice(0, 300));
  }
});
