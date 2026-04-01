-- 1. XOÁ BẢNG CŨ (BỊ SAI CẤU TRÚC DO AI CUNG CẤP LÚC TRƯỚC)
DROP TABLE IF EXISTS public.fact_dam CASCADE;
DROP TABLE IF EXISTS public.dim_dam CASCADE;
DROP TABLE IF EXISTS public.fact_inventory CASCADE;
DROP TABLE IF EXISTS public.export_confirmations CASCADE;

-- 2. TẠO LẠI DIM_DAM (CHUẨN 100% NHƯ V1)
CREATE TABLE IF NOT EXISTS public.dim_dam (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dam        text UNIQUE NOT NULL,              
  loai          text,                              
  chi_nhanh     text,                               
  nguoi_mat     text,                               
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. TẠO LẠI FACT_DAM (50 CỘT CHUẨN 100% NHƯ V1)
CREATE TABLE IF NOT EXISTS public.fact_dam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stt text,
  ngay text,
  thang text,
  ma_dam text,

  -- Thông tin chung đám
  loai text,
  chi_nhanh text,
  nguoi_mat text,
  dia_chi_to_chuc text,
  dia_chi_chon_thieu text,
  gio_liem text,
  ngay_liem text,
  gio_di_quan text,
  ngay_di_quan text,

  -- Nhân sự
  sale text,
  dieu_phoi text,
  
  -- Thầy
  thay_so_luong text,
  thay_ncc text,
  thay_ten text,

  -- Hòm / Hoa / Focmol / Kèn Tây
  hom_loai text,
  hom_ncc_hay_kho text,
  hoa text,
  da_kho_tiem_focmol text,
  ken_tay_so_le text,
  ken_tay_ncc text,

  -- Dịch vụ Media
  quay_phim_chup_hinh_goi_dv text,
  quay_phim_chup_hinh_ncc text,

  -- Cúng / Tâm Linh
  mam_cung_so_luong text,
  mam_cung_ncc text,
  di_anh_cao_pho text,
  bang_ron text,
  la_trieu_bai_vi text,

  -- Setup sự kiện
  nhac text,
  thue_rap_ban_ghe_so_luong text,
  thue_rap_ban_ghe_ncc text,
  hu_tro_cot text,
  teabreak text,

  -- Khối vận tải
  xe_tang_le_loai text,
  xe_tang_le_dao_ty text,
  xe_tang_le_ncc text,
  xe_khach_loai text,
  xe_khach_ncc text,
  xe_cap_cuu text,
  xe_khac text,

  -- Linh tinh
  thue_nv_truc text,
  bao_don text,
  ghi_chu text,
  chon_thieu text,
  ma_hom text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. TẠO LẠI FACT_INVENTORY (BẢNG TIẾNG VIỆT NHƯ V1)
CREATE TABLE IF NOT EXISTS public.fact_inventory (
    "Mã" text,
    "Tên hàng hóa" text,
    "Kho" text,
    "Số lượng" text,
    "Ghi chú" text,
    "Loại hàng" text
);

-- 5. CẤP QUYỀN MỞ CHO TẤT CẢ QUA SERVICE ROLE
GRANT ALL ON TABLE public.fact_dam TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_dam TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_inventory TO postgres, public, anon, authenticated, service_role;
