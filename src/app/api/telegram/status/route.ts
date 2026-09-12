import { NextResponse } from 'next/server';
import { getTelegramConnectionForBusiness } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || 'biz_tenant_demo';

    const connection = await getTelegramConnectionForBusiness(businessId);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'MySaaSBookkeeper_bot';

    return NextResponse.json({
      success: true,
      connected: !!connection,
      connection: connection || null,
      botUsername,
      botUrl: `https://t.me/${botUsername}`,
    });
  } catch (err: any) {
    console.error('Error fetching Telegram status:', err);
    return NextResponse.json({ success: false, connected: false, error: err.message }, { status: 500 });
  }
}
