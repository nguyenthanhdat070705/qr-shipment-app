-- ══════════════════════════════════════════════════════════════
-- BLACKSTONE SCM — STAR SCHEMA MIGRATION
-- Xóa toàn bộ bảng cũ, tạo schema mới theo mô hình Fact/Dim
-- ══════════════════════════════════════════════════════════════
-- ⚠️ CẢNH BÁO: Script này sẽ XÓA TẤT CẢ dữ liệu hiện có!
-- Chạy trong Supabase SQL Editor: https://supabase.com/dashboard
-- ══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════
-- BƯỚC 1: XÓA TOÀN BỘ BẢNG CŨ
-- ═══════════════════════════════════════════

DROP TABLE IF EXISTS delivery_order_items CASCADE;
DROP TABLE IF EXISTS delivery_orders CASCADE;
DROP TABLE IF EXISTS goods_receipt_items CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS export_confirmations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS product_holds CASCADE;
DROP TABLE IF EXISTS product_logs CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS "Dim_Products" CASCADE;
DROP TABLE IF EXISTS "Hòm tháng 3" CASCADE;
DROP TABLE IF EXISTS sale_contracts CASCADE;
DROP TABLE IF EXISTS sale_quotations CASCADE;
DROP TABLE IF EXISTS sale_orders CASCADE;
DROP TABLE IF EXISTS stocktakes CASCADE;
DROP TABLE IF EXISTS warehouses_1office CASCADE;
DROP TABLE IF EXISTS goods_receipts_1office CASCADE;
DROP TABLE IF EXISTS inventory_1office CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;

-- Xóa triggers & functions cũ
DROP FUNCTION IF EXISTS trigger_set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS trigger_set_qr_updated_at() CASCADE;


-- ═══════════════════════════════════════════
-- BƯỚC 2: TẠO FUNCTION CHUNG
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════
-- BƯỚC 3: TẠO DIMENSION TABLES
-- ═══════════════════════════════════════════

