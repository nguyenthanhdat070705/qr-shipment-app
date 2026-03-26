import { Metadata } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { PRODUCT_CONFIG } from '@/config/product.config';
import { Warehouse, Search, CheckCircle, PackageOpen } from 'lucide-react';
import InventorySearch from '@/components/InventorySearch';
import PageLayout from '@/components/PageLayout';

export const metadata: Metadata = {
  title: 'Kho hàng — Blackstones',
  description: 'Xem tồn kho, giá, số lượng sản phẩm.',
};

export const dynamic = 'force-dynamic';

/**
 * Hash-based coffin image selector (same logic as ProductDetailCard)
 */
function getCoffinImage(productCode: string): string {
  let hash = 0;
  for (let i = 0; i < productCode.length; i++) {
    hash = ((hash << 5) - hash + productCode.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) % 5) + 1;
  return `/coffin-${index}.png`;
}

function StatCard({
  label, value, icon, color, bg, border,
}: {
  label: string; value: number;
  icon: React.ReactNode; color: string; bg: string; border: string;
}) {
  return (
    <div className={`rounded-2xl bg-white border ${border} p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg} flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

export default async function InventoryPage() {
  const supabase = getSupabaseAdmin();
  const { data: products, error } = await supabase
    .from(PRODUCT_CONFIG.TABLE_NAME as string)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center bg-gray-50">
        <p className="text-red-500 font-semibold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
          Lỗi: {error.message}
        </p>
      </div>
    );
  }

  // Fetch active QR Codes (Lots) to calculate real inventory stock
  const [
    { data: qrCodes },
    { data: wData }
  ] = await Promise.all([
    supabase.from('qr_codes').select('*').eq('type', 'INVENTORY').eq('status', 'active'),
    supabase.from('warehouses').select('id, name')
  ]);

  const wMap = (wData || []).reduce((acc: Record<string, string>, curr: { id: string, name: string }) => {
    acc[curr.id] = curr.name;
    return acc;
  }, {});

  const qrMap = (qrCodes || []).reduce((acc: any, curr: any) => {
    const code = curr.reference_id;
    if (!acc[code]) acc[code] = { qty: 0, warehouses: new Set<string>(), lots: [] };
    acc[code].qty += curr.quantity || 0;
    if (curr.warehouse) acc[code].warehouses.add(curr.warehouse);
    acc[code].lots.push(curr.qr_code);
    return acc;
  }, {});

  // Transform products for the client component
  const items = (products || []).map((p: Record<string, unknown>) => {
    const code = String(p[PRODUCT_CONFIG.LOOKUP_COLUMN as keyof typeof p] || p['mã sản phẩm'] || p['Mã'] || p.code || p.product_code || '');
    const name = String(p['hòm sản phẩm'] || p['sản phẩm'] || p['Tên hàng hóa'] || p.name || p.product_name || p.ten_san_pham || 'Chưa có tên');
    const price = Number(p['gói sản phẩm'] || p['Ghi chú'] || p.selling_price || p.cost_price || p.gia_ban || p['Gia ban'] || 0);
    const status = String(p['tình trạng'] || p.is_active || p[PRODUCT_CONFIG.STATUS_COLUMN] || '');
    const tonKhoRaw = String(p['số lượng'] || p['Số lượng'] || p['số lượng trên web'] || p.ton_kho || p['Ton kho'] || '');
    const warehouseRaw = String(p['kho nào'] || p['Kho'] || p.kho_hang || p['Kho hang'] || '—');
    const serial = String(p.serial_no || p['Seri'] || '');
    const rawImg = String(p.image_url || p.hinh_anh || p['Hinh anh'] || '');
    const hasRealImage = rawImg && rawImg !== '—' && rawImg.trim() !== '' && rawImg.startsWith('http');
    const imageUrl = hasRealImage ? rawImg : getCoffinImage(code);

    const qrData = qrMap[code];
    const realQty = qrData ? qrData.qty : 0;
    const realWarehouses = qrData ? Array.from(qrData.warehouses).map(id => {
      return wMap[id as string] || id; 
    }).join(', ') : '';

    const finalTonKho = realQty > 0 ? String(realQty) : tonKhoRaw;
    const finalWarehouse = realWarehouses || warehouseRaw;

    const isExported = status === PRODUCT_CONFIG.EXPORTED_STATUS_VALUE;
    const isOutOfStock = realQty <= 0 && (!tonKhoRaw || tonKhoRaw === '—' || tonKhoRaw.trim() === '' || tonKhoRaw === '0');
    const available = !isExported && !isOutOfStock;

    return {
      code,
      name,
      price,
      status,
      tonKho: finalTonKho,
      warehouse: finalWarehouse,
      serial,
      imageUrl,
      isExported,
      isOutOfStock,
      available,
      lots: qrData ? qrData.lots : [],
    };
  });

  // Statistics
  const totalProducts = items.length;
  const availableCount = items.filter((i: { available: boolean }) => i.available).length;
  const exportedCount = items.filter((i: { isExported: boolean }) => i.isExported).length;

  return (
    <PageLayout title="Kho hàng" icon={<Warehouse size={15} className="text-sky-500" />}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Kho hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Xem tồn kho, giá, tình trạng sản phẩm.</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng SP" value={totalProducts} icon={<Warehouse size={22} />} color="text-[#1B2A4A]" bg="bg-[#eef1f7]" border="border-[#d5dbe9]" />
        <StatCard label="Còn hàng" value={availableCount} icon={<CheckCircle size={22} />} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-200" />
        <StatCard label="Đã xuất" value={exportedCount} icon={<PackageOpen size={22} />} color="text-blue-600" bg="bg-blue-50" border="border-blue-200" />
      </div>

      {/* Search + Table — Client Component */}
      <InventorySearch items={JSON.parse(JSON.stringify(items))} />
    </PageLayout>
  );
}
