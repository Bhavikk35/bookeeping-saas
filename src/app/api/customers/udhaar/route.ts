import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomer, recordUdhaar } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_id, customer_name, amount, description, transaction_id } = body;

    if (!business_id || !customer_name || !amount) {
      return NextResponse.json({ error: 'business_id, customer_name, amount required' }, { status: 400 });
    }

    const { customer, isNew, existingBalance } = await findOrCreateCustomer(business_id, customer_name);
    const result = await recordUdhaar(business_id, customer.id, Number(amount), description, transaction_id);

    return NextResponse.json({
      customer: result.customer,
      ledgerEntry: result.ledgerEntry,
      isNew,
      existingBalance,
      warning: existingBalance > 0
        ? `⚠️ ${customer.name} already has ₹${existingBalance} pending. New total: ₹${result.customer.balance_due}`
        : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
