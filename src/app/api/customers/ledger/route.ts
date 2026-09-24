import { NextRequest, NextResponse } from 'next/server';
import { getCustomerLedger, getCustomerById } from '@/lib/db';

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id');
  const bizId = req.nextUrl.searchParams.get('business_id');

  if (!customerId || !bizId) {
    return NextResponse.json({ error: 'customer_id and business_id required' }, { status: 400 });
  }

  const [customer, ledger] = await Promise.all([
    getCustomerById(customerId),
    getCustomerLedger(customerId, bizId),
  ]);

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  return NextResponse.json({ customer, ledger });
}
