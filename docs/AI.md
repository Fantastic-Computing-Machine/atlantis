# AI Assistant Guide

Enable AI assistance to generate and edit Mermaid diagrams using natural language.

## Configuration

1. **API Key**:
   - **Environment Variable (Recommended)**: Set `AI_API_KEY=sk-...` in your `.env` or Docker config. This key will be read-only in the UI.
   - **UI Setup**: Go to **Settings > AI**, paste your key, and click Save. Keys are stored locally in the database.

2. **Providers**:
   - **OpenAI**: Default. Supports `gpt-4o-mini`.
   - **Gemini**: Supports `gemini-2.5-flash`.
   - **Auto-detect**: Determines provider based on key prefix (`sk-...` vs `AIza...`/`gsk_...`).

## Usage

 Open the **AI helper** panel in the editor and enter a prompt.

- **Create**: "Sequence diagram for user login flow"
- **Create**: "Sequence diagram for user login flow"
- **Edit**: "Add an error state after validation"

## Notes Assistant

Open the **AI helper** panel (sparkles icon) in the Notes editor.

- **Quick Actions**: Proof, Summarize, Cleanup, Shorten, Lengthen.
- **Custom Prompt**: "Translate to Spanish", "Make it more professional".

### Tips

- Specify diagram type if ambiguous: "Flowchart for..."
- Keep prompts simple and iterative.
- Do not paste sensitive data/secrets into prompts.

## Troubleshooting

- **AI Key Not Configured**: Set `AI_API_KEY` or configure in Settings.
- **Request Failed**: specific provider error or network issue.
- **Mermaid Validation Failed**: AI generated invalid syntax. Try a simpler prompt.

### API Endpoints

- **Diagrams**: `POST /api/ai/assist`
  - Payload: `{ "prompt": "...", "diagramId": "...", "content": "..." }`

- **Notes**: `POST /api/ai/notes`
  - Payload: `{ "prompt": "...", "content": "..." }`
