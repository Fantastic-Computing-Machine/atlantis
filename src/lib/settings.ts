import { prisma } from './prisma';

const AI_API_KEY_KEY = 'aiApiKey';
const AI_PROVIDER_KEY = 'aiProvider';
const MAX_CHECKPOINTS_KEY = 'maxCheckpoints';
const AUTO_SAVE_DELAY_KEY = 'autoSaveDelay';
const DEFAULT_EXPORT_FORMAT_KEY = 'defaultExportFormat';
const EXPORT_SCALE_KEY = 'exportScale';

// Defaults
export const DEFAULT_MAX_CHECKPOINTS = 15;
export const DEFAULT_AUTO_SAVE_DELAY = 2000;
export const DEFAULT_EXPORT_FORMAT = 'svg' as const;
export const DEFAULT_EXPORT_SCALE = 2;

type SettingRecord = { key: string; value: string };
type SettingClient = {
  findUnique: (args: { where: { key: string } }) => Promise<SettingRecord | null>;
  findMany: () => Promise<SettingRecord[]>;
  delete: (args: { where: { key: string } }) => Promise<SettingRecord>;
  upsert: (args: {
    where: { key: string };
    update: { value: string };
    create: { key: string; value: string };
  }) => Promise<SettingRecord>;
};

const settingClient = (prisma as unknown as { setting: SettingClient }).setting;

export async function getAiApiKey(): Promise<string | null> {
  // Environment variable takes precedence
  const envKey = process.env.AI_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }
  // Fall back to database storage
  const setting = await settingClient.findUnique({ where: { key: AI_API_KEY_KEY } });
  return setting?.value ?? null;
}

export function isAiApiKeyFromEnv(): boolean {
  return Boolean(process.env.AI_API_KEY?.trim());
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

// Advanced Settings

export async function getMaxCheckpoints(): Promise<number> {
  const setting = await settingClient.findUnique({ where: { key: MAX_CHECKPOINTS_KEY } });
  if (!setting?.value) return DEFAULT_MAX_CHECKPOINTS;
  const num = parseInt(setting.value, 10);
  return isNaN(num) ? DEFAULT_MAX_CHECKPOINTS : Math.max(5, Math.min(50, num));
}

export async function setMaxCheckpoints(value: number): Promise<void> {
  const clamped = Math.max(5, Math.min(50, value));
  await settingClient.upsert({
    where: { key: MAX_CHECKPOINTS_KEY },
    update: { value: String(clamped) },
    create: { key: MAX_CHECKPOINTS_KEY, value: String(clamped) },
  });
}

export async function getAutoSaveDelay(): Promise<number> {
  const setting = await settingClient.findUnique({ where: { key: AUTO_SAVE_DELAY_KEY } });
  if (!setting?.value) return DEFAULT_AUTO_SAVE_DELAY;
  const num = parseInt(setting.value, 10);
  return isNaN(num) ? DEFAULT_AUTO_SAVE_DELAY : num;
}

export async function setAutoSaveDelay(value: number): Promise<void> {
  await settingClient.upsert({
    where: { key: AUTO_SAVE_DELAY_KEY },
    update: { value: String(value) },
    create: { key: AUTO_SAVE_DELAY_KEY, value: String(value) },
  });
}

export type ExportFormat = 'svg' | 'png' | 'pdf';

export async function getDefaultExportFormat(): Promise<ExportFormat> {
  const setting = await settingClient.findUnique({ where: { key: DEFAULT_EXPORT_FORMAT_KEY } });
  if (!setting?.value) return DEFAULT_EXPORT_FORMAT;
  if (setting.value === 'svg' || setting.value === 'png' || setting.value === 'pdf') {
    return setting.value;
  }
  return DEFAULT_EXPORT_FORMAT;
}

export async function setDefaultExportFormat(value: ExportFormat): Promise<void> {
  await settingClient.upsert({
    where: { key: DEFAULT_EXPORT_FORMAT_KEY },
    update: { value },
    create: { key: DEFAULT_EXPORT_FORMAT_KEY, value },
  });
}

export type ExportScale = 1 | 2 | 3;

export async function getExportScale(): Promise<ExportScale> {
  const setting = await settingClient.findUnique({ where: { key: EXPORT_SCALE_KEY } });
  if (!setting?.value) return DEFAULT_EXPORT_SCALE;
  const num = parseInt(setting.value, 10);
  if (num === 1 || num === 2 || num === 3) return num;
  return DEFAULT_EXPORT_SCALE;
}

export async function setExportScale(value: ExportScale): Promise<void> {
  await settingClient.upsert({
    where: { key: EXPORT_SCALE_KEY },
    update: { value: String(value) },
    create: { key: EXPORT_SCALE_KEY, value: String(value) },
  });
}

// Get all advanced settings at once
export async function getAdvancedSettings() {
  return {
    maxCheckpoints: await getMaxCheckpoints(),
    autoSaveDelay: await getAutoSaveDelay(),
    defaultExportFormat: await getDefaultExportFormat(),
    exportScale: await getExportScale(),
  };
}
