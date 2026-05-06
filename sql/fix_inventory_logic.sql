-- ==========================================
-- SCM INVENTORY RPC FUNCTIONS (FIX RACE CONDITION)
-- ==========================================

-- Hàm 1: adjust_inventory
-- Cộng / trừ số lượng của 1 dòng tồn kho cụ thể
-- Tự động recalculate tổng tồn kho cho dim_hom tương ứng
CREATE OR REPLACE FUNCTION adjust_inventory(
    p_inventory_id UUID,
    p_delta NUMERIC,
    p_loai_hang TEXT DEFAULT 'Đã mua'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_hom_id UUID;
    v_old_qty NUMERIC;
    v_new_qty NUMERIC;
    v_total_qty NUMERIC;
    v_result JSONB;
BEGIN
    -- 1. Lấy và khóa dòng fact_inventory (Row-level lock)
    SELECT "Tên hàng hóa", "Số lượng" INTO v_hom_id, v_old_qty
    FROM fact_inventory
    WHERE "Mã" = p_inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy dòng tồn kho với Mã %', p_inventory_id;
    END IF;

    -- 2. Tính toán số lượng mới
    v_new_qty := v_old_qty + p_delta;
    IF v_new_qty < 0 THEN
        v_new_qty := 0;
    END IF;

    -- 3. Cập nhật dòng fact_inventory
    IF v_new_qty > 0 THEN
        UPDATE fact_inventory
        SET "Số lượng" = v_new_qty,
            "Ghi chú" = v_new_qty::text,
            "Loại hàng" = p_loai_hang
        WHERE "Mã" = p_inventory_id;
    ELSE
        -- Nếu bằng 0 thì xóa dòng tồn kho luôn
        DELETE FROM fact_inventory WHERE "Mã" = p_inventory_id;
    END IF;

    -- 4. Tính toán lại tổng tồn kho cho dim_hom
    SELECT COALESCE(SUM("Số lượng"::numeric), 0) INTO v_total_qty
    FROM fact_inventory
    WHERE "Tên hàng hóa" = v_hom_id;

    -- 5. Cập nhật vào dim_hom
    UPDATE dim_hom
    SET so_luong = v_total_qty,
        updated_at = NOW()
    WHERE id = v_hom_id;

    -- 6. Trả về kết quả JSON
    v_result := jsonb_build_object(
        'success', true,
        'old_qty', v_old_qty,
        'new_qty', v_total_qty, -- Trả về tổng của sản phẩm
        'delta', p_delta
    );

    RETURN v_result;
END;
$$;


-- Hàm 2: process_goods_issue
-- Thực thi việc xuất kho (Deduct + Tạo Phiếu) trong 1 Transaction
CREATE OR REPLACE FUNCTION process_goods_issue(
    p_inventory_id UUID,
    p_quantity NUMERIC,
    p_ma_phieu_xuat TEXT,
    p_ten_khach TEXT,
    p_sdt_khach TEXT,
    p_dia_chi_giao TEXT,
    p_ghi_chu TEXT,
    p_nguoi_xuat_id UUID,
    p_item_ghi_chu TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_inv_row RECORD;
    v_hom_row RECORD;
    v_new_qty NUMERIC;
    v_new_avail NUMERIC;
    v_do_id UUID;
    v_total_qty NUMERIC;
    v_result JSONB;
BEGIN
    -- 1. Lấy và khóa dòng fact_inventory (Row-level lock)
    SELECT * INTO v_inv_row
    FROM fact_inventory
    WHERE "Mã" = p_inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy thông tin tồn kho hợp lệ (Mã: %).', p_inventory_id;
    END IF;

    -- Kiểm tra số lượng
    IF (v_inv_row."Ghi chú" IS NULL OR v_inv_row."Ghi chú"::numeric < p_quantity) THEN
        RAISE EXCEPTION 'Số lượng trong kho không đủ (Khả dụng: %, Yêu cầu: %).', v_inv_row."Ghi chú", p_quantity;
    END IF;

    -- 2. Lấy thông tin Hòm
    SELECT id, ma_hom, ten_hom INTO v_hom_row
    FROM dim_hom
    WHERE id = v_inv_row."Tên hàng hóa";

    -- 3. Cập nhật tồn kho (fact_inventory)
    v_new_qty := v_inv_row."Số lượng"::numeric - p_quantity;
    v_new_avail := v_inv_row."Ghi chú"::numeric - p_quantity;

    IF v_new_qty < 0 THEN v_new_qty := 0; END IF;
    IF v_new_avail < 0 THEN v_new_avail := 0; END IF;

    UPDATE fact_inventory
    SET "Số lượng" = v_new_qty,
        "Ghi chú" = v_new_avail::text
    WHERE "Mã" = p_inventory_id;

    -- 4. Tạo Phiếu Xuất (fact_xuat_hang)
    INSERT INTO fact_xuat_hang (
        ma_phieu_xuat, kho_id, trang_thai, ten_khach,
        sdt_khach, dia_chi_giao, ghi_chu, nguoi_xuat_id
    ) VALUES (
        p_ma_phieu_xuat, (v_inv_row."Kho")::uuid, 'pending', COALESCE(p_ten_khach, 'Khách vãng lai'),
        p_sdt_khach, p_dia_chi_giao, p_ghi_chu, p_nguoi_xuat_id
    ) RETURNING id INTO v_do_id;

    -- 5. Tạo Chi Tiết Phiếu Xuất (fact_xuat_hang_items)
    IF v_hom_row.id IS NOT NULL THEN
        INSERT INTO fact_xuat_hang_items (
            xuat_hang_id, hom_id, ma_hom, ten_hom,
            so_luong, inventory_id, ghi_chu
        ) VALUES (
            v_do_id, v_hom_row.id, v_hom_row.ma_hom, v_hom_row.ten_hom,
            p_quantity, p_inventory_id, COALESCE(p_item_ghi_chu, 'Xuất từ hệ thống SCM')
        );
    END IF;

    -- 6. Cập nhật lại tổng số lượng của dim_hom
    SELECT COALESCE(SUM("Số lượng"::numeric), 0) INTO v_total_qty
    FROM fact_inventory
    WHERE "Tên hàng hóa" = v_hom_row.id;

    UPDATE dim_hom
    SET so_luong = v_total_qty,
        updated_at = NOW()
    WHERE id = v_hom_row.id;

    -- 7. Trả về JSON Result
    v_result := jsonb_build_object(
        'success', true,
        'do_code', p_ma_phieu_xuat,
        'do_id', v_do_id,
        'ma_hom', v_hom_row.ma_hom,
        'ten_hom', v_hom_row.ten_hom,
        'so_luong_con_lai', v_new_qty
    );

    RETURN v_result;
END;
$$;
