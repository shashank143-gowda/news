// Simulated Kannada TTS. Returns a placeholder audio URL.
// Swap-in point: real Kannada TTS provider (Google Cloud TTS kn-IN, Bhashini, etc.).
// deno-lint-ignore-file
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text } = await req.json();
    return new Response(JSON.stringify({
      audio_url: "https://actions.google.com/sounds/v1/ambiences/newspaper_being_folded.ogg",
      simulated: true,
      text_length: (text ?? "").length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