-- ─── Dim_Hòm (Sản phẩm / Hòm) ───────────
CREATE TABLE dim_hom (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_hom        text UNIQUE NOT NULL,           -- Mã sản phẩm
  ten_hom       text NOT NULL,                   -- Tên hòm / sản phẩm
  nhom_san_pham text,                            -- Nhóm sản phẩm
  don_vi_tinh   text DEFAULT 'Cái',              -- Đơn vị tính
  gia_von       numeric(15,2) DEFAULT 0,         -- Giá vốn
  gia_ban       numeric(15,2) DEFAULT 0,         -- Giá bán
  mo_ta         text,                            -- Mô tả
  hinh_anh      text,                            -- URL hình ảnh
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_hom_updated_at
  BEFORE UPDATE ON dim_hom
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─── Dim_Kho (Kho hàng) ──────────────────
CREATE TABLE dim_kho (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_kho     text UNIQUE NOT NULL,              -- Mã kho
  ten_kho    text NOT NULL,                      -- Tên kho
  dia_chi    text,                               -- Địa chỉ kho
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_kho_updated_at
  BEFORE UPDATE ON dim_kho
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─── Dim_NCC (Nhà cung cấp) ──────────────
CREATE TABLE dim_ncc (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_ncc         text UNIQUE NOT NULL,           -- Mã NCC
  ten_ncc        text NOT NULL,                   -- Tên công ty
  nguoi_lien_he  text,                            -- Người liên hệ
  sdt            text,                            -- Số điện thoại
  email          text,                            -- Email
  dia_chi        text,                            -- Địa chỉ
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_ncc_updated_at
  BEFORE UPDATE ON dim_ncc
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ─── Dim_Account (Tài khoản) ─────────────
CREATE TABLE dim_account (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,              -- Email đăng nhập
  ho_ten     text NOT NULL DEFAULT '',           -- Họ và tên
  chuc_vu    text DEFAULT '',                    -- Chức vụ
  phong_ban  text DEFAULT '',                    -- Phòng ban
  sdt        text DEFAULT '',                    -- Số điện thoại
  role       text NOT NULL DEFAULT 'sales'       -- admin/procurement/warehouse/operations/sales
             CHECK (role IN ('admin','procurement','warehouse','operations','sales')),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_account_updated_at
  BEFORE UPDATE ON dim_account
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ═══════════════════════════════════════════
-- BƯỚC 4: TẠO FACT TABLES
-- ═══════════════════════════════════════════

-- ─── Fact_Inventory (Tồn kho) ────────────
CREATE TABLE fact_inventory (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hom_id            uuid NOT NULL REFERENCES dim_hom(id),
  kho_id            uuid NOT NULL REFERENCES dim_kho(id),
  so_luong          integer NOT NULL DEFAULT 0,              -- Số lượng tổng
  so_luong_kha_dung integer NOT NULL DEFAULT 0,              -- Số lượng khả dụng
  ma_lo             text,                                     -- Mã lô hàng (đám)
  trang_thai        text NOT NULL DEFAULT 'active'
                    CHECK (trang_thai IN ('active','reserved','depleted')),
  ghi_chu           text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_fact_inventory_updated_at
  BEFORE UPDATE ON fact_inventory
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_fact_inventory_hom ON fact_inventory(hom_id);
CREATE INDEX idx_fact_inventory_kho ON fact_inventory(kho_id);
CREATE INDEX idx_fact_inventory_trang_thai ON fact_inventory(trang_thai);


-- ─── Fact_Đơn_Hàng (Purchase Orders) ────
CREATE TABLE fact_don_hang (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_don_hang   text UNIQUE NOT NULL,                          -- PO code
  ncc_id        uuid REFERENCES dim_ncc(id),                   -- Nhà cung cấp
  kho_id        uuid REFERENCES dim_kho(id),                   -- Kho nhận hàng
  nguoi_tao_id  uuid REFERENCES dim_account(id),               -- Người tạo đơn
  nguoi_duyet_id uuid REFERENCES dim_account(id),              -- Người duyệt
  trang_thai    text NOT NULL DEFAULT 'draft'
                CHECK (trang_thai IN ('draft','submitted','approved','received','closed','cancelled')),
  tong_tien     numeric(15,2) DEFAULT 0,
  ghi_chu       text,
  ngay_dat      date DEFAULT current_date,                     -- Ngày đặt hàng
  ngay_du_kien  date,                                          -- Ngày dự kiến nhận
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_fact_don_hang_updated_at
  BEFORE UPDATE ON fact_don_hang
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_fact_don_hang_trang_thai ON fact_don_hang(trang_thai);
CREATE INDEX idx_fact_don_hang_ncc ON fact_don_hang(ncc_id);
CREATE INDEX idx_fact_don_hang_ngay ON fact_don_hang(created_at DESC);


-- Chi tiết đơn hàng
CREATE TABLE fact_don_hang_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  don_hang_id   uuid NOT NULL REFERENCES fact_don_hang(id) ON DELETE CASCADE,
  hom_id        uuid REFERENCES dim_hom(id),                   -- Sản phẩm
  ma_hom        text NOT NULL,                                  -- Mã SP (backup nếu chưa có dim)
  ten_hom       text NOT NULL,                                  -- Tên SP
  so_luong      integer NOT NULL DEFAULT 1 CHECK (so_luong > 0),
  don_gia       numeric(15,2) DEFAULT 0,                        -- Đơn giá
  thanh_tien    numeric(15,2) GENERATED ALWAYS AS (so_luong * don_gia) STORED,
  so_luong_da_nhan integer DEFAULT 0,                           -- Đã nhận (từ GRPO)
  ghi_chu       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fact_don_hang_items_parent ON fact_don_hang_items(don_hang_id);


-- ─── Fact_Nhập_Hàng (Goods Receipt) ─────
CREATE TABLE fact_nhap_hang (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_nhap  text UNIQUE NOT NULL,                          -- GR code
  don_hang_id    uuid REFERENCES fact_don_hang(id),             -- PO liên kết (nullable)
  kho_id         uuid NOT NULL REFERENCES dim_kho(id),          -- Kho nhận hàng
  nguoi_nhan_id  uuid REFERENCES dim_account(id),               -- Người nhận hàng
  trang_thai     text NOT NULL DEFAULT 'pending'
                 CHECK (trang_thai IN ('pending','inspecting','completed','rejected')),
  ghi_chu        text,
  ngay_nhan      date DEFAULT current_date,                     -- Ngày nhận hàng
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_fact_nhap_hang_updated_at
  BEFORE UPDATE ON fact_nhap_hang
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_fact_nhap_hang_trang_thai ON fact_nhap_hang(trang_thai);
CREATE INDEX idx_fact_nhap_hang_kho ON fact_nhap_hang(kho_id);
CREATE INDEX idx_fact_nhap_hang_ngay ON fact_nhap_hang(created_at DESC);


-- Chi tiết nhập hàng
CREATE TABLE fact_nhap_hang_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhap_hang_id    uuid NOT NULL REFERENCES fact_nhap_hang(id) ON DELETE CASCADE,
  hom_id          uuid REFERENCES dim_hom(id),
  ma_hom          text NOT NULL,
  ten_hom         text NOT NULL,
  so_luong_yeu_cau integer DEFAULT 0,                           -- SL yêu cầu (từ PO)
  so_luong_thuc_nhan integer DEFAULT 0,                         -- SL thực nhận
  dat_yeu_cau     boolean DEFAULT true,                          -- Đạt / không đạt
  ghi_chu         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fact_nhap_hang_items_parent ON fact_nhap_hang_items(nhap_hang_id);


-- ─── Fact_Xuất_Hàng (Goods Issue / Delivery) ──
CREATE TABLE fact_xuat_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_xuat   text UNIQUE NOT NULL,                         -- DO code
  kho_id          uuid NOT NULL REFERENCES dim_kho(id),         -- Kho xuất
  nguoi_xuat_id   uuid REFERENCES dim_account(id),              -- Người xuất hàng
  nguoi_giao      text,                                          -- Người vận chuyển
  trang_thai      text NOT NULL DEFAULT 'pending'
                  CHECK (trang_thai IN ('pending','assigned','in_transit','delivered','cancelled')),
  ten_khach       text,                                          -- Tên khách hàng
  sdt_khach       text,                                          -- SĐT khách
  dia_chi_giao    text,                                          -- Địa chỉ giao
  ghi_chu         text,
  ngay_giao       date,                                          -- Ngày giao hàng
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_fact_xuat_hang_updated_at
  BEFORE UPDATE ON fact_xuat_hang
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_fact_xuat_hang_trang_thai ON fact_xuat_hang(trang_thai);
CREATE INDEX idx_fact_xuat_hang_kho ON fact_xuat_hang(kho_id);
CREATE INDEX idx_fact_xuat_hang_ngay ON fact_xuat_hang(created_at DESC);


-- Chi tiết xuất hàng
CREATE TABLE fact_xuat_hang_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xuat_hang_id    uuid NOT NULL REFERENCES fact_xuat_hang(id) ON DELETE CASCADE,
  hom_id          uuid REFERENCES dim_hom(id),
  ma_hom          text NOT NULL,
  ten_hom         text NOT NULL,
  so_luong        integer NOT NULL DEFAULT 1 CHECK (so_luong > 0),
  inventory_id    uuid REFERENCES fact_inventory(id),            -- Lô tồn kho bị trừ
  ghi_chu         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fact_xuat_hang_items_parent ON fact_xuat_hang_items(xuat_hang_id);


-- ═══════════════════════════════════════════
-- BƯỚC 5: ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

-- Enable RLS trên tất cả bảng
ALTER TABLE dim_hom                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_kho                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_ncc                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_account             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_don_hang           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_don_hang_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_nhap_hang          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_nhap_hang_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_xuat_hang          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_xuat_hang_items    ENABLE ROW LEVEL SECURITY;

-- Dim tables: ai cũng đọc được, admin mới ghi được
CREATE POLICY "dim_hom_select" ON dim_hom FOR SELECT USING (true);
CREATE POLICY "dim_hom_all"    ON dim_hom FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "dim_kho_select" ON dim_kho FOR SELECT USING (true);
CREATE POLICY "dim_kho_all"    ON dim_kho FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "dim_ncc_select" ON dim_ncc FOR SELECT USING (true);
CREATE POLICY "dim_ncc_all"    ON dim_ncc FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "dim_account_select" ON dim_account FOR SELECT USING (true);
CREATE POLICY "dim_account_all"    ON dim_account FOR ALL    USING (true) WITH CHECK (true);

-- Fact tables: đọc public, ghi qua service-role
CREATE POLICY "fact_inventory_select" ON fact_inventory FOR SELECT USING (true);
CREATE POLICY "fact_inventory_all"    ON fact_inventory FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "fact_don_hang_select" ON fact_don_hang FOR SELECT USING (true);
CREATE POLICY "fact_don_hang_all"    ON fact_don_hang FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "fact_don_hang_items_select" ON fact_don_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_don_hang_items_all"    ON fact_don_hang_items FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "fact_nhap_hang_select" ON fact_nhap_hang FOR SELECT USING (true);
CREATE POLICY "fact_nhap_hang_all"    ON fact_nhap_hang FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "fact_nhap_hang_items_select" ON fact_nhap_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_nhap_hang_items_all"    ON fact_nhap_hang_items FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "fact_xuat_hang_select" ON fact_xuat_hang FOR SELECT USING (true);
CREATE POLICY "fact_xuat_hang_all"    ON fact_xuat_hang FOR ALL    USING (true) WITH CHECK (true);

CREATE POLICY "fact_xuat_hang_items_select" ON fact_xuat_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_xuat_hang_items_all"    ON fact_xuat_hang_items FOR ALL    USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════
-- BƯỚC 6: DỮ LIỆU MẪU (SEED DATA)
-- ═══════════════════════════════════════════

-- Kho mẫu
INSERT INTO dim_kho (ma_kho, ten_kho, dia_chi) VALUES
  ('KHO-01', 'Kho Chính',     'Xưởng sản xuất chính'),
  ('KHO-02', 'Kho Chi nhánh', 'Chi nhánh phía Nam'),
  ('KHO-03', 'Kho Phụ',       'Kho phụ');

-- NCC mẫu
INSERT INTO dim_ncc (ma_ncc, ten_ncc, nguoi_lien_he, sdt) VALUES
  ('NCC-001', 'Công ty TNHH Gỗ Việt',    'Nguyễn Văn A', '0901234567'),
  ('NCC-002', 'Xưởng Gỗ Phú Yên',        'Trần Văn B',   '0912345678'),
  ('NCC-003', 'Công ty CP Vật liệu Sài Gòn', 'Lê Thị C', '0923456789');

-- Account mẫu
INSERT INTO dim_account (email, ho_ten, chuc_vu, phong_ban, role) VALUES
  ('admin@blackstones.com.vn', 'Admin',     'Quản trị viên', 'IT',       'admin'),
  ('bepbanhthumai@blackstone.com.vn',   'Thu mua',   'Thu mua',        'Thu mua',   'procurement'),
  ('bephaivanhhanh7@blackstone.com.vn', 'Văn hành',  'Vận hành',       'Vận hành',  'operations'),
  ('kho1@blackstone.com.vn',            'Kho 1',     'Thủ kho',        'Kho',       'warehouse'),
  ('kho2@blackstone.com.vn',            'Kho 2',     'Thủ kho',        'Kho',       'warehouse'),
  ('kho3@blackstone.com.vn',            'Kho 3',     'Thủ kho',        'Kho',       'warehouse');


-- ═══════════════════════════════════════════
-- HOÀN TẤT
-- ═══════════════════════════════════════════
-- Tổng: 11 bảng mới
--   Dim:    dim_hom, dim_kho, dim_ncc, dim_account
--   Fact:   fact_inventory, fact_don_hang, fact_nhap_hang, fact_xuat_hang
--   Detail: fact_don_hang_items, fact_nhap_hang_items, fact_xuat_hang_items
