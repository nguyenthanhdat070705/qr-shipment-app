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
  let body: Partial<ConfirmShipmentRequest>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Dữ liệu gửi lên không hợp lệ (JSON lỗi).', 'VALIDATION_ERROR', 400);
  }

  const { qrCode, hoTen, email, note, chucVu, maSanPhamXacNhan, maDonHang } = body;

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

  // ── Bước 2.5: Kiểm tra mã đám đã xuất chưa (mỗi đám chỉ xuất 1 lần) ───
  if (trimmedMaDonHang) {
    const { data: existingExport } = await supabaseAdmin
      .from('export_confirmations')
      .select('stt, ma_san_pham, created_at')
      .ilike('ghi_chu', `%${trimmedMaDonHang}%`)
      .limit(1);

    if (existingExport && existingExport.length > 0) {
      const prev = existingExport[0];
      return errorResponse(
        `Mã đám "${trimmedMaDonHang}" đã được xuất hàng trước đó (SP: ${prev.ma_san_pham}). Mỗi đám chỉ được xuất 1 lần.`,
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
  const ngayXuat = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const thoiGianXuat = now.toTimeString().slice(0, 8); // HH:MM:SS

  // Escape single quotes to prevent SQL injection
  const escStr = (s: string | null) =>
    s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;

  const rawInsertSql = `
    INSERT INTO export_confirmations
      (ma_san_pham, ho_ten, email, chuc_vu, ghi_chu, ngay_xuat, thoi_gian_xuat)
    VALUES
      (${escStr(maSanPham)}, ${escStr(trimmedHoTen)}, ${escStr(trimmedEmail)},
       ${escStr(trimmedChucVu)}, ${escStr(trimmedNote)},
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
      ghi_chu:     trimmedNote,
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
  if (!confirmation.ngay_xuat) confirmation.ngay_xuat = new Date().toISOString().split('T')[0];
  if (!confirmation.thoi_gian_xuat) confirmation.thoi_gian_xuat = new Date().toTimeString().slice(0, 8);
  if (!confirmation.created_at) confirmation.created_at = new Date().toISOString();
  if (!confirmation.stt) confirmation.stt = 0;

  // ── Bước 5.5: Trừ tồn kho trong fact_inventory (dùng SQL trực tiếp) ─────
  try {
    // Dùng raw SQL để tránh lỗi encoding tên cột tiếng Việt
    const { error: deductErr } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        UPDATE fact_inventory
        SET "Số lượng" = GREATEST(0, CAST("Số lượng" AS INTEGER) - 1),
            "Ghi chú"  = GREATEST(0, CAST("Số lượng" AS INTEGER) - 1)
        WHERE "Tên hàng hóa" = '${productId}'
          AND CAST("Số lượng" AS INTEGER) > 0
          AND ctid = (
            SELECT ctid FROM fact_inventory
            WHERE "Tên hàng hóa" = '${productId}'
              AND CAST("Số lượng" AS INTEGER) > 0
            ORDER BY CAST("Số lượng" AS INTEGER) DESC
            LIMIT 1
          )
      `
    });

    if (deductErr) {
      // exec_sql không có → fallback dùng REST API không filter .gt()
      console.warn('[confirm-shipment] exec_sql thất bại, thử REST fallback:', deductErr.message);

      const { data: allRows } = await supabaseAdmin
        .from('fact_inventory')
        .select('Mã, Số lượng')
        .eq('Tên hàng hóa', productId);

      const validRows = (allRows || []).filter((r: any) => Number(r['Số lượng']) > 0);
      if (validRows.length > 0) {
        validRows.sort((a: any, b: any) => Number(b['Số lượng']) - Number(a['Số lượng']));
        const best = validRows[0] as any;
        const newQty = Math.max(0, Number(best['Số lượng']) - 1);
        const { error: restErr } = await supabaseAdmin
          .from('fact_inventory')
          .update({ 'Số lượng': newQty, 'Ghi chú': newQty })
          .eq('Mã', best['Mã']);
        if (restErr) {
          console.error('[confirm-shipment] REST fallback cũng thất bại:', restErr.message);
        } else {
          console.log(`[confirm-shipment] ✅ REST fallback: SL ${best['Số lượng']} → ${newQty}`);
        }
      }
    } else {
      console.log(`[confirm-shipment] ✅ SQL trực tiếp trừ kho thành công cho productId=${productId}`);
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
      },
    })
    .then(({ error }) => {
      if (error) console.warn('[confirm-shipment] Ghi log thất bại (bỏ qua):', error.message);
    });

  // ── Bước 6.5: Gửi email thông báo phòng mua hàng ────────────────
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const displayDonHang = typeof maDonHang === 'string' ? maDonHang : 'Không xác định';
  
  try {
    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'phongmuahang@blackstones.vn', // Mặc định hoặc cấu hình
        subject: `[Thông báo xuất kho] Mã đám: ${displayDonHang}`,
        html: `
          <h3>Thông báo xuất kho mới</h3>
          <p><strong>Mã đám (Đơn hàng):</strong> ${displayDonHang}</p>
          <p><strong>Người xuất:</strong> ${trimmedHoTen} (${trimmedEmail})</p>
          <p><strong>Sản phẩm:</strong> ${productName} (Mã: ${maSanPham})</p>
          <p><strong>Số lượng xuất:</strong> 1</p>
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
