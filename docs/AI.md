# AI Assistant Guide

Enable AI assistance to generate and edit Mermaid diagrams using natural language.

Server endpoint: `POST /api/ai/assist` (requires valid CSRF token). UI handles CSRF automatically.

## Configuration

1. **API Key**:
   - **Environment Variable (Recommended)**: Set `AI_API_KEY=sk-...` in `.env` or Docker env. When set, the key is read-only in the UI.
   - **UI Setup**: Go to **Settings → AI**, paste your key, and click Save. Keys are stored locally in the database.

2. **Providers**:
   - **OpenAI**: Default. Model: `gpt-4o-mini`.
   - **Gemini**: Model: `gemini-2.5-flash` (override with `GEMINI_MODEL`).
   - **Auto-detect**: Chooses provider from key prefix (`sk-...` vs `AIza...`/`gsk_...`).

## Usage

Open the **AI helper** panel in the editor and enter a prompt.

- **Create**: "Sequence diagram for user login flow"
- **Edit**: "Add an error state after validation"

### Tips

- Specify diagram type if ambiguous: "Flowchart for..."
- Keep prompts simple and iterative.
- Do not paste sensitive data/secrets into prompts.

## Troubleshooting

- **AI Key Not Configured**: Set `AI_API_KEY` or configure in Settings.
- **Request Failed**: provider error, network issue, or missing CSRF token (ensure browser loads the app to set the CSRF cookie).
- **Mermaid Validation Failed**: AI generated invalid syntax. Try a simpler prompt.

### API Endpoint

`POST /api/ai/assist`

- Headers: `x-csrf-token` from app cookie (handled automatically by UI)
- Payload: `{ "prompt": "...", "diagramId": "...", "content": "..." }`

---

## Related Documentation

- [Settings](settings.md) - AI API key configuration
- [API Guide](API_GUIDE.md) - REST API documentation
- [Container Startup](CONTAINER_STARTUP.md) - Docker deployment guide
