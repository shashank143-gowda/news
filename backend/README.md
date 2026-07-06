# Python Backend

This replaces the Supabase edge-function API surface for local development.

Run it with:

```powershell
npm run backend
```

The frontend calls `VITE_BACKEND_URL/functions/v1/<function-name>`. By default,
`.env` points that URL at `http://127.0.0.1:8000`.

Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY="sk-your-key-here"
OPENAI_MODEL_PRIMARY="gpt-5"
OPENAI_IMAGE_MODEL="gpt-image-1"
OPENAI_IMAGE_SIZE="1024x1024"
OPENAI_IMAGE_QUALITY="high"
OPENAI_IMAGE_FORMAT="jpeg"
```

If `OPENAI_API_KEY` is present, image generation uses OpenAI. Without an OpenAI
image key, the backend returns local development fallbacks so the pipeline still
runs.

OCR uploads also use `OPENAI_API_KEY` with `OPENAI_MODEL_PRIMARY`. The OCR
endpoint sends the uploaded image URL to OpenAI with an exact text-extraction
prompt and does not return simulated article text.
