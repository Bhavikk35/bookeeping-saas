import { NextResponse } from 'next/server';
import { addOrUpdateInventoryItem } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      business_id,
      item_name,
      sku,
      unit_price,
      quantity_in_stock,
      min_stock_alert,
      category,
      expiry_date,
      batch_number,
    } = body;

    if (!business_id || !item_name) {
      return NextResponse.json(
        { error: 'Missing required inventory fields: business_id or item_name.' },
        { status: 400 }
      );
    }

    const item = await addOrUpdateInventoryItem({
      id,
      business_id,
      item_name: item_name.trim(),
      sku: sku ? sku.trim() : null,
      unit_price: parseFloat(unit_price) || 0,
      quantity_in_stock: parseInt(quantity_in_stock, 10) || 0,
      min_stock_alert: parseInt(min_stock_alert, 10) || 5,
      category: category ? category.trim() : 'General',
      expiry_date: expiry_date ? expiry_date.trim() : null,
      batch_number: batch_number ? batch_number.trim() : null,
    });

    return NextResponse.json({
      success: true,
      item,
    });
  } catch (err: any) {
    console.error('Error adding inventory item:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to add or update inventory item.' },
      { status: 500 }
    );
  }
}
