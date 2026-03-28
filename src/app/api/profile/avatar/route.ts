import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * POST /api/profile/avatar → Upload avatar to Supabase Storage
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseAdmin();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const email = formData.get('email') as string;

    if (!file || !email) {
      return NextResponse.json({ error: 'File and email are required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Chỉ chấp nhận JPEG, PNG, WebP, GIF' }, { status: 400 });
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File ảnh không được vượt quá 2MB' }, { status: 400 });
    }

    // Generate file path
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${ext}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[avatar] Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);

    const avatarUrl = urlData.publicUrl;

    // Try to update dim_account with avatar_url
    const { error: updateError } = await supabase
      .from('dim_account')
      .update({ avatar_url: avatarUrl })
      .eq('email', email);

    if (updateError) {
      console.warn('[avatar] Could not save avatar_url to dim_account:', updateError.message);
      // Still return success — frontend will store in localStorage as fallback
    }

    return NextResponse.json({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    console.error('[avatar] Unexpected error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi upload ảnh.' }, { status: 500 });
  }
}
