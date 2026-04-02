/**
 * GET /api/cron/sync-dam
 * Được gọi bởi Vercel Cron mỗi 10 phút (xem vercel.json)
 * Bảo vệ bằng CRON_SECRET (Vercel tự inject header Authorization)
 * Sync: Google Sheets → fact_dam → dim_dam
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GOOGLE_SHEET_ID = '1NySorW3c07R_w7smqMkGbAja6I9rIVLT4s0OGZEOIOg';
const GOOGLE_SHEET_GID = '1072390539';

function parseCSVLine(line: string) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export async function GET(request: NextRequest) {
  // Xác thực: chấp nhận cả header Authorization HOẶC query param ?secret=
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized = !cronSecret 
    || authHeader === `Bearer ${cronSecret}` 
    || querySecret === cronSecret;

  if (!isAuthorized) {
    console.warn('[Cron sync-dam] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron sync-dam] 🕐 Bắt đầu scheduled sync Google Sheets → fact_dam → dim_dam');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch từ Google Sheets
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error('Không thể tải CSV từ Google Sheets. Có thể file chưa public.');
    }

    const text = await res.text();
    const lines = text.split('\n').map(l => l.replace(/\r$/, ''));

    // Tìm Header
    let headerIdx = 1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if ((lower.startsWith('stt') || lower.match(/^["\\s]*stt/)) && (lower.includes('ng') || lower.includes('th'))) {
        headerIdx = i; break;
      }
      if (lower.includes('mã đám') || lower.includes('ma dam')) {
        headerIdx = i; break;
      }
    }

    // Parse Data
    const rows: any[] = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const r = parseCSVLine(line);
      if (!r || r.length < 5) continue;

      if (!r[0] || r[0].trim() === '') continue;
      const maDam = r[3]?.trim();
      if (!maDam) continue;

      rows.push({
        stt:                           r[0]?.trim()  || '',
        ngay:                          r[1]?.trim()  || '',
        thang:                         r[2]?.trim()  || '',
        ma_dam:                        maDam,
        loai:                          r[4]?.trim()  || '',
        chi_nhanh:                     r[5]?.trim()  || '',
        nguoi_mat:                     r[6]?.trim()  || '',
        dia_chi_to_chuc:               r[7]?.trim()  || '',
        dia_chi_chon_thieu:            r[8]?.trim()  || '',
        gio_liem:                      r[9]?.trim()  || '',
        ngay_liem:                     r[10]?.trim() || '',
        gio_di_quan:                   r[11]?.trim() || '',
        ngay_di_quan:                  r[12]?.trim() || '',
        sale:                          r[13]?.trim() || '',
        dieu_phoi:                     r[14]?.trim() || '',
        thay_so_luong:                 r[15]?.trim() || '',
        thay_ncc:                      r[16]?.trim() || '',
        thay_ten:                      r[17]?.trim() || '',
        hom_loai:                      r[18]?.trim() || '',
        hom_ncc_hay_kho:               r[19]?.trim() || '',
        hoa:                           r[20]?.trim() || '',
        da_kho_tiem_focmol:            r[21]?.trim() || '',
        ken_tay_so_le:                 r[22]?.trim() || '',
        ken_tay_ncc:                   r[23]?.trim() || '',
        quay_phim_chup_hinh_goi_dv:    r[24]?.trim() || '',
        quay_phim_chup_hinh_ncc:       r[25]?.trim() || '',
        mam_cung_so_luong:             r[26]?.trim() || '',
        mam_cung_ncc:                  r[27]?.trim() || '',
        di_anh_cao_pho:                r[28]?.trim() || '',
        bang_ron:                      r[29]?.trim() || '',
        la_trieu_bai_vi:               r[30]?.trim() || '',
        nhac:                          r[31]?.trim() || '',
        thue_rap_ban_ghe_so_luong:     r[32]?.trim() || '',
        thue_rap_ban_ghe_ncc:          r[33]?.trim() || '',
        hu_tro_cot:                    r[34]?.trim() || '',
        teabreak:                      r[35]?.trim() || '',
        xe_tang_le_loai:               r[36]?.trim() || '',
        xe_tang_le_dao_ty:             r[37]?.trim() || '',
        xe_tang_le_ncc:                r[38]?.trim() || '',
        xe_khach_loai:                 r[39]?.trim() || '',
        xe_khach_ncc:                  r[40]?.trim() || '',
        xe_cap_cuu:                    r[41]?.trim() || '',
        xe_khac:                       r[42]?.trim() || '',
        thue_nv_truc:                  r[43]?.trim() || '',
        bao_don:                       r[44]?.trim() || '',
        ghi_chu:                       r[45]?.trim() || '',
        chon_thieu:                    r[46]?.trim() || '',
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu hợp lệ.' });
    }

    // 2. Deduplicate rows by ma_dam (giữ lại dòng cuối cùng nếu trùng)
    const deduped = new Map<string, any>();
    for (const r of rows) {
      deduped.set(r.ma_dam, r);
    }
    const uniqueRows = Array.from(deduped.values());
    const dupeCount = rows.length - uniqueRows.length;
    if (dupeCount > 0) {
      console.warn(`[Cron sync-dam] ${dupeCount} dòng trùng ma_dam đã bị loại bỏ`);
    }

    // 3. Upsert vào fact_dam theo batch 50 record
    let factDamCount = 0;
    const CHUNK_SIZE = 50;

    for (let i = 0; i < uniqueRows.length; i += CHUNK_SIZE) {
      const chunk = uniqueRows.slice(i, i + CHUNK_SIZE);
      const { data, error, count, status, statusText } = await supabase
        .from('fact_dam')
        .upsert(chunk, { onConflict: 'ma_dam', ignoreDuplicates: false })
        .select('ma_dam');
      if (!error) {
        factDamCount += data?.length || chunk.length;
      } else {
        console.error(`[Cron sync-dam] fact_dam chunk ${i} error:`, error.message, error.code, error.details);
        // Log first row of failed chunk for debugging
        console.error(`[Cron sync-dam] First row of failed chunk:`, JSON.stringify(chunk[0]));
      }
    }

    // 3. Upsert vào dim_dam (các cột cơ bản)
    // Kiểm tra xem cột 'ngay' đã tồn tại trong dim_dam chưa
    const { error: ngayCheck } = await supabase.from('dim_dam').select('ngay').limit(1);
    const hasNgayCol = !ngayCheck || ngayCheck.code !== '42703';
    if (!hasNgayCol) {
      console.warn('[Cron sync-dam] dim_dam chưa có cột "ngay" - bỏ qua cột này');
    }

    const dimRows = uniqueRows.map(r => {
      const row: any = {
        ma_dam:    r.ma_dam,
        loai:      r.loai,
        chi_nhanh: r.chi_nhanh,
        nguoi_mat: r.nguoi_mat,
      };
      if (hasNgayCol) row.ngay = r.ngay;
      return row;
    });

    let dimDamCount = 0;
    let dimDamError = '';
    for (let i = 0; i < dimRows.length; i += CHUNK_SIZE) {
      const chunk = dimRows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('dim_dam').upsert(chunk, { onConflict: 'ma_dam' });
      if (!error) dimDamCount += chunk.length;
      else {
        dimDamError = `chunk ${i}: ${error.message} (code: ${error.code}, details: ${error.details})`;
        console.error('[Cron sync-dam] dim_dam error:', dimDamError);
      }
    }

    const summary = {
      scheduled_at: new Date().toISOString(),
      success: true,
      message: 'Đồng bộ tự động thành công!',
      sheet_rows_parsed: rows.length,
      unique_rows: uniqueRows.length,
      duplicates_removed: dupeCount,
      fact_dam_upserted: factDamCount,
      dim_dam_upserted: dimDamCount,
      ...(dimDamError ? { dim_dam_error: dimDamError } : {}),
    };

    console.log('[Cron sync-dam] ✅ Sync hoàn thành:', JSON.stringify(summary));
    return NextResponse.json(summary);

  } catch (error: any) {
    console.error('[Cron sync-dam] ❌ Sync thất bại:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Vercel: cho phép chạy tối đa 5 phút
export const maxDuration = 300;
