-- ═══════════════════════════════════════════
-- PHẦN 2/3: TẠO BẢNG DIMENSION + FACT
-- Chạy SAU phần 1
-- ═══════════════════════════════════════════

CREATE TABLE dim_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  ho_ten text DEFAULT '',
  chuc_vu text DEFAULT '',
  so_dien_thoai text DEFAULT '',
  phong_ban text DEFAULT '',
  kho_id uuid,
  avatar_url text,
  ghi_chu text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_dim_account_updated_at BEFORE UPDATE ON dim_account FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
ALTER TABLE dim_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_account_select" ON dim_account FOR SELECT USING (true);
CREATE POLICY "dim_account_all" ON dim_account FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE dim_kho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_kho text UNIQUE NOT NULL,
  ten_kho text NOT NULL,
  dia_chi text,
  nguoi_quan_ly text,
  sdt text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_dim_kho_updated_at BEFORE UPDATE ON dim_kho FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
ALTER TABLE dim_kho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_kho_select" ON dim_kho FOR SELECT USING (true);
CREATE POLICY "dim_kho_all" ON dim_kho FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE dim_ncc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_ncc text UNIQUE NOT NULL,
  ten_ncc text NOT NULL,
  nguoi_lien_he text,
  sdt text,
  dia_chi text,
  email text,
  ghi_chu text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_dim_ncc_updated_at BEFORE UPDATE ON dim_ncc FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
ALTER TABLE dim_ncc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_ncc_select" ON dim_ncc FOR SELECT USING (true);
CREATE POLICY "dim_ncc_all" ON dim_ncc FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE dim_hom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_hom text UNIQUE NOT NULL,
  ten_hom text NOT NULL,
  gia_ban numeric(15,2) DEFAULT 0,
  gia_von numeric(15,2) DEFAULT 0,
  hinh_anh text,
  "NCC" text,
  loai_hom text,
  mo_ta text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_dim_hom_updated_at BEFORE UPDATE ON dim_hom FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX idx_dim_hom_ma ON dim_hom(ma_hom);
ALTER TABLE dim_hom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_hom_select" ON dim_hom FOR SELECT USING (true);
CREATE POLICY "dim_hom_all" ON dim_hom FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE dim_dam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dam text UNIQUE NOT NULL,
  ngay text,
  loai text,
  chi_nhanh text,
  nguoi_mat text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_dim_dam_updated_at BEFORE UPDATE ON dim_dam FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX idx_dim_dam_loai ON dim_dam(loai);
CREATE INDEX idx_dim_dam_chi_nhanh ON dim_dam(chi_nhanh);
ALTER TABLE dim_dam ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_dam_select" ON dim_dam FOR SELECT USING (true);
CREATE POLICY "dim_dam_all" ON dim_dam FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE fact_inventory (
  "Mã" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "Tên hàng hóa" text NOT NULL,
  "Kho" text,
  "Số lượng" integer DEFAULT 0,
  "Loại hàng" text,
  "Ghi chú" integer DEFAULT 0
);
ALTER TABLE fact_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_inventory_select" ON fact_inventory FOR SELECT USING (true);
CREATE POLICY "fact_inventory_all" ON fact_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_fact_inventory_product ON fact_inventory("Tên hàng hóa");
CREATE INDEX idx_fact_inventory_kho ON fact_inventory("Kho");

CREATE TABLE fact_don_hang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_don_hang text UNIQUE NOT NULL,
  ncc_id uuid REFERENCES dim_ncc(id),
  kho_id uuid REFERENCES dim_kho(id),
  nguoi_tao_id uuid REFERENCES dim_account(id),
  trang_thai text DEFAULT 'draft',
  tong_tien numeric(15,2) DEFAULT 0,
  ghi_chu text,
  ngay_dat date DEFAULT CURRENT_DATE,
  ngay_giao_du_kien date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_fact_don_hang_updated_at BEFORE UPDATE ON fact_don_hang FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX idx_fact_don_hang_status ON fact_don_hang(trang_thai);
