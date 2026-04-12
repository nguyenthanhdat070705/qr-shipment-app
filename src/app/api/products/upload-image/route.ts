import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/products/upload-image
 * Upload product image to Supabase Storage and update dim_hom.hinh_anh
 * Body: FormData with fields: file (File), product_id (string)
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('product_id') as string | null;
    const maHom = formData.get('ma_hom') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Chưa chọn file.' }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: 'Thiếu product_id.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF).' },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File quá lớn. Tối đa 5MB.' },
        { status: 400 }
      );
    }

    // Generate filename: ma_hom_timestamp.ext
    const ext = file.name.split('.').pop() || 'jpg';
    const code = (maHom || productId).replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${code}_${Date.now()}.${ext}`;
    const filePath = `products/${fileName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-image] Storage error:', uploadError);
      return NextResponse.json(
        { error: `Upload thất bại: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update dim_hom.hinh_anh
    const { error: updateError } = await supabase
      .from('dim_hom')
      .update({ hinh_anh: publicUrl })
      .eq('id', productId);

    if (updateError) {
      console.error('[upload-image] DB update error:', updateError);
      return NextResponse.json(
        { error: `Lưu URL thất bại: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: uploadData.path,
    });
  } catch (err) {
    console.error('[upload-image] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Lỗi server không xác định.' },
      { status: 500 }
    );
  }
}
