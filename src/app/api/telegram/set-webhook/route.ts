import { NextResponse } from 'next/server';

const REAL_BOT_TOKEN = '8939497312:AAHCyuAhHstCoVqWtOBJtE843Wo9WYo2f3Y';

function getValidBotToken(): string {
  const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  if (envToken && envToken.includes(':') && !envToken.includes('demo') && envToken.length > 30) {
    return envToken;
  }
  return REAL_BOT_TOKEN;
}

export async function POST(request: Request) {
  try {
    const { webhookUrl } = await request.json();
    const token = getValidBotToken();

    let targetUrl = (webhookUrl || 'https://bookeeping-saas.netlify.app').trim();
    if (!targetUrl.endsWith('/api/telegram/webhook')) {
      targetUrl = targetUrl.replace(/\/$/, '') + '/api/telegram/webhook';
    }

    // Call Telegram setWebhook API
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(targetUrl)}`);
    const data = await telegramRes.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.description || 'Failed to set webhook' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result: data,
      targetUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const token = getValidBotToken();
  const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await telegramRes.json();
  return NextResponse.json(data);
}
