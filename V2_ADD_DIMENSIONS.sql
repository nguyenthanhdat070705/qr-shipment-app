-- 1. Hàm Cập Nhật Thời Gian (Phòng Hờ Nếu V2 Chưa Có)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. TẠO BẢNG DIM_HOM (Danh Mục Hàng Hóa)
CREATE TABLE IF NOT EXISTS dim_hom (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_hom        text UNIQUE NOT NULL,           
  ten_hom       text NOT NULL,                   
  nhom_san_pham text,                            
  don_vi_tinh   text DEFAULT 'Cái',              
  gia_von       numeric(15,2) DEFAULT 0,         
  gia_ban       numeric(15,2) DEFAULT 0,         
  mo_ta         text,                            
  hinh_anh      text,                            
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS set_dim_hom_updated_at ON dim_hom;
CREATE TRIGGER set_dim_hom_updated_at BEFORE UPDATE ON dim_hom FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. TẠO BẢNG DIM_KHO (Danh Mục Kho)
CREATE TABLE IF NOT EXISTS dim_kho (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_kho     text UNIQUE NOT NULL,              
  ten_kho    text NOT NULL,                      
  dia_chi    text,                               
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS set_dim_kho_updated_at ON dim_kho;
CREATE TRIGGER set_dim_kho_updated_at BEFORE UPDATE ON dim_kho FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4. TẠO BẢNG DIM_NCC (Danh Mục Nhà Cung Cấp)
CREATE TABLE IF NOT EXISTS dim_ncc (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_ncc         text UNIQUE NOT NULL,           
  ten_ncc        text NOT NULL,                   
  nguoi_lien_he  text,                            
  sdt            text,                            
  email          text,                            
  dia_chi        text,                            
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS set_dim_ncc_updated_at ON dim_ncc;
CREATE TRIGGER set_dim_ncc_updated_at BEFORE UPDATE ON dim_ncc FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 5. TẠO BẢNG DIM_ACCOUNT (Tài Khoản Nhân Viên)
CREATE TABLE IF NOT EXISTS dim_account (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,              
  ho_ten     text NOT NULL DEFAULT '',           
  chuc_vu    text DEFAULT '',                    
  phong_ban  text DEFAULT '',                    
  sdt        text DEFAULT '',                    
  role       text NOT NULL DEFAULT 'sales'       
             CHECK (role IN ('admin','procurement','warehouse','operations','sales')),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS set_dim_account_updated_at ON dim_account;
CREATE TRIGGER set_dim_account_updated_at BEFORE UPDATE ON dim_account FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 6. MỞ QUYỀN RLS
ALTER TABLE dim_hom ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_kho ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_ncc ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dim_hom_select" ON dim_hom FOR SELECT USING (true);
CREATE POLICY "dim_hom_all"    ON dim_hom FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "dim_kho_select" ON dim_kho FOR SELECT USING (true);
CREATE POLICY "dim_kho_all"    ON dim_kho FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "dim_ncc_select" ON dim_ncc FOR SELECT USING (true);
CREATE POLICY "dim_ncc_all"    ON dim_ncc FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "dim_account_select" ON dim_account FOR SELECT USING (true);
CREATE POLICY "dim_account_all"    ON dim_account FOR ALL    USING (true) WITH CHECK (true);

-- 7. CẤP QUYỀN ACCESS API
GRANT ALL ON TABLE public.dim_hom TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_kho TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_ncc TO postgres, public, anon, authenticated, service_role;
GRANT ALL ON TABLE public.dim_account TO postgres, public, anon, authenticated, service_role;
