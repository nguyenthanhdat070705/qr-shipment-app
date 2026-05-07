import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const params = await context.params;
    const id = params?.id;
    const body = await request.json();
    const { product_code, quantity = 1 } = body;

    if (!product_code) return NextResponse.json({ success: false, error: 'Thiếu mã sản phẩm' }, { status: 400 });

    // 1. Get stocktake to verify it exists and is pending
    const { data: stocktake, error: stError } = await supabase
      .from('stocktakes')
      .select('status, warehouse_name')
      .eq('id', id)
      .single();

    if (stError) throw stError;
    if (stocktake.status === 'completed') {
      return NextResponse.json({ success: false, error: 'Phiếu kiểm kho đã hoàn thành, không thể quét thêm' }, { status: 400 });
    }

    // 2. Fetch system quantity from fact_inventory (if it exists)
    // Note: since fact_inventory might have multiple rows per product, we sum it up for the warehouse
    let systemQuantity = 0;
    const { data: inventoryData, error: invError } = await supabase
      .from('fact_inventory')
      .select('qty_available, product_code')
      .eq('product_code', product_code)
      .eq('warehouse_name', stocktake.warehouse_name);

    if (!invError && inventoryData) {
      systemQuantity = inventoryData.reduce((acc, row) => acc + (Number(row.qty_available) || 0), 0);
    }

    // 3. Check if product already exists in stocktake_items
    const { data: existingItem } = await supabase
      .from('stocktake_items')
      .select('id, actual_quantity')
      .eq('stocktake_id', id)
      .eq('product_code', product_code)
      .single();

    let result;
    if (existingItem) {
      // Update existing item
      const newQty = existingItem.actual_quantity + Number(quantity);
      const { data: updatedItem, error: updateError } = await supabase
        .from('stocktake_items')
        .update({ 
          actual_quantity: newQty,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      result = updatedItem;
    } else {
      // Try to get product name from products table
      let productName = 'Unknown';
      const { data: productData } = await supabase
        .from('products')
        .select('name')
        .eq('code', product_code)
        .single();
      
      if (productData) {
        productName = productData.name;
      }

      // Insert new item
      const { data: newItem, error: insertError } = await supabase
        .from('stocktake_items')
        .insert({
          stocktake_id: id,
          product_code: product_code,
          product_name: productName,
          system_quantity: systemQuantity,
          actual_quantity: Number(quantity)
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      result = newItem;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
