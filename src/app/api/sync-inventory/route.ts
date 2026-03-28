/**
 * API Route: POST /api/sync-inventory
 * Sync dữ liệu từ Google Sheet → Supabase fact_inventory
 * 
 * Query params:
 *   ?sheet_id=xxx  — Google Sheet ID (bắt buộc)
 *   ?gid=0         — Sheet tab GID (mặc định: 0)
 * 
 * Ví dụ:
 *   POST /api/sync-inventory?sheet_id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ── CSV Parser ──────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

interface InventoryRow {
  ma: string;
  ten: string;
  kho: string;
  so_luong: number;
  loai: string | null;
  ghi_chu: string | null;
}

function parseCSV(text: string): InventoryRow[] {
  const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const rows: InventoryRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length >= 4 && fields[0]) {
      rows.push({
        ma:       fields[0],
        ten:      fields[1] || '',
        kho:      fields[2] || '',
        so_luong: fields[3] === '' ? 0 : parseInt(fields[3], 10) || 0,
        loai:     fields[4] || null,
        ghi_chu:  fields[5] || null,
      });
    }
  }
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    // Validate env
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    // Get sheet_id from query params
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheet_id');
    const gid = searchParams.get('gid') || '0';

    if (!sheetId) {
      return NextResponse.json(
        { error: 'Missing sheet_id parameter. Usage: POST /api/sync-inventory?sheet_id=YOUR_SHEET_ID' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Google Sheet as CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Google Sheet: ${csvResponse.status} ${csvResponse.statusText}. Ensure the sheet is shared publicly.` },
        { status: 400 }
      );
    }
    const csvText = await csvResponse.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in Google Sheet' }, { status: 400 });
    }

    // 2. Get dim_hom
    const { data: allHom } = await supabase.from('dim_hom').select('id, ma_hom');
    const homMap = new Map<string, string>();
    for (const h of allHom || []) homMap.set(h.ma_hom, h.id);

    // Create missing products
    const missingHom = new Map<string, string>();
    for (const r of rows) {
      if (!homMap.has(r.ma) && !missingHom.has(r.ma)) missingHom.set(r.ma, r.ten);
    }
    for (const [ma, ten] of missingHom) {
      const { data: newH } = await supabase
        .from('dim_hom').insert({ ma_hom: ma, ten_hom: ten }).select('id').single();
      if (newH) homMap.set(ma, newH.id);
    }

    // 3. Get dim_kho
    const { data: allKho } = await supabase.from('dim_kho').select('id, ten_kho');
    const khoMap = new Map<string, string>();
    for (const k of allKho || []) khoMap.set(k.ten_kho, k.id);

    // 4. Delete existing fact_inventory
    const { data: existingRows } = await supabase.from('fact_inventory').select('Mã');
    if (existingRows && existingRows.length > 0) {
      for (let i = 0; i < existingRows.length; i += 50) {
        const batch = existingRows.slice(i, i + 50).map((r: any) => r['Mã']);
        await supabase.from('fact_inventory').delete().in('Mã', batch);
      }
    }

    // 5. Build & insert data
    const insertData = [];
    const errors: string[] = [];

    for (const row of rows) {
      const hom_id = homMap.get(row.ma);
      const kho_id = khoMap.get(row.kho);
      if (!hom_id) { errors.push(`Mã "${row.ma}" không có trong dim_hom`); continue; }
      if (!kho_id) { errors.push(`Kho "${row.kho}" không có trong dim_kho`); continue; }

      let kha_dung = row.so_luong;
      const gc = (row.ghi_chu || '').toLowerCase();
      if (gc.includes('cọc') || gc.includes('đặt cọc')) {
        const m = (row.ghi_chu || '').match(/(\d+)\s*(?:cái)?\s*(?:đã)?\s*(?:đặt)?\s*cọc/i);
        kha_dung = m ? Math.max(0, row.so_luong - parseInt(m[1], 10)) : Math.max(0, row.so_luong - 1);
      }

      insertData.push({
        'Mã': randomUUID(),
        'Tên hàng hóa': hom_id,
        'Kho': kho_id,
        'Số lượng': row.so_luong,
        'Ghi chú': kha_dung,
      });
    }

    // Batch insert
    let successCount = 0;
    for (let i = 0; i < insertData.length; i += 50) {
      const chunk = insertData.slice(i, i + 50);
      const { data, error } = await supabase.from('fact_inventory').insert(chunk).select();
      if (error) {
        errors.push(`Insert chunk ${i}: ${error.message}`);
      } else {
        successCount += (data || []).length;
      }
    }

    // 6. Verify
    const { count } = await supabase
      .from('fact_inventory')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      stats: {
        source_rows: rows.length,
        inserted: successCount,
        skipped: rows.length - insertData.length,
        total_in_db: count,
        new_products_created: missingHom.size,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Sync inventory error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
