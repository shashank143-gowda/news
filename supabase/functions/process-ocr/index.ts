// Simulated Kannada OCR. Structured to swap in Google Vision / Tesseract.
// deno-lint-ignore-file
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOCK_KANNADA = [
  "ಬೆಂಗಳೂರು: ರಾಜ್ಯದಲ್ಲಿ ಇಂದು ಭಾರೀ ಮಳೆ ಸುರಿಯುತ್ತಿದ್ದು, ಹಲವು ಜಿಲ್ಲೆಗಳಲ್ಲಿ ಪ್ರವಾಹ ಪರಿಸ್ಥಿತಿ ಉಂಟಾಗಿದೆ. ಸರ್ಕಾರ ತುರ್ತು ಪರಿಹಾರ ಕಾರ್ಯ ಪ್ರಾರಂಭಿಸಿದೆ.",
  "ಮೈಸೂರು: ಕೃಷಿ ಇಲಾಖೆ ರೈತರಿಗೆ ಹೊಸ ಸಬ್ಸಿಡಿ ಯೋಜನೆ ಘೋಷಿಸಿದೆ. ಈ ಯೋಜನೆಯಡಿ ಬೀಜ ಮತ್ತು ರಸಗೊಬ್ಬರಕ್ಕೆ ಶೇ.50 ರಿಯಾಯಿತಿ ದೊರೆಯಲಿದೆ.",
  "ಹಾಸನ: ಜಿಲ್ಲಾ ಕ್ರೀಡಾ ಸಮಾವೇಶದಲ್ಲಿ ಸ್ಥಳೀಯ ತಂಡ ಚಿನ್ನದ ಪದಕ ಗೆದ್ದಿದೆ. ವಿಜೇತರಿಗೆ ಜಿಲ್ಲಾಧಿಕಾರಿ ಅಭಿನಂದನೆ ಸಲ್ಲಿಸಿದ್ದಾರೆ.",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { fileUrl, inputType } = await req.json();
    // TODO: Plug real OCR provider here (Google Vision / Tesseract) using fileUrl.
    // For now return a randomized mock Kannada text so the pipeline is demonstrable end-to-end.
    const text = MOCK_KANNADA[Math.floor(Math.random() * MOCK_KANNADA.length)];
    return new Response(
      JSON.stringify({ ocr_text: text, simulated: true, source_type: inputType ?? "image", source: fileUrl ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
