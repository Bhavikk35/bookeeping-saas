import { NextResponse } from 'next/server';
import { addTransaction } from '@/lib/db';
import { syncTransactionToGoogleSheet } from '@/lib/google/sheets-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      businessId,
      userId,
      transaction_type,
      amount,
      currency,
      item,
      quantity,
      category,
      customer_name,
      supplier_name,
      payment_status,
      description,
      transaction_date,
    } = body;

    if (!businessId || !transaction_type || !amount || !item) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, transaction_type, amount, item.' },
        { status: 400 }
      );
    }

    const tx = await addTransaction({
      business_id: businessId,
      created_by: userId || null,
      telegram_connection_id: null,
      transaction_type,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      item,
      quantity: quantity ? parseFloat(quantity) : 1,
      category: category || 'General',
      customer_name: customer_name || null,
      supplier_name: supplier_name || null,
      payment_status: payment_status || 'paid',
      description: description || null,
      transaction_date: transaction_date || new Date().toISOString().split('T')[0],
      source: 'web',
    });

    // Sync to Google Sheet
    await syncTransactionToGoogleSheet(tx);

    return NextResponse.json({
      success: true,
      transaction: tx,
    });
  } catch (err: any) {
    console.error('Error recording web transaction:', err);
    return NextResponse.json({ error: err.message || 'Failed to record transaction.' }, { status: 500 });
  }
}
