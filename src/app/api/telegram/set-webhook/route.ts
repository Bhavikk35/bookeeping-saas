import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { webhookUrl } = await request.json();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || token.includes('demo')) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not configured.' }, { status: 400 });
    }

    if (!webhookUrl) {
      return NextResponse.json({ error: 'webhookUrl is required.' }, { status: 400 });
    }

    // Call Telegram setWebhook API
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await telegramRes.json();

    return NextResponse.json({
      success: data.ok,
      result: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('demo')) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not configured.' }, { status: 400 });
  }

  const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await telegramRes.json();
  return NextResponse.json(data);
}
