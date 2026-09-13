import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBusinessWorkspace, getOrCreateProfile } from '@/lib/db';

// NOTE: This route used to trust a client-supplied userId/userEmail, which
// meant anyone could create (or overwrite) a workspace for any email address.
// It now derives identity from the real, authenticated Supabase session only.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'You must be signed in to create a business.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { businessName, businessType, currency } = body;

    if (!businessName) {
      return NextResponse.json({ error: 'Missing required field: businessName.' }, { status: 400 });
    }

    const email = authUser.email || '';
    const meta = authUser.user_metadata || {};
    const name = meta.name || meta.full_name || email.split('@')[0];

    // Ensure profile exists
    await getOrCreateProfile(authUser.id, email, name);

    // Create Business Workspace + Member mapping for the *authenticated* user
    const result = await createBusinessWorkspace(
      authUser.id,
      businessName,
      businessType || 'Retail Store',
      currency || 'INR'
    );

    return NextResponse.json({
      success: true,
      business: result.business,
      member: result.member,
    });
  } catch (err: any) {
    console.error('Error creating business:', err);
    return NextResponse.json(
      { error: err.message || 'Business creation failed. Please try again.' },
      { status: 500 }
    );
  }
}
