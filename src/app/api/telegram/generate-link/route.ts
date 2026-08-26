import { NextResponse } from 'next/server';
import { createTelegramToken } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessId = body.businessId;
    const businessName = body.businessName;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required.' }, { status: 400 });
    }

    const tokenRecord = await createTelegramToken(businessId, businessName);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'MySaaSBookkeeper_bot';
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
