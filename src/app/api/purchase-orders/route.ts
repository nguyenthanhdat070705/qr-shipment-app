import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET  /api/purchase-orders   → List all POs from fact_don_hang
 * POST /api/purchase-orders   → Create new PO in fact_don_hang
 */

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('fact_don_hang')
    .select(`
      *,
      ncc:dim_ncc!ncc_id(id, ma_ncc, ten_ncc, nguoi_lien_he, sdt),
      kho:dim_kho!kho_id(id, ma_kho, ten_kho)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unique user IDs to fetch names
  const userIds = [...new Set((data || []).map(po => po.nguoi_tao_id).filter(Boolean))];
  let usersMap: Record<string, string> = {};
  
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('dim_account')
      .select('id, ho_ten, email')
      .in('id', userIds);
      
    if (usersData) {
      usersMap = usersData.reduce((acc, user) => {
        acc[user.id] = user.ho_ten || user.email || user.id;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Transform to match expected frontend format
  const transformed = (data || []).map((po: Record<string, unknown>) => ({
    id: po.id,
    po_code: po.ma_don_hang,
    supplier_id: po.ncc_id,
    warehouse_id: po.kho_id,
    status: po.trang_thai || 'confirmed',
    total_amount: po.tong_tien || 0,
    note: po.ghi_chu,
    created_by: po.nguoi_tao_id ? (usersMap[po.nguoi_tao_id as string] || po.nguoi_tao_id) : null,
    approved_by: po.nguoi_duyet_id,
    order_date: po.ngay_dat,
    expected_date: po.ngay_du_kien,
    created_at: po.created_at,
    updated_at: po.updated_at,
    // Joined
    supplier: po.ncc ? {
      id: (po.ncc as Record<string, unknown>).id,
      code: (po.ncc as Record<string, unknown>).ma_ncc,
      name: (po.ncc as Record<string, unknown>).ten_ncc,
      contact_name: (po.ncc as Record<string, unknown>).nguoi_lien_he,
      phone: (po.ncc as Record<string, unknown>).sdt,
    } : null,
    warehouse: po.kho ? {
      id: (po.kho as Record<string, unknown>).id,
      code: (po.kho as Record<string, unknown>).ma_kho,
      name: (po.kho as Record<string, unknown>).ten_kho,
    } : null,
  }));

  return NextResponse.json({ data: transformed });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { supplier_id, warehouse_id, note, created_by, expected_date, items } = body as {
    supplier_id?: string;
    warehouse_id?: string;
    note?: string;
    created_by: string;
    expected_date?: string;
    items?: { product_code: string; product_name: string; quantity: number; unit_price: number; note?: string }[];
  };

  if (!created_by) {
    return NextResponse.json({ error: 'created_by là bắt buộc.' }, { status: 400 });
  }

  // Generate PO code: PO-YYYYMMDD-XXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase.from('fact_don_hang').select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(3, '0');
  const ma_don_hang = `PO-${dateStr}-${seq}`;

  // Calculate total
  const totalAmount = (items || []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  // Lookup user UUID from dim_account by email
  let nguoiTaoId: string | null = null;
  if (created_by && created_by.includes('@')) {
    const { data: account } = await supabase
      .from('dim_account')
      .select('id')
      .eq('email', created_by)
      .maybeSingle();
    nguoiTaoId = account?.id || null;
  }

  // Insert PO into fact_don_hang
  const { data: po, error: poError } = await supabase
    .from('fact_don_hang')
    .insert({
      ma_don_hang,
      ncc_id: supplier_id || null,
      kho_id: warehouse_id || null,
      ghi_chu: note ? `${note} | Tạo bởi: ${created_by}` : `Tạo bởi: ${created_by}`,
      nguoi_tao_id: nguoiTaoId,
      ngay_du_kien: expected_date || null,
      tong_tien: totalAmount,
      trang_thai: 'confirmed',
      ngay_dat: now.toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (poError) {
    return NextResponse.json({ error: poError.message }, { status: 500 });
  }

  // Insert items into fact_don_hang_items
  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      don_hang_id: po.id,
      ma_hom: item.product_code,
      ten_hom: item.product_name,
      so_luong: item.quantity,
      don_gia: item.unit_price,
      ghi_chu: item.note || null,
    }));

    const { error: itemsError } = await supabase
      .from('fact_don_hang_items')
      .insert(itemRows);

    if (itemsError) {
      console.error('[purchase-orders] Items insert error:', itemsError);
    }
  }

  // Return transformed data
  return NextResponse.json({
    data: {
      id: po.id,
      po_code: ma_don_hang,
    },
    po_code: ma_don_hang,
  }, { status: 201 });
}
