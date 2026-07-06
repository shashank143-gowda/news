// Real Lovable AI call: grammar correction + headline + summary + category + priority.
// deno-lint-ignore-file
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an expert Kannada newspaper editor. You receive raw Kannada article text
(possibly noisy from OCR). Return a strict JSON object with:
- corrected_text (string): grammar/spell corrected Kannada version of the article.
- headline (string): a punchy Kannada headline, <= 12 words.
- summary (string): 1-2 sentence Kannada summary.
- category (string): exactly one of: Politics, Sports, Crime, Agriculture, Education, Cinema, Business, Other.
- priority_score (integer 0-100): 95 for breaking/national, 80 state-level, 50 district-level, 30 local/soft.
Respond ONLY with JSON, no prose.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text } = await req.json();
    if (!text) throw new Error("text required");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (resp.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: corsHeaders });
    if (!resp.ok) {
      const body = await resp.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: body }), { status: 500, headers: corsHeaders });
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { error: "parse_failed", raw: content }; }

    // clamp priority score
    if (typeof parsed.priority_score === "number") {
      parsed.priority_score = Math.max(0, Math.min(100, Math.round(parsed.priority_score)));
    } else {
      parsed.priority_score = 50;
    }
    const validCats = ["Politics","Sports","Crime","Agriculture","Education","Cinema","Business","Other"];
    if (!validCats.includes(parsed.category)) parsed.category = "Other";

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
