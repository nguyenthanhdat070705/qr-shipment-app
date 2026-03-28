-- Xóa bảng cũ nếu cần thiết (cẩn thận)
-- DROP TABLE IF EXISTS public.fact_dam;

CREATE TABLE IF NOT EXISTS public.fact_dam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stt text,
  ngay text,
  thang text,
  ma_dam text UNIQUE NOT NULL,

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

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Thêm Data vào bảng dim_dam tự động mỗi khi có cập nhật bên fact_dam
-- Tuy nhiên hiện tại nên cập nhật qua script bên dưới.
