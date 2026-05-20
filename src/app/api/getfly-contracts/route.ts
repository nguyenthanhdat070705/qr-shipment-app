import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const perPage = parseInt(req.nextUrl.searchParams.get('per_page') || '20');
    const search = req.nextUrl.searchParams.get('search') || '';
    const status = req.nextUrl.searchParams.get('status') || '';

    let query = supabase
      .from('getfly_contracts')
      .select('*', { count: 'exact' })
      .not('raw_data->>contract_id', 'is', null)
      .order('synced_at', { ascending: false });

    // Search filter
    if (search) {
      query = query.or(
        [
          `contract_name.ilike.%${search}%`,
          `contract_code.ilike.%${search}%`,
          `source_contract_code.ilike.%${search}%`,
          `customer_phone.ilike.%${search}%`,
        ].join(',')
      );
    }

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('contract_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getfly-contracts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sortedData = [...(data || [])].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aRaw = (a.raw_data || {}) as Record<string, unknown>;
      const bRaw = (b.raw_data || {}) as Record<string, unknown>;
      const aContractId = Number(aRaw.contract_id || 0);
      const bContractId = Number(bRaw.contract_id || 0);
      if (aContractId !== bContractId) return bContractId - aContractId;
      return String(b.synced_at || '').localeCompare(String(a.synced_at || ''));
    });

    const from = (page - 1) * perPage;
    const pagedData = sortedData.slice(from, from + perPage);

    // Fetch GDrive tracking data for these contracts
    const contractIds = pagedData.map((c: Record<string, unknown>) => c.getfly_contract_id).filter(Boolean);
    let driveMap = new Map<string, Record<string, unknown>>();

    if (contractIds.length > 0) {
      const { data: driveData } = await supabase
        .from('membership_gdrive_attachments')
        .select('*')
        .in('getfly_contract_id', contractIds);

      if (driveData) {
        driveMap = new Map(
          driveData.map((d: Record<string, unknown>) => [d.getfly_contract_id as string, d])
        );
      }
    }

    // Merge GDrive info into contract records
    const enrichedRecords = pagedData.map((contract: Record<string, unknown>) => {
      const driveInfo = driveMap.get(contract.getfly_contract_id as string);
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
      total: sortedData.length,
      page,
      per_page: perPage,
    });
  } catch (err) {
    console.error('getfly-contracts error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
