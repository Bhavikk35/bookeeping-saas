import { NextResponse } from 'next/server';
import { getBusinessTransactions, getBusinessFinancialMetrics } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  const date = searchParams.get('date') || undefined;
  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;

  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
  }

  try {
    const transactions = await getBusinessTransactions(businessId, { date, type, category });
    const metrics = await getBusinessFinancialMetrics(businessId);

    return NextResponse.json({
      success: true,
      transactions,
      metrics,
    });
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch transactions.' }, { status: 500 });
  }
}
