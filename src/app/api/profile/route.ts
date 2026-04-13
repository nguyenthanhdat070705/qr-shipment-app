import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/profile?email=xxx  → Get user profile from dim_account
 * PUT /api/profile            → Update user profile in dim_account
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let profile: Record<string, unknown> | null = null;

  // Try dim_account first
  const { data: account, error: accountError } = await supabase
    .from('dim_account')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!accountError && account) {
    profile = {
      id: account.id,
      email: account.email,
      ho_ten: account.ho_ten || '',
      chuc_vu: account.chuc_vu || '',
      so_dien_thoai: account.sdt || '',
      phong_ban: account.phong_ban || '',
      ghi_chu: account.ghi_chu || '',
      avatar_url: account.avatar_url || '',
      role: account.role || '',
    };
  }

  // Fallback if not found
  if (!profile) {
    profile = {
      email,
      ho_ten: email.split('@')[0],
      chuc_vu: '',
      so_dien_thoai: '',
      phong_ban: '',
      ghi_chu: '',
      avatar_url: '',
      _isLocal: true,
    };
  }

  // Get export history from export_confirmations
  let exportHistory: Record<string, unknown>[] = [];
  const { data: exports, error: exportsError } = await supabase
    .from('export_confirmations')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (!exportsError && exports) {
    exportHistory = exports.map((ex: any) => ({ ...ex, source: 'qr_scan' }));
  }

  // Get export history from fact_xuat_hang based on warehouse or user
  if (profile) {
    let factXuatHang: any = null;
    const tenKho = profile.ho_ten as string;

    // Map ho_ten directly to warehouse ten_kho if possible
    if (tenKho && tenKho.toLowerCase().includes('kho')) {
      const { data: matchedKho } = await supabase
        .from('dim_kho')
        .select('id')
        .ilike('ten_kho', `%${tenKho}%`)
        .maybeSingle();

      if (matchedKho) {
        const { data: fxh } = await supabase
          .from('fact_xuat_hang')
          .select('id, ma_phieu_xuat, ghi_chu, created_at, fact_xuat_hang_items ( ma_hom, ten_hom, so_luong )')
          .eq('kho_id', matchedKho.id)
          .order('created_at', { ascending: false });
        factXuatHang = fxh;
      }
    }

    // Fallback to nguoi_xuat_id if no matching dim_kho
    if (!factXuatHang && profile.id) {
      const { data: fxh } = await supabase
        .from('fact_xuat_hang')
        .select('id, ma_phieu_xuat, ghi_chu, created_at, fact_xuat_hang_items ( ma_hom, ten_hom, so_luong )')
        .eq('nguoi_xuat_id', profile.id)
        .order('created_at', { ascending: false });
      factXuatHang = fxh;
    }

    if (factXuatHang) {
      factXuatHang.forEach((doRow: any) => {
        let maSP = doRow.ma_phieu_xuat;
        let itemsDesc = '';
        if (doRow.fact_xuat_hang_items && doRow.fact_xuat_hang_items.length > 0) {
          const items: any[] = doRow.fact_xuat_hang_items;
          if (items.length === 1) {
            maSP = items[0].ma_hom;
          } else {
            maSP = `Nhiều SP (${items.length})`;
            itemsDesc = items.map((i: any) => i.ma_hom).join(', ');
          }
        }

        const dateObj = new Date(doRow.created_at || new Date());
        exportHistory.push({
          stt: Math.floor(Math.random() * 1000000), // Random ID since we merge
          ma_san_pham: maSP,
          ho_ten: profile?.ho_ten || 'N/A',
          email: profile?.email || email,
          chuc_vu: profile?.chuc_vu || '',
          ghi_chu: `Phiếu: ${doRow.ma_phieu_xuat}` + (doRow.ghi_chu ? ` - ${doRow.ghi_chu}` : '') + (itemsDesc ? ` (${itemsDesc})` : ''),
          ngay_xuat: dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }),
          thoi_gian_xuat: dateObj.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }),
          created_at: doRow.created_at,
          source: 'fact_xuat_hang'
        });
      });
    }

    // Sort by created_at descending
    exportHistory.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return NextResponse.json({
    profile,
    exportHistory,
    totalExports: exportHistory.length,
  });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, ho_ten, chuc_vu, so_dien_thoai, phong_ban, ghi_chu, avatar_url } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Build update data for dim_account 
  const updateData: Record<string, unknown> = {
    ho_ten: (ho_ten as string) || '',
    chuc_vu: (chuc_vu as string) || '',
    sdt: (so_dien_thoai as string) || '',
    phong_ban: (phong_ban as string) || '',
    updated_at: new Date().toISOString(),
  };

  // Only include optional columns if provided
  if (typeof ghi_chu === 'string') updateData.ghi_chu = ghi_chu;
  if (typeof avatar_url === 'string') updateData.avatar_url = avatar_url;

  // Try update first
  const { data: updated, error: updateError } = await supabase
    .from('dim_account')
    .update(updateData)
    .eq('email', email)
    .select('*')
    .maybeSingle();

  if (updateError) {
    console.error('[profile] PUT error:', updateError.message);
    // If column doesn't exist (ghi_chu/avatar_url), try without optional columns
    if (updateError.message.includes('column') || updateError.message.includes('schema')) {
      const basicUpdate: Record<string, unknown> = {
        ho_ten: (ho_ten as string) || '',
        chuc_vu: (chuc_vu as string) || '',
        sdt: (so_dien_thoai as string) || '',
        phong_ban: (phong_ban as string) || '',
        updated_at: new Date().toISOString(),
      };

      const { data: basic, error: basicErr } = await supabase
        .from('dim_account')
        .update(basicUpdate)
        .eq('email', email)
        .select('*')
        .maybeSingle();

      if (basicErr) {
        return NextResponse.json({ error: basicErr.message }, { status: 500 });
      }

      if (!basic) {
        // Insert new row
        const { data: inserted, error: insertErr } = await supabase
          .from('dim_account')
          .insert({ email: email as string, ...basicUpdate })
          .select('*')
          .single();
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
        return NextResponse.json({ success: true, profile: inserted, avatarSaveLocal: true });
      }

      return NextResponse.json({ success: true, profile: basic, avatarSaveLocal: true });
    }

    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If no row was updated (email not found), insert new
  if (!updated) {
    const insertData: Record<string, unknown> = {
      email: email as string,
      ...updateData,
    };
    const { data: inserted, error: insertErr } = await supabase
      .from('dim_account')
      .insert(insertData)
      .select('*')
      .single();

    if (insertErr) {
      console.error('[profile] Insert error:', insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, profile: inserted });
  }

  return NextResponse.json({ success: true, profile: updated });
}
