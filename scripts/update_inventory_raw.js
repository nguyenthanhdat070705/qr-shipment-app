const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const rawData = `Mã	Tên hàng hóa	Kho	Số lượng	Loại hàng	Ghi chú
2AQ0172	Quan tài gỗ Đinh Hương( Hương công gô) 4P - Trơn	Kho Hàm Long	1	Đã mua	
2AQ0173	Quan tài gỗ Đinh Hương( Hương công gô) 5P - Trơn	Kho Hàm Long	1	Đã mua	
2AQ0133	Quan Tài Gỗ Lim Nam Phi - Cối Nắp Tròn - KT (220x80x130)cm; Thành 5cm, liệt 12cm	Kho Hàm Long	1	Đã mua	
2AQ0128	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x105)cm; Thành 4cm	Kho Hàm Long	6	Đã mua	
2AQ0129	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x120)cm; Thành 5cm	Kho Hàm Long	3	Đã mua	
2AQ0130	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Cẩn (đồng quê) - KT (210x80x120)cm; Thành 5cm	Kho Hàm Long	1	Đã mua	
2AQ0118	Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x79x105)cm; Thành 4cm	Kho Hàm Long	2	Đã mua	1 cái bị mục, mối mọt
2AQ0119	Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x80x115)cm; Thành 5cm	Kho Hàm Long	1	Đã mua	
2AQ0163	Quan Tài Gỗ Căm Xe KAW_Thành 4cm - Kích Thước: (2,1 x 0,80 x 0.95)m	Kho Hàm Long	2	Đã mua	
2AQ0002	Quan Tài Gỗ Sao Cát - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 3cm	Kho Hàm Long	1	Đã mua	
2AQ0046	Quan tài William, Gỗ Tuyết Tùng - Kích thước: 2160x810x610(mm) CKT2001	Kho Hàm Long	2	Đã mua	
2AQ0044	Quan tài Calgary, Gỗ Dương - Kích thước: 2175x810x610(mm) CKT2003	Kho Hàm Long	1	Đã mua	
2AQ0039	Quan tài Queensland, Gỗ Dương - Kích thước: 2215x780x610(mm) CKT2007	Kho Hàm Long	1	Đã mua	
2AQ0100	Quan tài Gỗ Ngọc Am - Kích Thước: (2,20 x 0,74 x 0,67)m; Lọt lòng 0.48 m; Thành 10cm, địa 10cm, tấm thiên dầy 12cm	Kho Hàm Long	3	Đã mua	250213
2AQ0047	Quan tài Taisho, Gỗ Sồi - Kích thước: 2150x805x260(mm) CKT201C01	Kho Hàm Long	2	Đã mua	
2AQ0023	Quan Tài Gỗ Hương Bình Phước - Vật Liệu: Gỗ Hương - Kích Thước: (2,03 x 0,82 x 1,02)m_5p	Kho Hàm Long	1	Đã mua	đặt cọc 240942
2AQ0175	Quan Tài Gỗ Hương Nhập Khẩu - Trơn - Kích Thước: (2 x 0,80 x 1,3)m thành 5p	Kho Hàm Long	2	Đã mua	
2AQ0120	Quan Tài Gỗ Căm Xe WPL (gỗ nhập) - Trơn - KT (210x79x105)cm; Thành 4cm	Kho Hàm Long	0	Đã mua	trả NCC bảo hành
2AQ0116	Quan Tài Nhập Khẩu An Yên Gỗ Dái Ngựa CKT2009 - Kích thước: (2.06x0.56x0.67)m	Kho Hàm Long	1	Đã mua	
2AQ0115	Quan Tài Công Giáo Đức Giáo Hoàng - Gỗ Dỗi - Kích thước phủ bì: (1.93x0.46x0.73)m - Lọt lòng: (1.87x0.4x0.67)m. Độ dầy: thành 3cm, nắp 3cm, đáy 5cm	Kho Hàm Long	2	Đã mua	
2AQ0043	Quan tài Victoria, Gỗ Thông - Kích thước: 2175x810x610(mm) CKT2004	Kho Hàm Long	1	Đã mua	
2AQ0110	Quan Tài Thiêu Huyền Cung 2 - Màu vàng, bóng sáng - 1 nắp - Kích thước: (2.58 x 0.67 x 0.62)m	Kho Hàm Long	2	Đã mua	
2AQ0149	Quan Tài Thiêu Huyền Cung 4 - Màu trắng, bóng sáng - 1 nắp - Kích thước: (2.06 x 0.67 x 0.62)m	Kho Hàm Long	1	Đã mua	
2AQ0135	Quan Tài Công Giáo Đức Giáo Hoàng Gỗ Gụ - Màu hỗ phách- Kích thước phủ bì: (1.97x0.64-0.44x0.64-0.43)m. Độ dầy: thành 3cm	Kho Hàm Long	1	Đã mua	
2AQ0171	Quan tài Gỗ Ngọc Am - Kích Thước: Thành 5cm địa 8cm nắp 10cm - Phủ bì 207 rộng 62 cao 57 cm - Lọt lòng ...[...]	Kho Hàm Long	1	Đã mua	260232
2AQ0061	Quan tài Gỗ Trai - Cẩn - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm	Kho Hàm Long	1	Ký gửi	
2AQ0050	Quan tài Gỗ Hương Việt Nam Nắp Sen - Kích Thước: (1,96 x 0,70 x 1,33)m; Thành 6cm	Kho Hàm Long	1	Ký gửi	đã cọc
2AQ0104	Quan tài Gỗ Ngọc Am - Kích thước phủ bì: (2.3x0.86x0.86)m - Lọt lòng: (1.78x0.5x0.5)m. Thành 15cm, đáy 15cm, nắp 15cm	Kho Hàm Long	1	Ký gửi	của khách gửi
2AQ0090	Quan tài Thiêu Trung - NÂU - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,80 x 0,95)m	Kho Hàm Long	1	Ký gửi	đã cọc
2AQ0014	Quan Tài Thiêu Trung - Nâu Cẩn - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,68 x 0,9)m	Kho Hàm Long	2	Ký gửi	
2AQ0015	Quan Tài Thiêu Trung - Vàng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,68 x 0,9)m	Kho Hàm Long	2	Ký gửi	
2AQ0013	Quan Tài Thiêu Trung - Trắng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,68 x 0,9)m	Kho Hàm Long	1	Ký gửi	
2AQ0012	Quan Tài Thiêu Nhí_Nâu - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m	Kho Hàm Long	7	Ký gửi	2 cái đã đặt cọc
2AQ0011	Quan Tài Thiêu Nhí_Vàng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m	Kho Hàm Long	2	Ký gửi	
2AQ0010	Quan Tài Thiêu Nhí_Trắng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m	Kho Hàm Long	4	Ký gửi	2 chúa / 2 trơn
2AQ0106	Quan tài Thiêu 2 Nắp - Nâu - Gỗ công nghiệp - Kích thước: (2,03x0,65x0,74)m	Kho Hàm Long	2	Ký gửi	
2AQ0107	Quan tài Thiêu 2 Nắp - Vàng - Gỗ công nghiệp - Kích thước: (2,03x0,65x0,74)m	Kho Hàm Long	1	Ký gửi	
2AQ0109	Quan tài Thiêu 2 Nắp - Trắng - Gỗ công nghiệp - Kích thước: (2,03x0,65x0,74)m Công giáo	Kho Hàm Long	1	Ký gửi	
2AQ0126	Quan Tài Gỗ Xà Cừ - Chạm Phật Giáo - KT (210x80x120)cm; Thành 3-4cm	Kho Kha Vạn Cân	0	Đã mua	bảo hành
2AQ0132	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Cối Nắp Cuối - KT (220x80x130)cm; Thành 5cm, liệt 12cm	Kho Kha Vạn Cân	1	Đã mua	
2AQ0133	Quan Tài Gỗ Lim Nam Phi - Cối Nắp Tròn - KT (220x80x130)cm; Thành 5cm, liệt 12cm	Kho Kha Vạn Cân	2	Đã mua	
2AQ0134	Quan Tài Gỗ Hương Huyết - Cối Nắp Tròn - KT Nắp cao 46cm, thùng 65.5cm, dài 193cm, ngang 66cm; Thành 5cm, liệt 12cm	Kho Kha Vạn Cân	1	Đã mua	
2AQ0139	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Chạm Chúa - KT (210x79x120)cm; Thành 4-5cm	Kho Kha Vạn Cân	1	Đã mua	
2AQ0131	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Chạm Rồng - KT (210x79x120)cm; Thành 4-5cm	Kho Kha Vạn Cân	0	Đã mua	
2AQ0125	Quan Tài Gỗ Xà Cừ - Chạm Công Giáo - KT (210x80x120)cm; Thành 4-5cm	Kho Kha Vạn Cân	0	Đã mua	bảo hành
2AQ0127	Quan Tài Gỗ Xà Cừ - Cối Nắp Tròn- KT (220x80x130)cm; Thành 5cm	Kho Kha Vạn Cân	1	Đã mua	
2AQ0104	Quan tài Gỗ Ngọc Am - Kích thước phủ bì: (2.3x0.86x0.86)m - Lọt lòng: (1.78x0.5x0.5)m. Thành 15cm, đáy 15cm, nắp 15cm	Kho Kha Vạn Cân	2	Đã mua	
2AQ0116	Quan Tài Nhập Khẩu An Yên Gỗ Dái Ngựa CKT2009 - Kích thước: (2.06x0.56x0.67)m	Kho Kha Vạn Cân	1	Đã mua	
2AQ0040	Quan Tài Whitsunday, Gỗ Thông - Kích thước: 2160x810x610(mm) CKT2008	Kho Kha Vạn Cân	1	Đã mua	
2AQ0135	Quan Tài Công Giáo Đức Giáo Hoàng Gỗ Gụ - Màu hỗ phách- Kích thước phủ bì: (1.97x0.64-0.44x0.64-0.43)m. Độ dầy: thành 3cm	Kho Kha Vạn Cân	2	Đã mua	
2AQ0112	Quan Tài thiêu Huyền Cung 3 - Gỗ Công nghiệp -Đài Loan 1 nắp	Kho Kha Vạn Cân	1	Đã mua	
2AQ0061	Quan tài Gỗ Trai - Cẩn - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm	Kho Kha Vạn Cân	0	Đã mua	
2AQ0136	Quan Tài Gỗ Gõ Ghana - Trơn - KT (2.1x0.8x1.2)m; Thành 5cm	Kho Kha Vạn Cân	1	Đã mua	
2AQ0102	Quan Tài Gỗ Căm Xe Nhập Khẩu - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm	Kho Kha Vạn Cân		Đã mua	
2AQ0047	Quan tài Taisho, Gỗ Sồi - Kích thước: 2150x805x260(mm) CKT201C01	Kho Kha Vạn Cân	3	Đã mua	
2AQ0148	Quan Tài Gỗ Căm Xe Nhập Khẩu Úc_Thành 4cm - Kích Thước: (2,1 x 0,80 x 1,15)m	Kho Kha Vạn Cân	0	Đã mua	Lỗi đổi trả
2AQ0009	Quan Tài Gỗ Hương Nhập khẩu Chạm - Kích Thước: (2 x 0,80 x 1,15)m; Thành 5cm	Kho Kha Vạn Cân	1	Đã mua	
2AQ0043	Quan tài Victoria, Gỗ Thông - Kích thước: 2175x810x610(mm) CKT2004	Kho Kha Vạn Cân	1	Đã mua	
2AQ0046	Quan tài William, Gỗ Tuyết Tùng - Kích thước: 2160x810x610(mm) CKT2001	Kho Kha Vạn Cân	2	Đã mua	
2AQ0039	Quan tài Queensland, Gỗ Dương - Kích thước: 2215x780x610(mm) CKT2007	Kho Kha Vạn Cân	2	Đã mua	
2AQ0042	Quan tài Rutherford, Gỗ Tuyết Tùng - Kích thước: 2073x686x505(mm) CKT2005	Kho Kha Vạn Cân	1	Đã mua	
2AQ0041	Quan tài George, Gỗ Thông - Kích thước: 2160x810x550(mm) CKT2006	Kho Kha Vạn Cân	1	Đã mua	
2AQ0044	Quan Tài Calgary - nâu in lá phong - CKT2003 - Bình Yên	Kho Kha Vạn Cân	1	Đã mua	
2AQ0129	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x120)cm; Thành 5cm	Kho Kha Vạn Cân	4	Đã mua	1 bị mốc
2AQ0128	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x105)cm; Thành 4cm	Kho Kha Vạn Cân	4	Đã mua	
2AQ0118	Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x79x105)cm; Thành 4cm	Kho Kha Vạn Cân	0	Đã mua	
2AQ0119	Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x80x115)cm; Thành 5cm	Kho Kha Vạn Cân	6	Đã mua	
2AQ0137	Quan Tài Gỗ Lim Nam Phi - Xanh - Trơn - KT (210x80x115)cm; Thành 5cm	Kho Kha Vạn Cân	0	Đã mua	
2AQ0118	Quan Tài Gỗ Lim Nam Phi - Xanh - Trơn - KT (210x80x115)cm; Thành 4P	Kho Kha Vạn Cân	0	Đã mua	
2AQ0100	Quan tài Gỗ Ngọc Am - Kích Thước: (2,20 x 0,74 x 0,67)m; Lọt lòng 0.48 m; Thành 10cm, địa 10cm, tấm thiên dầy 12cm	Kho Kha Vạn Cân	3	Đã mua	
2AQ0064	Quan tài Gỗ Trai Chạm (Phật giáo) chạm Rồng- Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm	Kho Kha Vạn Cân	3	Đã mua	
2AQ0124	Quan Tài Gỗ Xà Cừ - Trơn - KT (210x79x105cm ; Thành 4cm	Kho Kha Vạn Cân	0	Đã mua	bảo hành
2AQ0163	Quan Tài Gỗ Căm Xe KAW_Thành 4cm - Kích Thước: (2,1 x 0,80 x 0.95)m	Kho Kha Vạn Cân	2	Đã mua	
2AQ0165	Quan tài gỗ Căm Xe WPL - Cẩn - KT (2.1x0.8x1.15)m; Thành 4cm	Kho Kha Vạn Cân	2	Đã mua	
2AQ0168	Quan Tài Gỗ Căm Xe KAW_Thành 5cm -(2,1 x 0,80 x 1.15)m	Kho Kha Vạn Cân	4	Đã mua	
2AQ0105	Quan tài XÀ CỪ cẩn đồng quê 5P	Kho Kha Vạn Cân	1	Đã mua	Lỗi nứt
2AQ0075	Căm Xe 5P - Đỏ - Chạm rồng 210x80x120	Kho Kha Vạn Cân	0	Đã mua	bảo hành
2AQ0010	Nhí trắng 1 nắp	Kho Kha Vạn Cân	4	Đã mua	2 dán chúa
2AQ0011	Nhí vàng 1 nắp	Kho Kha Vạn Cân	6	Đã mua	
2AQ0012	NhÍ Nâu 1 nắp	Kho Kha Vạn Cân	4	Đã mua	1 dán chúa
2AQ0106	Nhí nâu 2 nắp	Kho Kha Vạn Cân	3	Đã mua	
2AQ0107	Nhí vàng 2 nắp	Kho Kha Vạn Cân		Đã mua	
2AQ0108	Nhí trắng 2 nắp	Kho Kha Vạn Cân		Đã mua	
2AQ0014	Nâu cẩn , thiêu trung	Kho Kha Vạn Cân	1	Đã mua	
2AQ0015	Vàng cẩn , thiêu trung	Kho Kha Vạn Cân		Đã mua	
2AQ0172	Quan tài gỗ Đinh Hương( Hương công gô) 4P - Trơn	Kho Kha Vạn Cân	1	Đã mua	
2AQ0173	Quan tài gỗ Đinh Hương( Hương công gô) 5P - Trơn+	Kho Kha Vạn Cân	1	Đã mua	
2AQ0174	Quan tài gỗ Sao Nghệ (gõ vàng) Nắp tròn - Trơn - 6P - liệt 14cm	Kho Kha Vạn Cân	2	Đã mua	
2AQ0137	Quan Tài Gỗ Lim Nam Phi -Trơn- Vàng (Lim Xanh) - KT (210x80x115)cm; Thành 5cm	Kho Kinh Dương Vương	0	Đã mua	
2AQ0135	Quan Tài Công Giáo Đức Giáo Hoàng Gỗ Gụ - Màu hỗ phách- Kích thước phủ bì: (1.97x0.64-0.44x0.64-0.43)m. Độ dầy: thành 3cm	Kho Kinh Dương Vương	2	Đã mua	
2AQ0105	Quan Tài Gỗ Xà Cừ - Cẩn Ốc - KT (210x80x120)cm; Thành 5cm	Kho Kinh Dương Vương	0	Đã mua	
2AQ0027	Quan tài Gỗ Ngọc Am - Kích thước: (2 x 0.55 x 0.5)m; Thành 8cm địa 12cm thiên dầy 10cm	Kho Kinh Dương Vương	0	Đã mua	
2AQ0011	Quan Tài Thiêu Nhí_Vàng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m	Kho Kinh Dương Vương	0	Đã mua	
2AQ0124	Quan Tài Gỗ Xà Cừ - Trơn - KT (210x79x105cm ; Thành 4cm	Kho Kinh Dương Vương	0	Đã mua	
2AQ0168	Quan Tài Gỗ Căm Xe KAW_Thành 5cm - Kích Thước: (2,1 x 0,80 x 1.15)m	Kho Kinh Dương Vương	2	Đã mua	
2AQ0163	Quan Tài Gỗ Căm Xe KAW_Thành 4cm - Kích Thước: (2,1 x 0,80 x 0.95)m	Kho Kinh Dương Vương	4	Đã mua	
2AQ0119	Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x80x115)cm; Thành 5cm	Kho Kinh Dương Vương	4	Đã mua	
2AQ0064	Quan tài Gỗ Trai Chạm (Phật giáo) - Kích Thước: (2,2 x 0,80 x 1,15)m; Thành 5cm	Kho Kinh Dương Vương	1	Đã mua	
2AQ0157	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Chạm Rồng - KT (210x79x120)cm; Thành 3-4cm	Kho Kinh Dương Vương	1	Đã mua	
2AQ0133	Quan Tài Gỗ Lim Nam Phi - Cối Nắp Tròn - KT (220x80x130)cm; Thành 5cm, liệt 12cm	Kho Kinh Dương Vương	0	Đã mua	
2AQ0129	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x120)cm; Thành 5cm	Kho Kinh Dương Vương	1	Đã mua	
2AQ0128	Quan Tài Gỗ Sao Nghệ (Gõ Vàng) - Trơn - KT (210x80x105)cm; Thành 4cm	Kho Kinh Dương Vương	3	Đã mua	
2AQ0118	Quan Tài Gỗ Lim Nam Phi - Đỏ - Trơn - KT (210x79x105)cm; Thành 4cm	Kho Kinh Dương Vương	0	Đã mua	
2AQ0100	Quan tài Gỗ Ngọc Am - Kích Thước: (2,20 x 0,74 x 0,67)m; Lọt lòng 0.48 m; Thành 10cm, địa 10cm, tấm thiên dầy 12cm	Kho Kinh Dương Vương	2	Đã mua	
2AQ0112	Quan Tài Thiêu Huyền Cung 3 - Màu óc chó đậm, bóng sáng - 1 nắp - Kích thước: (2.58 x 0.67 x 0.62)m	Kho Kinh Dương Vương	1	Đã mua	
2AQ0111	Quan Tài Thiêu Huyền Cung 1 - Màu chery, bóng sáng - 1 nắp - Kích thước: (2.58 x 0.67 x 0.62)m	Kho Kinh Dương Vương	0	Đã mua	
2AQ0044	Quan tài Calgary, Gỗ Dương - Kích thước: 2175x810x610(mm) CKT2003	Kho Kinh Dương Vương	1	Đã mua	
2AQ0039	Quan tài Queensland, Gỗ Dương - Kích thước: 2215x780x610(mm) CKT2007	Kho Kinh Dương Vương	1	Đã mua	
2AQ0043	Quan tài Victoria, Gỗ Thông - Kích thước: 2175x810x610(mm) CKT2004	Kho Kinh Dương Vương	1	Đã mua	
2AQ0046	Quan tài William, Gỗ Tuyết Tùng - Kích thước: 2160x810x610(mm) CKT2001	Kho Kinh Dương Vương	2	Đã mua	
2AQ0012	Quan Tài Thiêu Nhí_Nâu - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m	Kho Kinh Dương Vương	1	Ký gửi	
2AQ0011	Quan Tài Thiêu Nhí_Vàng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m	Kho Kinh Dương Vương	1	Ký gửi	
2AQ0010	Quan Tài Thiêu Nhí_Trắng - Gỗ Công Nghiệp - Kích Thước: (2,05 x 0,67 x 0,79)m	Kho Kinh Dương Vương	0	Ký gửi	
2AQ0106	Quan tài Thiêu 2 Nắp - Nâu - Gỗ công nghiệp - Kích thước: (2,03x0,65x0,74)m	Kho Kinh Dương Vương	1	Ký gửi`;

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  CẬP NHẬT TỒN KHO TỪ BẢNG MỚI NHẤT (TSV)');
  console.log('═══════════════════════════════════════════════════\n');

  // Prefix check mapping
  const extractKho = (name) => {
    name = name.trim();
    if (name.startsWith('Kho ')) return name.substring(4);
    return name;
  };

  const lines = rawData.trim().split('\n');
  const headers = lines[0].split('\t').map(x => x.trim());
  const groupedDataObj = {};

  // Mã[0]	Tên hàng hóa[1]	Kho[2]	Số lượng[3]	Loại hàng[4]	Ghi chú[5]
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map(x => x.trim());
    if (cols.length < 5) continue; // Bỏ qua dòng thiếu data

    const ma = cols[0];
    const kho = extractKho(cols[2]);
    let slStr = cols[3].trim();
    const sl = slStr === '' ? 0 : parseInt(slStr, 10);
    const loaiHang = cols[4];

    if (isNaN(sl) || sl < 0) continue;

    const key = `${ma}_${kho}_${loaiHang}`;
    if (!groupedDataObj[key]) {
      groupedDataObj[key] = { ma_hom: ma, kho_ten: kho, so_luong: sl, loai_hang: loaiHang };
    } else {
      groupedDataObj[key].so_luong += sl;
    }
  }

  const groupedData = Object.values(groupedDataObj);

  // Fetch dim_hom
  const { data: dimHom, error: errHom } = await supabase.from('dim_hom').select('id, ma_hom, ten_hom');
  if (errHom) {
    console.error("Lỗi lấy dim_hom:", errHom);
    return;
  }
  const homMap = {};
  dimHom.forEach(h => {
    homMap[h.ma_hom.toUpperCase()] = h.id;
  });

  // Fetch dim_kho
  const { data: dimKho, error: errKho } = await supabase.from('dim_kho').select('id, ten_kho');
  if (errKho) {
    console.error("Lỗi lấy dim_kho:", errKho);
    return;
  }
  const khoMap = {};
  dimKho.forEach(k => {
    khoMap[k.ten_kho] = k.id;
  });

  // Delete current fact inventory
  console.log("Xóa fact_inventory cũ...");
  const { error: delErr } = await supabase.from('fact_inventory').delete().neq('Mã', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.error("Lỗi xóa fact_inventory:", delErr);
    return;
  }
  console.log("Đã xóa xong. Chuẩn bị insert mới...");

  const insertRows = [];
  const notFoundProducts = new Set();
  
  for (const item of groupedData) {
    const homId = homMap[item.ma_hom.toUpperCase()];
    const khoId = khoMap[item.kho_ten];
    
    if (!homId) {
      notFoundProducts.add(item.ma_hom);
      continue;
    }
    
    if (!khoId) {
      console.log(`Kho không hợp lệ: ${item.kho_ten}`);
      continue;
    }
    
    insertRows.push({
      "Tên hàng hóa": homId,
      "Kho": khoId,
      "Số lượng": item.so_luong,
      "Ghi chú": item.so_luong,
      "Loại hàng": item.loai_hang
    });
  }

  if (notFoundProducts.size > 0) {
    console.log("\n⚠️ Các mã không tìm thấy trong danh mục (dim_hom) và sẽ bị bỏ qua:");
    console.log(Array.from(notFoundProducts).join(', '));
  }

  if (insertRows.length === 0) {
    console.log("Không có dòng nào hợp lệ để thêm!");
    return;
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const chunk = insertRows.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase.from('fact_inventory').insert(chunk);
    if (insErr) {
      console.error(`Lỗi insert batch ${i}:`, insErr);
    } else {
      console.log(`Đã insert batch từ ${i} đến ${i + chunk.length - 1}...`);
    }
  }

  console.log(`\n✅ Hoàn tất! Đã cập nhật ${insertRows.length} mục vào kho.`);
}

main();
