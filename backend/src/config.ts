import fs from 'node:fs/promises';
import path from 'node:path';

import type { BotConfig } from './types.js';

const DEFAULT_SETTINGS: BotConfig = {
  codeRabbit: true,
  devin: true,
  claude: true,
  openAI: true,
  cursor: true,
};

const SETTINGS_PATH = path.resolve(process.cwd(), 'data', 'switchboard-settings.json');

export async function readSettings(): Promise<BotConfig> {
  try {
    const file = await fs.readFile(SETTINGS_PATH, 'utf-8');
    const parsed = JSON.parse(file) as Partial<BotConfig>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return DEFAULT_SETTINGS;
  }
}

export async function writeSettings(patch: Partial<BotConfig>): Promise<BotConfig> {
  const current = await readSettings();
  const next = { ...current, ...patch };

  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2));

  return next;
}

export function getActiveBots(settings: BotConfig): string[] {
  return Object.entries(settings)
    .filter(([, isEnabled]) => isEnabled)
    .map(([botName]) => botName);
}
