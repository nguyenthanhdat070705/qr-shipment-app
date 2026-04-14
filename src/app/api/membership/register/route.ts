import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Generate member code Format: MemYYMMDDNNN
 * Example: Mem260414001, Mem260414002
 */
async function generateMemberCode(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = `Mem${yy}${mm}${dd}`;

  // Find the highest existing code for today
  const { data } = await supabase
    .from('members')
    .select('member_code')
    .like('member_code', `${prefix}%`)
    .order('member_code', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastCode = data[0].member_code;
    const lastNumStr = lastCode.replace(prefix, '');
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

import { createMemberFolder } from '@/lib/googleDrive';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { member, beneficiaries } = await req.json();

    if (!member?.full_name || !member?.phone) {
      return NextResponse.json({ error: 'Thiếu họ tên hoặc số điện thoại' }, { status: 400 });
    }

    // Auto-generate member code
    const memberCode = await generateMemberCode(supabase);

    const registeredDate = member.registered_date || new Date().toISOString().slice(0, 10);
    const expiryDate = new Date(
      new Date(registeredDate).setFullYear(new Date(registeredDate).getFullYear() + 10)
    ).toISOString().slice(0, 10);

    // Generate Drive Folder
    let drive_folder_id = null;
    let drive_folder_link = null;
    const parentFolderId = '1bwgDD-4dl7eGlAXlOoHp2vCY-IaLeRpL'; // Google Drive folder user gave

    const folderInfo = await createMemberFolder(memberCode, parentFolderId);
    if (folderInfo) {
      drive_folder_id = folderInfo.id;
      drive_folder_link = folderInfo.link;
    }

    // Insert member
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        member_code: memberCode,
        full_name: member.full_name.trim(),
        phone: member.phone.trim(),
        id_number: member.id_number?.trim() || null,
        id_issue_date: member.id_issue_date || null,
        id_issue_place: member.id_issue_place?.trim() || null,
        email: member.email?.trim() || null,
        address: member.address?.trim() || null,
        registered_date: registeredDate,
        expiry_date: expiryDate,
        status: 'active',
        payment_method: member.payment_method || 'transfer',
        consultant_name: member.consultant_name?.trim() || null,
        branch: member.branch || null,
        notes: member.notes?.trim() || null,
        contract_number: drive_folder_id, // temporarily use contract_number to store folder ID if needed
        // drive_folder_id,
        // drive_folder_link
      })
      .select()
      .single();

    if (memberError) {
      console.error('Insert member error:', memberError);
      if (memberError.code === '23505') {
        return NextResponse.json({ error: 'Số điện thoại đã được đăng ký hội viên' }, { status: 409 });
      }
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Insert beneficiaries
    if (beneficiaries && beneficiaries.length > 0 && newMember) {
      const validBens = beneficiaries
        .filter((b: { full_name: string }) => b.full_name?.trim())
        .map((b: { full_name: string; id_number?: string; address?: string; relationship?: string }) => ({
          member_id: newMember.id,
          full_name: b.full_name.trim(),
          id_number: b.id_number?.trim() || null,
          address: b.address?.trim() || null,
          relationship: b.relationship?.trim() || null,
        }));

      if (validBens.length > 0) {
        const { error: benError } = await supabase.from('beneficiaries').insert(validBens);
        if (benError) {
          console.error('Insert beneficiaries error:', benError);
        }
      }
    }

    // Auto-create commission record if we have enough info
    if (newMember && member.service_package) {
      const commissionRates: Record<string, number> = {
        tieu_chuan: 5,
        cao_cap: 7,
        dac_biet: 10,
        gia_dinh: 8,
      };
      const rate = commissionRates[member.service_package] || 5;
      const packageValues: Record<string, number> = {
        tieu_chuan: 2000000,
        cao_cap: 5000000,
        dac_biet: 10000000,
        gia_dinh: 8000000,
      };
      const dealValue = packageValues[member.service_package] || 2000000;
      const commissionAmount = Math.round(dealValue * rate / 100);

      // Try to insert commission, ignore if table doesn't exist yet
      try {
        await supabase.from('commission_records').insert({
          member_id: newMember.id,
          member_code: memberCode,
          member_name: newMember.full_name,
          sales_name: member.consultant_name?.trim() || 'Unknown',
          service_package: member.service_package,
          deal_value: dealValue,
          commission_rate: rate,
          commission_amount: commissionAmount,
          status: 'pending',
          deal_date: registeredDate,
        });
      } catch {
        // commission_records table may not exist yet — skip silently
      }
    }

    // ── Gửi ZNS Welcome (non-blocking, không blocking response) ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/zalo/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: newMember?.id,
        member_code: memberCode,
        full_name: member.full_name.trim(),
        phone: member.phone.trim(),
      }),
    }).catch(err => console.warn('[Register] ZNS welcome fire-and-forget error:', err));

    return NextResponse.json({
      success: true,
      member: newMember,
      member_code: memberCode,
      zns_triggered: true,
    });
  } catch (err) {
    console.error('Register membership error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
