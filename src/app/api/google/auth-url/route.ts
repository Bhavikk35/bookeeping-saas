import { NextResponse } from 'next/server';
import { generateGoogleAuthUrl } from '@/lib/google/sheets-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');

  if (!businessId) {
    return NextResponse.json({ error: 'businessId parameter is required.' }, { status: 400 });
  }

  const url = generateGoogleAuthUrl(businessId);
  return NextResponse.json({ url });
}
