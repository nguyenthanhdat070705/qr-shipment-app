import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET    /api/purchase-orders/[id]   → Detail with items
 * PUT    /api/purchase-orders/[id]   → Update PO
 * PATCH  /api/purchase-orders/[id]   → Update status only
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Fetch PO from fact_don_hang
  const { data: po, error } = await supabase
    .from('fact_don_hang')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  // Fetch related data
  const [nccRes, khoRes, createdByRes, itemsRes] = await Promise.all([
    po.ncc_id ? supabase.from('dim_ncc').select('*').eq('id', po.ncc_id).single() : { data: null },
    po.kho_id ? supabase.from('dim_kho').select('*').eq('id', po.kho_id).single() : { data: null },
    po.nguoi_tao_id ? supabase.from('dim_account').select('*').eq('id', po.nguoi_tao_id).single() : { data: null },
    supabase.from('fact_don_hang_items').select('*').eq('don_hang_id', id),
  ]);

  const createdByName = createdByRes.data?.ho_ten || createdByRes.data?.email || po.nguoi_tao_id;

  // Transform to expected frontend format
  const transformed = {
    id: po.id,
    po_code: po.ma_don_hang,
    supplier_id: po.ncc_id,
    warehouse_id: po.kho_id,
    status: po.trang_thai || 'confirmed',
    total_amount: po.tong_tien || 0,
    note: po.ghi_chu,
    created_by: createdByName,
    approved_by: po.nguoi_duyet_id,
    order_date: po.ngay_dat,
    expected_date: po.ngay_du_kien,
    created_at: po.created_at,
    updated_at: po.updated_at,
    supplier: nccRes.data ? {
      id: nccRes.data.id,
      code: nccRes.data.ma_ncc,
      name: nccRes.data.ten_ncc,
      contact_name: nccRes.data.nguoi_lien_he,
      phone: nccRes.data.sdt,
      address: nccRes.data.dia_chi,
    } : null,
    warehouse: khoRes.data ? {
      id: khoRes.data.id,
      code: khoRes.data.ma_kho,
      name: khoRes.data.ten_kho,
      address: khoRes.data.dia_chi,
    } : null,
    items: (itemsRes.data || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      po_id: item.don_hang_id,
      product_code: item.ma_hom,
      product_name: item.ten_hom,
      quantity: item.so_luong,
      unit_price: item.don_gia,
      total_price: (Number(item.so_luong) || 0) * (Number(item.don_gia) || 0),
      received_qty: item.so_luong_nhan || 0,
      note: item.ghi_chu,
      created_at: item.created_at,
    })),
  };

  return NextResponse.json({ data: transformed });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { supplier_id, warehouse_id, note, expected_date } = body;

  const { data, error } = await supabase
    .from('fact_don_hang')
    .update({
      ncc_id: supplier_id || null,
      kho_id: warehouse_id || null,
      ghi_chu: note || null,
      ngay_du_kien: expected_date || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: { status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validStatuses = ['confirmed', 'received', 'closed', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { trang_thai: body.status };

  const { data, error } = await supabase
    .from('fact_don_hang')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...data, status: data.trang_thai } });
}
