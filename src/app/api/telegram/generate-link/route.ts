import { NextResponse } from 'next/server';
import { createTelegramToken } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required.' }, { status: 400 });
    }

    const tokenRecord = await createTelegramToken(businessId);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'UniversalBookkeeperBot';
    const deepLink = `https://t.me/${botUsername}?start=${tokenRecord.token}`;

    return NextResponse.json({
      success: true,
      token: tokenRecord.token,
      deepLink,
      expiresAt: tokenRecord.expires_at,
    });
  } catch (err: any) {
    console.error('Error generating Telegram link:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate Telegram connection link.' }, { status: 500 });
  }
}
