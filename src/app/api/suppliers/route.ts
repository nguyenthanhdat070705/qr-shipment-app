import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole } from '@/config/roles.config';

/**
 * GET  /api/suppliers       → Lấy danh sách NCC
 * POST /api/suppliers       → Tạo NCC mới
 * PUT  /api/suppliers       → Cập nhật NCC
 */

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('dim_ncc')
    .select('*')
    .order('ma_ncc', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.created_by as string) || '';
  const role = getUserRole(email);
  if (role !== 'admin' && role !== 'procurement') {
    return NextResponse.json(
      { error: 'Bạn không có quyền tạo NCC. Chỉ Admin và Thu mua mới được phép.' },
      { status: 403 }
    );
  }

  const { ma_ncc, ten_ncc } = body;
  if (!ma_ncc || !ten_ncc) {
    return NextResponse.json(
      { error: 'Mã NCC và Tên NCC là bắt buộc.' },
      { status: 400 }
    );
  }

  // Check duplicate
  const { data: existing } = await supabase
    .from('dim_ncc')
    .select('id')
    .eq('ma_ncc', ma_ncc as string)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Mã NCC "${ma_ncc}" đã tồn tại.` },
      { status: 409 }
    );
  }

  const insertData: Record<string, unknown> = {
    ma_ncc,
    ten_ncc,
    nguoi_lien_he: body.nguoi_lien_he || '',
    sdt: body.sdt || '',
    dia_chi: body.dia_chi || '',
    email: body.email || '',
    ghi_chu: body.ghi_chu || '',
    noi_dung: body.noi_dung || '',
    thong_tin_lien_he: body.thong_tin_lien_he || '',
    thong_tin_hoa_don: body.thong_tin_hoa_don || '',
    is_active: true,
  };

  const { data: created, error: insertError } = await supabase
    .from('dim_ncc')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('[suppliers] POST error:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

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
      { error: 'Bạn không có quyền chỉnh sửa NCC.' },
      { status: 403 }
    );
  }

  const { id, ...updateFields } = body;
  if (!id) {
    return NextResponse.json({ error: 'ID NCC là bắt buộc.' }, { status: 400 });
  }

  delete updateFields.updated_by;
  delete updateFields.created_by;

  const { data: updated, error: updateError } = await supabase
    .from('dim_ncc')
    .update({ ...updateFields, updated_at: new Date().toISOString() })
    .eq('id', id as string)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email as string) || '';
  const role = getUserRole(email);
  if (role !== 'admin' && role !== 'procurement') {
    return NextResponse.json(
      { error: 'Bạn không có quyền xóa NCC.' },
      { status: 403 }
    );
  }

  const id = body.id as string;
  if (!id) {
    return NextResponse.json({ error: 'ID NCC là bắt buộc.' }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from('dim_ncc')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[suppliers] DELETE error:', deleteError.message);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
