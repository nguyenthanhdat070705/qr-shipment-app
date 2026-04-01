import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function getCoffinImage(productCode: string): string {
  if (productCode === '2AQ0106') return '/coffin-3.png';
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) % 5) + 1;
  return `/coffin-${index}.png`;
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung yêu cầu không hợp lệ (Invalid JSON).' }, { status: 400 });
  }

  const { qr_code } = body;
  if (!qr_code) {
    return NextResponse.json({ error: 'Thiếu mã QR cần quét.' }, { status: 400 });
  }

  try {
    // 1. Fetch QR Code info and associated Warehouse Name
    const { data: qrData, error: qrErr } = await supabase
      .from('qr_codes')
      .select('id, qr_code, reference_id, quantity, warehouse, status, warehouses!warehouse(name)')
      .eq('qr_code', qr_code)
      .single();

    if (qrErr || !qrData) {
      return NextResponse.json({ error: `Mã Đám "${qr_code}" không tồn tại hoặc dữ liệu lỗi.` }, { status: 404 });
    }

    if (qrData.status !== 'active' || qrData.quantity <= 0) {
      return NextResponse.json({ error: `Mã Đám "${qr_code}" đã hết số lượng tồn kho (Khả dụng: 0).` }, { status: 400 });
    }

    // 2. Fetch Product Info
    const { data: homData, error: homErr } = await supabase
      .from('dim_hom')
      .select('id, ten_hom, hinh_anh')
      .eq('ma_hom', qrData.reference_id)
      .single();

    const product_name = homData?.ten_hom || 'Sản phẩm chưa cập nhật tên';
    const product_id = homData?.id || null;
    
    let rawImg = homData?.hinh_anh || '';
    if (!rawImg || !rawImg.startsWith('http')) {
      rawImg = getCoffinImage(qrData.reference_id);
    }

    // Return aggregated info suitable for Cart UI
    return NextResponse.json({
      data: {
        qr_id: qrData.id,
        qr_code: qrData.qr_code,
        product_code: qrData.reference_id,
        product_id: product_id,
        product_name: product_name,
        available_quantity: qrData.quantity,
        warehouse_id: qrData.warehouse,
        warehouse_name: (qrData.warehouses as any)?.name || qrData.warehouse,
        image_url: rawImg
      }
    }, { status: 200 });

  } catch (err: any) {
    console.error('[goods-issue-scan API]', err);
    return NextResponse.json({ error: 'Lỗi khi xử lý truy vấn: ' + err.message }, { status: 500 });
  }
}
