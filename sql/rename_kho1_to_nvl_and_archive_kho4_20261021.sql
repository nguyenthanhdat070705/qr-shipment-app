-- Authorized 21/10/2026: keep KHO-01 as the active Nguyễn Văn Linh (Kho 4),
-- and archive the duplicate 1O-39 warehouse/account. Preserve all inventory rows
-- and transaction history; active-warehouse summaries omit the archived record.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.dim_kho, public.dim_account, public.warehouses, auth.users IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  changed_count integer;
BEGIN
  IF (SELECT count(*) FROM public.dim_kho WHERE ma_kho = 'KHO-01'
      AND ten_kho IN ('Kho Hàm Long (Kho 1)', 'Kho Nguyễn Văn Linh (Kho 1)', 'Kho Nguyễn Văn Linh (Kho 4)')
      AND is_active) <> 1 THEN
    RAISE EXCEPTION 'KHO-01 identity differs from the authorized rename';
  END IF;
  IF (SELECT count(*) FROM public.dim_kho WHERE ma_kho = '1O-39'
      AND ten_kho IN ('Kho Nguyễn Văn Linh', 'Kho Nguyễn Văn Linh (Kho 4)')) <> 1 THEN
    RAISE EXCEPTION '1O-39 identity differs from the duplicate warehouse to archive';
  END IF;
  IF (SELECT count(*) FROM public.dim_account WHERE email = 'kho1@blackstone.com.vn' AND role = 'warehouse') <> 1 THEN
    RAISE EXCEPTION 'Expected one warehouse profile for kho1';
  END IF;
  IF (SELECT count(*) FROM public.dim_account WHERE email = 'kho4@blackstone.com.vn' AND role = 'warehouse') <> 1 THEN
    RAISE EXCEPTION 'Expected one warehouse profile for kho4';
  END IF;
  IF (SELECT count(*) FROM auth.users WHERE email IN ('kho1@blackstone.com.vn', 'kho4@blackstone.com.vn')) <> 2 THEN
    RAISE EXCEPTION 'Expected both Auth users before account reconciliation';
  END IF;

  UPDATE public.dim_kho
    SET ten_kho = 'Kho Nguyễn Văn Linh (Kho 4)', is_active = true, updated_at = now()
    WHERE ma_kho = 'KHO-01';
  UPDATE public.dim_kho
    SET is_active = false, updated_at = now()
    WHERE ma_kho = '1O-39';

  UPDATE public.dim_account
    SET ho_ten = 'Kho Nguyễn Văn Linh (Kho 4)', is_active = true, updated_at = now()
    WHERE email = 'kho1@blackstone.com.vn';
  UPDATE public.dim_account
    SET is_active = false, updated_at = now()
    WHERE email = 'kho4@blackstone.com.vn';

  UPDATE public.warehouses
    SET name = 'Kho Nguyễn Văn Linh (Kho 4)', is_active = true, updated_at = now()
    WHERE code = 'KHO-01';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count > 1 THEN RAISE EXCEPTION 'Unexpected duplicate legacy KHO-01 records'; END IF;

  UPDATE auth.users
    SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('name', 'Kho Nguyễn Văn Linh (Kho 4)', 'full_name', 'Kho Nguyễn Văn Linh (Kho 4)'),
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object('role', 'warehouse', 'warehouse_id', (SELECT id::text FROM public.dim_kho WHERE ma_kho = 'KHO-01'), 'warehouse_code', 'KHO-01'),
        updated_at = now()
    WHERE email = 'kho1@blackstone.com.vn';
  UPDATE auth.users
    SET banned_until = now() + interval '100 years',
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_active', false),
        updated_at = now()
    WHERE email = 'kho4@blackstone.com.vn';
END $$;

COMMIT;

SELECT 'warehouse' AS kind, k.ma_kho AS code, k.ten_kho AS display_name, k.is_active AS active,
  count(i."Mã") AS inventory_rows, coalesce(sum(i."Số lượng"),0) AS total_quantity
FROM public.dim_kho k
LEFT JOIN public.fact_inventory i ON i."Kho" = k.id
WHERE k.ma_kho IN ('KHO-01','1O-39')
GROUP BY k.ma_kho,k.ten_kho,k.is_active
UNION ALL
SELECT 'account', split_part(a.email,'@',1), a.ho_ten, a.is_active, NULL, NULL
FROM public.dim_account a
WHERE a.email IN ('kho1@blackstone.com.vn','kho4@blackstone.com.vn')
ORDER BY kind,code;
