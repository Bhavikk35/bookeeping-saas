import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('khata_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, authenticated: false });
    }

    const rawJson = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const parsed = JSON.parse(rawJson);

    if (parsed.user && parsed.business) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: parsed.user,
        business: parsed.business,
      });
    }

    return NextResponse.json({ success: false, authenticated: false });
  } catch (err: any) {
    return NextResponse.json({ success: false, authenticated: false });
  }
}
