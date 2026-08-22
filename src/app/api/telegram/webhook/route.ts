import { NextResponse } from 'next/server';
import { processTelegramWebhookUpdate } from '@/lib/telegram/bot-service';

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const result = await processTelegramWebhookUpdate(update);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Telegram Webhook error:', err);
    return NextResponse.json(
      { error: err.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    bot: process.env.TELEGRAM_BOT_USERNAME || 'UniversalBookkeeperBot',
    mode: 'Universal SaaS Telegram Bot',
  });
}
