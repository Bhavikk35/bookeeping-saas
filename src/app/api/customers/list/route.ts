import { NextRequest, NextResponse } from 'next/server';
import { getCustomersByBusiness } from '@/lib/db';

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get('business_id');
  if (!bizId) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

  const customers = await getCustomersByBusiness(bizId);
  return NextResponse.json({ customers });
}
