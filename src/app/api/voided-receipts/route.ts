import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/voided-receipts
 * Returns both import receipts (fact_nhap_hang) and export receipts (fact_xuat_hang)
 * for the voided receipts management page.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // ── Fetch Import Receipts (Phiếu Nhập) ──
    const { data: imports, error: importErr } = await supabase
      .from('fact_nhap_hang')
      .select('*, items:fact_nhap_hang_items(ma_hom, ten_hom, so_luong_thuc_nhan)')
      .order('created_at', { ascending: false });

    if (importErr && !importErr.message.includes('schema cache')) {
      console.error('[voided-receipts] Import fetch error:', importErr);
    }

    // Enrich import data with warehouse names
    const importData = imports || [];
    const khoIds = [...new Set(importData.map((r: any) => r.kho_id).filter(Boolean))];
    const khoMap = new Map<string, string>();
    if (khoIds.length > 0) {
      const { data: khoList } = await supabase
        .from('dim_kho')
        .select('id, ten_kho')
        .in('id', khoIds);
      (khoList || []).forEach((k: any) => khoMap.set(k.id, k.ten_kho));
    }

    // Enrich with receiver names
    const nguoiNhanIds = [...new Set(importData.map((r: any) => r.nguoi_nhan_id).filter(Boolean))];
    const accountMap = new Map<string, string>();
    if (nguoiNhanIds.length > 0) {
      const { data: accounts } = await supabase
        .from('dim_account')
        .select('id, ho_ten, email')
        .in('id', nguoiNhanIds);
      (accounts || []).forEach((a: any) => {
        accountMap.set(a.id, a.ho_ten || a.email?.split('@')[0] || '');
      });
    }

    const enrichedImports = importData.map((r: any) => ({
      id: r.id,
      code: r.ma_phieu_nhap,
      type: 'import' as const,
      warehouse: khoMap.get(r.kho_id) || '—',
      warehouse_id: r.kho_id,
      status: r.trang_thai || 'completed',
      note: r.ghi_chu,
      created_by: r.nguoi_nhan_id ? accountMap.get(r.nguoi_nhan_id) || r.nguoi_nhan_id : '—',
      date: r.ngay_nhan || r.created_at,
      created_at: r.created_at,
      items: (r.items || []).map((i: any) => ({
        code: i.ma_hom,
        name: i.ten_hom,
        qty: i.so_luong_thuc_nhan || 0,
      })),
    }));

    // ── Fetch Export Receipts (Phiếu Xuất) ──
    const { data: exports, error: exportErr } = await supabase
      .from('fact_xuat_hang')
      .select('*, items:fact_xuat_hang_items(ma_hom, ten_hom, so_luong)')
      .order('created_at', { ascending: false });

    if (exportErr && !exportErr.message.includes('schema cache')) {
      console.error('[voided-receipts] Export fetch error:', exportErr);
    }

    const exportData = exports || [];

    // Enrich export data with warehouse names & creator names
    const exportKhoIds = [...new Set(exportData.map((r: any) => r.kho_id).filter(Boolean))];
    const extraKhoIds = exportKhoIds.filter(id => !khoMap.has(id));
    if (extraKhoIds.length > 0) {
      const { data: khoList } = await supabase
        .from('dim_kho')
        .select('id, ten_kho')
        .in('id', extraKhoIds);
      (khoList || []).forEach((k: any) => khoMap.set(k.id, k.ten_kho));
    }

    const exportNguoiIds = [...new Set(exportData.map((r: any) => r.nguoi_xuat_id).filter(Boolean))];
    const extraNguoiIds = exportNguoiIds.filter(id => !accountMap.has(id));
    if (extraNguoiIds.length > 0) {
      const { data: accounts } = await supabase
        .from('dim_account')
        .select('id, ho_ten, email')
        .in('id', extraNguoiIds);
      (accounts || []).forEach((a: any) => {
        accountMap.set(a.id, a.ho_ten || a.email?.split('@')[0] || '');
      });
    }

    const enrichedExports = exportData.map((r: any) => ({
      id: r.id,
      code: r.ma_phieu_xuat,
      type: 'export' as const,
      warehouse: khoMap.get(r.kho_id) || '—',
      warehouse_id: r.kho_id,
      status: r.trang_thai || 'pending',
      note: r.ghi_chu,
      customer: r.ten_khach,
      created_by: r.nguoi_xuat_id ? accountMap.get(r.nguoi_xuat_id) || '—' : '—',
      date: r.created_at,
      created_at: r.created_at,
      items: (r.items || []).map((i: any) => ({
        code: i.ma_hom,
        name: i.ten_hom,
        qty: i.so_luong || 0,
      })),
    }));

    return NextResponse.json({
      imports: enrichedImports,
      exports: enrichedExports,
    });
  } catch (err: any) {
    console.error('[voided-receipts GET]', err);
    return NextResponse.json({ error: err.message, imports: [], exports: [] }, { status: 500 });
  }
}
