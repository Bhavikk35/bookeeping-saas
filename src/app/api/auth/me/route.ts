import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile, getUserBusinesses, createBusinessWorkspace } from '@/lib/db';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ success: false, authenticated: false });
    }

    const email = authUser.email || '';
    const meta = authUser.user_metadata || {};
    const name = meta.name || meta.full_name || email.split('@')[0];

    // Ensure a profile row exists for this real, authenticated user.
    const profile = await getOrCreateProfile(authUser.id, email, name);

    // Ensure the user has at least one business workspace.
    let businesses = await getUserBusinesses(authUser.id);
    if (!businesses || businesses.length === 0) {
      const businessName = meta.business_name || `${name}'s Business Workspace`;
      const businessType = meta.business_type || 'General Business';
      const currency = meta.currency || 'INR';
      const created = await createBusinessWorkspace(authUser.id, businessName, businessType, currency);
      businesses = [created.business];
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: profile,
      business: businesses[0],
      businesses,
    });
  } catch (err: any) {
    console.error('Error in /api/auth/me:', err);
    return NextResponse.json({ success: false, authenticated: false, error: err.message });
  }
}
