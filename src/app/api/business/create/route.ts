import { NextResponse } from 'next/server';
import { createBusinessWorkspace, getOrCreateProfile } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userEmail, userName, businessName, businessType, currency } = body;

    if (!userId || !userEmail || !businessName) {
      return NextResponse.json(
        { error: 'Missing required business details: userId, userEmail, or businessName.' },
        { status: 400 }
      );
    }

    // Ensure user profile exists
    await getOrCreateProfile(userId, userEmail, userName);

    // Create Business Workspace + Member mapping
    const result = await createBusinessWorkspace(
      userId,
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
