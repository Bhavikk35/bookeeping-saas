import { NextResponse } from 'next/server';
import { getBusinessInventory, getInventorySummary } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId') || 'biz_tenant_demo';

  try {
    const items = await getBusinessInventory(businessId);
    const summary = await getInventorySummary(businessId);

    return NextResponse.json({
      success: true,
      items,
      summary,
    });
  } catch (err: any) {
    console.error('Error fetching inventory list:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch inventory list.' },
      { status: 500 }
    );
  }
}
