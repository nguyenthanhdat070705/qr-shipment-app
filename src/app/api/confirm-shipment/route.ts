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
 * POST /api/confirm-shipment
 *
 * Luồng xử lý:
 *   1. Phân tích và kiểm tra request body (qrCode, hoTen, email)
 *   2. Tìm sản phẩm theo LOOKUP_COLUMN trong TABLE_NAME
 *   3. Guard: không tìm thấy → 404
 *   4. Guard: đã xuất kho → 409
 *   5. Thêm bản ghi vào CONFIRMATION_TABLE (export_confirmations)
 *   6. Cập nhật STATUS_COLUMN = EXPORTED_STATUS_VALUE trong TABLE_NAME
 *   7. (Không bắt buộc) Ghi log hành động
 *   8. Trả về 200 với dữ liệu xác nhận đầy đủ
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

  const { qrCode, hoTen, email, note, chucVu, maSanPhamXacNhan } = body;

  // Kiểm tra mã sản phẩm (lấy từ URL / Context quét)
  if (!qrCode || typeof qrCode !== 'string' || qrCode.trim() === '') {
    return errorResponse('Không xác định được mã QR hiện tại.', 'VALIDATION_ERROR', 400);
  }

  // Yêu cầu nhập đúng mã sản phẩm để xác nhận (chống thao tác nhầm)
  if (!maSanPhamXacNhan || typeof maSanPhamXacNhan !== 'string' || maSanPhamXacNhan.trim() === '') {
    return errorResponse('Vui lòng nhập lại mã sản phẩm để xác nhận.', 'VALIDATION_ERROR', 400);
  }

  // Kiểm tra họ tên
  if (!hoTen || typeof hoTen !== 'string' || hoTen.trim() === '') {
    return errorResponse('Họ và tên là bắt buộc.', 'VALIDATION_ERROR', 400);
  }

  // Kiểm tra email
  if (!email || typeof email !== 'string') {
    return errorResponse('Email là bắt buộc.', 'VALIDATION_ERROR', 400);
  }
  const trimmedEmail = email.trim();
  if (!isValidEmail(trimmedEmail)) {
    return errorResponse('Địa chỉ email không hợp lệ.', 'VALIDATION_ERROR', 400);
  }

  // Kiểm tra chức vụ
  if (!chucVu || typeof chucVu !== 'string' || chucVu.trim() === '') {
    return errorResponse('Chức vụ là bắt buộc.', 'VALIDATION_ERROR', 400);
  }

  const trimmedQrCode = qrCode.trim();
  const trimmedHoTen  = hoTen.trim();
  const trimmedChucVu = chucVu.trim();
  const trimmedNote   = typeof note === 'string' ? note.trim() || null : null;
  const trimmedMaSanPhamXacNhan = maSanPhamXacNhan.trim();

  // ── Bước 2: Tìm sản phẩm theo mã sản phẩm ──────────────
  const selectCols = ['id', 'name', PRODUCT_CONFIG.PRODUCT_CODE_COLUMN, PRODUCT_CONFIG.STATUS_COLUMN]
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .join(', ');

  const { data: product, error: fetchError } = await supabaseAdmin
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .select(selectCols)
    .eq(PRODUCT_CONFIG.LOOKUP_COLUMN as string, trimmedQrCode)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[confirm-shipment] Lỗi DB khi tìm sản phẩm:', fetchError);
    return errorResponse('Lỗi cơ sở dữ liệu khi tìm sản phẩm.', 'DATABASE_ERROR', 500);
  }

  // ── Bước 3: Guard — không tìm thấy ──────────────────────
  if (!product) {
    return errorResponse(
      `Không tìm thấy sản phẩm với mã "${trimmedQrCode}".`,
      'PRODUCT_NOT_FOUND',
      404
    );
  }

  const productRow = product as unknown as Record<string, unknown>;
  const currentStatus = String(productRow[PRODUCT_CONFIG.STATUS_COLUMN] ?? '');
  const productId     = String(productRow['id'] ?? '');
  const productName   = String(productRow['name'] ?? trimmedQrCode);
  // Mã sản phẩm thực tế — dùng PRODUCT_CODE_COLUMN, fallback về giá trị quét
  const maSanPham     = String(productRow[PRODUCT_CONFIG.PRODUCT_CODE_COLUMN] ?? trimmedQrCode);

  // Đối chiếu mã sản phẩm do người dùng nhập thủ công so với mã thực tế
  if (trimmedMaSanPhamXacNhan !== maSanPham && trimmedMaSanPhamXacNhan !== trimmedQrCode) {
    return errorResponse(
      `Mã sản phẩm nhập vào không khớp. Vui lòng nhập đúng mã: ${maSanPham}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // ── Bước 4: Guard — đã xuất kho ─────────────────────────
  if (currentStatus === PRODUCT_CONFIG.EXPORTED_STATUS_VALUE) {
    return errorResponse(
      `Sản phẩm "${maSanPham}" đã được xác nhận xuất kho trước đó.`,
      'ALREADY_EXPORTED',
      409
    );
  }

  // ── Bước 5: Lưu vào export_confirmations ────────────────
  // ngay_xuat, thoi_gian_xuat, created_at dùng DEFAULT của DB
  const { data: confirmation, error: insertError } = await supabaseAdmin
    .from(PRODUCT_CONFIG.CONFIRMATION_TABLE as string)
    .insert({
      ma_san_pham: maSanPham,
      ho_ten:      trimmedHoTen,
      email:       trimmedEmail,
      chuc_vu:     trimmedChucVu,
      ghi_chu:     trimmedNote,
      // ngay_xuat: mặc định current_date (từ DB)
      // thoi_gian_xuat: mặc định current_time (từ DB)
      // created_at: mặc định now() (từ DB)
    })
    .select('stt, ho_ten, email, ngay_xuat, thoi_gian_xuat, created_at')
    .single();

  if (insertError || !confirmation) {
    console.error('[confirm-shipment] Lỗi khi lưu xác nhận:', insertError);
    return errorResponse('Không thể lưu xác nhận xuất hàng vào hệ thống.', 'DATABASE_ERROR', 500);
  }

  // ── Bước 6: Cập nhật trạng thái sản phẩm ───────────────
  const { error: updateError } = await supabaseAdmin
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .update({ [PRODUCT_CONFIG.STATUS_COLUMN]: PRODUCT_CONFIG.EXPORTED_STATUS_VALUE })
    .eq('id', productId);

  if (updateError) {
    console.error('[confirm-shipment] Lỗi cập nhật trạng thái:', updateError);
    // Bản ghi đã lưu thành công — không rollback, chỉ cảnh báo
    console.warn('[confirm-shipment] Xác nhận đã lưu nhưng không cập nhật được trạng thái sản phẩm.');
  }

  // ── Bước 7: Ghi log (không bắt buộc) ────────────────────
  // Bỏ qua nếu bảng product_logs không tồn tại
  await supabaseAdmin
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
      if (error) console.warn('[confirm-shipment] Ghi log không thành công (bỏ qua):', error.message);
    });

  // ── Bước 8: Phản hồi thành công ─────────────────────────
  const response: ConfirmShipmentResponse = {
    success: true,
    message: 'Xác nhận xuất hàng thành công.',
    confirmation: {
      ho_ten:         confirmation.ho_ten,
      email:          confirmation.email,
      ngay_xuat:      confirmation.ngay_xuat,
      thoi_gian_xuat: confirmation.thoi_gian_xuat,
      created_at:     confirmation.created_at,
      stt:            confirmation.stt,
    },
    product: {
      id:     productId,
      name:   productName,
      status: PRODUCT_CONFIG.EXPORTED_STATUS_VALUE as string,
    },
  };

  return NextResponse.json(response, { status: 200 });
}
