/**
 * CRM MODULES — nguồn chân lý chung cho luồng Google Sheets → Supabase → UI.
 *
 * 14 module = 14 file Google Sheets trong folder "BLACKSTONES Data" (do Apps Script
 * `scratch/getfly_drive_sync.gs` sinh ra, poll GetFly v6.1 mỗi 15', append-only).
 *
 * - `sheetId`   : ID Google Sheet (public-readable qua export?format=xlsx).
 * - `table`     : bảng Supabase tương ứng (mirror current-state).
 * - `idField`   : cột khoá (header thật của Sheet) để rút current-state.
 * - `columns`   : TẤT CẢ trường data của Sheet + nhãn tiếng Việt (drive cả sync lẫn UI).
 * - `searchKeys`: các cột dùng cho ô tìm kiếm nhanh.
 *
 * File này KHÔNG import React → an toàn dùng ở cả server (sync) lẫn client (UI).
 */

export type CrmColType = 'text' | 'money' | 'date' | 'image' | 'bool' | 'long' | 'number' | 'percent';
export type CrmFilterType = 'select' | 'date' | 'text' | 'number';

export interface CrmColumn {
  key: string;
  label: string;
  type?: CrmColType;
  /** Hiện trong bảng (table view). Mặc định false → chỉ hiện ở chi tiết. */
  table?: boolean;
  /** Có bộ lọc cho cột này (filter bar). */
  filter?: CrmFilterType;
}

export interface CrmModule {
  /** slug dùng cho URL/tab, vd 'khach-hang' */
  key: string;
  /** bảng Supabase, vd 'crm_khach_hang' */
  table: string;
  /** ID Google Sheet */
  sheetId: string;
  /** nhãn đầy đủ */
  label: string;
  /** nhãn ngắn cho tab */
  short: string;
  /** tên icon lucide-react (map ở UI) */
  icon: string;
  /** cột khoá của Sheet */
  idField: string;
  columns: CrmColumn[];
  searchKeys: string[];
}

/** helper gọn để khai báo cột */
function c(key: string, label: string, opts: Partial<CrmColumn> = {}): CrmColumn {
  return { key, label, ...opts };
}

