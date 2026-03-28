import { execute, queryOne } from '../../db/query.js';

export async function getNgrokUrlFromLocal(): Promise<string | null> {
  try {
    const response = await fetch('http://127.0.0.1:4040/api/tunnels');
    const data = await response.json();
    const tunnel = data.tunnels.find((t: any) => t.proto === 'https');
    return tunnel ? tunnel.public_url : null;
  } catch {
    return null;
  }
}

export async function updateSystemConfig(key: string, value: string): Promise<void> {
  await execute(
    'INSERT INTO system_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?, updated_at = CURRENT_TIMESTAMP(3)',
    [key, value, value]
  );
}

export async function getSystemConfig(key: string): Promise<string | null> {
  const row = await queryOne<{ config_value: string }>('SELECT config_value FROM system_config WHERE config_key = ?', [key]);
  return row ? row.config_value : null;
}
