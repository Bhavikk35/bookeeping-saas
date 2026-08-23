import { NextResponse } from 'next/server';

function getBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
}

export async function POST(request: Request) {
  try {
    const { webhookUrl } = await request.json();
    const token = getBotToken();

    if (!token) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN environment variable is missing in Netlify settings.' },
        { status: 400 }
      );
    }

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
  const token = getBotToken();
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is missing.' }, { status: 400 });
  }

  const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await telegramRes.json();
  return NextResponse.json(data);
}
