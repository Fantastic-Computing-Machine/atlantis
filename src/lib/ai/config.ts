export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
export const GEMINI_API_VERSION =
  process.env.GEMINI_API_VERSION || (GEMINI_MODEL.includes('-preview') ? 'v1beta' : 'v1');
