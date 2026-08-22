import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { webhookUrl } = await request.json();
    let envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
    const token = (!envToken || envToken.includes('demo') || !envToken.includes(':'))
      ? '8939497312:AAHCyuAhHstCoVqWtOBJtE843Wo9WYo2f3Y'
      : envToken;

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
  let envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  const token = (!envToken || envToken.includes('demo') || !envToken.includes(':'))
    ? '8939497312:AAHCyuAhHstCoVqWtOBJtE843Wo9WYo2f3Y'
    : envToken;

  const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await telegramRes.json();
  return NextResponse.json(data);
}
