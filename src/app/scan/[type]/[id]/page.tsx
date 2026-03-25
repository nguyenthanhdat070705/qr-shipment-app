import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, PackageCheck, Truck, Package, Calendar, User, Building, MapPin, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Quét mã QR — Blackstones',
  description: 'Xem thông tin tài liệu từ mã QR.',
};

export const dynamic = 'force-dynamic';

const TYPE_CONFIG: Record<string, {
  table: string;
  codeField: string;
  color: string;
  icon: string;
  label: string;
  detailRoute: string;
  itemsTable?: string;
  itemsFk?: string;
  joins?: string;
}> = {
  po: {
    table: 'purchase_orders',
    codeField: 'po_code',
    color: 'purple',
    icon: 'ShoppingCart',
    label: 'Đơn mua hàng',
    detailRoute: '/purchase-orders',
    itemsTable: 'purchase_order_items',
    itemsFk: 'po_id',
    joins: '*, supplier:suppliers(*), warehouse:warehouses(*)',
  },
  grpo: {
    table: 'goods_receipts',
    codeField: 'gr_code',
    color: 'orange',
    icon: 'PackageCheck',
    label: 'Phiếu nhập kho',
    detailRoute: '/goods-receipt',
    itemsTable: 'goods_receipt_items',
    itemsFk: 'gr_id',
    joins: '*, warehouse:warehouses(*)',
  },
  delivery: {
    table: 'delivery_orders',
    codeField: 'do_code',
    color: 'amber',
    icon: 'Truck',
    label: 'Đơn giao hàng',
    detailRoute: '/operations',
    itemsTable: 'delivery_order_items',
    itemsFk: 'do_id',
    joins: '*, warehouse:warehouses(*)',
  },
  product: {
    table: 'products',
    codeField: 'product_code',
    color: 'blue',
    icon: 'Package',
    label: 'Sản phẩm',
    detailRoute: '/product',
    joins: '*',
  },
};

const ICONS: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart size={24} />,
  PackageCheck: <PackageCheck size={24} />,
  Truck: <Truck size={24} />,
  Package: <Package size={24} />,
};

export default async function ScanPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  const config = TYPE_CONFIG[type];

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

  // Fetch the document
  const { data: doc, error } = await supabase
    .from(config.table)
    .select(config.joins || '*')
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

  // Fetch items if applicable
  let items: Record<string, unknown>[] = [];
  if (config.itemsTable && config.itemsFk) {
    const { data: itemsData } = await supabase
      .from(config.itemsTable)
      .select('*')
      .eq(config.itemsFk, id);
    items = itemsData || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = doc as any as Record<string, unknown>;
  const code = String(record[config.codeField] || '');
  const status = String(record['status'] || '');

  const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-200', light: 'bg-purple-50' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-200', light: 'bg-orange-50' },
    amber:  { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-50' },
    blue:   { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50' },
  };
  const colors = colorMap[config.color] || colorMap.blue;

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className={`${colors.bg} text-white py-8 px-6`}>
        <div className="max-w-lg mx-auto">
          <Link
            href={`${config.detailRoute}/${id}`}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Xem chi tiết đầy đủ
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              {ICONS[config.icon]}
            </div>
            <div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{config.label}</p>
              <h1 className="text-2xl font-extrabold font-mono">{code}</h1>
            </div>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-sm font-semibold mt-2">
            {status}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* Info card */}
        <div className={`rounded-2xl border ${colors.border} bg-white shadow-sm p-5 space-y-3`}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Thông tin</h2>
          <div className="grid grid-cols-2 gap-3">
            {type === 'po' && (
              <>
                <InfoRow icon={<Building size={14} />} label="NCC" value={String((record['supplier'] as Record<string, unknown>)?.name || '—')} />
                <InfoRow icon={<Calendar size={14} />} label="Ngày đặt" value={formatDate(String(record['order_date'] || ''))} />
                <InfoRow icon={<User size={14} />} label="Người tạo" value={String(record['created_by'] || '—')} />
                <InfoRow icon={<Package size={14} />} label="Tổng tiền" value={`${Number(record['total_amount'] || 0).toLocaleString('vi-VN')} ₫`} />
              </>
            )}
            {type === 'grpo' && (
              <>
                <InfoRow icon={<Package size={14} />} label="Kho" value={String((record['warehouse'] as Record<string, unknown>)?.name || '—')} />
                <InfoRow icon={<Calendar size={14} />} label="Ngày nhận" value={formatDate(String(record['received_date'] || ''))} />
                <InfoRow icon={<User size={14} />} label="Người nhận" value={String(record['received_by'] || '—')} />
              </>
            )}
            {type === 'delivery' && (
              <>
                <InfoRow icon={<User size={14} />} label="Khách hàng" value={String(record['customer_name'] || '—')} />
                <InfoRow icon={<Phone size={14} />} label="SĐT" value={String(record['customer_phone'] || '—')} />
                <InfoRow icon={<MapPin size={14} />} label="Địa chỉ" value={String(record['customer_address'] || '—')} />
                <InfoRow icon={<Calendar size={14} />} label="Ngày giao" value={formatDate(String(record['delivery_date'] || ''))} />
              </>
            )}
            {type === 'product' && (
              <>
                <InfoRow icon={<Package size={14} />} label="Tên" value={String(record['name'] || '—')} />
                <InfoRow icon={<Package size={14} />} label="Mã" value={String(record['product_code'] || '—')} />
              </>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className={`rounded-2xl border ${colors.border} bg-white shadow-sm overflow-hidden`}>
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Sản phẩm ({items.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className={`font-mono font-semibold text-sm ${colors.text}`}>
                      {String(item.product_code || '')}
                    </p>
                    <p className="text-sm text-gray-600">{String(item.product_name || '')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      x{String(item.quantity || item.received_qty || item.expected_qty || '—')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to full detail */}
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === '—') return '—';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
}
