import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET   /api/goods-receipt/[id]  → Detail with items
 * PATCH /api/goods-receipt/[id]  → Cancel GRPO only
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Fetch GR from fact_nhap_hang
  const { data: gr, error } = await supabase
    .from('fact_nhap_hang')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  // Fetch items from fact_nhap_hang_items
  const { data: rawItems } = await supabase
    .from('fact_nhap_hang_items')
    .select('*')
    .eq('nhap_hang_id', id);

  const items = (rawItems || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    gr_id: item.nhap_hang_id,
    product_code: item.ma_hom,
    product_name: item.ten_hom,
    expected_qty: item.so_luong_yeu_cau || 0,
    received_qty: item.so_luong_thuc_nhan || 0,
    is_accepted: true,
    note: item.ghi_chu,
    created_at: item.created_at,
  }));

  // Fetch warehouse from dim_kho
  let warehouse = null;
  if (gr.kho_id) {
    const { data: kho } = await supabase
      .from('dim_kho')
      .select('id, ma_kho, ten_kho')
      .eq('id', gr.kho_id)
      .single();
    if (kho) warehouse = { id: kho.id, code: kho.ma_kho, name: kho.ten_kho };
  }

  // Fetch PO from fact_don_hang
  let purchase_order = null;
  if (gr.don_hang_id) {
    const { data: po } = await supabase
      .from('fact_don_hang')
      .select('*')
      .eq('id', gr.don_hang_id)
      .single();

    if (po) {
      let supplier = null;
      if (po.ncc_id) {
        const { data: ncc } = await supabase
          .from('dim_ncc')
          .select('*')
          .eq('id', po.ncc_id)
          .single();
        if (ncc) {
          supplier = {
            id: ncc.id,
            code: ncc.ma_ncc,
            name: ncc.ten_ncc,
            contact_name: ncc.nguoi_lien_he,
            phone: ncc.sdt,
          };
        }
      }
      purchase_order = {
        id: po.id,
        po_code: po.ma_don_hang,
        status: po.trang_thai,
        supplier,
      };
    }
  }

  // Fetch receiver name from dim_account
  let receivedByName: string | null = null;
  if (gr.nguoi_nhan_id) {
    const { data: account } = await supabase
      .from('dim_account')
      .select('ho_ten, email')
      .eq('id', gr.nguoi_nhan_id)
      .maybeSingle();
    if (account) {
      receivedByName = account.ho_ten || account.email?.split('@')[0] || null;
    }
  }

  return NextResponse.json({
    data: {
      id: gr.id,
      gr_code: gr.ma_phieu_nhap,
      po_id: gr.don_hang_id,
      warehouse_id: gr.kho_id,
      status: gr.trang_thai || 'completed',
      note: gr.ghi_chu,
      received_by: receivedByName || gr.nguoi_nhan_id,
      received_date: gr.ngay_nhan,
      created_at: gr.created_at,
      updated_at: gr.updated_at,
      warehouse,
      purchase_order,
      items,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ error: 'Thiếu status.' }, { status: 400 });
  }

  const validStatuses = ['completed', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `Trạng thái không hợp lệ: ${body.status}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('fact_nhap_hang')
    .update({ trang_thai: body.status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...data, status: data.trang_thai, gr_code: data.ma_phieu_nhap } });
}
