/**
 * GET /api/getfly-contracts — Hợp đồng bán (Hội viên).
 * Nguồn MỚI: bảng `crm_hop_dong_ban` (mirror Google Sheet) chuẩn hoá về shape cũ.
 * File đính kèm (Drive) join qua cầu nối `source_contract_code` (mã MBS) — bền vững
 * sau khi bỏ getfly_contracts; fallback theo getfly_contract_id (= id HĐ) nếu có.
 * Giữ NGUYÊN response shape ({ records, total, page, per_page }).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { loadCrmContracts, type NormalizedContract } from '@/lib/crmContracts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const perPage = parseInt(req.nextUrl.searchParams.get('per_page') || '20');
    const search = (req.nextUrl.searchParams.get('search') || '').toLowerCase().trim();
    const status = req.nextUrl.searchParams.get('status') || '';

    let contracts = await loadCrmContracts(supabase);

    // Lọc theo search
    if (search) {
      contracts = contracts.filter((c) =>
        [c.contract_name, c.contract_code, c.source_contract_code, c.customer_phone, c.customer_name]
          .some((v) => String(v ?? '').toLowerCase().includes(search)),
      );
    }
    // Lọc theo trạng thái
    if (status && status !== 'all') {
      contracts = contracts.filter((c) => c.contract_status === status);
    }

    // Sắp xếp: id HĐ giảm dần (mới nhất trước)
    contracts.sort((a, b) => Number(b.getfly_contract_id || 0) - Number(a.getfly_contract_id || 0));

    const total = contracts.length;
    const from = (page - 1) * perPage;
    const pagedData = contracts.slice(from, from + perPage);

    // Join file đính kèm theo source_contract_code (cầu nối) hoặc getfly_contract_id.
    const codes = pagedData.map((c) => c.source_contract_code).filter(Boolean) as string[];
    const ids = pagedData.map((c) => c.getfly_contract_id).filter(Boolean) as string[];
    const driveByCode = new Map<string, Record<string, unknown>>();
    const driveById = new Map<string, Record<string, unknown>>();

    if (codes.length || ids.length) {
      const ors: string[] = [];
      if (codes.length) ors.push(`source_contract_code.in.(${codes.join(',')})`);
      if (ids.length) ors.push(`getfly_contract_id.in.(${ids.join(',')})`);
      const { data: driveData } = await supabase
        .from('membership_gdrive_attachments')
        .select('*')
        .or(ors.join(','));
      for (const d of (driveData ?? []) as Record<string, unknown>[]) {
        if (d.source_contract_code) driveByCode.set(String(d.source_contract_code), d);
        if (d.getfly_contract_id) driveById.set(String(d.getfly_contract_id), d);
      }
    }

    const enrichedRecords = pagedData.map((contract: NormalizedContract) => {
      const driveInfo =
        (contract.source_contract_code && driveByCode.get(contract.source_contract_code)) ||
        driveById.get(contract.getfly_contract_id) ||
        undefined;
      return {
        ...contract,
        gdrive_folder_id: driveInfo?.gdrive_folder_id || null,
        gdrive_folder_url: driveInfo?.gdrive_folder_id
          ? `https://drive.google.com/drive/folders/${driveInfo.gdrive_folder_id}`
          : null,
        gdrive_vneid_front: driveInfo?.vneid_front_file_id || null,
        gdrive_vneid_back: driveInfo?.vneid_back_file_id || null,
        gdrive_contract_scan: driveInfo?.contract_scan_file_id || null,
        gdrive_membership_form: driveInfo?.membership_form_file_id || null,
        gdrive_last_sync: driveInfo?.last_sync_at || null,
      };
    });

    return NextResponse.json({
      records: enrichedRecords,
      total,
      page,
      per_page: perPage,
    });
  } catch (err) {
    console.error('getfly-contracts error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
