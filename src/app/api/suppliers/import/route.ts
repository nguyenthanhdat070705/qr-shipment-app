import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole } from '@/config/roles.config';

/**
 * POST /api/suppliers/import — Bulk import NCC from Excel
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: { rows: Record<string, unknown>[]; email: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const role = getUserRole(body.email || '');
  if (role !== 'admin' && role !== 'procurement') {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }

  const { rows } = body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu.' }, { status: 400 });
  }

  let inserted = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ma_ncc = String(row.ma_ncc || '').trim();
    if (!ma_ncc) {
      skipped++;
      continue;
    }

    const record: Record<string, unknown> = {
      ma_ncc,
      ten_ncc: String(row.ten_ncc || ma_ncc),
      nguoi_lien_he: String(row.nguoi_lien_he || ''),
      sdt: String(row.sdt || ''),
      dia_chi: String(row.dia_chi || ''),
      email: String(row.email || ''),
      ghi_chu: String(row.ghi_chu || ''),
      noi_dung: String(row.noi_dung || ''),
      thong_tin_lien_he: String(row.thong_tin_lien_he || ''),
      thong_tin_hoa_don: String(row.thong_tin_hoa_don || ''),
      is_active: true,
    };

    // Check existing
    const { data: existing } = await supabase
      .from('dim_ncc')
      .select('id')
      .eq('ma_ncc', ma_ncc)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('dim_ncc')
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateErr) {
        errors.push(`Dòng ${i + 1} (${ma_ncc}): ${updateErr.message}`);
      } else {
        updated++;
      }
    } else {
      const { error: insertErr } = await supabase
        .from('dim_ncc')
        .insert(record);
      if (insertErr) {
        errors.push(`Dòng ${i + 1} (${ma_ncc}): ${insertErr.message}`);
      } else {
        inserted++;
      }
    }
  }

  return NextResponse.json({
    total: rows.length,
    inserted,
    updated,
    skipped,
    errors,
  });
}
