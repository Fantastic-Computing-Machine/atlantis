# AI Assistant Guide

How to turn on and use Atlantis AI help for Mermaid diagrams.

## Quick Setup

- You need internet and an AI API key.
- Open the header menu (three dots) → `AI settings`.
- Paste your key: `sk-...` (OpenAI-style) or `AIza...` / `gsk_...` (Gemini).
- Pick a provider or leave `Auto` to detect from the key.
- Click `Save`. Status shows `Configured`. Use `Remove` to delete the key.

## Providers

- OpenAI-compatible (default): model `gpt-4o-mini`.
- Gemini (Google AI Studio): model `gemini-2.5-flash` (tries `-latest` if needed).
- Auto-detect by key prefix; override in settings if you want.

## Where the Key Lives

- Stored in your local database on the server; only sent to the chosen provider when you click `Ask AI`.
- Not shared elsewhere. Remove anytime in `AI settings`.

## Use the Assistant

- In the editor, open the AI panel (`AI helper`).
- Type a simple instruction, e.g., "Add error state after payment" or "Make this a sequence diagram with three actors".
- Click `Ask AI`. The reply replaces the diagram text.
- If the AI output is invalid Mermaid, the server tries twice to fix it before showing an error.

## Good Prompts

- Be direct: "Add retry from fail to start" > "Make better".
- Say the diagram type or direction if you want it changed (`flowchart LR`, `sequenceDiagram`).
- One request at a time works best.

## Common Errors (and fixes)

- `AI key not configured`: add a key in `AI settings`.
- `AI request failed`: bad key, quota, or network; check your key and provider status.
- `Mermaid validation failed`: output could not be fixed; try a shorter, clearer prompt and name the diagram type.

## Security Notes

- Do not paste secrets into prompts. Requests go to the AI provider you chose.
- Keys stay local until you make a request.

## Advanced (API)

- Endpoint: `POST /api/ai/assist`
- Body: `{ "prompt": string, "diagramId"?: string, "content": string }`
- Response: `{ "content": string }` on success. Requires stored key and CSRF (handled by the UI).

## Troubleshooting

- Verify the key matches the provider (prefix rules above).
- Make sure the server/container can reach the internet over HTTPS.
- For Gemini model errors, set `GEMINI_MODEL` or use a current key.
- If errors persist, simplify the prompt and specify the diagram type.

Keep this page updated when models, defaults, or UI labels change.
