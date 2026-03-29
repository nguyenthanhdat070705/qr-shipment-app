import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft, ShoppingCart, PackageCheck, Truck, Package,
  Calendar, User, Building, MapPin, Phone, ChevronRight,
  ClipboardList, CheckCircle, Warehouse
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Quét mã QR — Blackstones',
  description: 'Xem thông tin tài liệu từ mã QR.',
};

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────
// PO Scan Landing Page — dành riêng cho nhận hàng kho
// ─────────────────────────────────────────────────────
async function POScanPage({ id }: { id: string }) {
  const supabase = getSupabaseAdmin();

  // Fetch PO từ fact_don_hang
  const { data: po, error } = await supabase
    .from('fact_don_hang')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !po) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy</h1>
          <p className="text-gray-500 mb-4">Không tìm thấy Đơn mua hàng với ID này.</p>
          <Link href="/" className="text-blue-600 font-semibold hover:underline">← Về trang chủ</Link>
        </div>
      </main>
    );
  }

  // Fetch các items của PO
  const { data: items } = await supabase
    .from('fact_don_hang_items')
    .select('*')
    .eq('don_hang_id', id);

  // Fetch tên NCC
  let nccName = '—';
  if (po.ncc_id) {
    const { data: ncc } = await supabase.from('dim_ncc').select('ten_ncc').eq('id', po.ncc_id).single();
    if (ncc) nccName = ncc.ten_ncc;
  }

  // Fetch tên kho
  let khoName = '—';
  if (po.kho_id) {
    const { data: kho } = await supabase.from('dim_kho').select('ten_kho').eq('id', po.kho_id).single();
    if (kho) khoName = kho.ten_kho;
  }

  // Kiểm tra đã có GRPO chưa
  const { data: existingGRs } = await supabase
    .from('fact_nhap_kho')
    .select('id, ma_phieu_nhap, trang_thai')
    .eq('po_id', id)
    .order('created_at', { ascending: false });

  const poCode = po.ma_don_hang || '—';
  const status = po.trang_thai || 'confirmed';
  const isConfirmed = status === 'confirmed' || status === 'received' || status === 'closed';
  const totalItems = (items || []).reduce((s: number, i: any) => s + (Number(i.so_luong) || 0), 0);

  const statusLabels: Record<string, string> = {
    confirmed: 'Đã xác nhận',
    received: 'Đã nhận', closed: 'Hoàn thành', cancelled: 'Đã hủy',
  };
  const statusColors: Record<string, string> = {
    confirmed: 'bg-purple-100 text-purple-700',
    received: 'bg-green-100 text-green-700',
    closed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-700 to-purple-900 pb-12">
      {/* Header */}
      <div className="px-4 pt-10 pb-6 text-white">
        <div className="flex items-center gap-2 mb-6 opacity-70">
          <ShoppingCart size={16} />
          <span className="text-sm font-medium uppercase tracking-widest">Đơn mua hàng</span>
        </div>
        <h1 className="text-3xl font-extrabold font-mono mb-2">{poCode}</h1>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColors[status]}`}>
          {statusLabels[status] || status}
        </span>
      </div>

      {/* Cards */}
      <div className="px-4 space-y-4 -mt-2">

        {/* PO Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Thông tin đơn hàng</p>
          </div>
          <div className="divide-y divide-gray-50">
            <InfoRow icon={<Building size={15} />} label="Nhà cung cấp" value={nccName} />
            <InfoRow icon={<Warehouse size={15} />} label="Kho nhận" value={khoName} />
            <InfoRow icon={<Calendar size={15} />} label="Ngày đặt" value={formatDate(po.ngay_dat)} />
            <InfoRow icon={<Calendar size={15} />} label="Dự kiến nhận" value={formatDate(po.ngay_du_kien)} highlight />
          </div>
        </div>

        {/* Hàng hóa */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Hàng hóa</p>
            <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              Tổng: {totalItems} sản phẩm
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {(items || []).map((item: any, i: number) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-purple-600 font-mono">{item.ma_hom || '—'}</p>
                  <p className="text-sm text-gray-700 font-medium leading-snug break-words">{item.ten_hom || '—'}</p>
                </div>
                <div className="flex-shrink-0 text-right pt-1">
                  <p className="text-lg font-extrabold text-gray-900">x{item.so_luong || 0}</p>
                </div>
              </div>
            ))}
            {(!items || items.length === 0) && (
              <p className="px-4 py-3 text-sm text-gray-400">Chưa có hàng hóa.</p>
            )}
          </div>
        </div>

        {/* CTA Section */}
        {isConfirmed ? (
          <div className="space-y-3">
            {/* Nếu đã có GRPO thì hiện link */}
            {existingGRs && existingGRs.length > 0 ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={18} className="text-green-600" />
                    <p className="font-bold text-green-800 text-sm">Đã có phiếu nhập kho</p>
                  </div>
                  <div className="space-y-2">
                    {existingGRs.map((gr: any) => (
                      <Link
                        key={gr.id}
                        href={`/goods-receipt/${gr.id}`}
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-green-200 hover:border-green-400 transition-all"
                      >
                        <span className="font-mono font-bold text-green-700 text-sm">{gr.ma_phieu_nhap}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">{gr.trang_thai}</span>
                          <ChevronRight size={14} className="text-gray-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/goods-receipt/create?po_id=${id}&po_code=${poCode}&warehouse_id=${po.kho_id || ''}`}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-white/20 text-white font-bold rounded-2xl border-2 border-white/30 hover:bg-white/30 transition-all text-sm"
                >
                  <PackageCheck size={18} />
                  Tạo thêm phiếu nhập
                </Link>
              </>
            ) : (
              /* Chưa có GRPO — hiện nút to nổi bật */
              <Link
                href={`/goods-receipt/create?po_id=${id}&po_code=${poCode}&warehouse_id=${po.kho_id || ''}`}
                className="flex items-center justify-center gap-3 w-full py-5 bg-white rounded-2xl shadow-xl font-extrabold text-purple-700 text-lg hover:bg-purple-50 active:scale-95 transition-all"
              >
                <PackageCheck size={22} />
                Nhập hàng vào kho
              </Link>
            )}
          </div>
        ) : (
          /* PO đã hủy */
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-800 font-bold text-sm mb-1">⚠️ PO đã bị hủy</p>
            <p className="text-red-700 text-xs">Đơn hàng này đã bị hủy, không thể nhập kho.</p>
          </div>
        )}

        {/* Link xem chi tiết đầy đủ */}
        <Link
          href={`/purchase-orders/${id}`}
          className="flex items-center justify-center gap-2 w-full py-3 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          <ClipboardList size={15} />
          Xem chi tiết đầy đủ
        </Link>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────
