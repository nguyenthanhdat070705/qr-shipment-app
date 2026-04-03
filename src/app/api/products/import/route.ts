import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole } from '@/config/roles.config';

/**
 * POST /api/products/import
 * Nhận mảng sản phẩm từ Excel, upsert vào dim_hom
 * - Nếu ma_hom đã tồn tại → update
 * - Nếu chưa → insert
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: { rows: Record<string, unknown>[]; email: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { rows, email } = body;

  // Check permission
  const role = getUserRole(email || '');
  if (role !== 'admin' && role !== 'procurement') {
    return NextResponse.json(
      { error: 'Bạn không có quyền import sản phẩm. Chỉ Admin và Thu mua mới được phép.' },
      { status: 403 }
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu để import.' }, { status: 400 });
  }

  // Allowed columns in dim_hom
  const ALLOWED_COLS = [
    'ma_hom', 'ten_hom', 'gia_ban', 'gia_von', 'NCC', 'loai_hom',
    'hinh_anh', 'mo_ta', 'kich_thuoc', 'thong_so_khac', 'do_day_thanh',
    'don_vi_tinh', 'tinh_chat', 'muc_dich_su_dung',
  ];

  const results = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ma_hom = (row.ma_hom as string || '').trim().toUpperCase();

    if (!ma_hom) {
      results.skipped++;
      continue;
    }

    // Build clean data, only allowed columns
    const cleanData: Record<string, unknown> = {};
    for (const col of ALLOWED_COLS) {
      if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
        cleanData[col] = col === 'gia_ban' || col === 'gia_von'
          ? Number(row[col]) || 0
          : String(row[col]).trim();
      }
    }
    cleanData.ma_hom = ma_hom;
    if (!cleanData.don_vi_tinh) cleanData.don_vi_tinh = 'Cái';
    cleanData.is_active = true;

    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('dim_hom')
        .select('id')
        .eq('ma_hom', ma_hom)
        .maybeSingle();

      if (existing) {
        // Update
        const { ma_hom: _unused, ...updateFields } = cleanData;
        void _unused;
        const { error: updateErr } = await supabase
          .from('dim_hom')
          .update({ ...updateFields, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (updateErr) {
          results.errors.push(`Dòng ${i + 1} (${ma_hom}): ${updateErr.message}`);
        } else {
          results.updated++;
        }
      } else {
        // Insert
        const { error: insertErr } = await supabase
          .from('dim_hom')
          .insert(cleanData);

        if (insertErr) {
          results.errors.push(`Dòng ${i + 1} (${ma_hom}): ${insertErr.message}`);
        } else {
          results.inserted++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.errors.push(`Dòng ${i + 1} (${ma_hom}): ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    total: rows.length,
    ...results,
  });
}
