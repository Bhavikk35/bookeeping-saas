import { NextRequest, NextResponse } from 'next/server';
import { recordPayment } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_id, customer_id, amount, description } = body;

    if (!business_id || !customer_id || !amount) {
      return NextResponse.json({ error: 'business_id, customer_id, amount required' }, { status: 400 });
    }

    const result = await recordPayment(business_id, customer_id, Number(amount), description);

    return NextResponse.json({
      customer: result.customer,
      ledgerEntry: result.ledgerEntry,
      cleared: result.cleared,
      overpayment: result.overpayment,
      message: result.cleared
        ? `✅ ${result.customer.name}'s udhaar fully cleared!`
        : result.overpayment > 0
        ? `⚠️ Overpayment of ₹${result.overpayment} — only ₹${result.ledgerEntry.amount} applied.`
        : `✅ Payment recorded. ₹${result.customer.balance_due} still pending.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