// Generic Scan Page for other document types
// ─────────────────────────────────────────────────────
const GENERIC_CONFIG: Record<string, {
  table: string; codeField: string; color: string; icon: string;
  label: string; detailRoute: string; itemsTable?: string; itemsFk?: string;
}> = {
  grpo: {
    table: 'fact_nhap_kho', codeField: 'ma_phieu_nhap', color: 'orange',
    icon: 'PackageCheck', label: 'Phiếu nhập kho', detailRoute: '/goods-receipt',
    itemsTable: 'fact_nhap_kho_items', itemsFk: 'phieu_nhap_id',
  },
  delivery: {
    table: 'fact_xuat_hang', codeField: 'ma_phieu_xuat', color: 'amber',
    icon: 'Truck', label: 'Đơn giao hàng', detailRoute: '/operations',
    itemsTable: 'fact_xuat_hang_items', itemsFk: 'xuat_hang_id',
  },
  product: {
    table: 'dim_hom', codeField: 'ma_hom', color: 'blue',
    icon: 'Package', label: 'Sản phẩm', detailRoute: '/product',
  },
};

export default async function ScanPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;

  // PO has its own dedicated page
  if (type === 'po') {
    return <POScanPage id={id} />;
  }

  // For product type, redirect directly to product detail page
  if (type === 'product') {
    const supabase = getSupabaseAdmin();
    const { data: hom } = await supabase.from('dim_hom').select('ma_hom').eq('id', id).single();
    if (hom?.ma_hom) {
      redirect(`/product/${hom.ma_hom}`);
    }
  }

  const config = GENERIC_CONFIG[type];

  if (!config) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">❓</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Loại QR không xác định</h1>
          <p className="text-gray-500 mb-4">Loại &ldquo;{type}&rdquo; không được hệ thống hỗ trợ.</p>
          <Link href="/" className="text-blue-600 font-semibold hover:underline">← Về trang chủ</Link>
        </div>
      </main>
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: doc, error } = await supabase
    .from(config.table)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !doc) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy</h1>
          <p className="text-gray-500 mb-4">Không tìm thấy {config.label} với ID này.</p>
          <Link href="/" className="text-blue-600 font-semibold hover:underline">← Về trang chủ</Link>
        </div>
      </main>
    );
  }

  const record = doc as Record<string, unknown>;
  const code = String(record[config.codeField] || '');

  let items: Record<string, unknown>[] = [];
  if (config.itemsTable && config.itemsFk) {
    const { data: itemsData } = await supabase
      .from(config.itemsTable)
      .select('*')
      .eq(config.itemsFk, id);
    items = itemsData || [];
  }

  const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
    orange: { bg: 'bg-orange-500', border: 'border-orange-200', text: 'text-orange-600', light: 'bg-orange-50' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-600', light: 'bg-amber-50' },
    blue: { bg: 'bg-blue-600', border: 'border-blue-200', text: 'text-blue-600', light: 'bg-blue-50' },
  };
  const colors = colorMap[config.color] || colorMap.blue;

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <header className={`${colors.bg} text-white py-8 px-6`}>
        <div className="max-w-lg mx-auto">
          <Link
            href={`${config.detailRoute}/${id}`}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Xem chi tiết đầy đủ
          </Link>
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{config.label}</p>
          <h1 className="text-2xl font-extrabold font-mono">{code}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {items.length > 0 && (
          <div className={`rounded-2xl border ${colors.border} bg-white shadow-sm overflow-hidden`}>
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Sản phẩm ({items.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className={`font-mono font-semibold text-sm ${colors.text}`}>{String(item.ma_hom || item.product_code || '')}</p>
                    <p className="text-sm text-gray-600">{String(item.ten_hom || item.product_name || '')}</p>
                  </div>
                  <p className="font-bold text-gray-900">x{String(item.so_luong || item.quantity || '—')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href={`${config.detailRoute}/${id}`}
          className={`block text-center py-3 rounded-xl ${colors.bg} text-white font-bold text-sm shadow-lg transition-all hover:opacity-90`}
        >
          Xem chi tiết đầy đủ →
        </Link>
      </div>
    </main>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm font-semibold flex-1 text-right ${highlight ? 'text-purple-700' : 'text-gray-900'}`}>{value || '—'}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('vi-VN'); }
  catch { return dateStr; }
}
