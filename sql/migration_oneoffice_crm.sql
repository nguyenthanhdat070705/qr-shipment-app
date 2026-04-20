-- Migration: 1Office CRM Tables
-- Chạy trong Supabase Dashboard → SQL Editor

-- =======================================================
-- 1. Khách hàng / Accounts
-- =======================================================
CREATE TABLE IF NOT EXISTS oneoffice_crm_customers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oneoffice_id    INTEGER UNIQUE NOT NULL,
  code            TEXT,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  company         TEXT,
  assigned_to     TEXT,
  assigned_name   TEXT,
  status          TEXT,
  customer_type   TEXT,
  source          TEXT,
  tags            TEXT,
  total_revenue   NUMERIC DEFAULT 0,
  note            TEXT,
  date_created    DATE,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================================
-- 2. Cơ hội kinh doanh / Leads + Deals
-- =======================================================
CREATE TABLE IF NOT EXISTS oneoffice_crm_leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oneoffice_id    INTEGER UNIQUE NOT NULL,
  code            TEXT,
  title           TEXT NOT NULL,
  customer_id     INTEGER,
  customer_name   TEXT,
  customer_phone  TEXT,
  assigned_to     TEXT,
  stage           TEXT,
  status          TEXT,
  value           NUMERIC DEFAULT 0,
  currency        TEXT DEFAULT 'VND',
  probability     NUMERIC DEFAULT 0,
  expected_close  DATE,
  source          TEXT,
  note            TEXT,
  date_created    DATE,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================================
-- 3. Công việc / Tasks
-- =======================================================
CREATE TABLE IF NOT EXISTS oneoffice_crm_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oneoffice_id    INTEGER UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  assigned_to     TEXT,
  related_type    TEXT,
  related_id      INTEGER,
  status          TEXT,
  priority        TEXT,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  date_created    DATE,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================================
-- 4. Lịch sử sync
-- =======================================================
CREATE TABLE IF NOT EXISTS oneoffice_sync_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'running',
  fetched     INTEGER DEFAULT 0,
  upserted    INTEGER DEFAULT 0,
  errors      INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_msg   TEXT,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- =======================================================
-- Indexes
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_crm_cust_phone     ON oneoffice_crm_customers(phone);
CREATE INDEX IF NOT EXISTS idx_crm_cust_name      ON oneoffice_crm_customers(name);
CREATE INDEX IF NOT EXISTS idx_crm_cust_assigned  ON oneoffice_crm_customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_cust_status    ON oneoffice_crm_customers(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_cust     ON oneoffice_crm_leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage    ON oneoffice_crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON oneoffice_crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due      ON oneoffice_crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_sync_log_type      ON oneoffice_sync_log(sync_type, started_at DESC);

-- =======================================================
-- Enable RLS (Row Level Security)
-- =======================================================
ALTER TABLE oneoffice_crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oneoffice_crm_leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE oneoffice_crm_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE oneoffice_sync_log      ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_all_customers" ON oneoffice_crm_customers FOR ALL USING (true);
CREATE POLICY "service_role_all_leads"     ON oneoffice_crm_leads     FOR ALL USING (true);
CREATE POLICY "service_role_all_tasks"     ON oneoffice_crm_tasks     FOR ALL USING (true);
CREATE POLICY "service_role_all_sync_log"  ON oneoffice_sync_log      FOR ALL USING (true);