CREATE INDEX idx_fact_don_hang_ncc ON fact_don_hang(ncc_id);
ALTER TABLE fact_don_hang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_don_hang_select" ON fact_don_hang FOR SELECT USING (true);
CREATE POLICY "fact_don_hang_all" ON fact_don_hang FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE fact_don_hang_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  don_hang_id uuid NOT NULL REFERENCES fact_don_hang(id) ON DELETE CASCADE,
  hom_id uuid REFERENCES dim_hom(id),
  ma_hom text,
  ten_hom text,
  so_luong integer DEFAULT 0,
  don_gia numeric(15,2) DEFAULT 0,
  thanh_tien numeric(15,2) DEFAULT 0,
  hang_ky_gui boolean DEFAULT false,
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fact_don_hang_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_don_hang_items_select" ON fact_don_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_don_hang_items_all" ON fact_don_hang_items FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE fact_nhap_hang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_nhap text UNIQUE NOT NULL,
  don_hang_id uuid REFERENCES fact_don_hang(id),
  kho_id uuid REFERENCES dim_kho(id),
  nguoi_nhan_id uuid REFERENCES dim_account(id),
  trang_thai text DEFAULT 'completed',
  ngay_nhan date DEFAULT CURRENT_DATE,
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_fact_nhap_hang_updated_at BEFORE UPDATE ON fact_nhap_hang FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX idx_fact_nhap_hang_po ON fact_nhap_hang(don_hang_id);
CREATE INDEX idx_fact_nhap_hang_kho ON fact_nhap_hang(kho_id);
ALTER TABLE fact_nhap_hang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_nhap_hang_select" ON fact_nhap_hang FOR SELECT USING (true);
CREATE POLICY "fact_nhap_hang_all" ON fact_nhap_hang FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE fact_nhap_hang_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhap_hang_id uuid NOT NULL REFERENCES fact_nhap_hang(id) ON DELETE CASCADE,
  ma_hom text,
  ten_hom text,
  so_luong_yeu_cau integer DEFAULT 0,
  so_luong_thuc_nhan integer DEFAULT 0,
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fact_nhap_hang_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_nhap_hang_items_select" ON fact_nhap_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_nhap_hang_items_all" ON fact_nhap_hang_items FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE fact_xuat_hang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_xuat text UNIQUE NOT NULL,
  kho_id uuid REFERENCES dim_kho(id),
  nguoi_xuat_id uuid REFERENCES dim_account(id),
  trang_thai text DEFAULT 'pending',
  ten_khach text,
  sdt_khach text,
  dia_chi_giao text,
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_fact_xuat_hang_updated_at BEFORE UPDATE ON fact_xuat_hang FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE INDEX idx_fact_xuat_hang_kho ON fact_xuat_hang(kho_id);
CREATE INDEX idx_fact_xuat_hang_status ON fact_xuat_hang(trang_thai);
ALTER TABLE fact_xuat_hang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_xuat_hang_select" ON fact_xuat_hang FOR SELECT USING (true);
CREATE POLICY "fact_xuat_hang_all" ON fact_xuat_hang FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE fact_xuat_hang_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xuat_hang_id uuid NOT NULL REFERENCES fact_xuat_hang(id) ON DELETE CASCADE,
  hom_id uuid REFERENCES dim_hom(id),
  ma_hom text,
  ten_hom text,
  so_luong integer DEFAULT 1,
  inventory_id text,
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fact_xuat_hang_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_xuat_hang_items_select" ON fact_xuat_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_xuat_hang_items_all" ON fact_xuat_hang_items FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE fact_dam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stt text,
  ngay text,
  thang text,
  ma_dam text UNIQUE NOT NULL,
  loai text,
  chi_nhanh text,
  nguoi_mat text,
  dia_chi_to_chuc text,
  dia_chi_chon_thieu text,
  gio_liem text,
  ngay_liem text,
  gio_di_quan text,
  ngay_di_quan text,
  sale text,
  dieu_phoi text,
  thay_so_luong text,
  thay_ncc text,
  thay_ten text,
  hom_loai text,
  hom_ncc_hay_kho text,
  hoa text,
  da_kho_tiem_focmol text,
  ken_tay_so_le text,
  ken_tay_ncc text,
  quay_phim_chup_hinh_goi_dv text,
  quay_phim_chup_hinh_ncc text,
  mam_cung_so_luong text,
  mam_cung_ncc text,
  di_anh_cao_pho text,
  bang_ron text,
  la_trieu_bai_vi text,
  nhac text,
  thue_rap_ban_ghe_so_luong text,
  thue_rap_ban_ghe_ncc text,
  hu_tro_cot text,
  teabreak text,
  xe_tang_le_loai text,
  xe_tang_le_dao_ty text,
  xe_tang_le_ncc text,
  xe_khach_loai text,
  xe_khach_ncc text,
  xe_cap_cuu text,
  xe_khac text,
  thue_nv_truc text,
  bao_don text,
  ghi_chu text,
  chon_thieu text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER set_fact_dam_updated_at BEFORE UPDATE ON fact_dam FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
ALTER TABLE fact_dam ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_dam_select" ON fact_dam FOR SELECT USING (true);
CREATE POLICY "fact_dam_all" ON fact_dam FOR ALL USING (true) WITH CHECK (true);
