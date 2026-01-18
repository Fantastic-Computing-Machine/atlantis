import { prisma } from './prisma';

const AI_API_KEY_KEY = 'aiApiKey';
const AI_PROVIDER_KEY = 'aiProvider';

export async function getAiApiKey(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: AI_API_KEY_KEY } });
  return setting?.value ?? null;
}

export async function setAiApiKey(value: string | null): Promise<void> {
  if (value === null || value.trim() === '') {
    await prisma.setting.delete({ where: { key: AI_API_KEY_KEY } }).catch(() => undefined);
    return;
  }

  await prisma.setting.upsert({
    where: { key: AI_API_KEY_KEY },
    update: { value: value.trim() },
    create: { key: AI_API_KEY_KEY, value: value.trim() },
  });
}

export async function getAiProvider(): Promise<'openai' | 'gemini' | 'auto'> {
  const setting = await prisma.setting.findUnique({ where: { key: AI_PROVIDER_KEY } });
  if (!setting?.value) return 'auto';
  if (setting.value === 'openai' || setting.value === 'gemini') return setting.value;
  return 'auto';
}

export async function setAiProvider(provider: 'openai' | 'gemini' | 'auto'): Promise<void> {
  if (!provider || provider === 'auto') {
    await prisma.setting.delete({ where: { key: AI_PROVIDER_KEY } }).catch(() => undefined);
    return;
  }

  await prisma.setting.upsert({
    where: { key: AI_PROVIDER_KEY },
    update: { value: provider },
    create: { key: AI_PROVIDER_KEY, value: provider },
  });
}
