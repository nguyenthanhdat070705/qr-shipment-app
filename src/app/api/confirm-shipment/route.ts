import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isValidEmail } from '@/lib/utils/email';
import { PRODUCT_CONFIG } from '@/config/product.config';
import type {
  ConfirmShipmentRequest,
  ConfirmShipmentResponse,
  ConfirmShipmentError,
} from '@/types';

type ErrorCode = ConfirmShipmentError['code'];

function errorResponse(error: string, code: ErrorCode, status: number): NextResponse {
  const body: ConfirmShipmentError = { success: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * Đảm bảo bảng export_confirmations tồn tại.
 * Nếu chưa có thì tạo mới qua raw SQL.
 */
async function ensureConfirmationTable(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS export_confirmations (
        stt SERIAL PRIMARY KEY,
        ma_san_pham TEXT NOT NULL,
        ho_ten TEXT NOT NULL,
        email TEXT NOT NULL,
        chuc_vu TEXT DEFAULT '',
        ghi_chu TEXT,
        ngay_xuat DATE DEFAULT CURRENT_DATE,
        thoi_gian_xuat TIME DEFAULT CURRENT_TIME,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  });
  if (error) {
    console.warn('[confirm-shipment] Không thể tạo bảng qua RPC (bỏ qua):', error.message);
  }
}

/**
 * POST /api/confirm-shipment
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabaseAdmin = getSupabaseAdmin();

  // ── Bước 1: Phân tích request body ──────────────────────
  let body: Partial<ConfirmShipmentRequest & { soLuong?: number }>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Dữ liệu gửi lên không hợp lệ (JSON lỗi).', 'VALIDATION_ERROR', 400);
  }

  const { qrCode, hoTen, email, note, chucVu, maSanPhamXacNhan, maDonHang } = body;
  const soLuong = Math.max(1, Number(body.soLuong) || 1);

  if (!qrCode || typeof qrCode !== 'string' || qrCode.trim() === '') {
    return errorResponse('Không xác định được mã QR hiện tại.', 'VALIDATION_ERROR', 400);
  }
  if (!maSanPhamXacNhan || typeof maSanPhamXacNhan !== 'string' || maSanPhamXacNhan.trim() === '') {
    return errorResponse('Vui lòng nhập lại mã sản phẩm để xác nhận.', 'VALIDATION_ERROR', 400);
  }
  if (!hoTen || typeof hoTen !== 'string' || hoTen.trim() === '') {
    return errorResponse('Họ và tên là bắt buộc.', 'VALIDATION_ERROR', 400);
  }
  if (!email || typeof email !== 'string') {
    return errorResponse('Email là bắt buộc.', 'VALIDATION_ERROR', 400);
  }
  
  const trimmedEmail = email.trim();
  if (!isValidEmail(trimmedEmail)) {
    return errorResponse('Địa chỉ email không hợp lệ.', 'VALIDATION_ERROR', 400);
  }
  if (!chucVu || typeof chucVu !== 'string' || chucVu.trim() === '') {
    return errorResponse('Chức vụ là bắt buộc.', 'VALIDATION_ERROR', 400);
  }

  const trimmedQrCode = qrCode.trim();
  const trimmedHoTen  = hoTen.trim();
  const trimmedChucVu = chucVu.trim();
  const trimmedNote   = typeof note === 'string' ? note.trim() || null : null;
  const trimmedMaSanPhamXacNhan = maSanPhamXacNhan.trim();
  const trimmedMaDonHang = typeof maDonHang === 'string' ? maDonHang.trim() : '';

  // Validate mã đám: bắt buộc, đúng 6 số
  if (!trimmedMaDonHang) {
    return errorResponse('Vui lòng nhập mã đám (bắt buộc).', 'VALIDATION_ERROR', 400);
  }
  if (!/^\d{6}$/.test(trimmedMaDonHang)) {
    return errorResponse('Mã đám phải đúng 6 chữ số (vd: 260108).', 'VALIDATION_ERROR', 400);
  }

  // ── Bước 2: Tìm sản phẩm trong dim_hom ──────────────────────────────
  const { data: product, error: fetchError } = await supabaseAdmin
    .from('dim_hom')
    .select('id, ma_hom, ten_hom')
    .eq('ma_hom', trimmedQrCode)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[confirm-shipment] Lỗi DB khi tìm sản phẩm:', fetchError);
    return errorResponse(`Lỗi tìm sản phẩm: ${fetchError.message}`, 'DATABASE_ERROR', 500);
  }

  if (!product) {
    return errorResponse(
      `Không tìm thấy sản phẩm với mã "${trimmedQrCode}".`,
      'PRODUCT_NOT_FOUND',
      404
    );
  }

  const productId     = String(product.id);
  const productName   = String(product.ten_hom);
  const maSanPham     = String(product.ma_hom);

  // Đối chiếu mã sản phẩm
  if (trimmedMaSanPhamXacNhan.toUpperCase() !== maSanPham.toUpperCase() && 
      trimmedMaSanPhamXacNhan.toUpperCase() !== trimmedQrCode.toUpperCase()) {
    return errorResponse(
      `Mã sản phẩm nhập vào không khớp. Vui lòng nhập đúng mã: ${maSanPham}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // ── Bước 2.5: Kiểm tra mã đám đã xuất chưa (mỗi mã đám chỉ xuất 1 lần) ───
  if (trimmedMaDonHang) {
    const damTag = `[DAM:${trimmedMaDonHang}]`;
    const { data: existingExport } = await supabaseAdmin
      .from('export_confirmations')
      .select('stt, ma_san_pham, ghi_chu, created_at')
      .like('ghi_chu', `%${damTag}%`)
      .limit(1);

    if (existingExport && existingExport.length > 0) {
      const prev = existingExport[0];
      const exportDate = prev.created_at 
        ? new Date(prev.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      return errorResponse(
        `Mã đám "${trimmedMaDonHang}" đã được xuất kho trước đó (Phiếu #${prev.stt}, SP: ${prev.ma_san_pham}${exportDate ? `, ngày ${exportDate}` : ''}). Mỗi mã đám chỉ được xuất 1 lần.`,
        'ALREADY_EXPORTED',
        400
      );
    }
  }

  // ── Bước 2.6: Kiểm tra tồn kho >= số lượng xuất ───
  {
    let totalStock = 0;
    try {
      // Dùng SDK query trực tiếp — đáng tin cậy hơn exec_sql
      const { data: invRows, error: invErr } = await supabaseAdmin
        .from('fact_inventory')
        .select('*')
        .eq('Tên hàng hóa', productId);

      if (!invErr && invRows) {
        totalStock = invRows.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r['Số lượng']) || 0), 0);
        console.log(`[confirm-shipment] SDK query OK: ${invRows.length} rows, totalStock=${totalStock}, productId=${productId}`);
      } else {
        console.error(`[confirm-shipment] SDK query ERROR:`, invErr?.message, `rows:`, invRows);
      }

      // Nếu SDK thất bại, thử fallback bằng RPC
      if (totalStock === 0 && invErr) {
        console.warn('[confirm-shipment] SDK query failed, trying RPC:', invErr.message);
        const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('exec_sql', {
          sql: `SELECT COALESCE(SUM(CAST("Số lượng" AS INTEGER)), 0) AS total_stock FROM fact_inventory WHERE "Tên hàng hóa" = '${productId}'`
        });
        if (!rpcErr && rpcData) {
          const rows = Array.isArray(rpcData) ? rpcData : [];
          totalStock = rows.length > 0 ? Number(rows[0].total_stock || 0) : 0;
        }
      }
    } catch (invCheckErr) {
      console.warn('[confirm-shipment] Lỗi kiểm tra tồn kho:', invCheckErr);
    }

    if (totalStock < soLuong) {
      return errorResponse(
        `Không đủ tồn kho để xuất. Tồn kho hiện tại: ${totalStock}, số lượng yêu cầu xuất: ${soLuong}. Vui lòng kiểm tra lại.`,
        'VALIDATION_ERROR',
        400
      );
    }
  }

  // ── Bước 3: Guard — (Đã xuất kho - Bỏ qua vì dùng dim_hom) ─────────────────────────
  // Trong schema mới, dim_hom là danh mục sản phẩm nên không có trạng thái "exported".
  // Lịch sử xuất được ghi nhận qua export_confirmations và trừ tồn trong fact_inventory.

  // ── Bước 4: Insert vào export_confirmations (bypass RLS bằng raw SQL) ─────
  // Dùng raw SQL để hoàn toàn bypass Row Level Security
  let confirmation: Record<string, unknown> | null = null;
  let insertError: { message: string; code?: string } | null = null;

  const now = new Date();
  const options = { timeZone: 'Asia/Ho_Chi_Minh', hour12: false };
  const ngayXuat = now.toLocaleDateString('en-CA', options); // YYYY-MM-DD in VN time
  const thoiGianXuat = now.toLocaleTimeString('en-GB', options); // HH:MM:SS in VN time

  // Escape single quotes to prevent SQL injection
  const escStr = (s: string | null) =>
    s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;

  // Build ghi_chu with embedded [DAM:xxx] tag for reliable duplicate checking
  const damMarker = trimmedMaDonHang ? `[DAM:${trimmedMaDonHang}]` : '';
  const finalNote = [damMarker, trimmedNote].filter(Boolean).join(' ') || null;

  const rawInsertSql = `
    INSERT INTO export_confirmations
      (ma_san_pham, ho_ten, email, chuc_vu, ghi_chu, ngay_xuat, thoi_gian_xuat)
    VALUES
      (${escStr(maSanPham)}, ${escStr(trimmedHoTen)}, ${escStr(trimmedEmail)},
       ${escStr(trimmedChucVu)}, ${escStr(finalNote)},
       '${ngayXuat}', '${thoiGianXuat}')
    RETURNING stt, ho_ten, email, ngay_xuat, thoi_gian_xuat, created_at;
  `;

  try {
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('exec_sql', {
      sql: rawInsertSql,
    });

    if (!rpcErr && rpcData) {
      // exec_sql returns rows as JSON array string or object
      const rows = Array.isArray(rpcData) ? rpcData : JSON.parse(JSON.stringify(rpcData));
      confirmation = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } else {
      console.warn('[confirm-shipment] exec_sql insert failed, trying SDK insert:', rpcErr?.message);
    }
  } catch (rpcEx) {
    console.warn('[confirm-shipment] exec_sql exception:', rpcEx);
  }

  // Fallback: SDK insert (works if service_role is correctly configured)
  if (!confirmation) {
    const insertData: Record<string, unknown> = {
      ma_san_pham: maSanPham,
      ho_ten:      trimmedHoTen,
      email:       trimmedEmail,
      chuc_vu:     trimmedChucVu,
      ghi_chu:     finalNote,
      ngay_xuat:   ngayXuat,
      thoi_gian_xuat: thoiGianXuat,
    };

    const result1 = await supabaseAdmin
      .from(PRODUCT_CONFIG.CONFIRMATION_TABLE as string)
      .insert(insertData)
      .select('stt, ho_ten, email, ngay_xuat, thoi_gian_xuat, created_at')
      .single();

    insertError = result1.error;
    confirmation = result1.data as Record<string, unknown> | null;
  }

  if (!confirmation) {
    console.error('[confirm-shipment] Lỗi khi lưu xác nhận:', insertError);
    return errorResponse(
      `Không thể lưu xác nhận: ${insertError?.message || 'Unknown error'}. Vui lòng kiểm tra bảng "${PRODUCT_CONFIG.CONFIRMATION_TABLE}" hoặc RLS trong Supabase.`,
      'DATABASE_ERROR',
      500
    );
  }

  // Gán giá trị mặc định nếu raw SQL không trả về đủ fields
  if (!confirmation.ngay_xuat) confirmation.ngay_xuat = ngayXuat;
  if (!confirmation.thoi_gian_xuat) confirmation.thoi_gian_xuat = thoiGianXuat;
  if (!confirmation.created_at) confirmation.created_at = new Date().toISOString();
  if (!confirmation.stt) confirmation.stt = 0;

  // ── Bước 5.5: Trừ tồn kho trong fact_inventory ─────
  try {
    // Dùng SDK trực tiếp — đáng tin cậy hơn exec_sql
    const { data: allRows } = await supabaseAdmin
      .from('fact_inventory')
      .select('*')
      .eq('Tên hàng hóa', productId);

    const validRows = (allRows || []).filter((r: Record<string, unknown>) => Number(r['Số lượng']) > 0);
    
    if (validRows.length > 0) {
      // Ưu tiên trừ từ kho có nhiều nhất
      validRows.sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(b['Số lượng']) - Number(a['Số lượng']));
      const best = validRows[0];
      const newQty = Math.max(0, Number(best['Số lượng']) - soLuong);
      const { error: updateErr } = await supabaseAdmin
        .from('fact_inventory')
        .update({ 'Số lượng': newQty, 'Ghi chú': newQty })
        .eq('Mã', best['Mã'] as string);
      if (updateErr) {
        console.error('[confirm-shipment] Lỗi trừ kho:', updateErr.message);
      } else {
        console.log(`[confirm-shipment] ✅ Trừ kho: ${best['Mã']} | SL ${best['Số lượng']} → ${newQty}`);
      }
    } else {
      console.warn('[confirm-shipment] Không tìm thấy dòng inventory có tồn > 0 để trừ');
    }
  } catch (invDeductErr) {
    console.error('[confirm-shipment] Exception trừ kho:', invDeductErr);
  }

  // ── Bước 6: Ghi log (không bắt buộc) ────────────────────
  supabaseAdmin
    .from('product_logs')
    .insert({
      product_id:  productId,
      action_type: 'confirmed_export',
      action_by:   trimmedEmail,
      metadata: {
        ho_ten:      trimmedHoTen,
        ma_san_pham: maSanPham,
        note:        trimmedNote,
        stt:         confirmation.stt,
        so_luong:    soLuong,
      },
    })
    .then(({ error }) => {
      if (error) console.warn('[confirm-shipment] Ghi log thất bại (bỏ qua):', error.message);
    });

  // ── Bước 6.5: Gửi email thông báo phòng mua hàng ────────────────
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const displayDonHang = trimmedMaDonHang || 'Không có mã đám';
  
  try {
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'phongmuahang@blackstones.vn', // Mặc định hoặc cấu hình
        subject: `[Thông báo xuất kho] SP: ${maSanPham}${trimmedMaDonHang ? ` — Đám: ${trimmedMaDonHang}` : ''}`,
        html: `
          <h3>Thông báo xuất kho mới</h3>
          <p><strong>Mã sản phẩm:</strong> ${maSanPham}</p>
          <p><strong>Tên sản phẩm:</strong> ${productName}</p>
          ${trimmedMaDonHang ? `<p><strong>Mã đám:</strong> ${trimmedMaDonHang}</p>` : ''}
          <p><strong>Người xuất:</strong> ${trimmedHoTen} (${trimmedEmail})</p>
          <p><strong>Số lượng xuất:</strong> ${soLuong}</p>
          <p><strong>Ngày xuất:</strong> ${confirmation.ngay_xuat} ${confirmation.thoi_gian_xuat}</p>
          <hr/>
          <p><a href="${origin}/operations">Bấm vào đây để xem / chỉnh sửa thông tin xuất kho</a></p>
          <p><em>Bạn có quyền edit nếu xuất sai (quét 2 lần, mã sai, vv).</em></p>
        `
      })
    });
  } catch (emailError) {
    console.error('[confirm-shipment] Lỗi gọi API gửi email:', emailError);
  }

  // ── Bước 7: Phản hồi thành công ─────────────────────────
  const response: ConfirmShipmentResponse = {
    success: true,
    message: 'Xác nhận xuất hàng thành công.',
    confirmation: {
      ho_ten:         String(confirmation.ho_ten ?? ''),
      email:          String(confirmation.email ?? ''),
      ngay_xuat:      String(confirmation.ngay_xuat ?? ''),
      thoi_gian_xuat: String(confirmation.thoi_gian_xuat ?? ''),
      created_at:     String(confirmation.created_at ?? ''),
      stt:            Number(confirmation.stt ?? 0),
    },
    product: {
      id:     productId,
      name:   productName,
      status: PRODUCT_CONFIG.EXPORTED_STATUS_VALUE as string,
    },
  };

  return NextResponse.json(response, { status: 200 });
}
