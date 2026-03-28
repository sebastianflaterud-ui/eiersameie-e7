import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { transaksjoner } = await req.json();
    if (!transaksjoner || !Array.isArray(transaksjoner) || transaksjoner.length === 0) {
      return new Response(JSON.stringify({ error: "Ingen transaksjoner å klassifisere" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing rules and leietakere for context
    const [{ data: regler }, { data: leietakere }, { data: enheter }] = await Promise.all([
      supabase.from("klassifiseringsregler").select("monster, motpart, kategori, underkategori, inntektstype, utgiftstype").eq("user_id", user.id).eq("aktiv", true),
      supabase.from("leietakere").select("navn, naavaerende, forfall_dag").eq("user_id", user.id),
      supabase.from("enheter").select("navn, type, boenhet, status").eq("user_id", user.id),
    ]);

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
${(leietakere || []).map(l => `- ${l.navn} (${l.naavaerende ? 'nåværende' : 'tidligere'}, forfall dag ${l.forfall_dag})`).join("\n")}

ENHETER:
${(enheter || []).map(e => `- ${e.navn} (${e.type}, ${e.boenhet}, ${e.status})`).join("\n")}

EKSISTERENDE REGLER (for å forstå mønstre):
${(regler || []).slice(0, 30).map(r => `"${r.monster}" → ${r.kategori}/${r.underkategori || ''} motpart: ${r.motpart || ''}`).join("\n")}

VIKTIG:
- Innbetalinger som matcher leietakernavn = "Eiersameie E7" + underkategori "Leieinntekt" + sett leie_for til leietakernavn
- Fuzzy-match på navn: "CAMILLA DE BRUYN W" = "Camilla de Bruyn Walle", "IDA KEMI" = "Ida Kemiläinen Pettersén"
- For leieinntekter: estimer leieperiode fra betalingsdato (f.eks. betaling 23.03.26 med forfall 23 → "2026-03")
- Sett motpart_egen til normalisert fullt navn fra leietakerlisten
- For utgifter: gjett leverandør og utgiftstype basert på beskrivelse

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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
                      inntektstype: { type: "string" },
                      utgiftstype: { type: "string" },
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

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "For mange forespørsler. Prøv igjen om litt." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "AI-kreditter brukt opp." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI-feil" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await aiResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Ingen klassifisering returnert" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ results: parsed.results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Ukjent feil" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
