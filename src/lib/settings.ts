import { prisma } from './prisma';

const AI_API_KEY_KEY = 'aiApiKey';
const AI_PROVIDER_KEY = 'aiProvider';

type SettingRecord = { key: string; value: string };
type SettingClient = {
  findUnique: (args: { where: { key: string } }) => Promise<SettingRecord | null>;
  delete: (args: { where: { key: string } }) => Promise<SettingRecord>;
  upsert: (args: {
    where: { key: string };
    update: { value: string };
    create: { key: string; value: string };
  }) => Promise<SettingRecord>;
};

const settingClient = (prisma as unknown as { setting: SettingClient }).setting;

export async function getAiApiKey(): Promise<string | null> {
  const setting = await settingClient.findUnique({ where: { key: AI_API_KEY_KEY } });
  return setting?.value ?? null;
}

export async function setAiApiKey(value: string | null): Promise<void> {
  if (value === null || value.trim() === '') {
    await settingClient.delete({ where: { key: AI_API_KEY_KEY } }).catch(() => undefined);
    return;
  }

  await settingClient.upsert({
    where: { key: AI_API_KEY_KEY },
    update: { value: value.trim() },
    create: { key: AI_API_KEY_KEY, value: value.trim() },
  });
}

export async function getAiProvider(): Promise<'openai' | 'gemini' | 'auto'> {
  const setting = await settingClient.findUnique({ where: { key: AI_PROVIDER_KEY } });
  if (!setting?.value) return 'auto';
  if (setting.value === 'openai' || setting.value === 'gemini') return setting.value;
  return 'auto';
}

export async function setAiProvider(provider: 'openai' | 'gemini' | 'auto'): Promise<void> {
  if (!provider || provider === 'auto') {
    await settingClient.delete({ where: { key: AI_PROVIDER_KEY } }).catch(() => undefined);
    return;
  }

  await settingClient.upsert({
    where: { key: AI_PROVIDER_KEY },
    update: { value: provider },
    create: { key: AI_PROVIDER_KEY, value: provider },
  });
}
