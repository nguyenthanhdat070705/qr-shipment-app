-- ==============================================================================
-- FILE: rpc_inventory.sql
-- MỤC ĐÍCH: Tạo các Stored Procedures (RPC) trên Supabase để trừ/cộng tồn kho 
-- một cách an toàn, tránh lỗi Race Condition và đảm bảo tính nhất quán dữ liệu.
-- 
-- CÁCH CHẠY: Copy toàn bộ nội dung file này và chạy trong SQL Editor của Supabase
-- ==============================================================================

-- 1. Hàm trừ/cộng kho dựa trên ID của dòng trong fact_inventory (Dùng cho Xuất hàng)
CREATE OR REPLACE FUNCTION adjust_inventory_by_id(
  p_inventory_id text,
  p_qty_delta int
) RETURNS jsonb AS $$
DECLARE
  v_hom_id text;
  v_new_qty int;
  v_new_khadung int;
  v_total_for_hom int;
BEGIN
  -- Khóa dòng dữ liệu (Row-level lock) để chặn thao tác đồng thời
  SELECT "Tên hàng hóa", "Số lượng" + p_qty_delta, "Ghi chú" + p_qty_delta 
  INTO v_hom_id, v_new_qty, v_new_khadung
  FROM fact_inventory 
  WHERE "Mã" = p_inventory_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thông tin tồn kho hợp lệ (ID: %)', p_inventory_id;
  END IF;

  IF v_new_qty < 0 OR v_new_khadung < 0 THEN
    RAISE EXCEPTION 'Số lượng trong kho không đủ để xuất.';
  END IF;

  -- Cập nhật trực tiếp số lượng
  UPDATE fact_inventory
  SET "Số lượng" = v_new_qty,
      "Ghi chú" = v_new_khadung
  WHERE "Mã" = p_inventory_id;

  -- Tính lại tổng tồn kho của sản phẩm này trên TẤT CẢ các kho
  SELECT COALESCE(SUM("Số lượng"), 0) INTO v_total_for_hom
  FROM fact_inventory
  WHERE "Tên hàng hóa" = v_hom_id;

  -- Đồng bộ lại bảng danh mục sản phẩm (dim_hom)
  UPDATE dim_hom
  SET so_luong = v_total_for_hom,
      updated_at = NOW()
  WHERE id = v_hom_id;

  RETURN jsonb_build_object(
    'success', true,
    'inventory_id', p_inventory_id,
    'new_qty', v_new_qty,
    'new_khadung', v_new_khadung,
    'total_hom_qty', v_total_for_hom
  );
END;
$$ LANGUAGE plpgsql;


-- 2. Hàm trừ/cộng kho dựa trên ID Sản Phẩm (Tên hàng hóa) và Kho ID
-- (Dùng cho chức năng Điều chỉnh số lượng thủ công & Nhập kho)
CREATE OR REPLACE FUNCTION adjust_product_quantity(
  p_hom_id text,
  p_kho_id text,
  p_qty_delta int,
  p_loai_hang text DEFAULT 'Đã mua'
) RETURNS jsonb AS $$
DECLARE
  v_inventory_id text;
  v_current_qty int := 0;
  v_current_khadung int := 0;
  v_new_qty int;
  v_new_khadung int;
  v_total_for_hom int;
BEGIN
  -- Cố gắng khóa dòng tồn kho nếu sản phẩm đã có sẵn ở kho này
  SELECT "Mã", "Số lượng", "Ghi chú" 
  INTO v_inventory_id, v_current_qty, v_current_khadung
  FROM fact_inventory 
  WHERE "Tên hàng hóa" = p_hom_id AND "Kho" = p_kho_id
  FOR UPDATE;

  v_new_qty := v_current_qty + p_qty_delta;
  v_new_khadung := v_current_khadung + p_qty_delta;

  IF v_new_qty < 0 OR v_new_khadung < 0 THEN
    RAISE EXCEPTION 'Hết hàng hoặc số lượng trong kho không đủ để điều chỉnh.';
  END IF;

  IF v_inventory_id IS NOT NULL THEN
    IF v_new_qty = 0 THEN
      -- Nếu trừ hết hàng, thì xóa dòng đó khỏi kho theo logic cũ
      DELETE FROM fact_inventory WHERE "Mã" = v_inventory_id;
    ELSE
      -- Nếu còn hàng, thì update
      UPDATE fact_inventory
      SET "Số lượng" = v_new_qty,
          "Ghi chú" = v_new_khadung,
          "Loại hàng" = COALESCE(p_loai_hang, "Loại hàng")
      WHERE "Mã" = v_inventory_id;
    END IF;
  ELSE
    -- Nếu sản phẩm chưa từng có trong kho này, và đang có thao tác nhập thêm (delta > 0)
    IF p_qty_delta > 0 THEN
      v_inventory_id := gen_random_uuid()::text;
      INSERT INTO fact_inventory("Mã", "Tên hàng hóa", "Kho", "Số lượng", "Ghi chú", "Loại hàng")
      VALUES (v_inventory_id, p_hom_id, p_kho_id, v_new_qty, v_new_khadung, COALESCE(p_loai_hang, 'Đã mua'));
    END IF;
  END IF;

  -- Tính toán lại tổng toàn bộ các kho cho dim_hom
  SELECT COALESCE(SUM("Số lượng"), 0) INTO v_total_for_hom
  FROM fact_inventory
  WHERE "Tên hàng hóa" = p_hom_id;

  -- Cập nhật đồng bộ cache
  UPDATE dim_hom
  SET so_luong = v_total_for_hom,
      updated_at = NOW()
  WHERE id = p_hom_id;

  RETURN jsonb_build_object(
    'success', true,
    'hom_id', p_hom_id,
    'kho_id', p_kho_id,
    'new_warehouse_qty', v_new_qty,
    'total_hom_qty', v_total_for_hom
  );
END;
$$ LANGUAGE plpgsql;
