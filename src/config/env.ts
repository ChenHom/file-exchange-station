import { config as loadEnv } from 'dotenv';

loadEnv();

const requiredKeys = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;

for (const key of requiredKeys) {
  if (process.env[key] === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  APP_BASE_URL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  DB_HOST: process.env.DB_HOST!,
  DB_PORT: Number(process.env.DB_PORT!),
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_NAME: process.env.DB_NAME!,
  STORAGE_ROOT: process.env.STORAGE_ROOT ?? './storage/uploads',
  DEFAULT_TTL_MINUTES: Number(process.env.DEFAULT_TTL_MINUTES ?? 1440),
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB ?? 100),
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ?? '',
  NGROK_AUTHTOKEN: process.env.NGROK_AUTHTOKEN ?? ''
};
