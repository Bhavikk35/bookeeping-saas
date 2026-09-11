import { NextResponse } from 'next/server';
import { getBusinessTransactions, getBusinessFinancialMetrics, getBusiness } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const format = searchParams.get('format') || 'json';

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Business ID is required' }, { status: 400 });
    }

    const business = await getBusiness(businessId);
    if (!business) {
      return NextResponse.json({ success: false, error: 'Business workspace not found' }, { status: 404 });
    }

    const transactions = await getBusinessTransactions(businessId);
    const metrics = await getBusinessFinancialMetrics(businessId);

    if (format === 'csv') {
      // Build raw CSV text string
      const headers = ['Date', 'Type', 'Item Name', 'Quantity', 'Category', 'Customer/Supplier', 'Amount', 'Status', 'Description', 'Source', 'ID'];
      const csvRows = [headers.join(',')];

      transactions.forEach((tx) => {
        const row = [
          `"${tx.transaction_date}"`,
          `"${tx.transaction_type.toUpperCase()}"`,
          `"${(tx.item || '').replace(/"/g, '""')}"`,
          tx.quantity || 1,
          `"${(tx.category || 'General').replace(/"/g, '""')}"`,
          `"${(tx.customer_name || tx.supplier_name || '-').replace(/"/g, '""')}"`,
          Number(tx.amount || 0),
          `"${(tx.payment_status || 'paid').toUpperCase()}"`,
          `"${(tx.description || '').replace(/"/g, '""')}"`,
          `"${tx.source || 'telegram'}"`,
          `"${tx.id}"`,
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const filename = `${business.business_name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Ledger_${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.business_name,
        type: business.business_type,
        currency: business.currency,
      },
      metrics,
      transactions,
    });
  } catch (error: any) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export transaction ledger' },
      { status: 500 }
    );
  }
}
