-- ═══════════════════════════════════════════
-- PHẦN 3/3: OPERATIONS + SUPPORT + 1OFFICE
-- Chạy SAU phần 2
-- ═══════════════════════════════════════════

CREATE TABLE delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  do_code text UNIQUE NOT NULL,
  customer_name text,
  customer_phone text,
  customer_address text,
  status text DEFAULT 'pending',
  warehouse_id uuid REFERENCES dim_kho(id),
  delivery_date date,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_delivery_orders_updated_at BEFORE UPDATE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_orders_select" ON delivery_orders FOR SELECT USING (true);
CREATE POLICY "delivery_orders_all" ON delivery_orders FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE delivery_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id uuid NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_code text,
  product_name text,
  quantity integer DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE delivery_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_order_items_select" ON delivery_order_items FOR SELECT USING (true);
CREATE POLICY "delivery_order_items_all" ON delivery_order_items FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE export_confirmations (
  stt serial PRIMARY KEY,
  ma_san_pham text NOT NULL,
  ho_ten text NOT NULL,
  email text NOT NULL,
  chuc_vu text DEFAULT '',
  ghi_chu text,
  ngay_xuat date DEFAULT CURRENT_DATE,
  thoi_gian_xuat time DEFAULT CURRENT_TIME,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE export_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "export_confirmations_select" ON export_confirmations FOR SELECT USING (true);
CREATE POLICY "export_confirmations_all" ON export_confirmations FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email text,
  receiver_role text,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_all" ON notifications FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text UNIQUE NOT NULL,
  type text DEFAULT 'INVENTORY',
  reference_id text,
  quantity integer DEFAULT 0,
  warehouse text,
  status text DEFAULT 'active',
  created_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_codes_select" ON qr_codes FOR SELECT USING (true);
CREATE POLICY "qr_codes_all" ON qr_codes FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE product_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  action_type text NOT NULL,
  action_by text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE product_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_logs_select" ON product_logs FOR SELECT USING (true);
CREATE POLICY "product_logs_all" ON product_logs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT '1office_full',
  started_at timestamptz,
  finished_at timestamptz,
  total_duration_ms integer,
  tables_synced text[],
  total_fetched integer DEFAULT 0,
  total_upserted integer DEFAULT 0,
  total_errors integer DEFAULT 0,
  success boolean DEFAULT true,
  details jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_logs_select" ON sync_logs FOR SELECT USING (true);
CREATE POLICY "sync_logs_all" ON sync_logs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE warehouses_1office (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id integer UNIQUE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE warehouses_1office ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warehouses_1office_select" ON warehouses_1office FOR SELECT USING (true);
CREATE POLICY "warehouses_1office_all" ON warehouses_1office FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE goods_receipts_1office (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id integer UNIQUE,
  gr_code text NOT NULL,
  warehouse_name text,
  warehouse_code text,
  supplier_name text,
  supplier_code text,
  status text,
  approval_status text,
  total_amount numeric(15,2) DEFAULT 0,
  note text,
  received_date date,
  created_by text,
  product_list text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE goods_receipts_1office ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goods_receipts_1office_select" ON goods_receipts_1office FOR SELECT USING (true);
CREATE POLICY "goods_receipts_1office_all" ON goods_receipts_1office FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE inventory_1office (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id integer UNIQUE,
  product_code text,
  product_name text,
  warehouse_name text,
  warehouse_code text,
  quantity numeric(15,3) DEFAULT 0,
  available_qty numeric(15,3) DEFAULT 0,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE inventory_1office ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_1office_select" ON inventory_1office FOR SELECT USING (true);
CREATE POLICY "inventory_1office_all" ON inventory_1office FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE sale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oneoffice_id integer UNIQUE,
  order_code text NOT NULL,
  title text,
  customer_id integer,
  customer_name text,
  customer_code text,
  customer_phone text,
  customer_email text,
  order_date date,
  delivery_date date,
  status text,
  approval_status text,
  total_amount numeric(15,2) DEFAULT 0,
  currency_unit text DEFAULT 'VND',
  product_list text,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sale_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_orders_select" ON sale_orders FOR SELECT USING (true);
CREATE POLICY "sale_orders_all" ON sale_orders FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
