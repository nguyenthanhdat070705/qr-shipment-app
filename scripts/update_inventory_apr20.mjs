/**
 * Script cập nhật tồn kho theo data kiểm kê ngày 20/04/2026
 * Chạy: node scripts/update_inventory_apr20.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════════════════
// DATA kiểm kê ngày 20/04/2026
// Format: [ma_hom, ten_hom, kho_name, so_luong, loai_hang]
// ═══════════════════════════════════════════════════
const INVENTORY_DATA = [
  // ── Kho Kha Vạn Cân ──
  ['2AQ0126', 'Quan Tài Gỗ Xà Cừ - Chạm Phật Giáo - KT (210x80x120)cm; Thành 3-4cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0132', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Cối Nắp Cuối - KT (220x80x130)cm; Thành 5cm, liệt 12cm', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0133', 'Quan Tài Gỗ Lim Nam Phi - Cối Nắp Tròn - KT (220x80x130)cm; Thành 5cm, liệt 12cm', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0134', 'Quan Tài Gỗ Hương Huyết - Cối Nắp Tròn - KT Nắp cao 46cm, thùng 65.5cm, dài 193cm, ngang 66cm; Thành 5cm, liệt 12cm', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0139', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Chạm Chúa - KT (210x79x120)cm; Thành 4-5cm', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0131', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Chạm Rồng - KT (210x79x120)cm; Thành 4-5cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0125', 'Quan Tài Gỗ Xà Cừ - Chạm Công Giáo - KT (210x80x120)cm; Thành 4-5cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0127', 'Quan Tài Gỗ Xà Cừ - Cối Nắp Tròn- KT (220x80x130)cm; Thành 5cm', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0104', 'Quan tài Gỗ Ngọc Am - Kích thước phủ bì: (2.3x0.86x0.86)m - Lọt lòng: (1.78x0.5x0.5)m. Thành 15cm, đáy 15cm, nắp 15cm', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0116', 'Quan Tài Nhập Khẩu An Yên Gỗ Dái Ngựa CKT2009 - Kích thước: (2.06x0.56x0.67)m', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0040', 'Quan Tài Whitsunday, Gỗ Thông - Kích thước: 2160x810x610(mm) CKT2008', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0135', 'Quan Tài Công Giáo Đức Giáo Hoàng Gỗ Gụ - Màu hỗ phách- Kích thước phủ bì: (1.97x0.64-0.44x0.64-0.43)m. Độ dầy: thành 3cm', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0112', 'Quan Tài thiêu Huyền Cung 3 - Gỗ Công nghiệp -Đài Loan 1 nắp', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0061', 'Quan tài Gỗ Trai - Cẩn - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0136', 'Quan Tài Gỗ Gõ Ghana - Trơn - KT (2.1x0.8x1.2)m; Thành 5cm', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0102', 'Quan Tài Gỗ Căm Xe Nhập Khẩu - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0047', 'Quan tài Taisho, Gỗ Sồi - Kích thước: 2150x805x260(mm) CKT201C01', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0148', 'Quan Tài Gỗ Căm Xe Nhập Khẩu Úc_Thành 4cm - Kích Thước: (2,1 x 0,80 x 1,15)m', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0009', 'Quan Tài Gỗ Hương Nhập khẩu Chạm - Kích Thước: (2 x 0,80 x 1,15)m; Thành 5cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0043', 'Quan tài Victoria, Gỗ Thông - Kích thước: 2175x810x610(mm) CKT2004', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0046', 'Quan tài William, Gỗ Tuyết Tùng - Kích thước: 2160x810x610(mm) CKT2001', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0039', 'Quan tài Queensland, Gỗ Dương - Kích thước: 2215x780x610(mm) CKT2007', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0042', 'Quan tài Rutherford, Gỗ Tuyết Tùng - Kích thước: 2073x686x505(mm) CKT2005', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0041', 'Quan tài George, Gỗ Thông - Kích thước: 2160x810x550(mm) CKT2006', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0044', 'Quan Tài Calgary - nâu in lá phong - CKT2003 - Bình Yên', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0129', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x120)cm; Thành 5cm', 'Kho Kha Vạn Cân', 4, 'Đã mua'],
  ['2AQ0128', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x105)cm; Thành 4cm', 'Kho Kha Vạn Cân', 4, 'Đã mua'],
  ['2AQ0118', 'Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x79x105)cm; Thành 4cm', 'Kho Kha Vạn Cân', 4, 'Đã mua'],
  ['2AQ0119', 'Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x80x115)cm; Thành 5cm', 'Kho Kha Vạn Cân', 5, 'Đã mua'],
  ['2AQ0137', 'Quan Tài Gỗ Lim Nam Phi - Xanh - Trơn - KT (210x80x115)cm; Thành 5cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  // Note: 2AQ0118 appears twice in KVC data with different names - using second occurrence
  ['2AQ0100', 'Quan tài Gỗ Ngọc Am - Kích Thước: (2,20 x 0,74 x 0,67)m; Lọt lòng 0.48 m; Thành 10cm, địa 10cm, tấm thiên dầy 12cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0064', 'Quan tài Gỗ Trai Chạm (Phật giáo) chạm Rồng- Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0124', 'Quan Tài Gỗ Xà Cừ - Trơn - KT (210x79x105cm ; Thành 4cm', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0163', 'Quan Tài Gỗ Căm Xe KAW_Thành 4cm - Kích Thước: (2,1 x 0,80 x 0.95)m', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0165', 'Quan tài gỗ Căm Xe WPL - Cẩn - KT (2.1x0.8x1.15)m; Thành 4cm', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0168', 'Quan Tài Gỗ Căm Xe KAW_Thành 5cm -(2,1 x 0,80 x 1.15)m', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0105', 'Quan tài XÀ CỪ cẩn đồng quê 5P', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0075', 'Căm Xe 5P - Đỏ - Chạm rồng 210x80x120', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0010', 'Nhí trắng 1 nắp', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0011', 'Nhí vàng 1 nắp', 'Kho Kha Vạn Cân', 6, 'Đã mua'],
  ['2AQ0012', 'NhÍ Nâu 1 nắp', 'Kho Kha Vạn Cân', 3, 'Đã mua'],
  ['2AQ0106', 'Nhí nâu 2 nắp', 'Kho Kha Vạn Cân', 3, 'Đã mua'],
  ['2AQ0107', 'Nhí vàng 2 nắp', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0108', 'Nhí trắng 2 nắp', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0014', 'Nâu cẩn , thiêu trung', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0015', 'Vàng cẩn , thiêu trung', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0172', 'Quan tài gỗ Đinh Hương( Hương công gô) 4P - Trơn', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0173', 'Quan tài gỗ Đinh Hương( Hương công gô) 5P - Trơn+', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0174', 'Quan tài gỗ Sao Nghệ (gõ vàng) Nắp tròn - Trơn - 6P - liệt 14cm', 'Kho Kha Vạn Cân', 2, 'Đã mua'],

  // ── Kho Kinh Dương Vương ──
  ['2AQ0046', 'Quan tài William, Gỗ Tuyết Tùng - Kích thước: 2160x810x610(mm) CKT2001', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0043', 'Quan tài Victoria, Gỗ Thông - Kích thước: 2175x810x610(mm) CKT2004', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0039', 'Quan tài Queensland, Gỗ Dương - Kích thước: 2215x780x610(mm) CKT2007', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0044', 'Quan tài Calgary, Gỗ Dương - Kích thước: 2175x810x610(mm) CKT2003', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0111', 'Quan Tài Thiêu Huyền Cung 1 - Màu chery, bóng sáng - 1 nắp - Kích thước: (2.58 x 0.67 x 0.62)m', 'Kho Kinh Dương Vương', 0, 'Đã mua'],
  ['2AQ0112', 'Quan Tài Thiêu Huyền Cung 3 - Màu óc chó đậm, bóng sáng - 1 nắp - Kích thước: (2.58 x 0.67 x 0.62)m', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0100', 'Quan tài Gỗ Ngọc Am chạm hoa văn - Kích Thước: (2,20 x 0,74 x 0,67)m', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0100', 'Quan tài Gỗ Ngọc Am - Kích Thước: (2,20 x 0,74 x 0,67)m', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0118', 'Quan Tài Gỗ Lim Nam Phi - Xanh - Trơn - KT (210x79x105)cm; Thành 4cm', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0128', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x105)cm; Thành 4cm', 'Kho Kinh Dương Vương', 3, 'Đã mua'],
  ['2AQ0129', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x120)cm; Thành 5cm', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0157', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Chạm Rồng - KT (210x79x120)cm; Thành 3-4cm', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0064', 'Quan tài Gỗ Trai Chạm (Phật giáo) - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0119', 'Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x80x115)cm; Thành 5cm', 'Kho Kinh Dương Vương', 4, 'Đã mua'],
  ['2AQ0163', 'Quan Tài Gỗ Căm Xe KAW_Thành 4cm - Kích Thước: (2,1 x 0,80 x 0.95)m', 'Kho Kinh Dương Vương', 4, 'Đã mua'],
  ['2AQ0168', 'Quan Tài Gỗ Căm Xe KAW_Thành 5cm - Kích Thước: (2,1 x 0,80 x 1.15)m', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0010', 'Hòm THIÊU NHÍ (TRẮNG) – GỖ CÔNG NGHIỆP - ĐÀI LOAN - 1 NẮP', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0012', 'Hòm THIÊU NHÍ (NÂU) – GỖ CÔNG NGHIỆP – ĐÀI LOAN - TAY NẮM TRƠN – 1 NẮP', 'Kho Kinh Dương Vương', 3, 'Đã mua'],
  ['2AQ0011', 'Hòm THIÊU NHÍ (VÀNG) – GỖ CÔNG NGHIỆP - ĐÀI LOAN - TAY NẮM TRƠN- 1 NẮP', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0135', 'Quan Tài Công Giáo Đức Giáo Hoàng Gỗ Gụ - Màu hỗ phách', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0106', 'Quan tài Thiêu 2 Nắp - Nâu - Gỗ công nghiệp - Kích thước: (2,03x0,65x0,74)m', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0124', 'Quan tài Gỗ Xà Cừ 4P', 'Kho Kinh Dương Vương', 0, 'Đã mua'],

  // ── Kho Hàm Long ──
  ['2AQ0172', 'Quan tài gỗ Đinh Hương( Hương công gô) 4P - Trơn', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0173', 'Quan tài gỗ Đinh Hương( Hương công gô) 5P - Trơn', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0133', 'Quan Tài Gỗ Lim Nam Phi - Cối Nắp Tròn - KT (220x80x130)cm; Thành 5cm, liệt 12cm', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0128', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x105)cm; Thành 4cm', 'Kho Hàm Long', 4, 'Đã mua'],
  ['2AQ0129', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x120)cm; Thành 5cm', 'Kho Hàm Long', 3, 'Đã mua'],
  ['2AQ0130', 'Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Cẩn (đồng quê) - KT (210x80x120)cm; Thành 5cm', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0118', 'Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x79x105)cm; Thành 4cm', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0119', 'Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x80x115)cm; Thành 5cm', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0163', 'Quan Tài Gỗ Căm Xe KAW_Thành 4cm - Kích Thước: (2,1 x 0,80 x 0.95)m', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0002', 'Quan Tài Gỗ Sao Cát - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 3cm', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0046', 'Quan tài William, Gỗ Tuyết Tùng - Kích thước: 2160x810x610(mm) CKT2001', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0044', 'Quan tài Calgary, Gỗ Dương - Kích thước: 2175x810x610(mm) CKT2003', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0039', 'Quan tài Queensland, Gỗ Dương - Kích thước: 2215x780x610(mm) CKT2007', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0100', 'Quan tài Gỗ Ngọc Am - Kích Thước: (2,20 x 0,74 x 0,67)m', 'Kho Hàm Long', 3, 'Đã mua'],
  ['2AQ0047', 'Quan tài Taisho, Gỗ Sồi - Kích thước: 2150x805x260(mm) CKT201C01', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0023', 'Quan Tài Gỗ Hương Bình Phước - Vật Liệu: Gỗ Hương - Kích Thước: (2,03 x 0,82 x 1,02)m_5p', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0175', 'Quan Tài Gỗ Hương Nhập Khẩu - Trơn - Kích Thước: (2 x 0,80 x 1,3)m thành 5p', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0120', 'Quan Tài Gỗ Căm Xe WPL (gỗ nhập) - Trơn - KT (210x79x105)cm; Thành 4cm', 'Kho Hàm Long', 0, 'Đã mua'],
  ['2AQ0116', 'Quan Tài Nhập Khẩu An Yên Gỗ Dái Ngựa CKT2009 - Kích thước: (2.06x0.56x0.67)m', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0115', 'Quan Tài Công Giáo Đức Giáo Hoàng - Gỗ Dỗi - Kích thước phủ bì: (1.93x0.46x0.73)m', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0043', 'Quan tài Victoria, Gỗ Thông - Kích thước: 2175x810x610(mm) CKT2004', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0110', 'Quan Tài Thiêu Huyền Cung 2 - Màu vàng, bóng sáng - 1 nắp', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0149', 'Quan Tài Thiêu Huyền Cung 4 - Màu trắng, bóng sáng - 1 nắp', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0135', 'Quan Tài Công Giáo Đức Giáo Hoàng Gỗ Gụ - Màu hỗ phách', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0171', 'Quan tài Gỗ Ngọc Am - Kích Thước: Thành 5cm địa 8cm nắp 10cm', 'Kho Hàm Long', 1, 'Đã mua'],

  // ── Kho Hàm Long - Ký gửi ──
  ['2AQ0061', 'Quan tài Gỗ Trai - Cẩn - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0050', 'Quan tài Gỗ Hương Việt Nam Nắp Sen - Kích Thước: (1,96 x 0,70 x 1,33)m; Thành 6cm', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0104', 'Quan tài Gỗ Ngọc Am - Kích thước phủ bì: (2.3x0.86x0.86)m', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0090', 'Quan tài Thiêu Trung - NÂU - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,80 x 0,95)m', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0014', 'Quan Tài Thiêu Trung - Nâu Cẩn - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,68 x 0,9)m', 'Kho Hàm Long', 2, 'Ký gửi'],
  ['2AQ0015', 'Quan Tài Thiêu Trung - Vàng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,68 x 0,9)m', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0013', 'Quan Tài Thiêu Trung - Trắng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,68 x 0,9)m', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0012', 'Quan Tài Thiêu Nhí_Nâu - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m', 'Kho Hàm Long', 5, 'Ký gửi'],
  ['2AQ0011', 'Quan Tài Thiêu Nhí_Vàng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m', 'Kho Hàm Long', 3, 'Ký gửi'],
  ['2AQ0010', 'Quan Tài Thiêu Nhí_Trắng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m', 'Kho Hàm Long', 4, 'Ký gửi'],
  ['2AQ0106', 'Quan tài Thiêu 2 Nắp - Nâu - Gỗ công nghiệp - Kích thước: (2,03x0,65x0,74)m', 'Kho Hàm Long', 2, 'Ký gửi'],
  ['2AQ0107', 'Quan tài Thiêu 2 Nắp - Vàng - Gỗ công nghiệp - Kích thước: (2,03x0,65x0,74)m', 'Kho Hàm Long', 0, 'Ký gửi'],
];

// ═══════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════
async function main() {
  console.log('🔄 Bắt đầu cập nhật tồn kho...\n');

  // 1. Load dim_hom => map ma_hom -> id
  const { data: allHom, error: homErr } = await supabase.from('dim_hom').select('id, ma_hom, ten_hom');
  if (homErr) { console.error('❌ Lỗi load dim_hom:', homErr.message); return; }
  const homMap = new Map(); // ma_hom -> id
  allHom.forEach(h => homMap.set(h.ma_hom, h.id));
  console.log(`📦 Loaded ${allHom.length} sản phẩm từ dim_hom`);

  // 2. Load dim_kho => map ten_kho -> id
  const { data: allKho, error: khoErr } = await supabase.from('dim_kho').select('id, ten_kho');
  if (khoErr) { console.error('❌ Lỗi load dim_kho:', khoErr.message); return; }
  const khoMap = new Map(); // ten_kho -> id
  allKho.forEach(k => {
    khoMap.set(k.ten_kho, k.id);
    // Also map with "Kho " prefix for fuzzy matching
    khoMap.set('Kho ' + k.ten_kho, k.id);
  });
  console.log(`🏭 Loaded ${allKho.length} kho:`);
  allKho.forEach(k => console.log(`   • ${k.ten_kho} → ${k.id}`));

  // 3. Load existing fact_inventory
  const { data: existingInv, error: invErr } = await supabase.from('fact_inventory').select('*');
  if (invErr) { console.error('❌ Lỗi load fact_inventory:', invErr.message); return; }
  console.log(`📊 Hiện có ${existingInv.length} bản ghi fact_inventory\n`);

  // Build lookup: "homId|khoId|loaiHang" -> record
  const invLookup = new Map();
  existingInv.forEach(row => {
    const key = `${row['Tên hàng hóa']}|${row['Kho']}|${row['Loại hàng'] || 'Đã mua'}`;
    invLookup.set(key, row);
  });

  let updated = 0, inserted = 0, skipped = 0, notFound = 0;

  for (const [maHom, tenHom, khoName, soLuong, loaiHang] of INVENTORY_DATA) {
    const homId = homMap.get(maHom);
    const khoId = khoMap.get(khoName);

    if (!homId) {
      console.log(`⚠️  SKIP: ma_hom "${maHom}" không tìm thấy trong dim_hom → "${tenHom}"`);
      notFound++;
      continue;
    }
    if (!khoId) {
      console.log(`⚠️  SKIP: Kho "${khoName}" không tìm thấy trong dim_kho`);
      notFound++;
      continue;
    }

    // Check if record exists (match by product + warehouse + loại hàng)
    const lookupKey = `${homId}|${khoId}|${loaiHang}`;
    const existing = invLookup.get(lookupKey);

    if (existing) {
      const currentQty = Number(existing['Số lượng'] || 0);
      if (currentQty === soLuong) {
        skipped++;
        continue; // Already correct
      }

      // Update
      const { error: upErr } = await supabase
        .from('fact_inventory')
        .update({ 'Số lượng': soLuong, 'Ghi chú': soLuong })
        .eq('Mã', existing['Mã']);

      if (upErr) {
        console.log(`❌ Lỗi update ${maHom} @ ${khoName}: ${upErr.message}`);
      } else {
        console.log(`✅ UPDATE: ${maHom} @ ${khoName} [${loaiHang}]: ${currentQty} → ${soLuong}`);
        updated++;
      }
    } else {
      // Also check without loaiHang match (legacy records may not have Loại hàng)
      const legacyKey = `${homId}|${khoId}|Đã mua`;
      const legacyKey2 = `${homId}|${khoId}|`;
      const legacyKey3 = `${homId}|${khoId}|null`;
      const legacyExisting = invLookup.get(legacyKey) || invLookup.get(legacyKey2) || invLookup.get(legacyKey3);

      if (legacyExisting && loaiHang === 'Đã mua') {
        const currentQty = Number(legacyExisting['Số lượng'] || 0);
        if (currentQty === soLuong) { skipped++; continue; }

        const { error: upErr } = await supabase
          .from('fact_inventory')
          .update({ 'Số lượng': soLuong, 'Ghi chú': soLuong })
          .eq('Mã', legacyExisting['Mã']);

        if (upErr) {
          console.log(`❌ Lỗi update (legacy) ${maHom} @ ${khoName}: ${upErr.message}`);
        } else {
          console.log(`✅ UPDATE (legacy): ${maHom} @ ${khoName}: ${currentQty} → ${soLuong}`);
          updated++;
        }
      } else {
        // Insert new record
        const newMa = `INV-${maHom}-${khoName.replace(/\s+/g, '').slice(0, 8)}-${loaiHang === 'Ký gửi' ? 'KG' : 'DM'}-${Date.now().toString(36)}`;
        const { error: insErr } = await supabase
          .from('fact_inventory')
          .insert({
            'Mã': newMa,
            'Tên hàng hóa': homId,
            'Kho': khoId,
            'Số lượng': soLuong,
            'Ghi chú': soLuong,
            'Loại hàng': loaiHang,
          });

        if (insErr) {
          console.log(`❌ Lỗi insert ${maHom} @ ${khoName} [${loaiHang}]: ${insErr.message}`);
        } else {
          console.log(`🆕 INSERT: ${maHom} @ ${khoName} [${loaiHang}] = ${soLuong}`);
          inserted++;
        }
      }
    }
  }

  console.log('\n════════════════════════════════');
  console.log(`📊 Kết quả cập nhật tồn kho:`);
  console.log(`   ✅ Cập nhật: ${updated}`);
  console.log(`   🆕 Thêm mới: ${inserted}`);
  console.log(`   ⏭️  Không đổi: ${skipped}`);
  console.log(`   ⚠️  Không tìm thấy: ${notFound}`);
  console.log('════════════════════════════════');
}

main().catch(console.error);
