import type { IncomingMessage, ServerResponse } from 'node:http';
import { readRequestBody, sendJson } from './http.js';
import { verifyLineSignature, parseLineEvents, replyMessage } from '../modules/line/line-service.js';
import { createSession, listActiveSessions } from '../modules/sessions/session-service.js';
import { env } from '../config/env.js';
import { recordEvent } from '../modules/events/event-service.js';

export async function lineWebhookHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const signature = req.headers['x-line-signature'] as string;
  if (!signature) {
    sendJson(res, 401, { error: 'Missing signature' });
    return;
  }

  const body = await readRequestBody(req);
  if (!verifyLineSignature(body, signature)) {
    sendJson(res, 401, { error: 'Invalid signature' });
    return;
  }

  const events = parseLineEvents(body);
  for (const event of events) {
    try {
      if (event.type === 'message' && event.message?.type === 'text' && event.replyToken) {
        const text = event.message.text.trim();
        await handleCommand(text, event.replyToken, event.source.userId);
      }
    } catch (error) {
      console.error('Error handling LINE event:', error);
    }
  }

  sendJson(res, 200, { ok: true });
}

async function handleCommand(text: string, replyToken: string, userId?: string): Promise<void> {
  const [cmd, ...args] = text.split(/\s+/);
  const command = cmd?.toLowerCase();

  if (command === '!new') {
    const title = args.join(' ') || '未命名交換站';
    const session = await createSession(title);
    const link = `${env.APP_BASE_URL}?code=${session.code}`;
    
    await recordEvent(session.id, null, 'line_command_create', { userId, text });
    
    await replyMessage(replyToken, [
      {
        type: 'text',
        text: `✅ 已建立交換站：${title}\n連結：${link}\n代碼：${session.code}\n將於 ${new Date(session.expiresAt).toLocaleString()} 到期。`
      }
    ]);
    return;
  }

  if (command === '!list') {
    const sessions = await listActiveSessions();
    if (sessions.length === 0) {
      await replyMessage(replyToken, [{ type: 'text', text: '目前沒有活動中的交換站。' }]);
      return;
    }

    const listText = sessions
      .slice(0, 5)
      .map((s) => `- ${s.title} (${s.code})\n  ${env.APP_BASE_URL}?code=${s.code}`)
      .join('\n\n');

    await replyMessage(replyToken, [
      {
        type: 'text',
        text: `📂 活動中的交換站 (前 5 筆)：\n\n${listText}`
      }
    ]);
    return;
  }

  if (command === '!help' || text.startsWith('!')) {
    await replyMessage(replyToken, [
      {
        type: 'text',
        text: '🤖 File Exchange Station 指令：\n\n!new [標題] - 建立新的交換站\n!list - 列出所有活動中的交換站\n!help - 顯示此說明'
      }
    ]);
  }
}
