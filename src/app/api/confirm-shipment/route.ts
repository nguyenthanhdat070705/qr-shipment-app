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

  // ── Bước 3: Guard — (Đã xuất kho - Bỏ qua vì dùng dim_hom) ─────────────────────────
  // Trong schema mới, dim_hom là danh mục sản phẩm nên không có trạng thái "exported".
  // Lịch sử xuất được ghi nhận qua export_confirmations và trừ tồn trong fact_inventory.

  // ── Bước 4: Thử insert vào export_confirmations ─────────
  // First attempt
  let confirmation: Record<string, unknown> | null = null;
  let insertError: { message: string; code?: string } | null = null;

  const insertData: Record<string, unknown> = {
    ma_san_pham: maSanPham,
    ho_ten:      trimmedHoTen,
    email:       trimmedEmail,
    ghi_chu:     trimmedNote,
  };

  // Only include chuc_vu if we have it (in case the column doesn't exist in DB)
  if (trimmedChucVu) {
    insertData.chuc_vu = trimmedChucVu;
  }

  const result1 = await supabaseAdmin
    .from(PRODUCT_CONFIG.CONFIRMATION_TABLE as string)
    .insert(insertData)
    .select('stt, ho_ten, email, ngay_xuat, thoi_gian_xuat, created_at')
    .single();

  insertError = result1.error;
  confirmation = result1.data as Record<string, unknown> | null;

  // If the error is about missing column 'chuc_vu', retry without it
  if (insertError && insertError.message?.includes('chuc_vu')) {
    console.warn('[confirm-shipment] Column chuc_vu not found, retrying without it...');
    delete insertData.chuc_vu;
    
    const result2 = await supabaseAdmin
      .from(PRODUCT_CONFIG.CONFIRMATION_TABLE as string)
      .insert(insertData)
      .select('stt, ho_ten, email, ngay_xuat, thoi_gian_xuat, created_at')
      .single();

    insertError = result2.error;
    confirmation = result2.data as Record<string, unknown> | null;
  }

  // If still failing (table doesn't exist), try to create it and retry
  if (insertError && (insertError.message?.includes('does not exist') || insertError.code === '42P01')) {
    console.warn('[confirm-shipment] Table not found, attempting to create...');
    await ensureConfirmationTable(supabaseAdmin);

    const result3 = await supabaseAdmin
      .from(PRODUCT_CONFIG.CONFIRMATION_TABLE as string)
      .insert(insertData)
      .select('stt, ho_ten, email, ngay_xuat, thoi_gian_xuat, created_at')
      .single();

    insertError = result3.error;
    confirmation = result3.data as Record<string, unknown> | null;
  }

  if (insertError || !confirmation) {
    console.error('[confirm-shipment] Lỗi khi lưu xác nhận:', insertError);
    return errorResponse(
      `Không thể lưu xác nhận: ${insertError?.message || 'Unknown error'}. Vui lòng kiểm tra bảng "${PRODUCT_CONFIG.CONFIRMATION_TABLE}" trong Supabase.`,
      'DATABASE_ERROR',
      500
    );
  }

  // ── Bước 5: Cập nhật trạng thái sản phẩm (Bỏ qua) ───────────────
  // Không cập nhật is_active của dim_hom thành 'exported' vì nó là danh mục sản phẩm.

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
