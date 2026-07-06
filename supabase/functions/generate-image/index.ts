// Real Lovable AI image generation (Gemini nano-banana). Returns a data URL.
// deno-lint-ignore-file
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { prompt } = await req.json();
    if (!prompt) throw new Error("prompt required");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: `Photorealistic Indian newspaper editorial photograph: ${prompt}. Documentary photojournalism style, natural lighting, no text overlays.` }],
        modalities: ["image", "text"],
      }),
    });
    if (resp.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: corsHeaders });
    if (!resp.ok) {
      const body = await resp.text();
      return new Response(JSON.stringify({ error: "image_failed", detail: body }), { status: 500, headers: corsHeaders });
    }
    const data = await resp.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return new Response(JSON.stringify({ error: "no_image" }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ image_url: `data:image/png;base64,${b64}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
