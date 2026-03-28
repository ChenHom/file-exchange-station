import { mkdir, stat, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../../config/env.js';

function resolveSafePath(name: string): string {
  return resolve(env.STORAGE_ROOT, name);
}

export async function ensureStorageRoot(): Promise<void> {
  await mkdir(env.STORAGE_ROOT, { recursive: true });
}

export async function writeBufferToStorage(fileName: string, data: Buffer): Promise<string> {
  await ensureStorageRoot();
  const fullPath = resolveSafePath(fileName);
  await mkdir(dirname(fullPath), { recursive: true });
  await import('node:fs/promises').then(({ writeFile }) => writeFile(fullPath, data));
  return fullPath;
}

export function openFileStream(fileName: string) {
  return createReadStream(resolveSafePath(fileName));
}

export async function deleteStoredFile(fileName: string): Promise<boolean> {
  try {
    await unlink(resolveSafePath(fileName));
    return true;
  } catch {
    return false;
  }
}

export async function existsStoredFile(fileName: string): Promise<boolean> {
  try {
    await stat(resolveSafePath(fileName));
    return true;
  } catch {
    return false;
  }
}
