import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getUserRole, HOLD_DURATION_MS } from '@/config/roles.config';

/**
 * POST /api/hold-product
 * Sales giữ hàng (hold) — hold 24h rồi tự release
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { productCode, email } = body;

  if (!productCode || !email || typeof productCode !== 'string' || typeof email !== 'string') {
    return NextResponse.json({ error: 'productCode và email là bắt buộc.' }, { status: 400 });
  }

  // Check role
  const role = getUserRole(email);
  if (role !== 'sales') {
    return NextResponse.json({ error: 'Chỉ tài khoản Sales mới được giữ hàng.' }, { status: 403 });
  }

  // Ensure hold table exists
  await ensureHoldTable(supabase);

  // Check if product is already held
  const now = new Date().toISOString();
  const { data: existingHold } = await supabase
    .from('product_holds')
    .select('*')
    .eq('product_code', productCode)
    .gt('expires_at', now)
    .single();

  if (existingHold) {
    return NextResponse.json({
      error: `Sản phẩm đang được giữ bởi ${(existingHold as Record<string, unknown>).held_by_email}. Hết hạn lúc ${new Date(String((existingHold as Record<string, unknown>).expires_at)).toLocaleString('vi-VN')}.`,
      alreadyHeld: true,
    }, { status: 409 });
  }

  // Create hold
  const expiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString();
  const { data: hold, error: holdError } = await supabase
    .from('product_holds')
    .upsert({
      product_code: productCode,
      held_by_email: email,
      held_at: now,
      expires_at: expiresAt,
      status: 'active',
    }, { onConflict: 'product_code' })
    .select('*')
    .single();

  if (holdError) {
    console.error('[hold-product] Error:', holdError);
    return NextResponse.json({ error: holdError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    hold,
    message: `Đã giữ hàng thành công! Hết hạn sau 24 giờ.`,
    expiresAt,
  });
}

/**
 * DELETE /api/hold-product
 * Release a hold
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseAdmin();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { productCode } = body;
  if (!productCode || typeof productCode !== 'string') {
    return NextResponse.json({ error: 'productCode là bắt buộc.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('product_holds')
    .delete()
    .eq('product_code', productCode);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Đã hủy giữ hàng.' });
}

/**
 * GET /api/hold-product?productCode=xxx
 * Check hold status of a product
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = getSupabaseAdmin();
  const productCode = req.nextUrl.searchParams.get('productCode');

  if (!productCode) {
    return NextResponse.json({ error: 'productCode là bắt buộc.' }, { status: 400 });
  }

  await ensureHoldTable(supabase);

  // Clean up expired holds
  await supabase
    .from('product_holds')
    .delete()
    .lt('expires_at', new Date().toISOString());

  const { data: hold } = await supabase
    .from('product_holds')
    .select('*')
    .eq('product_code', productCode)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (hold) {
    return NextResponse.json({
      isHeld: true,
      hold,
    });
  }

  return NextResponse.json({ isHeld: false });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureHoldTable(supabase: any) {
  const { error } = await supabase
    .from('product_holds')
    .select('product_code')
    .limit(1);

  if (error && (error.message?.includes('does not exist') || error.message?.includes('schema cache'))) {
    console.warn('[hold-product] Table product_holds not found. Needs setup.');
  }
}
