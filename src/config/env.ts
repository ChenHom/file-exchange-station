import { config as loadEnv } from 'dotenv';

loadEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  APP_BASE_URL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  DB_HOST: required('DB_HOST'),
  DB_PORT: Number(required('DB_PORT')),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: required('DB_PASSWORD'),
  DB_NAME: required('DB_NAME'),
  STORAGE_ROOT: process.env.STORAGE_ROOT ?? './storage/uploads',
  DEFAULT_TTL_MINUTES: Number(process.env.DEFAULT_TTL_MINUTES ?? 1440),
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB ?? 100),
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ?? '',
  NGROK_AUTHTOKEN: process.env.NGROK_AUTHTOKEN ?? ''
} as const;
