import { NextResponse } from 'next/server';
import { deleteInventoryItem } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { business_id, id } = body;

    if (!business_id || !id) {
      return NextResponse.json(
        { error: 'Missing business_id or inventory item id.' },
        { status: 400 }
      );
    }

    const deleted = await deleteInventoryItem(business_id, id);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (err: any) {
    console.error('Error deleting inventory item:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete inventory item.' },
      { status: 500 }
    );
  }
}
