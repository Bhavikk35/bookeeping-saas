import { NextResponse } from 'next/server';
import { getGoogleOAuthClient, createBusinessSpreadsheet } from '@/lib/google/sheets-service';
import { saveGoogleConnection, getBusiness } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const businessId = searchParams.get('state');

  if (!businessId) {
    return NextResponse.json({ error: 'State / Business ID is missing.' }, { status: 400 });
  }

  // Handle Demo Mode / Manual simulation fallback if code is demo
  if (code === 'demo_code' || !code) {
    const business = await getBusiness(businessId);
    const bizName = business?.business_name || 'Business Workspace';
    const mockSheetId = `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`;
    const mockSheetUrl = `https://docs.google.com/spreadsheets/d/${mockSheetId}/edit`;

    await saveGoogleConnection(businessId, mockSheetId, mockSheetUrl, 'google_user_demo');
    return NextResponse.redirect(new URL(`/dashboard/integrations?status=google_success`, request.url));
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const business = await getBusiness(businessId);
    const bizName = business?.business_name || 'Business Workspace';

    const { spreadsheetId, spreadsheetUrl } = await createBusinessSpreadsheet(oauth2Client, bizName);

    await saveGoogleConnection(businessId, spreadsheetId, spreadsheetUrl, tokens.id_token || undefined, {
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
    });

    return NextResponse.redirect(new URL(`/dashboard/integrations?status=google_success`, request.url));
  } catch (err: any) {
    console.error('Google OAuth Callback Error:', err);
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?status=google_error&error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}