export const CRM_MODULES: CrmModule[] = [
  // ───────────────────────────── 1. KHÁCH HÀNG ─────────────────────────────
  {
    key: 'khach-hang', table: 'crm_khach_hang',
    sheetId: '1y-Z-N7xv0rpr82_9k5pKSwNxPvuPvAhhYgw9g3MOQOs',
    label: 'Khách Hàng', short: 'Khách Hàng', icon: 'Users', idField: 'id',
    searchKeys: ['account_code', 'account_name', 'phone_office', 'cf_so_cccd', 'cf_ma_hoi_vien', 'email'],
    columns: [
      c('id', 'Mã ID'),
      c('account_code', 'Mã KH', { table: true }),
      c('account_name', 'Tên khách hàng', { table: true }),
      c('relation_id', 'Mã quan hệ'),
      c('relation_name', 'Trạng thái quan hệ', { filter: 'select' }),
      c('phone_office', 'Điện thoại', { table: true }),
      c('email', 'Email'),
      c('billing_address_street', 'Địa chỉ'),
      c('website', 'Website'),
      c('birthday', 'Ngày sinh', { type: 'date' }),
      c('sic_code', 'Mã SIC'),
      c('description', 'Ghi chú', { type: 'long' }),
      c('gioi_tinh', 'Giới tính'),
      c('mgr_email', 'Email phụ trách'),
      c('mgr_display_name', 'Người phụ trách', { table: true, filter: 'select' }),
      c('total_revenue', 'Tổng doanh thu', { type: 'money', table: true }),
      c('total_point_bonus', 'Điểm thưởng', { type: 'number' }),
      c('total_cash_bonus', 'Tiền thưởng', { type: 'money' }),
      c('loai_kh', 'Loại KH', { filter: 'select' }),
      c('nguon_kh', 'Nguồn KH', { filter: 'select' }),
      c('tinh_tp', 'Tỉnh/TP', { filter: 'select' }),
      c('district_id', 'Quận/Huyện (id)'),
      c('industry_names', 'Ngành nghề'),
      c('last_active', 'Hoạt động gần nhất', { type: 'date' }),
      c('created_at', 'Ngày tạo', { type: 'date' }),
      c('updated_at', 'Cập nhật', { type: 'date' }),
      c('lh_first_name', 'Liên hệ - Họ'),
      c('lh_last_name', 'Liên hệ - Tên'),
      c('lh_title', 'Liên hệ - Chức danh'),
      c('lh_phone_mobile', 'Liên hệ - Di động'),
      c('lh_phone_home', 'Liên hệ - ĐT nhà'),
      c('lh_email', 'Liên hệ - Email'),
      c('lh_is_primary', 'Liên hệ - Chính'),
      c('lh_them', 'Liên hệ khác'),
      c('cf_ma_hoi_vien', 'Mã hội viên', { table: true }),
      c('cf_goi_dich_vu', 'Gói dịch vụ', { filter: 'select' }),
      c('cf_trang_thai_hoi_vien', 'Trạng thái hội viên', { filter: 'select' }),
      c('cf_ngay_tham_gia', 'Ngày tham gia', { type: 'date' }),
      c('cf_doanh_thu_membership', 'Doanh thu membership', { type: 'money' }),
      c('cf_so_cccd', 'Số CCCD'),
      c('cf_so_tk_ngan_hang', 'Số TK ngân hàng'),
      c('cf_ten_ngan_hang', 'Tên ngân hàng'),
      c('cf_dia_chi_lien_he', 'Địa chỉ liên hệ'),
      c('cf_ho_ten_nguoi_mat', 'Họ tên người mất'),
      c('cf_ngay_mat', 'Ngày mất', { type: 'date' }),
      c('cf_thoi_gian_to_chuc_dam', 'Thời gian tổ chức đám'),
      c('cf_dia_chi_chon_cat', 'Địa chỉ chôn cất'),
    ],
  },

  // ───────────────────────────── 2. ĐƠN BÁN ─────────────────────────────
  {
    key: 'don-ban', table: 'crm_don_ban',
    sheetId: '1ee8nhWRj131iVYP_gY8iQc_ZfLb7VNvA_KVWkvKxf-0',
    label: 'Đơn Bán', short: 'Đơn Bán', icon: 'ShoppingCart', idField: 'id',
    searchKeys: ['order_code', 'account_phone', 'account_code', 'contact_name', 'sp_product_name'],
    columns: [
      c('id', 'Mã ID'),
      c('order_code', 'Mã đơn', { table: true }),
      c('order_date', 'Ngày đặt', { type: 'date', table: true, filter: 'date' }),
      c('created_at', 'Ngày tạo', { type: 'date' }),
      c('updated_at', 'Cập nhật', { type: 'date' }),
      c('status', 'Mã TT'),
      c('status_label', 'Trạng thái', { table: true, filter: 'select' }),
      c('payment_status', 'TT thanh toán', { filter: 'select' }),
      c('has_pay_off', 'Đã tất toán', { type: 'bool' }),
      c('account_id', 'Mã KH (id)'),
      c('account_code', 'Mã KH'),
      c('account_email', 'Email KH'),
      c('account_phone', 'SĐT KH', { table: true }),
      c('account_address', 'Địa chỉ KH'),
      c('contact_name', 'Người liên hệ'),
      c('contact_phone', 'SĐT liên hệ'),
      c('contact_email', 'Email liên hệ'),
      c('real_amount', 'Giá trị đơn', { type: 'money', table: true }),
      c('f_amount', 'Đã thanh toán', { type: 'money' }),
      c('vat_amount', 'Tiền VAT', { type: 'money' }),
      c('discount', 'Chiết khấu (%)', { type: 'percent' }),
      c('discount_amount', 'Tiền chiết khấu', { type: 'money' }),
      c('assigned_user', 'Phụ trách (id)'),
      c('assigned_user_name', 'Người phụ trách', { table: true, filter: 'select' }),
      c('lading_code', 'Mã vận đơn'),
      c('tracking_url', 'Link theo dõi'),
      c('src_name', 'Nguồn', { filter: 'select' }),
      c('contract_id', 'Mã hợp đồng'),
      c('sp_product_code', 'SP - Mã'),
      c('sp_product_name', 'SP - Tên sản phẩm', { table: true }),
      c('sp_unit_name', 'SP - Đơn vị'),
      c('sp_quantity', 'SP - Số lượng', { type: 'number' }),
      c('sp_price', 'SP - Đơn giá', { type: 'money' }),
      c('sp_amount', 'SP - Thành tiền', { type: 'money' }),
      c('sp_vat', 'SP - VAT (%)', { type: 'percent' }),
      c('sp_vat_amount', 'SP - Tiền VAT', { type: 'money' }),
      c('sp_note', 'SP - Ghi chú'),
      c('sp_them', 'SP khác'),
      c('kytt_title', 'Kỳ TT - Tên'),
      c('kytt_amount', 'Kỳ TT - Số tiền', { type: 'money' }),
      c('kytt_percent', 'Kỳ TT - %', { type: 'percent' }),
      c('kytt_pay_day', 'Kỳ TT - Ngày'),
      c('kytt_status', 'Kỳ TT - Trạng thái'),
      c('kytt_them', 'Kỳ TT khác'),
    ],
  },

  // ───────────────────────────── 3. ĐƠN MUA ─────────────────────────────
  {
    key: 'don-mua', table: 'crm_don_mua',
    sheetId: '1xQp3J5yqDwignCqSDiTXVTm7DCTFP4Eh4VPcG33dfqc',
    label: 'Đơn Mua', short: 'Đơn Mua', icon: 'ShoppingBag', idField: 'id',
    searchKeys: ['order_code', 'account_code', 'account_phone', 'sp_product_name'],
    columns: [
      c('id', 'Mã ID'),
      c('order_code', 'Mã đơn mua', { table: true }),
      c('order_date', 'Ngày đặt', { type: 'date', table: true, filter: 'date' }),
      c('created_at', 'Ngày tạo', { type: 'date' }),
      c('updated_at', 'Cập nhật', { type: 'date' }),
      c('status', 'Trạng thái', { table: true, filter: 'select' }),
      c('real_amount', 'Giá trị đơn', { type: 'money', table: true }),
      c('f_amount', 'Đã thanh toán', { type: 'money' }),
      c('discount', 'Chiết khấu (%)', { type: 'percent' }),
      c('discount_amount', 'Tiền chiết khấu', { type: 'money' }),
      c('vat_amount', 'Tiền VAT', { type: 'money' }),
      c('account_id', 'NCC (id)'),
      c('account_code', 'Mã NCC', { table: true }),
      c('account_email', 'Email NCC'),
      c('account_phone', 'SĐT NCC'),
      c('account_address', 'Địa chỉ NCC'),
      c('assigned_user', 'Phụ trách (id)'),
      c('assigned_user_name', 'Người phụ trách', { table: true, filter: 'select' }),
      c('contact_name', 'Người liên hệ'),
      c('contact_phone', 'SĐT liên hệ'),
      c('contact_email', 'Email liên hệ'),
      c('sp_product_code', 'SP - Mã'),
      c('sp_product_name', 'SP - Tên sản phẩm', { table: true }),
      c('sp_unit_name', 'SP - Đơn vị'),
      c('sp_quantity', 'SP - Số lượng', { type: 'number' }),
      c('sp_price', 'SP - Đơn giá', { type: 'money' }),
      c('sp_amount', 'SP - Thành tiền', { type: 'money' }),
      c('sp_vat', 'SP - VAT (%)', { type: 'percent' }),
      c('sp_vat_amount', 'SP - Tiền VAT', { type: 'money' }),
      c('sp_note', 'SP - Ghi chú'),
      c('sp_them', 'SP khác'),
      c('contract_id', 'Mã hợp đồng'),
    ],
  },

  // ───────────────────────────── 4. HỢP ĐỒNG BÁN ─────────────────────────────
  {
    key: 'hop-dong-ban', table: 'crm_hop_dong_ban',
    sheetId: '1_tG7luH6__DR7vxxBtwwuQ0vqp8i5LliMoG9hKefWlI',
    label: 'Hợp Đồng Bán', short: 'HĐ Bán', icon: 'FileText', idField: 'id',
    searchKeys: ['contract_code', 'contract_name', 'buyers_account_name', 'buyers_account_phone', 'cf_cccd_kh'],
    columns: [
      c('id', 'Mã ID'),
      c('contract_code', 'Mã HĐ', { table: true }),
      c('contract_name', 'Tên HĐ'),
      c('contract_status', 'Mã TT'),
      c('contract_status_label', 'Trạng thái', { table: true, filter: 'select' }),
      c('contract_type', 'Loại HĐ', { filter: 'select' }),
      c('effective_date', 'Ngày hiệu lực', { type: 'date', table: true }),
      c('expiration_date', 'Ngày hết hạn', { type: 'date', table: true }),
      c('expiration_day_remain', 'Số ngày còn lại', { type: 'number' }),
      c('number_of_contract', 'Số HĐ'),
      c('vendor_account_id', 'Bên bán (id)'),
      c('vendor_account_name', 'Bên bán'),
      c('vendor_account_address', 'Địa chỉ bên bán'),
      c('vendor_account_phone', 'SĐT bên bán'),
      c('vendor_contact_name', 'Liên hệ bên bán'),
      c('vendor_bank_account_number', 'STK bên bán'),
      c('buyers_account_id', 'Bên mua (id)'),
      c('buyers_account_name', 'Khách hàng', { table: true }),
      c('buyers_account_address', 'Địa chỉ bên mua'),
      c('buyers_account_phone', 'SĐT bên mua', { table: true }),
      c('buyers_contact_name', 'Liên hệ bên mua'),
      c('buyers_bank_account_number', 'STK bên mua'),
      c('after_vat', 'Giá trị (sau VAT)', { type: 'money', table: true }),
      c('discount', 'Chiết khấu (%)', { type: 'percent' }),
      c('discount_amount', 'Tiền chiết khấu', { type: 'money' }),
      c('vat', 'VAT (%)', { type: 'percent' }),
      c('vat_amount', 'Tiền VAT', { type: 'money' }),
      c('contract_terms', 'Điều khoản', { type: 'long' }),
      c('quote_id', 'Báo giá (id)'),
      c('quote_code', 'Mã báo giá'),
      c('payment_methods_name', 'Phương thức TT'),
      c('start_actual_time', 'TG bắt đầu thực tế'),
      c('end_actual_time', 'TG kết thúc thực tế'),
      c('contract_used', 'Mã sử dụng'),
      c('contract_used_label', 'Tình trạng sử dụng', { filter: 'select' }),
      c('actual_value', 'Giá trị thực tế', { type: 'money' }),
      c('project_name', 'Dự án'),
      c('project_address', 'Địa chỉ dự án'),
      c('contract_origin_code', 'Mã gốc HĐ'),
      c('contract_date', 'Ngày HĐ', { type: 'date' }),
      c('create_user', 'Người tạo (id)'),
      c('create_user_display_name', 'Người tạo', { filter: 'select' }),
      c('approved_by_display_name', 'Người duyệt'),
      c('approved_at', 'Thời điểm duyệt'),
      c('contract_parent_id', 'HĐ cha (id)'),
      c('total_payment', 'Tổng thanh toán', { type: 'money' }),
      c('total_sale_order_real_amount', 'Tổng GT đơn bán', { type: 'money' }),
      c('total_sale_order_remain_amount', 'Tổng còn lại đơn bán', { type: 'money' }),
      c('total_sale_order_f_amount', 'Tổng đã TT đơn bán', { type: 'money' }),
      c('performed', 'Đã thực hiện'),
      c('number_performed', 'Số lần thực hiện', { type: 'number' }),
      c('kytt_title', 'Kỳ TT - Tên'),
      c('kytt_amount', 'Kỳ TT - Số tiền', { type: 'money' }),
      c('kytt_percent', 'Kỳ TT - %', { type: 'percent' }),
      c('kytt_pay_day', 'Kỳ TT - Ngày'),
      c('kytt_status', 'Kỳ TT - Trạng thái'),
      c('kytt_them', 'Kỳ TT khác'),
      c('cf_cccd_kh', 'CCCD khách hàng'),
      c('cf_nguoi_thu_huong_so_1', 'Người thụ hưởng 1'),
      c('cf_vneid_nguoi_thu_huong_1', 'VNeID người thụ hưởng 1'),
      c('cf_so_dien_thoai_nguoi_thu_huong_01', 'SĐT người thụ hưởng 1'),
      c('cf_dia_chi_nguoi_thu_huong_01', 'Địa chỉ người thụ hưởng 1'),
      c('cf_nguoi_thu_huong_02', 'Người thụ hưởng 2'),
      c('cf_vneid_nguoi_thu_huong_02', 'VNeID người thụ hưởng 2'),
      c('cf_so_dien_thoai_nguoi_thu_huong_02', 'SĐT người thụ hưởng 2'),
      c('cf_dia_chi_nguoi_thu_huong_02', 'Địa chỉ người thụ hưởng 2'),
      c('cf_email_nguoi_mua', 'Email người mua'),
    ],
  },

  // ───────────────────────────── 5. HỢP ĐỒNG MUA ─────────────────────────────
  {
    key: 'hop-dong-mua', table: 'crm_hop_dong_mua',
    sheetId: '1IzAqccCTr1SepMEJ8TDgL9ZxlCIeAqFY7SSKig2LcOs',
    label: 'Hợp Đồng Mua', short: 'HĐ Mua', icon: 'FileSignature', idField: 'id',
    searchKeys: ['contract_code', 'contract_name', 'vendor_account_name', 'vendor_account_phone'],
    columns: [
      c('id', 'Mã ID'),
      c('contract_code', 'Mã HĐ', { table: true }),
      c('contract_name', 'Tên HĐ'),
      c('contract_status', 'Mã TT'),
      c('contract_status_label', 'Trạng thái', { table: true, filter: 'select' }),
      c('contract_type', 'Loại HĐ', { filter: 'select' }),
      c('effective_date', 'Ngày hiệu lực', { type: 'date', table: true }),
      c('expiration_date', 'Ngày hết hạn', { type: 'date', table: true }),
      c('expiration_day_remain', 'Số ngày còn lại', { type: 'number' }),
      c('number_of_contract', 'Số HĐ'),
      c('vendor_account_id', 'Nhà cung cấp (id)'),
      c('vendor_account_name', 'Nhà cung cấp', { table: true }),
      c('vendor_account_address', 'Địa chỉ NCC'),
      c('vendor_account_phone', 'SĐT NCC', { table: true }),
      c('vendor_contact_name', 'Liên hệ NCC'),
      c('vendor_bank_account_number', 'STK NCC'),
      c('buyers_account_id', 'Bên mua (id)'),
      c('buyers_account_name', 'Bên mua'),
      c('buyers_account_address', 'Địa chỉ bên mua'),
      c('buyers_account_phone', 'SĐT bên mua'),
      c('buyers_contact_name', 'Liên hệ bên mua'),
      c('buyers_bank_account_number', 'STK bên mua'),
      c('after_vat', 'Giá trị (sau VAT)', { type: 'money', table: true }),
      c('discount', 'Chiết khấu (%)', { type: 'percent' }),
      c('discount_amount', 'Tiền chiết khấu', { type: 'money' }),
      c('vat', 'VAT (%)', { type: 'percent' }),
      c('vat_amount', 'Tiền VAT', { type: 'money' }),
      c('contract_terms', 'Điều khoản', { type: 'long' }),
      c('quote_id', 'Báo giá (id)'),
      c('quote_code', 'Mã báo giá'),
      c('payment_methods_name', 'Phương thức TT'),
      c('start_actual_time', 'TG bắt đầu thực tế'),
      c('end_actual_time', 'TG kết thúc thực tế'),
      c('contract_used', 'Mã sử dụng'),
      c('contract_used_label', 'Tình trạng sử dụng', { filter: 'select' }),
      c('actual_value', 'Giá trị thực tế', { type: 'money' }),
      c('project_name', 'Dự án'),
      c('project_address', 'Địa chỉ dự án'),
      c('contract_origin_code', 'Mã gốc HĐ'),
      c('contract_date', 'Ngày HĐ', { type: 'date' }),
      c('create_user', 'Người tạo (id)'),
      c('create_user_display_name', 'Người tạo', { filter: 'select' }),
      c('approved_by_display_name', 'Người duyệt'),
      c('approved_at', 'Thời điểm duyệt'),
      c('contract_parent_id', 'HĐ cha (id)'),
      c('total_payment', 'Tổng thanh toán', { type: 'money' }),
      c('total_purchase_order_real_amount', 'Tổng GT đơn mua', { type: 'money' }),
      c('total_purchase_order_remain_amount', 'Tổng còn lại đơn mua', { type: 'money' }),
      c('total_purchase_order_f_amount', 'Tổng đã TT đơn mua', { type: 'money' }),
      c('performed', 'Đã thực hiện'),
      c('number_performed', 'Số lần thực hiện', { type: 'number' }),
      c('kytt_title', 'Kỳ TT - Tên'),
      c('kytt_amount', 'Kỳ TT - Số tiền', { type: 'money' }),
      c('kytt_percent', 'Kỳ TT - %', { type: 'percent' }),
      c('kytt_pay_day', 'Kỳ TT - Ngày'),
      c('kytt_status', 'Kỳ TT - Trạng thái'),
      c('kytt_them', 'Kỳ TT khác'),
      c('cf_cccd_kh', 'CCCD khách hàng'),
      c('cf_nguoi_thu_huong_so_1', 'Người thụ hưởng 1'),
      c('cf_vneid_nguoi_thu_huong_1', 'VNeID người thụ hưởng 1'),
      c('cf_so_dien_thoai_nguoi_thu_huong_01', 'SĐT người thụ hưởng 1'),
      c('cf_dia_chi_nguoi_thu_huong_01', 'Địa chỉ người thụ hưởng 1'),
      c('cf_nguoi_thu_huong_02', 'Người thụ hưởng 2'),
      c('cf_vneid_nguoi_thu_huong_02', 'VNeID người thụ hưởng 2'),
      c('cf_so_dien_thoai_nguoi_thu_huong_02', 'SĐT người thụ hưởng 2'),
      c('cf_dia_chi_nguoi_thu_huong_02', 'Địa chỉ người thụ hưởng 2'),
      c('cf_email_nguoi_mua', 'Email người mua'),
    ],
  },

  // ───────────────────────────── 6. BÁO GIÁ ─────────────────────────────
  {
    key: 'bao-gia', table: 'crm_bao_gia',
    sheetId: '1HVVQWQ1Hp2GkZPRUvQ4vb8YvSTlHXkIIu9Ieh77T03I',
    label: 'Báo Giá', short: 'Báo Giá', icon: 'Receipt', idField: 'id',
    searchKeys: ['quote_code', 'account_name', 'account_phone'],
    columns: [
      c('id', 'Mã ID'),
      c('quote_code', 'Mã báo giá', { table: true }),
      c('quote_date', 'Ngày báo giá', { type: 'date', table: true, filter: 'date' }),
      c('quote_number', 'Số báo giá'),
      c('status', 'Mã TT'),
      c('status_title', 'Trạng thái', { table: true, filter: 'select' }),
      c('amount', 'Giá trị', { type: 'money', table: true }),
      c('after_vat', 'Sau VAT', { type: 'money' }),
      c('vat_amount', 'Tiền VAT', { type: 'money' }),
      c('discount', 'Chiết khấu (%)', { type: 'percent' }),
      c('discount_amount', 'Tiền chiết khấu', { type: 'money' }),
      c('account_id', 'KH (id)'),
      c('account_code', 'Mã KH'),
      c('account_name', 'Khách hàng', { table: true }),
      c('account_phone', 'SĐT KH', { table: true }),
      c('user_name', 'Người tạo'),
      c('assigned_user_name', 'Người phụ trách', { filter: 'select' }),
      c('approval_user_name', 'Người duyệt'),
      c('created_at', 'Ngày tạo', { type: 'date' }),
      c('updated_at', 'Cập nhật', { type: 'date' }),
    ],
  },

  // ───────────────────────────── 7. SẢN PHẨM ─────────────────────────────
  {
    key: 'san-pham', table: 'crm_san_pham',
    sheetId: '12FTiPGWuZPV4DmO8sXe4L71hQtx4j8HOz1ngLnjF4fM',
    label: 'Sản Phẩm', short: 'Sản Phẩm', icon: 'Package', idField: 'id',
    searchKeys: ['product_code', 'product_name', 'category_name'],
    columns: [
      c('id', 'Mã ID'),
      c('product_code', 'Mã SP', { table: true }),
      c('product_name', 'Tên sản phẩm', { table: true }),
      c('category_id', 'Danh mục (id)'),
      c('category_name', 'Danh mục', { table: true, filter: 'select' }),
      c('unit_id', 'ĐVT (id)'),
      c('unit_name', 'Đơn vị', { table: true, filter: 'select' }),
      c('manufacturer_name', 'Hãng SX'),
      c('origin_name', 'Xuất xứ'),
      c('cover_price', 'Giá niêm yết', { type: 'money', table: true }),
      c('price_wholesale', 'Giá sỉ', { type: 'money' }),
      c('price_online', 'Giá online', { type: 'money' }),
      c('price_average_in', 'Giá vốn TB', { type: 'money' }),
      c('saleoff_price', 'Giá KM', { type: 'money' }),
      c('discount', 'Chiết khấu', { type: 'percent' }),
      c('product_vat', 'VAT', { type: 'percent' }),
      c('short_description', 'Mô tả ngắn', { type: 'long' }),
      c('description', 'Mô tả', { type: 'long' }),
      c('weight', 'Khối lượng'),
      c('featured_image', 'Ảnh đại diện', { type: 'image' }),
      c('created_at', 'Ngày tạo', { type: 'date' }),
      c('updated_at', 'Cập nhật', { type: 'date' }),
      c('last_active', 'Hoạt động gần nhất', { type: 'date' }),
      c('anh_1', 'Ảnh 1', { type: 'image' }),
      c('anh_2', 'Ảnh 2', { type: 'image' }),
      c('anh_3', 'Ảnh 3', { type: 'image' }),
      c('anh_4', 'Ảnh 4', { type: 'image' }),
      c('anh_5', 'Ảnh 5', { type: 'image' }),
      c('anh_6', 'Ảnh 6', { type: 'image' }),
    ],
  },

  // ───────────────────────────── 8. CÔNG VIỆC ─────────────────────────────
  {
    key: 'cong-viec', table: 'crm_cong_viec',
    sheetId: '183-69TzK9drwlPLQLbYZwV83UiJnAJBRpt1-Q1yTvSY',
    label: 'Công Việc', short: 'Công Việc', icon: 'ClipboardList', idField: 'id',
    searchKeys: ['task_code', 'task_name', 'task_receiver_display_name', 'kh_account_name'],
    columns: [
      c('id', 'Mã ID'),
      c('task_code', 'Mã CV', { table: true }),
      c('task_name', 'Tên công việc', { table: true }),
      c('task_description', 'Mô tả', { type: 'long' }),
      c('task_start_date', 'Bắt đầu', { type: 'date', table: true, filter: 'date' }),
      c('task_end_date', 'Kết thúc', { type: 'date', table: true }),
      c('task_status', 'Mã TT'),
      c('task_status_title', 'Trạng thái', { table: true, filter: 'select' }),
      c('task_progress', 'Tiến độ (%)', { type: 'percent' }),
      c('user_important', 'Độ ưu tiên'),
      c('task_receiver', 'Người nhận (id)'),
      c('task_receiver_display_name', 'Người thực hiện', { table: true, filter: 'select' }),
      c('task_receiver_email', 'Email người nhận'),
      c('task_receiver_phone', 'SĐT người nhận'),
      c('project_id', 'Dự án (id)'),
      c('project_name', 'Dự án', { filter: 'select' }),
      c('notifications_count', 'Số thông báo', { type: 'number' }),
      c('task_color', 'Màu'),
      c('kh_account_id', 'KH (id)'),
      c('kh_account_code', 'Mã KH'),
      c('kh_account_name', 'Khách hàng'),
      c('kh_them', 'KH khác'),
    ],
  },

  // ───────────────────────────── 9. CƠ HỘI ─────────────────────────────
  {
    key: 'co-hoi', table: 'crm_co_hoi',
    sheetId: '1m_vLuceYZJKYKeLT7GSRUPBxEeGRGidWRuDpPwIoG74',
    label: 'Cơ Hội', short: 'Cơ Hội', icon: 'TrendingUp', idField: 'id',
    searchKeys: ['opportunity_code', 'opportunity_name', 'account_name', 'phone_office'],
    columns: [
      c('id', 'Mã ID'),
      c('opportunity_code', 'Mã cơ hội', { table: true }),
      c('opportunity_name', 'Tên cơ hội', { table: true }),
      c('probability', 'Xác suất (%)', { type: 'percent' }),
      c('opportunity_status', 'Mã bước'),
      c('opportunity_status_name', 'Bước bán hàng', { table: true, filter: 'select' }),
      c('status_label', 'Nhãn trạng thái'),
      c('status', 'Trạng thái', { filter: 'select' }),
      c('account_id', 'KH (id)'),
      c('account_name', 'Khách hàng', { table: true }),
      c('phone_office', 'Điện thoại', { table: true }),
      c('account_email', 'Email'),
      c('campaign_id', 'Chiến dịch (id)'),
      c('campaign_name', 'Chiến dịch', { filter: 'select' }),
      c('responsible', 'Phụ trách (id)'),
      c('c_display_name', 'Người phụ trách', { filter: 'select' }),
      c('recipient', 'Người nhận (id)'),
      c('rcpt_display_name', 'Người tiếp nhận'),
      c('rcpt_role_name', 'Vai trò'),
      c('rcpt_department_name', 'Phòng ban'),
      c('create_user', 'Người tạo (id)'),
      c('created_at', 'Ngày tạo', { type: 'date' }),
      c('time_registed', 'Thời gian ghi nhận'),
    ],
  },

  // ───────────────────────────── 10. CHIẾN DỊCH ─────────────────────────────
  {
    key: 'chien-dich', table: 'crm_chien_dich',
    sheetId: '1etKlfHVtV5PKyb8rC_NCih058CYMf7VT8GFlecJBZb4',
    label: 'Chiến Dịch', short: 'Chiến Dịch', icon: 'Megaphone', idField: 'id',
    searchKeys: ['campaign_code', 'campaign_name'],
    columns: [
      c('id', 'Mã ID'),
      c('campaign_code', 'Mã chiến dịch', { table: true }),
      c('campaign_name', 'Tên chiến dịch', { table: true }),
      c('create_user', 'Người tạo (id)'),
      c('responsible', 'Phụ trách (id)'),
      c('time_registed', 'Thời gian tạo', { table: true }),
      c('allow_duplicate_opp', 'Cho phép trùng cơ hội', { type: 'bool' }),
      c('is_lock', 'Khóa', { type: 'bool', filter: 'select' }),
      c('cause_types', 'Loại nguyên nhân'),
      c('nguoi_user_id', 'Thành viên (id)'),
      c('nguoi_divided_percent', 'Tỷ lệ chia (%)', { type: 'percent' }),
      c('nguoi_accept_opp', 'Nhận cơ hội'),
      c('nguoi_them', 'Thành viên khác'),
      c('buoc_1', 'Bước 1'),
      c('buoc_2', 'Bước 2'),
      c('buoc_3', 'Bước 3'),
      c('buoc_4', 'Bước 4'),
      c('buoc_5', 'Bước 5'),
      c('buoc_6', 'Bước 6'),
      c('buoc_7', 'Bước 7'),
      c('buoc_8', 'Bước 8'),
    ],
  },

  // ───────────────────────────── 11. NGƯỜI DÙNG ─────────────────────────────
  {
    key: 'nguoi-dung', table: 'crm_nguoi_dung',
    sheetId: '1hOnNGEugm6RNrTWO9ob50RUCskkgIYM3AGW0DTTKsMQ',
    label: 'Người Dùng', short: 'Người Dùng', icon: 'UserCog', idField: 'user_id',
    searchKeys: ['contact_name', 'user_name', 'email', 'contact_mobile'],
    columns: [
      c('user_id', 'Mã người dùng', { table: true }),
      c('contact_name', 'Họ tên', { table: true }),
      c('user_name', 'Tên đăng nhập', { table: true }),
      c('dept_id', 'Phòng ban (id)'),
      c('dept_name', 'Phòng ban', { table: true, filter: 'select' }),
      c('email', 'Email', { table: true }),
      c('contact_mobile', 'Di động', { table: true }),
      c('extensions', 'Máy lẻ'),
    ],
  },

  // ───────────────────────────── 12. KHO ─────────────────────────────
  {
    key: 'kho', table: 'crm_kho',
    sheetId: '1mnu1ZM19d0iUd_sN8tG3KjiyRgF6vHUxDl8W4Uq4OPY',
    label: 'Kho', short: 'Kho', icon: 'Warehouse', idField: 'id',
    searchKeys: ['store_name'],
    columns: [
      c('id', 'Mã ID'),
      c('store_name', 'Tên kho', { table: true }),
      c('total_quantity', 'Tổng số lượng', { type: 'number', table: true }),
    ],
  },

  // ───────────────────────────── 13. QUỸ ─────────────────────────────
  {
    key: 'quy', table: 'crm_quy',
    sheetId: '16DGeXg9eMV0e0Pfl0TEar1PfgYxvm8RL36PjcvYeH_Y',
    label: 'Quỹ', short: 'Quỹ', icon: 'Wallet', idField: 'id',
    searchKeys: ['fund_code', 'fund_title'],
    columns: [
      c('id', 'Mã ID'),
      c('fund_code', 'Mã quỹ', { table: true }),
      c('fund_title', 'Tên quỹ', { table: true }),
      c('fund_description', 'Mô tả', { type: 'long' }),
      c('fund_parent_id', 'Quỹ cha (id)'),
      c('lvl', 'Cấp', { type: 'number' }),
      c('financial_account', 'TK tài chính'),
      c('fund_manager', 'Người quản lý', { table: true }),
      c('fund_cashier', 'Thủ quỹ'),
      c('opening_balance', 'Số dư đầu', { type: 'money' }),
      c('total_money', 'Tổng tiền', { type: 'money', table: true }),
      c('invalid', 'Ngừng dùng', { type: 'bool' }),
    ],
  },

  // ───────────────────────────── 14. PT THANH TOÁN ─────────────────────────────
  {
    key: 'pt-thanh-toan', table: 'crm_pt_thanh_toan',
    sheetId: '1BL6QmxNoKlO8-ai_A1vwCr3ZY7Cd5N78A3n5YmvsGxs',
    label: 'Phương Thức Thanh Toán', short: 'PT Thanh Toán', icon: 'CreditCard', idField: 'id',
    searchKeys: ['method_name'],
    columns: [
      c('id', 'Mã ID'),
      c('method_name', 'Phương thức', { table: true }),
      c('valid', 'Hiệu lực', { type: 'bool', table: true }),
    ],
  },
];

/** Tra module theo slug (URL/tab). */
export function getCrmModule(key: string): CrmModule | undefined {
  return CRM_MODULES.find((m) => m.key === key);
}

/** Tra module theo tên bảng Supabase. */
export function getCrmModuleByTable(table: string): CrmModule | undefined {
  return CRM_MODULES.find((m) => m.table === table);
}

/** 3 cột audit (append-only) ở đầu mỗi Sheet — KHÔNG phải data. */
export const AUDIT_COLS = ['Thời điểm ghi nhận', 'Loại thay đổi', 'Trường thay đổi (cũ → mới)'];
