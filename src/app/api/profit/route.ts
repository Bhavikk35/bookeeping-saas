import { NextRequest, NextResponse } from 'next/server';
import { getProfitReport, ProfitPeriod } from '@/lib/db';

export async function GET(req: NextRequest) {
  const bizId = req.nextUrl.searchParams.get('business_id');
  const period = (req.nextUrl.searchParams.get('period') || 'all') as ProfitPeriod;

  if (!bizId) return NextResponse.json({ error: 'business_id required' }, { status: 400 });

  const validPeriods: ProfitPeriod[] = ['today', 'week', 'month', 'all'];
  if (!validPeriods.includes(period)) {
    return NextResponse.json({ error: 'period must be today|week|month|all' }, { status: 400 });
  }

  const report = await getProfitReport(bizId, period);
  return NextResponse.json({ report });
}
