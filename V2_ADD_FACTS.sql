-- =========================================================
-- FILE CẬP NHẬT 7 BẢNG GIAO DỊCH (FACT) CÒN THIẾU
-- =========================================================

-- 1. TẠO BẢNG XÁC NHẬN XUẤT HÀNG
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

-- 2. TẠO BẢNG ĐƠN HÀNG MUA 
CREATE TABLE IF NOT EXISTS fact_don_hang (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_don_hang   text UNIQUE NOT NULL,                          
  ncc_id        uuid REFERENCES dim_ncc(id),                   
  kho_id        uuid REFERENCES dim_kho(id),                   
  nguoi_tao_id  uuid REFERENCES dim_account(id),               
  nguoi_duyet_id uuid REFERENCES dim_account(id),              
  trang_thai    text NOT NULL DEFAULT 'draft'
                CHECK (trang_thai IN ('draft','submitted','approved','received','closed','cancelled')),
  tong_tien     numeric(15,2) DEFAULT 0,
  ghi_chu       text,
  ngay_dat      date DEFAULT current_date,                     
  ngay_du_kien  date,                                          
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS set_fact_don_hang_updated_at ON fact_don_hang;
CREATE TRIGGER set_fact_don_hang_updated_at BEFORE UPDATE ON fact_don_hang FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. CHI TIẾT ĐƠN HÀNG MUA
CREATE TABLE IF NOT EXISTS fact_don_hang_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  don_hang_id   uuid NOT NULL REFERENCES fact_don_hang(id) ON DELETE CASCADE,
  hom_id        uuid REFERENCES dim_hom(id),                   
  ma_hom        text NOT NULL,                                  
  ten_hom       text NOT NULL,                                  
  so_luong      integer NOT NULL DEFAULT 1 CHECK (so_luong > 0),
  don_gia       numeric(15,2) DEFAULT 0,                        
  thanh_tien    numeric(15,2) GENERATED ALWAYS AS (so_luong * don_gia) STORED,
  so_luong_da_nhan integer DEFAULT 0,                           
  ghi_chu       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 4. TẠO BẢNG NHẬP HÀNG (GOODS RECEIPT)
CREATE TABLE IF NOT EXISTS fact_nhap_hang (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_nhap  text UNIQUE NOT NULL,                          
  don_hang_id    uuid REFERENCES fact_don_hang(id),             
  kho_id         uuid NOT NULL REFERENCES dim_kho(id),          
  nguoi_nhan_id  uuid REFERENCES dim_account(id),               
  trang_thai     text NOT NULL DEFAULT 'pending'
                 CHECK (trang_thai IN ('pending','inspecting','completed','rejected')),
  ghi_chu        text,
  ngay_nhan      date DEFAULT current_date,                     
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS set_fact_nhap_hang_updated_at ON fact_nhap_hang;
CREATE TRIGGER set_fact_nhap_hang_updated_at BEFORE UPDATE ON fact_nhap_hang FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 5. CHI TIẾT NHẬP HÀNG
CREATE TABLE IF NOT EXISTS fact_nhap_hang_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhap_hang_id    uuid NOT NULL REFERENCES fact_nhap_hang(id) ON DELETE CASCADE,
  hom_id          uuid REFERENCES dim_hom(id),
  ma_hom          text NOT NULL,
  ten_hom         text NOT NULL,
  so_luong_yeu_cau integer DEFAULT 0,                           
  so_luong_thuc_nhan integer DEFAULT 0,                         
  dat_yeu_cau     boolean DEFAULT true,                          
  ghi_chu         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 6. TẠO BẢNG XUẤT HÀNG (DELIVERY)
CREATE TABLE IF NOT EXISTS fact_xuat_hang (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_phieu_xuat   text UNIQUE NOT NULL,                         
  kho_id          uuid NOT NULL REFERENCES dim_kho(id),         
  nguoi_xuat_id   uuid REFERENCES dim_account(id),              
  nguoi_giao      text,                                          
  trang_thai      text NOT NULL DEFAULT 'pending'
                  CHECK (trang_thai IN ('pending','assigned','in_transit','delivered','cancelled')),
  ten_khach       text,                                          
  sdt_khach       text,                                          
  dia_chi_giao    text,                                          
  ghi_chu         text,
  ngay_giao       date,                                          
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS set_fact_xuat_hang_updated_at ON fact_xuat_hang;
CREATE TRIGGER set_fact_xuat_hang_updated_at BEFORE UPDATE ON fact_xuat_hang FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 7. CHI TIẾT XUẤT HÀNG
CREATE TABLE IF NOT EXISTS fact_xuat_hang_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xuat_hang_id    uuid NOT NULL REFERENCES fact_xuat_hang(id) ON DELETE CASCADE,
  hom_id          uuid REFERENCES dim_hom(id),
  ma_hom          text NOT NULL,
  ten_hom         text NOT NULL,
  so_luong        integer NOT NULL DEFAULT 1 CHECK (so_luong > 0),
  inventory_id    uuid,            
  ghi_chu         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- BẬT QUYỀN RLS
ALTER TABLE export_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_don_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_don_hang_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_nhap_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_nhap_hang_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_xuat_hang ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_xuat_hang_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select" ON export_confirmations FOR SELECT USING (true);
CREATE POLICY "public_all" ON export_confirmations FOR ALL USING (true) WITH CHECK (true);

-- CẤP QUYỀN GHI QUA API
GRANT ALL ON TABLE public.export_confirmations TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_don_hang TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_don_hang_items TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_nhap_hang TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_nhap_hang_items TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_xuat_hang TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fact_xuat_hang_items TO postgres, public, anon, authenticated, service_role;
