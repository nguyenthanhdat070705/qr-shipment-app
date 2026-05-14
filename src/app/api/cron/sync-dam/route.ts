/**
 * GET /api/cron/sync-dam
 * Được gọi bởi Vercel Cron mỗi 10 phút (xem vercel.json)
 * Bảo vệ bằng CRON_SECRET (Vercel tự inject header Authorization)
 * Sync: Google Sheets → fact_dam → dim_dam
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import { normalizeDateVN } from '@/lib/utils/date';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GOOGLE_SHEET_ID = '1NySorW3c07R_w7smqMkGbAja6I9rIVLT4s0OGZEOIOg';

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

    // Normalize Vietnamese header names to DB column names
    const HEADER_TO_DB: Record<string, string> = {
      'stt': 'stt',
      'ngày': 'ngay', 'ngay': 'ngay',
      'tháng': 'thang', 'thang': 'thang',
      'mã đám': 'ma_dam', 'ma dam': 'ma_dam', 'mã dam': 'ma_dam',
      'loại': 'loai', 'loai': 'loai', 'phân loại': 'loai',
      'chi nhánh': 'chi_nhanh', 'chi nhanh': 'chi_nhanh', 'cn': 'chi_nhanh',
      'người mất': 'nguoi_mat', 'nguoi mat': 'nguoi_mat', 'ng mất': 'nguoi_mat',
      'địa chỉ tổ chức': 'dia_chi_to_chuc', 'đc tổ chức': 'dia_chi_to_chuc', 'nơi tổ chức': 'dia_chi_to_chuc',
      'địa chỉ chôn thiêu': 'dia_chi_chon_thieu', 'địa chỉ chôn/thiêu': 'dia_chi_chon_thieu', 'đc chôn/thiêu': 'dia_chi_chon_thieu', 'nơi chôn/thiêu': 'dia_chi_chon_thieu',
      'giờ liệm': 'gio_liem', 'gio liem': 'gio_liem', 'giờ khâm liệm': 'gio_liem',
      'ngày liệm': 'ngay_liem', 'ngay liem': 'ngay_liem', 'ngày khâm liệm': 'ngay_liem',
      'giờ di quan': 'gio_di_quan', 'gio di quan': 'gio_di_quan', 'giờ đi quan': 'gio_di_quan',
      'ngày di quan': 'ngay_di_quan', 'ngay di quan': 'ngay_di_quan', 'ngày đi quan': 'ngay_di_quan',
      'sale': 'sale',
      'điều phối': 'dieu_phoi', 'dieu phoi': 'dieu_phoi',
      'thầy sl': 'thay_so_luong', 'thay sl': 'thay_so_luong', 'thầy số lượng': 'thay_so_luong',
      'thầy ncc': 'thay_ncc', 'thay ncc': 'thay_ncc',
      'thầy tên': 'thay_ten', 'thay ten': 'thay_ten', 'tên thầy': 'thay_ten',
      'hòm loại': 'hom_loai', 'hom loai': 'hom_loai', 'loại hòm': 'hom_loai',
      'hòm ncc/kho': 'hom_ncc_hay_kho', 'hòm ncc hay kho': 'hom_ncc_hay_kho', 'hom ncc': 'hom_ncc_hay_kho',
      'hoa': 'hoa',
      'đá khô/tiêm focmol': 'da_kho_tiem_focmol', 'đá khô/ tiêm focmol': 'da_kho_tiem_focmol', 'đá khô': 'da_kho_tiem_focmol', 'focmol': 'da_kho_tiem_focmol',
      'kèn tây sl': 'ken_tay_so_le', 'kèn tây số lễ': 'ken_tay_so_le', 'kèn tây số lẻ': 'ken_tay_so_le',
      'kèn tây ncc': 'ken_tay_ncc',
      'quay phim chụp hình gói dv': 'quay_phim_chup_hinh_goi_dv', 'quay phim + chụp hình gói dv': 'quay_phim_chup_hinh_goi_dv', 'media gói': 'quay_phim_chup_hinh_goi_dv',
      'quay phim chụp hình ncc': 'quay_phim_chup_hinh_ncc', 'quay phim + chụp hình ncc': 'quay_phim_chup_hinh_ncc', 'media ncc': 'quay_phim_chup_hinh_ncc',
      'mâm cúng sl': 'mam_cung_so_luong', 'mâm cúng số lượng': 'mam_cung_so_luong',
      'mâm cúng ncc': 'mam_cung_ncc',
      'di ảnh/cáo phó': 'di_anh_cao_pho', 'di ảnh + cáo phó': 'di_anh_cao_pho', 'di ảnh': 'di_anh_cao_pho', 'cáo phó': 'di_anh_cao_pho',
      'băng rôn': 'bang_ron', 'bang ron': 'bang_ron',
      'lá triệu/bài vị': 'la_trieu_bai_vi', 'lá triệu': 'la_trieu_bai_vi',
      'nhạc': 'nhac', 'nhac': 'nhac',
      'thuê rạp bàn ghế sl': 'thue_rap_ban_ghe_so_luong', 'rạp bàn ghế sl': 'thue_rap_ban_ghe_so_luong',
      'thuê rạp bàn ghế ncc': 'thue_rap_ban_ghe_ncc', 'rạp bàn ghế ncc': 'thue_rap_ban_ghe_ncc',
      'hủ tro cốt': 'hu_tro_cot', 'hu tro cot': 'hu_tro_cot',
      'teabreak': 'teabreak', 'tea break': 'teabreak',
      'xe tang lễ loại': 'xe_tang_le_loai', 'xe tang lễ': 'xe_tang_le_loai',
      'xe tang lễ đạo tỳ': 'xe_tang_le_dao_ty', 'đạo tỳ': 'xe_tang_le_dao_ty',
      'xe tang lễ ncc': 'xe_tang_le_ncc',
      'xe khách loại': 'xe_khach_loai', 'xe khách': 'xe_khach_loai',
      'xe khách ncc': 'xe_khach_ncc',
      'xe cấp cứu': 'xe_cap_cuu',
      'xe khác': 'xe_khac',
      'thuê nv trực': 'thue_nv_truc', 'nv trực': 'thue_nv_truc',
      'bao đồn': 'bao_don', 'bao don': 'bao_don',
      'ghi chú': 'ghi_chu', 'ghi chu': 'ghi_chu',
      'hình thức chôn thiêu': 'chon_thieu', 'chon thieu': 'chon_thieu', 'chôn thiêu': 'chon_thieu',
    };

    // Fallback column order (khớp với Google Sheet hiện tại) để dùng khi header detection thất bại
    const FALLBACK_ORDER = [
      'stt', 'ngay', 'thang', 'ma_dam', 'loai', 'chi_nhanh', 'nguoi_mat',
      'dia_chi_to_chuc', 'dia_chi_chon_thieu', 'gio_liem', 'ngay_liem',
      'gio_di_quan', 'ngay_di_quan', 'sale', 'dieu_phoi',
      'thay_so_luong', 'thay_ncc', 'thay_ten',
      'hom_loai', 'hom_ncc_hay_kho', 'hoa', 'da_kho_tiem_focmol',
      'ken_tay_so_le', 'ken_tay_ncc',
      'quay_phim_chup_hinh_goi_dv', 'quay_phim_chup_hinh_ncc',
      'mam_cung_so_luong', 'mam_cung_ncc', 'di_anh_cao_pho', 'bang_ron',
      'la_trieu_bai_vi', 'nhac', 'thue_rap_ban_ghe_so_luong', 'thue_rap_ban_ghe_ncc',
      'hu_tro_cot', 'teabreak',
      'xe_tang_le_loai', 'xe_tang_le_dao_ty', 'xe_tang_le_ncc',
      'xe_khach_loai', 'xe_khach_ncc', 'xe_cap_cuu', 'xe_khac',
      'thue_nv_truc', 'bao_don', 'ghi_chu', 'chon_thieu',
    ];

    const rows: any[] = [];
    const syncStartedAt = new Date().toISOString();

    const getSheetMonth = (sheetName: string): number | null => {
      const match = sheetName.toLowerCase().match(/(?:tháng|thang)\s*0?(\d{1,2})/);
      if (!match) return null;
      const month = Number(match[1]);
      return month >= 1 && month <= 12 ? month : null;
    };

    const getMonthFromDamCode = (maDam: string): number | null => {
      const match = String(maDam || '').match(/^(?:BL)?\d{2}(\d{2})/i);
      if (!match) return null;
      const month = Number(match[1]);
      return month >= 1 && month <= 12 ? month : null;
    };

    const normalizeHeader = (value: unknown) => String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[""]/g, '')
      .replace(/\s+/g, ' ');

    const mapHeaderCandidate = (candidate: string, colIndex: number, colMap: Record<string, number>) => {
      const raw = normalizeHeader(candidate);
      if (!raw) return;

      if (HEADER_TO_DB[raw] && colMap[HEADER_TO_DB[raw]] === undefined) {
        colMap[HEADER_TO_DB[raw]] = colIndex;
        return;
      }

      for (const [pattern, dbCol] of Object.entries(HEADER_TO_DB)) {
        if (raw.includes(pattern) && colMap[dbCol] === undefined) {
          colMap[dbCol] = colIndex;
          return;
        }
      }
    };

    // 1. Fetch toàn bộ workbook từ Google Sheets dưới dạng Excel (.xlsx)
    console.log(`[Cron sync-dam] 📥 Đang tải file Excel từ Google Sheets...`);
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error('Không thể tải file XLSX từ Google Sheets. Có thể file chưa public.');
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // Lọc các sheet hợp lệ: Bắt đầu bằng "THÁNG" hoặc là "Data2Sync"
    const validSheetNames = workbook.SheetNames.filter(name => {
      const lower = name.toLowerCase();
      return lower.includes('tháng') || lower.includes('thang') || lower === 'data2sync';
    });

    console.log(`[Cron sync-dam] 📄 Các sheet sẽ được đồng bộ:`, validSheetNames);

    for (const sheetName of validSheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      // Chuyển worksheet trực tiếp thành mảng JSON 2 chiều (bỏ qua CSV text và split để tránh lỗi xuống dòng trong ô)
      const sheetData = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true, defval: '' });

      // Tìm Header
      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const row = sheetData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.join(' ').toLowerCase();

        if ((rowStr.includes('stt') || row[0]?.toString().toLowerCase().includes('stt')) && (rowStr.includes('ng') || rowStr.includes('th'))) {
          headerIdx = i; break;
        }
        if (rowStr.includes('mã đám') || rowStr.includes('ma dam')) {
          headerIdx = i; break;
        }
      }

      if (headerIdx === -1) {
        console.warn(`[Cron sync-dam] ⚠️ Không tìm thấy header ở sheet ${sheetName}, bỏ qua...`);
        continue;
      }

      // Try to build column map from the main header row and its subheader row.
      const headerFields = sheetData[headerIdx].map(c => String(c));
      const subHeaderFields = Array.isArray(sheetData[headerIdx + 1])
        ? sheetData[headerIdx + 1].map((c: any) => String(c))
        : [];
      const colMap: Record<string, number> = {};
      let headerMapped = false;

      if (headerFields && headerFields.length >= 4) {
        let activeGroup = '';
        for (let ci = 0; ci < headerFields.length; ci++) {
          const top = normalizeHeader(headerFields[ci]);
          const sub = normalizeHeader(subHeaderFields[ci]);

          if (top) activeGroup = top;

          mapHeaderCandidate(top, ci, colMap);
          mapHeaderCandidate(sub, ci, colMap);
          if (activeGroup && sub) {
            mapHeaderCandidate(`${activeGroup} ${sub}`, ci, colMap);
          }
        }
        // Some month tabs have a blank A1 where STT should be, while values still live in column A.
        if (colMap['stt'] === undefined && colMap['ma_dam'] !== undefined && colMap['ma_dam'] >= 3) {
          colMap['stt'] = 0;
        }
        // Consider header mapped if we found at least ma_dam + 3 other columns
        headerMapped = !!colMap['ma_dam'] && Object.keys(colMap).length >= 4;
      }

      if (headerMapped) {
        console.log(`[Cron sync-dam] ✅ Header auto-mapped for sheet ${sheetName}: ${Object.keys(colMap).length} columns detected`);
      } else {
        console.warn(`[Cron sync-dam] ⚠️ Header mapping failed for sheet ${sheetName}, falling back to index-based mapping`);
        FALLBACK_ORDER.forEach((col, idx) => { colMap[col] = idx; });
      }

      // Helper: convert Excel date to DD/MM/YYYY string
      const parseExcelValue = (val: any) => {
        if (typeof val === 'number') {
           // If it's a typical Excel date serial (between year 2000 and 2050 -> ~36000 to ~54000)
           if (val > 36000 && val < 55000) {
             const utc_days  = Math.floor(val - 25569);
             const utc_value = utc_days * 86400;                                        
             const date_info = new Date(utc_value * 1000);
             const d = String(date_info.getUTCDate()).padStart(2, '0');
             const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
             const y = date_info.getUTCFullYear();
             return `${d}/${m}/${y}`;
           }
           return val.toString();
        }
        return val?.toString().trim() || '';
      };

      // Helper: get value from row by DB column name
      const getCol = (r: any[], col: string) => parseExcelValue(r[colMap[col] ?? -1]);

      // Helper: get normalized date value, using thang column as anchor
      const getDateCol = (r: any[], col: string, expectedMonth: number | null) => {
        const raw = parseExcelValue(r[colMap[col] ?? -1]);
        return normalizeDateVN(raw, { expectedMonth });
      };

      // Parse Data
      let countForGid = 0;
      for (let i = headerIdx + 1; i < sheetData.length; i++) {
        const r = sheetData[i];
        if (!r || !Array.isArray(r) || r.length === 0) continue;

        const stt = getCol(r, 'stt');
        const maDam = getCol(r, 'ma_dam');
        
        // Bỏ qua nếu không có mã đám hoặc stt
        if (!maDam || !stt) continue;
        
        // Bỏ qua các dòng rác bị gõ nhầm (Mã đám thật thường chỉ có 6 ký tự, ví dụ 260501 hoặc BL2601)
        if (maDam.length > 20) {
           console.warn(`[Cron sync-dam] ⚠️ Bỏ qua dòng rác có mã đám quá dài: ${maDam.substring(0, 30)}...`);
           continue;
        }

        const thangRaw = getCol(r, 'thang');
        const thangNum = parseInt(thangRaw, 10);
        const expectedMonth = (thangNum >= 1 && thangNum <= 12 ? thangNum : null)
          || getSheetMonth(sheetName)
          || getMonthFromDamCode(maDam);

        rows.push({
          stt,
          ngay:                          getDateCol(r, 'ngay', expectedMonth),
          thang:                         thangRaw,
          ma_dam:                        maDam,
          loai:                          getCol(r, 'loai'),
          chi_nhanh:                     getCol(r, 'chi_nhanh'),
          nguoi_mat:                     getCol(r, 'nguoi_mat'),
          dia_chi_to_chuc:               getCol(r, 'dia_chi_to_chuc'),
          dia_chi_chon_thieu:            getCol(r, 'dia_chi_chon_thieu'),
          gio_liem:                      getCol(r, 'gio_liem'),
          ngay_liem:                     getDateCol(r, 'ngay_liem', expectedMonth),
          gio_di_quan:                   getCol(r, 'gio_di_quan'),
          ngay_di_quan:                  getDateCol(r, 'ngay_di_quan', expectedMonth),
          sale:                          getCol(r, 'sale'),
          dieu_phoi:                     getCol(r, 'dieu_phoi'),
          thay_so_luong:                 getCol(r, 'thay_so_luong'),
          thay_ncc:                      getCol(r, 'thay_ncc'),
          thay_ten:                      getCol(r, 'thay_ten'),
          hom_loai:                      getCol(r, 'hom_loai'),
          hom_ncc_hay_kho:               getCol(r, 'hom_ncc_hay_kho'),
          hoa:                           getCol(r, 'hoa'),
          da_kho_tiem_focmol:            getCol(r, 'da_kho_tiem_focmol'),
          ken_tay_so_le:                 getCol(r, 'ken_tay_so_le'),
          ken_tay_ncc:                   getCol(r, 'ken_tay_ncc'),
          quay_phim_chup_hinh_goi_dv:    getCol(r, 'quay_phim_chup_hinh_goi_dv'),
          quay_phim_chup_hinh_ncc:       getCol(r, 'quay_phim_chup_hinh_ncc'),
          mam_cung_so_luong:             getCol(r, 'mam_cung_so_luong'),
          mam_cung_ncc:                  getCol(r, 'mam_cung_ncc'),
          di_anh_cao_pho:                getCol(r, 'di_anh_cao_pho'),
          bang_ron:                      getCol(r, 'bang_ron'),
          la_trieu_bai_vi:               getCol(r, 'la_trieu_bai_vi'),
          nhac:                          getCol(r, 'nhac'),
          thue_rap_ban_ghe_so_luong:     getCol(r, 'thue_rap_ban_ghe_so_luong'),
          thue_rap_ban_ghe_ncc:          getCol(r, 'thue_rap_ban_ghe_ncc'),
          hu_tro_cot:                    getCol(r, 'hu_tro_cot'),
          teabreak:                      getCol(r, 'teabreak'),
          xe_tang_le_loai:               getCol(r, 'xe_tang_le_loai'),
          xe_tang_le_dao_ty:             getCol(r, 'xe_tang_le_dao_ty'),
          xe_tang_le_ncc:                getCol(r, 'xe_tang_le_ncc'),
          xe_khach_loai:                 getCol(r, 'xe_khach_loai'),
          xe_khach_ncc:                  getCol(r, 'xe_khach_ncc'),
          xe_cap_cuu:                    getCol(r, 'xe_cap_cuu'),
          xe_khac:                       getCol(r, 'xe_khac'),
          thue_nv_truc:                  getCol(r, 'thue_nv_truc'),
          bao_don:                       getCol(r, 'bao_don'),
          ghi_chu:                       getCol(r, 'ghi_chu'),
          chon_thieu:                    getCol(r, 'chon_thieu'),
          updated_at:                     syncStartedAt,
        });
        countForGid++;
      }
      console.log(`[Cron sync-dam] 📥 Sheet ${sheetName} parsed ${countForGid} rows`);
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
      scheduled_at: syncStartedAt,
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
