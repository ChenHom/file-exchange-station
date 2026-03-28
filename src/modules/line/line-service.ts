import { createHmac } from 'node:crypto';
import { env } from '../../config/env.js';

export function verifyLineSignature(body: string, signature: string): boolean {
  const hmac = createHmac('sha256', env.LINE_CHANNEL_SECRET);
  const hash = hmac.update(body).digest('base64');
  return hash === signature;
}

export type LineEvent = {
  type: string;
  replyToken?: string;
  source: {
    userId?: string;
    type: string;
  };
  message?: {
    type: string;
    text: string;
  };
};

export function parseLineEvents(body: string): LineEvent[] {
  try {
    const data = JSON.parse(body);
    return (data.events || []) as LineEvent[];
  } catch {
    return [];
  }
}

export async function replyMessage(replyToken: string, messages: any[]): Promise<void> {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      replyToken,
      messages
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('LINE reply error:', errorBody);
    throw new Error('Failed to reply to LINE message');
  }
}
