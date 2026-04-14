import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/membership/import
 * Bulk import members from Excel data.
 * Each row needs at least: full_name + phone (or member_code).
 * Auto-generates member_code if missing.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 });
    }

    // Get current max member code for auto-generation
    const year = new Date().getFullYear();
    const prefix = `HV-${year}-`;
    const { data: latestMember } = await supabase
      .from('members')
      .select('member_code')
      .like('member_code', `${prefix}%`)
      .order('member_code', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (latestMember && latestMember.length > 0) {
      const lastNum = parseInt(latestMember[0].member_code.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIdx = i + 1;

      // Validate: must have full_name
      const fullName = String(row.full_name || '').trim();
      if (!fullName) {
        errors.push(`Dòng ${rowIdx}: Thiếu họ tên hội viên`);
        skipped++;
        continue;
      }

      const phone = String(row.phone || '').trim();
      const email = String(row.email || '').trim() || null;
      const idNumber = String(row.id_number || '').trim() || null;
      const address = String(row.address || '').trim() || null;
      const branch = String(row.branch || '').trim() || null;
      const consultantName = String(row.consultant_name || '').trim() || null;
      const notes = String(row.notes || '').trim() || null;
      const paymentMethod = String(row.payment_method || '').trim() || null;
      const servicePackage = String(row.service_package || '').trim() || null;
      const contractNumber = String(row.contract_number || '').trim() || null;
      const status = String(row.status || 'active').trim().toLowerCase();

      // Parse dates
      let registeredDate = null;
      if (row.registered_date) {
        const d = parseFlexibleDate(String(row.registered_date));
        if (d) registeredDate = d;
      }
      if (!registeredDate) {
        registeredDate = new Date().toISOString().slice(0, 10);
      }

      let expiryDate = null;
      if (row.expiry_date) {
        expiryDate = parseFlexibleDate(String(row.expiry_date));
      }
      if (!expiryDate) {
        expiryDate = new Date(
          new Date(registeredDate).setFullYear(new Date(registeredDate).getFullYear() + 10)
        ).toISOString().slice(0, 10);
      }

      // Determine member code
      let memberCode = String(row.member_code || '').trim();
      const isNewCode = !memberCode;
      if (isNewCode) {
        memberCode = `${prefix}${String(nextNum).padStart(4, '0')}`;
        nextNum++;
      }

      // Parse contract value
      let contractValue = null;
      if (row.contract_value) {
        const cv = parseFloat(String(row.contract_value).replace(/[,.\s]/g, ''));
        if (!isNaN(cv)) contractValue = cv;
      }

      // Validate status
      const validStatuses = ['active', 'pending', 'expired', 'terminated'];
      const finalStatus = validStatuses.includes(status) ? status : 'active';

      // Validate service package
      const validPackages = ['Tiêu Chuẩn', 'Cao Cấp', 'Đặc Biệt', 'Gói Gia Đình'];
      let finalPackage: string | null = null;
      if (servicePackage) {
        const matched = validPackages.find(
          p => p.toLowerCase() === servicePackage.toLowerCase()
        );
        finalPackage = matched || null;
      }

      // Build member record
      const memberData: Record<string, unknown> = {
        member_code: memberCode,
        full_name: fullName,
        phone: phone || null,
        email,
        id_number: idNumber,
        address,
        registered_date: registeredDate,
        expiry_date: expiryDate,
        status: finalStatus,
        payment_method: paymentMethod === 'cash' || paymentMethod === 'transfer' ? paymentMethod : null,
        consultant_name: consultantName,
        branch,
        notes,
        service_package: finalPackage,
        contract_number: contractNumber,
        contract_value: contractValue,
      };

      try {
        // Check if member already exists (by member_code or phone)
        let existing = null;
        if (!isNewCode) {
          const { data } = await supabase
            .from('members')
            .select('id')
            .eq('member_code', memberCode)
            .limit(1);
          if (data && data.length > 0) existing = data[0];
        }
        if (!existing && phone) {
          const { data } = await supabase
            .from('members')
            .select('id')
            .eq('member_code', phone)
            .limit(1);
          if (data && data.length > 0) existing = data[0];
        }

        if (existing) {
          // Update existing
          const { error: updateErr } = await supabase
            .from('members')
            .update(memberData)
            .eq('id', existing.id);
          if (updateErr) {
            errors.push(`Dòng ${rowIdx} (${fullName}): ${updateErr.message}`);
            skipped++;
          } else {
            updated++;
          }
        } else {
          // Insert new
          const { error: insertErr } = await supabase
            .from('members')
            .insert(memberData);
          if (insertErr) {
            if (insertErr.code === '23505') {
              // Duplicate key - try to update instead
              errors.push(`Dòng ${rowIdx} (${fullName}): Mã HV trùng, đã bỏ qua`);
              skipped++;
            } else {
              errors.push(`Dòng ${rowIdx} (${fullName}): ${insertErr.message}`);
              skipped++;
            }
          } else {
            inserted++;
          }
        }
      } catch (err) {
        errors.push(`Dòng ${rowIdx} (${fullName}): ${String(err)}`);
        skipped++;
      }
    }

    return NextResponse.json({
      total: rows.length,
      inserted,
      updated,
      skipped,
      errors,
    });
  } catch (err) {
    console.error('Member import error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Parse flexible date formats:
 * - dd/mm/yyyy, dd-mm-yyyy
 * - yyyy-mm-dd (ISO)
 * - Excel serial number
 */
function parseFlexibleDate(val: string): string | null {
  if (!val) return null;
  const trimmed = val.trim();

  // Excel serial number (e.g. 44927)
  if (/^\d{5}$/.test(trimmed)) {
    const date = new Date((parseInt(trimmed) - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  // ISO format yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  return null;
}
