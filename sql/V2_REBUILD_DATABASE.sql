-- ══════════════════════════════════════════════════════════════
-- BLACKSTONE SCM v2 — REBUILD DATABASE HOÀN TOÀN
-- Project: woqtdgzldkxmcgjshthx
-- Branch: v2-testing
-- Ngày tạo: 2026-04-03
-- ══════════════════════════════════════════════════════════════
-- ⚠️  CẢNH BÁO: Script này sẽ XÓA TOÀN BỘ dữ liệu cũ!
-- Chạy trong Supabase SQL Editor:
-- https://supabase.com/dashboard/project/woqtdgzldkxmcgjshthx/sql/new
-- ══════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 1: XÓA TẤT CẢ BẢNG CŨ                               │
-- └─────────────────────────────────────────────────────────────┘

-- Fact tables (xóa trước vì có foreign keys)
DROP TABLE IF EXISTS fact_xuat_hang_items CASCADE;
DROP TABLE IF EXISTS fact_xuat_hang CASCADE;
DROP TABLE IF EXISTS fact_nhap_hang_items CASCADE;
DROP TABLE IF EXISTS fact_nhap_hang CASCADE;
DROP TABLE IF EXISTS fact_don_hang_items CASCADE;
DROP TABLE IF EXISTS fact_don_hang CASCADE;
DROP TABLE IF EXISTS fact_inventory CASCADE;
DROP TABLE IF EXISTS fact_dam CASCADE;

-- Operations tables
DROP TABLE IF EXISTS delivery_order_items CASCADE;
DROP TABLE IF EXISTS delivery_orders CASCADE;
DROP TABLE IF EXISTS export_confirmations CASCADE;

-- Support tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS product_logs CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;

-- 1Office sync tables
DROP TABLE IF EXISTS warehouses_1office CASCADE;
DROP TABLE IF EXISTS goods_receipts_1office CASCADE;
DROP TABLE IF EXISTS inventory_1office CASCADE;
DROP TABLE IF EXISTS sale_orders CASCADE;

-- Legacy tables (dọn sạch)
DROP TABLE IF EXISTS goods_receipt_items CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS stocktakes CASCADE;
DROP TABLE IF EXISTS sale_contracts CASCADE;
DROP TABLE IF EXISTS sale_quotations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Dimension tables (xóa cuối)
DROP TABLE IF EXISTS dim_hom CASCADE;
DROP TABLE IF EXISTS dim_kho CASCADE;
DROP TABLE IF EXISTS dim_ncc CASCADE;
DROP TABLE IF EXISTS dim_account CASCADE;
DROP TABLE IF EXISTS dim_dam CASCADE;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 2: UTILITY FUNCTIONS                                  │
-- └─────────────────────────────────────────────────────────────┘

-- Hàm tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Hàm exec_sql (cho phép chạy raw SQL từ app)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql;
  result := '[]'::json;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 3: DIMENSION TABLES (Master Data)                     │
-- └─────────────────────────────────────────────────────────────┘

