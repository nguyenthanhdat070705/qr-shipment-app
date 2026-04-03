import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole } from '@/config/roles.config';

/**
 * GET    /api/warehouses → Lấy danh sách kho
 * POST   /api/warehouses → Tạo kho mới
 * PUT    /api/warehouses → Cập nhật kho
 * DELETE /api/warehouses → Xóa kho
 */

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('dim_kho')
    .select('*')
    .order('ma_kho', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const role = getUserRole((body.created_by as string) || '');
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền tạo kho.' }, { status: 403 });
  }

  const { ma_kho, ten_kho } = body;
  if (!ma_kho || !ten_kho) {
    return NextResponse.json({ error: 'Mã kho và Tên kho là bắt buộc.' }, { status: 400 });
  }

  const { data: existing } = await supabase.from('dim_kho').select('id').eq('ma_kho', ma_kho as string).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `Mã kho "${ma_kho}" đã tồn tại.` }, { status: 409 });
  }

  const { data: created, error: insertError } = await supabase
    .from('dim_kho')
    .insert({
      ma_kho, ten_kho,
      dia_chi: body.dia_chi || '',
      nguoi_quan_ly: body.nguoi_quan_ly || '',
      sdt: body.sdt || '',
      is_active: true,
    })
    .select().single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const role = getUserRole((body.updated_by as string) || '');
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền chỉnh sửa kho.' }, { status: 403 });
  }

  const { id, ...updateFields } = body;
  if (!id) return NextResponse.json({ error: 'ID kho là bắt buộc.' }, { status: 400 });
  delete updateFields.updated_by; delete updateFields.created_by;

  const { data: updated, error: updateError } = await supabase
    .from('dim_kho')
    .update({ ...updateFields, updated_at: new Date().toISOString() })
    .eq('id', id as string).select().single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const role = getUserRole((body.email as string) || '');
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa kho.' }, { status: 403 });
  }

  const id = body.id as string;
  if (!id) return NextResponse.json({ error: 'ID kho là bắt buộc.' }, { status: 400 });

  const { error: deleteError } = await supabase.from('dim_kho').delete().eq('id', id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
