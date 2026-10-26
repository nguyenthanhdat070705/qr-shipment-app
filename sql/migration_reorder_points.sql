-- Reorder point management and idempotent low-stock alerts.
-- Apply this migration in Supabase SQL Editor before using /procurement/reorder-points.

CREATE TABLE IF NOT EXISTS public.reorder_point_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_month date NOT NULL,
  source_file_name text NOT NULL,
  uploaded_by text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'superseded', 'rejected')),
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  source_hash text,
  source_rows jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reorder_point_sets_status
  ON public.reorder_point_sets(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reorder_point_sets_single_active
  ON public.reorder_point_sets(status)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_reorder_point_sets_effective_month
  ON public.reorder_point_sets(effective_month DESC);

ALTER TABLE public.reorder_point_sets
  ADD COLUMN IF NOT EXISTS source_rows jsonb;

CREATE TABLE IF NOT EXISTS public.reorder_point_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.reorder_point_sets(id) ON DELETE CASCADE,
  hom_id uuid NOT NULL REFERENCES public.dim_hom(id),
  ma_hom text NOT NULL,
  safety_stock integer NOT NULL CHECK (safety_stock >= 0),
  movement integer NOT NULL CHECK (movement >= 0),
  reorder_point integer NOT NULL CHECK (reorder_point >= 0),
  description_snapshot text,
  source_row integer NOT NULL CHECK (source_row >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reorder_point_items_unique_sku_per_set UNIQUE (set_id, ma_hom),
  CONSTRAINT reorder_point_items_formula_check CHECK (reorder_point = safety_stock + movement)
);

CREATE INDEX IF NOT EXISTS idx_reorder_point_items_set_id
  ON public.reorder_point_items(set_id);
CREATE INDEX IF NOT EXISTS idx_reorder_point_items_sku
  ON public.reorder_point_items(ma_hom);

CREATE TABLE IF NOT EXISTS public.reorder_alert_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.reorder_point_sets(id) ON DELETE CASCADE,
  hom_id uuid NOT NULL REFERENCES public.dim_hom(id),
  ma_hom text NOT NULL,
  physical_quantity numeric NOT NULL DEFAULT 0,
  available_quantity numeric NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL CHECK (reorder_point >= 0),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'po_pending', 'resolved', 'superseded')),
  first_alerted_at timestamptz,
  last_notified_at timestamptz,
  last_reminder_date date,
  linked_po_id uuid REFERENCES public.fact_don_hang(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reorder_alert_states_unique_sku_per_set UNIQUE (set_id, hom_id)
);

CREATE INDEX IF NOT EXISTS idx_reorder_alert_states_set_status
  ON public.reorder_alert_states(set_id, status);
CREATE INDEX IF NOT EXISTS idx_reorder_alert_states_sku
  ON public.reorder_alert_states(ma_hom);
CREATE INDEX IF NOT EXISTS idx_reorder_alert_states_last_reminder
  ON public.reorder_alert_states(last_reminder_date);

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'receipt_alert',
    'export_alert',
    'system_alert',
    'temporary_receipt',
    'po_linked',
    'receipt_confirmed',
    'reorder_alert',
    'reorder_reminder'
  ));

ALTER TABLE public.reorder_point_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_point_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_alert_states ENABLE ROW LEVEL SECURITY;

-- The application uses the server-side service-role client for these tables.
-- No public/authenticated policies are added so the new tables are not exposed
-- through the Data API to arbitrary clients. Service role bypasses RLS.
GRANT ALL ON TABLE public.reorder_point_sets TO service_role;
GRANT ALL ON TABLE public.reorder_point_items TO service_role;
GRANT ALL ON TABLE public.reorder_alert_states TO service_role;

CREATE OR REPLACE FUNCTION public.touch_reorder_alert_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_reorder_alert_state_updated_at ON public.reorder_alert_states;
CREATE TRIGGER set_reorder_alert_state_updated_at
  BEFORE UPDATE ON public.reorder_alert_states
  FOR EACH ROW EXECUTE FUNCTION public.touch_reorder_alert_state_updated_at();