-- ── 3.1 dim_account — Tài khoản người dùng ──────────────────
CREATE TABLE dim_account (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  ho_ten      text DEFAULT '',
  chuc_vu     text DEFAULT '',           -- admin, warehouse, procurement, sales
  so_dien_thoai text DEFAULT '',
  phong_ban   text DEFAULT '',
  kho_id      uuid,                      -- Kho phụ trách (cho warehouse user)
  avatar_url  text,
  ghi_chu     text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_account_updated_at
  BEFORE UPDATE ON dim_account
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE dim_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_account_select" ON dim_account FOR SELECT USING (true);
CREATE POLICY "dim_account_all"    ON dim_account FOR ALL    USING (true) WITH CHECK (true);


-- ── 3.2 dim_kho — Danh mục kho hàng ─────────────────────────
CREATE TABLE dim_kho (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_kho      text UNIQUE NOT NULL,       -- VD: KHO1, KHO2, KHO3
  ten_kho     text NOT NULL,              -- VD: Kho 1 - Quận 12
  dia_chi     text,
  nguoi_quan_ly text,
  sdt         text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_kho_updated_at
  BEFORE UPDATE ON dim_kho
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE dim_kho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_kho_select" ON dim_kho FOR SELECT USING (true);
CREATE POLICY "dim_kho_all"    ON dim_kho FOR ALL    USING (true) WITH CHECK (true);


-- ── 3.3 dim_ncc — Nhà cung cấp ──────────────────────────────
CREATE TABLE dim_ncc (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_ncc          text UNIQUE NOT NULL,    -- VD: NCC001
  ten_ncc         text NOT NULL,
  nguoi_lien_he   text,
  sdt             text,
  dia_chi         text,
  email           text,
  ghi_chu         text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_ncc_updated_at
  BEFORE UPDATE ON dim_ncc
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE dim_ncc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_ncc_select" ON dim_ncc FOR SELECT USING (true);
CREATE POLICY "dim_ncc_all"    ON dim_ncc FOR ALL    USING (true) WITH CHECK (true);


-- ── 3.4 dim_hom — Danh mục sản phẩm (hòm) ──────────────────
CREATE TABLE dim_hom (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_hom      text UNIQUE NOT NULL,       -- VD: 2AQ0012
  ten_hom     text NOT NULL,              -- VD: Hòm Anh Quốc 12
  gia_ban     numeric(15,2) DEFAULT 0,
  gia_von     numeric(15,2) DEFAULT 0,
  hinh_anh    text,                       -- URL hình ảnh
  "NCC"       text,                       -- Tên NCC (text, legacy field)
  loai_hom    text,                       -- Phân loại hòm
  mo_ta       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_hom_updated_at
  BEFORE UPDATE ON dim_hom
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_dim_hom_ma ON dim_hom(ma_hom);

ALTER TABLE dim_hom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_hom_select" ON dim_hom FOR SELECT USING (true);
CREATE POLICY "dim_hom_all"    ON dim_hom FOR ALL    USING (true) WITH CHECK (true);


-- ── 3.5 dim_dam — Hồ sơ đám tang ────────────────────────────
CREATE TABLE dim_dam (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dam        text UNIQUE NOT NULL,       -- Mã đám (VD: 260101)
  ngay          text,                       -- Ngày diễn ra đám
  loai          text,                       -- Loại (Chôn CC, Thiêu TC, ...)
  chi_nhanh     text,                       -- Chi nhánh (CN1, CN2, CN3)
  nguoi_mat     text,                       -- Tên người mất
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_dim_dam_updated_at
  BEFORE UPDATE ON dim_dam
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_dim_dam_loai ON dim_dam(loai);
CREATE INDEX idx_dim_dam_chi_nhanh ON dim_dam(chi_nhanh);

ALTER TABLE dim_dam ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_dam_select" ON dim_dam FOR SELECT USING (true);
CREATE POLICY "dim_dam_all"    ON dim_dam FOR ALL    USING (true) WITH CHECK (true);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 4: FACT TABLES (Dữ liệu giao dịch)                   │
-- └─────────────────────────────────────────────────────────────┘

-- ── 4.1 fact_inventory — Tồn kho ─────────────────────────────
-- Lưu ý: Tên cột dùng tiếng Việt (legacy từ Google Sheets)
CREATE TABLE fact_inventory (
  "Mã"            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "Tên hàng hóa"  text NOT NULL,           -- → dim_hom.id (uuid dạng text)
  "Kho"           text,                     -- → dim_kho.id (uuid dạng text)
  "Số lượng"      integer DEFAULT 0,
  "Loại hàng"     text,
  "Ghi chú"       integer DEFAULT 0         -- Khả dụng (available qty)
);

ALTER TABLE fact_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_inventory_select" ON fact_inventory FOR SELECT USING (true);
CREATE POLICY "fact_inventory_all"    ON fact_inventory FOR ALL    USING (true) WITH CHECK (true);

CREATE INDEX idx_fact_inventory_product ON fact_inventory("Tên hàng hóa");
CREATE INDEX idx_fact_inventory_kho     ON fact_inventory("Kho");


-- ── 4.2 fact_don_hang — Đơn mua hàng (Purchase Orders) ──────
CREATE TABLE fact_don_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_don_hang     text UNIQUE NOT NULL,     -- VD: PO-20260403-001
  ncc_id          uuid REFERENCES dim_ncc(id),
  kho_id          uuid REFERENCES dim_kho(id),
  nguoi_tao_id    uuid REFERENCES dim_account(id),
  trang_thai      text DEFAULT 'draft',     -- draft, confirmed, received, cancelled
  tong_tien       numeric(15,2) DEFAULT 0,
  ghi_chu         text,
  ngay_dat        date DEFAULT CURRENT_DATE,
  ngay_giao_du_kien date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_fact_don_hang_updated_at
  BEFORE UPDATE ON fact_don_hang
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_fact_don_hang_status ON fact_don_hang(trang_thai);
CREATE INDEX idx_fact_don_hang_ncc    ON fact_don_hang(ncc_id);

ALTER TABLE fact_don_hang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_don_hang_select" ON fact_don_hang FOR SELECT USING (true);
CREATE POLICY "fact_don_hang_all"    ON fact_don_hang FOR ALL    USING (true) WITH CHECK (true);


-- ── 4.3 fact_don_hang_items — Chi tiết đơn mua hàng ──────────
CREATE TABLE fact_don_hang_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  don_hang_id     uuid NOT NULL REFERENCES fact_don_hang(id) ON DELETE CASCADE,
  hom_id          uuid REFERENCES dim_hom(id),
  ma_hom          text,
  ten_hom         text,
  so_luong        integer DEFAULT 0,
  don_gia         numeric(15,2) DEFAULT 0,
  thanh_tien      numeric(15,2) DEFAULT 0,
  hang_ky_gui     boolean DEFAULT false,    -- Hàng ký gửi
  ghi_chu         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fact_don_hang_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_don_hang_items_select" ON fact_don_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_don_hang_items_all"    ON fact_don_hang_items FOR ALL    USING (true) WITH CHECK (true);


-- ── 4.4 fact_nhap_hang — Phiếu nhập kho (GRPO) ──────────────
CREATE TABLE fact_nhap_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_nhap   text UNIQUE NOT NULL,     -- VD: GR-20260403-001
  don_hang_id     uuid REFERENCES fact_don_hang(id),
  kho_id          uuid REFERENCES dim_kho(id),
  nguoi_nhan_id   uuid REFERENCES dim_account(id),
  trang_thai      text DEFAULT 'completed', -- completed, cancelled
  ngay_nhan       date DEFAULT CURRENT_DATE,
  ghi_chu         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_fact_nhap_hang_updated_at
  BEFORE UPDATE ON fact_nhap_hang
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_fact_nhap_hang_po  ON fact_nhap_hang(don_hang_id);
CREATE INDEX idx_fact_nhap_hang_kho ON fact_nhap_hang(kho_id);

ALTER TABLE fact_nhap_hang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_nhap_hang_select" ON fact_nhap_hang FOR SELECT USING (true);
CREATE POLICY "fact_nhap_hang_all"    ON fact_nhap_hang FOR ALL    USING (true) WITH CHECK (true);


-- ── 4.5 fact_nhap_hang_items — Chi tiết nhập kho ─────────────
CREATE TABLE fact_nhap_hang_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhap_hang_id      uuid NOT NULL REFERENCES fact_nhap_hang(id) ON DELETE CASCADE,
  ma_hom            text,
  ten_hom           text,
  so_luong_yeu_cau  integer DEFAULT 0,
  so_luong_thuc_nhan integer DEFAULT 0,
  ghi_chu           text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fact_nhap_hang_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_nhap_hang_items_select" ON fact_nhap_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_nhap_hang_items_all"    ON fact_nhap_hang_items FOR ALL    USING (true) WITH CHECK (true);


-- ── 4.6 fact_xuat_hang — Phiếu xuất kho (Goods Issue) ───────
CREATE TABLE fact_xuat_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_xuat   text UNIQUE NOT NULL,     -- VD: DO-20260403-1234
  kho_id          uuid REFERENCES dim_kho(id),
  nguoi_xuat_id   uuid REFERENCES dim_account(id),
  trang_thai      text DEFAULT 'pending',   -- pending, delivered, cancelled
  ten_khach       text,                     -- Tên người nhận
  sdt_khach       text,
  dia_chi_giao    text,
  ghi_chu         text,                     -- Chứa mã đám: "Mã Đám: 260101"
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_fact_xuat_hang_updated_at
  BEFORE UPDATE ON fact_xuat_hang
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_fact_xuat_hang_kho    ON fact_xuat_hang(kho_id);
CREATE INDEX idx_fact_xuat_hang_status ON fact_xuat_hang(trang_thai);

ALTER TABLE fact_xuat_hang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_xuat_hang_select" ON fact_xuat_hang FOR SELECT USING (true);
CREATE POLICY "fact_xuat_hang_all"    ON fact_xuat_hang FOR ALL    USING (true) WITH CHECK (true);


-- ── 4.7 fact_xuat_hang_items — Chi tiết xuất kho ─────────────
CREATE TABLE fact_xuat_hang_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xuat_hang_id    uuid NOT NULL REFERENCES fact_xuat_hang(id) ON DELETE CASCADE,
  hom_id          uuid REFERENCES dim_hom(id),
  ma_hom          text,
  ten_hom         text,
  so_luong        integer DEFAULT 1,
  inventory_id    text,                     -- ref → fact_inventory."Mã"
  ghi_chu         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fact_xuat_hang_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_xuat_hang_items_select" ON fact_xuat_hang_items FOR SELECT USING (true);
CREATE POLICY "fact_xuat_hang_items_all"    ON fact_xuat_hang_items FOR ALL    USING (true) WITH CHECK (true);


-- ── 4.8 fact_dam — Dữ liệu đám tang (sync từ Google Sheets) ─
CREATE TABLE fact_dam (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stt             text,
  ngay            text,
  thang           text,
  ma_dam          text UNIQUE NOT NULL,

  -- Thông tin chung
  loai            text,
  chi_nhanh       text,
  nguoi_mat       text,
  dia_chi_to_chuc text,
  dia_chi_chon_thieu text,
  gio_liem        text,
  ngay_liem       text,
  gio_di_quan     text,
  ngay_di_quan    text,

  -- Nhân sự
  sale            text,
  dieu_phoi       text,

  -- Thầy
  thay_so_luong   text,
  thay_ncc        text,
  thay_ten        text,

  -- Hòm / Hoa / Focmol / Kèn
  hom_loai        text,
  hom_ncc_hay_kho text,
  hoa             text,
  da_kho_tiem_focmol text,
  ken_tay_so_le   text,
  ken_tay_ncc     text,

  -- Media
  quay_phim_chup_hinh_goi_dv text,
  quay_phim_chup_hinh_ncc    text,

  -- Cúng / Tâm Linh
  mam_cung_so_luong text,
  mam_cung_ncc      text,
  di_anh_cao_pho    text,
  bang_ron           text,
  la_trieu_bai_vi   text,

  -- Setup sự kiện
  nhac              text,
  thue_rap_ban_ghe_so_luong text,
  thue_rap_ban_ghe_ncc      text,
  hu_tro_cot        text,
  teabreak          text,

  -- Vận tải
  xe_tang_le_loai   text,
  xe_tang_le_dao_ty text,
  xe_tang_le_ncc    text,
  xe_khach_loai     text,
  xe_khach_ncc      text,
  xe_cap_cuu        text,
  xe_khac           text,

  -- Khác
  thue_nv_truc      text,
  bao_don           text,
  ghi_chu           text,
  chon_thieu        text,

  -- Metadata
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TRIGGER set_fact_dam_updated_at
  BEFORE UPDATE ON fact_dam
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE fact_dam ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fact_dam_select" ON fact_dam FOR SELECT USING (true);
CREATE POLICY "fact_dam_all"    ON fact_dam FOR ALL    USING (true) WITH CHECK (true);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 5: OPERATIONS TABLES                                  │
-- └─────────────────────────────────────────────────────────────┘

-- ── 5.1 delivery_orders — Lệnh giao hàng ────────────────────
CREATE TABLE delivery_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  do_code         text UNIQUE NOT NULL,     -- VD: DO-20260403-001
  customer_name   text,
  customer_phone  text,
  customer_address text,
  status          text DEFAULT 'pending',   -- pending, in_transit, delivered, cancelled
  warehouse_id    uuid REFERENCES dim_kho(id),
  delivery_date   date,
  note            text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_orders_select" ON delivery_orders FOR SELECT USING (true);
CREATE POLICY "delivery_orders_all"    ON delivery_orders FOR ALL    USING (true) WITH CHECK (true);


-- ── 5.2 delivery_order_items — Chi tiết giao hàng ────────────
CREATE TABLE delivery_order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id uuid NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_code    text,
  product_name    text,
  quantity        integer DEFAULT 1,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_order_items_select" ON delivery_order_items FOR SELECT USING (true);
CREATE POLICY "delivery_order_items_all"    ON delivery_order_items FOR ALL    USING (true) WITH CHECK (true);


-- ── 5.3 export_confirmations — Xác nhận xuất kho (QR scan) ──
CREATE TABLE export_confirmations (
  stt             serial PRIMARY KEY,
  ma_san_pham     text NOT NULL,
  ho_ten          text NOT NULL,
  email           text NOT NULL,
  chuc_vu         text DEFAULT '',
  ghi_chu         text,
  ngay_xuat       date DEFAULT CURRENT_DATE,
  thoi_gian_xuat  time DEFAULT CURRENT_TIME,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE export_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "export_confirmations_select" ON export_confirmations FOR SELECT USING (true);
CREATE POLICY "export_confirmations_all"    ON export_confirmations FOR ALL    USING (true) WITH CHECK (true);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 6: SUPPORT TABLES                                     │
-- └─────────────────────────────────────────────────────────────┘

-- ── 6.1 notifications — Thông báo hệ thống ──────────────────
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email    text,
  receiver_role   text,                     -- procurement, operations, warehouse, admin
  title           text NOT NULL,
  message         text,
  type            text DEFAULT 'info',      -- info, receipt_alert, export_alert
  reference_id    uuid,                     -- FK tới entity liên quan
  is_read         boolean DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_all"    ON notifications FOR ALL    USING (true) WITH CHECK (true);


-- ── 6.2 qr_codes — Mã QR inventory ──────────────────────────
CREATE TABLE qr_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code         text UNIQUE NOT NULL,
  type            text DEFAULT 'INVENTORY',  -- INVENTORY, SHIPMENT
  reference_id    text,                      -- product_code hoặc entity id
  quantity        integer DEFAULT 0,
  warehouse       text,                      -- warehouse_id
  status          text DEFAULT 'active',     -- active, used, expired
  created_by      text DEFAULT 'system',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_codes_select" ON qr_codes FOR SELECT USING (true);
CREATE POLICY "qr_codes_all"    ON qr_codes FOR ALL    USING (true) WITH CHECK (true);


-- ── 6.3 product_logs — Log hoạt động sản phẩm ───────────────
CREATE TABLE product_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text,
  action_type     text NOT NULL,             -- confirmed_export, received, etc.
  action_by       text,                      -- email người thực hiện
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_logs_select" ON product_logs FOR SELECT USING (true);
CREATE POLICY "product_logs_all"    ON product_logs FOR ALL    USING (true) WITH CHECK (true);


-- ── 6.4 sync_logs — Log đồng bộ hệ thống ────────────────────
CREATE TABLE sync_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type       text NOT NULL DEFAULT '1office_full',
  started_at      timestamptz,
  finished_at     timestamptz,
  total_duration_ms integer,
  tables_synced   text[],
  total_fetched   integer DEFAULT 0,
  total_upserted  integer DEFAULT 0,
  total_errors    integer DEFAULT 0,
  success         boolean DEFAULT true,
  details         jsonb,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_logs_select" ON sync_logs FOR SELECT USING (true);
CREATE POLICY "sync_logs_all"    ON sync_logs FOR ALL    USING (true) WITH CHECK (true);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 7: 1OFFICE SYNC TABLES                               │
-- └─────────────────────────────────────────────────────────────┘

-- ── 7.1 warehouses_1office ───────────────────────────────────
CREATE TABLE warehouses_1office (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer UNIQUE,
  code            text NOT NULL,
  name            text NOT NULL,
  address         text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE warehouses_1office ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warehouses_1office_select" ON warehouses_1office FOR SELECT USING (true);
CREATE POLICY "warehouses_1office_all"    ON warehouses_1office FOR ALL    USING (true) WITH CHECK (true);


-- ── 7.2 goods_receipts_1office ───────────────────────────────
CREATE TABLE goods_receipts_1office (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer UNIQUE,
  gr_code         text NOT NULL,
  warehouse_name  text,
  warehouse_code  text,
  supplier_name   text,
  supplier_code   text,
  status          text,
  approval_status text,
  total_amount    numeric(15,2) DEFAULT 0,
  note            text,
  received_date   date,
  created_by      text,
  product_list    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goods_receipts_1office ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goods_receipts_1office_select" ON goods_receipts_1office FOR SELECT USING (true);
CREATE POLICY "goods_receipts_1office_all"    ON goods_receipts_1office FOR ALL    USING (true) WITH CHECK (true);


-- ── 7.3 inventory_1office ────────────────────────────────────
CREATE TABLE inventory_1office (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer UNIQUE,
  product_code    text,
  product_name    text,
  warehouse_name  text,
  warehouse_code  text,
  quantity        numeric(15,3) DEFAULT 0,
  available_qty   numeric(15,3) DEFAULT 0,
  unit            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_1office ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_1office_select" ON inventory_1office FOR SELECT USING (true);
CREATE POLICY "inventory_1office_all"    ON inventory_1office FOR ALL    USING (true) WITH CHECK (true);


-- ── 7.4 sale_orders ──────────────────────────────────────────
CREATE TABLE sale_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id    integer UNIQUE,
  order_code      text NOT NULL,
  title           text,
  customer_id     integer,
  customer_name   text,
  customer_code   text,
  customer_phone  text,
  customer_email  text,
  order_date      date,
  delivery_date   date,
  status          text,
  approval_status text,
  total_amount    numeric(15,2) DEFAULT 0,
  currency_unit   text DEFAULT 'VND',
  product_list    text,
  note            text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sale_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_orders_select" ON sale_orders FOR SELECT USING (true);
CREATE POLICY "sale_orders_all"    ON sale_orders FOR ALL    USING (true) WITH CHECK (true);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 8: STORAGE BUCKET (Avatars)                           │
-- └─────────────────────────────────────────────────────────────┘

-- Tạo bucket avatars (chạy riêng nếu cần)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  PHẦN 9: REFRESH SCHEMA CACHE                              │
-- └─────────────────────────────────────────────────────────────┘

NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════
-- ✅ HOÀN TẤT! Database v2-testing đã sẵn sàng.
-- Tổng: 5 dim + 5 fact + 3 operations + 4 support + 4 sync = 21 bảng
-- ══════════════════════════════════════════════════════════════
