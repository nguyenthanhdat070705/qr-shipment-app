import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole } from '@/config/roles.config';

/**
 * GET  /api/products       → Lấy danh sách sản phẩm (dim_hom)
 * POST /api/products       → Tạo sản phẩm mới
 */

// ── GET: Lấy danh sách sản phẩm ──────────────────────────
// so_luong is calculated from fact_inventory (source of truth),
// NOT from dim_hom.so_luong which may be stale.
export async function GET() {
  const supabase = getSupabaseAdmin();

  // Fetch products and inventory in parallel
  const [productsRes, inventoryRes] = await Promise.all([
    supabase.from('dim_hom').select('*').order('ma_hom', { ascending: true }),
    supabase.from('fact_inventory').select('"Tên hàng hóa", "Số lượng"'),
  ]);

  if (productsRes.error) {
    return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
  }

  // Build a map: product_id → total quantity across all warehouses
  const qtyMap = new Map<string, number>();
  if (inventoryRes.data) {
    for (const row of inventoryRes.data) {
      const homId = row['Tên hàng hóa'] as string;
      const qty = Number(row['Số lượng']) || 0;
      qtyMap.set(homId, (qtyMap.get(homId) || 0) + qty);
    }
  }

  // Merge: override so_luong with the real aggregated quantity
  const data = (productsRes.data || []).map((product: Record<string, unknown>) => ({
    ...product,
    so_luong: qtyMap.get(product.id as string) || 0,
  }));

  return NextResponse.json({ data });
}

// ── POST: Tạo sản phẩm mới ───────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Check permission
  const email = (body.created_by as string) || '';
  const role = getUserRole(email);
  if (role !== 'admin' && role !== 'procurement') {
    return NextResponse.json(
      { error: 'Bạn không có quyền tạo sản phẩm. Chỉ Admin và Thu mua mới được phép.' },
      { status: 403 }
    );
  }

  const {
    ma_hom,
    ten_hom,
    gia_ban,
    gia_von,
    NCC,
    loai_hom,
    hinh_anh,
    mo_ta,
    kich_thuoc,
    thong_so_khac,
    do_day_thanh,
    don_vi_tinh,
    tinh_chat,
    muc_dich_su_dung,
  } = body;

  if (!ma_hom || !ten_hom) {
    return NextResponse.json(
      { error: 'Mã hòm và Tên hòm là bắt buộc.' },
      { status: 400 }
    );
  }

  // Check duplicate ma_hom
  const { data: existing } = await supabase
    .from('dim_hom')
    .select('id')
    .eq('ma_hom', ma_hom as string)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Mã hòm "${ma_hom}" đã tồn tại. Vui lòng chọn mã khác.` },
      { status: 409 }
    );
  }

  // Destructure new fields
  const {
    ten_mkt, ten_hom_the_hien, ten_ky_thuat, ten_chuan_hoa,
    loai_go, Goi_dich_vu, Mau_sac, nhom_hang_hoa, loai_san_pham, Ton_giao,
    nap, Nguon_goc, Liet, be_mat, Muc_dich, Thanh, dac_diem,
    ...restBody
  } = body;

  const insertData: Record<string, unknown> = {
    ma_hom,
    ten_hom,
    gia_ban: gia_ban || 0,
    gia_von: gia_von || 0,
    loai_hom: loai_hom || '',
    hinh_anh: hinh_anh || '',
    kich_thuoc: kich_thuoc || '',
    thong_so_khac: thong_so_khac || '',
    don_vi_tinh: don_vi_tinh || 'Cái',
    is_active: true,

    // New/Renamed mapping
    ten_mkt: ten_mkt || '',
    ten_hom_the_hien: ten_hom_the_hien || '',
    ten_ky_thuat: ten_ky_thuat || '',
    ten_chuan_hoa: ten_chuan_hoa || '',
    loai_go: loai_go || '',
    "Goi_dich_vu": Goi_dich_vu || '',
    "Mau_sac": Mau_sac || '',
    nhom_hang_hoa: nhom_hang_hoa || '',
    loai_san_pham: loai_san_pham || '',
    "Ton_giao": Ton_giao || '',
    nap: nap || '',
    "Nguon_goc": Nguon_goc || '',
    "Liet": Liet || '',
    be_mat: be_mat || '',
    "Muc_dich": Muc_dich || '',
    "Thanh": Thanh || '',
    dac_diem: dac_diem || '',
  };

  const { data: created, error: insertError } = await supabase
    .from('dim_hom')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('[products] POST error:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

// ── PUT: Cập nhật sản phẩm ────────────────────────────────
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.updated_by as string) || '';
  const role = getUserRole(email);
  if (role !== 'admin' && role !== 'procurement') {
    return NextResponse.json(
      { error: 'Bạn không có quyền chỉnh sửa sản phẩm.' },
      { status: 403 }
    );
  }

  const { id, ...updateFields } = body;
  if (!id) {
    return NextResponse.json({ error: 'ID sản phẩm là bắt buộc.' }, { status: 400 });
  }

  // Remove non-column fields
  delete updateFields.updated_by;
  delete updateFields.created_by;

  const { data: updated, error: updateError } = await supabase
    .from('dim_hom')
    .update({ ...updateFields, updated_at: new Date().toISOString() })
    .eq('id', id as string)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: updated });
}

// ── DELETE: Xóa sản phẩm ─────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email as string) || '';
  const role = getUserRole(email);
  if (role !== 'admin' && role !== 'procurement') {
    return NextResponse.json({ error: 'Bạn không có quyền xóa sản phẩm.' }, { status: 403 });
  }

  const id = body.id as string;
  if (!id) return NextResponse.json({ error: 'ID sản phẩm là bắt buộc.' }, { status: 400 });

  // Xóa inventory liên quan trước
  await supabase.from('fact_inventory').delete().eq('Tên hàng hóa', id);

  // Xóa sản phẩm
  const { error: deleteError } = await supabase.from('dim_hom').delete().eq('id', id);
  if (deleteError) {
    console.error('[products] DELETE error:', deleteError.message);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
