import { NextResponse } from 'next/server';
import { getOrCreateProfile, createBusinessWorkspace, getUserBusinesses, inMemoryDB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, businessName } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const slug = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const userId = `usr_${slug}`;
    const rawName = cleanEmail.split('@')[0];
    const displayName = name?.trim() || rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const targetBizName = businessName?.trim() || `${displayName}'s Workspace`;

    // 1. Ensure Profile exists in DB
    const profile = await getOrCreateProfile(userId, cleanEmail, displayName);

    // 2. Find existing business for this user or create new one
    let existingBizs = await getUserBusinesses(userId);
    let activeBiz = existingBizs.find(
      (b) => b.owner_id === userId || b.business_name.toLowerCase() === targetBizName.toLowerCase()
    );

    if (!activeBiz) {
      const created = await createBusinessWorkspace(
        userId,
        targetBizName,
        'General Business',
        'INR'
      );
      activeBiz = created.business;
    }

    return NextResponse.json({
      success: true,
      user: profile,
      business: activeBiz,
    });
  } catch (err: any) {
    console.error('Error during auth login API:', err);
    return NextResponse.json({ error: err.message || 'Authentication failed.' }, { status: 500 });
  }
}
