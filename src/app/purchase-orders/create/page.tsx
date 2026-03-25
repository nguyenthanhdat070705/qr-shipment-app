'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import type { Supplier, Warehouse } from '@/types';

interface OrderItem {
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  note: string;
}

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { product_code: '', product_name: '', quantity: 1, unit_price: 0, note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch suppliers and warehouses
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    Promise.all([
      fetch(`${supabaseUrl}/rest/v1/suppliers?is_active=eq.true&select=*`, { headers }).then(r => r.json()),
      fetch(`${supabaseUrl}/rest/v1/warehouses?is_active=eq.true&select=*`, { headers }).then(r => r.json()),
    ]).then(([s, w]) => {
      setSuppliers(Array.isArray(s) ? s : []);
      setWarehouses(Array.isArray(w) ? w : []);
    }).catch(console.error);
  }, []);

  const addItem = () => {
    setItems([...items, { product_code: '', product_name: '', quantity: 1, unit_price: 0, note: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Get current user email
    let createdBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) createdBy = JSON.parse(raw).email || 'unknown';
    } catch { /* ignore */ }

    // Validate items
    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());
    if (validItems.length === 0) {
      setError('Cần ít nhất một sản phẩm trong đơn hàng.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId || null,
          warehouse_id: warehouseId || null,
          expected_date: expectedDate || null,
          note: note || null,
          created_by: createdBy,
          items: validItems,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Có lỗi xảy ra.');
        return;
      }

      router.push(`/purchase-orders/${result.data.id}`);
    } catch (err) {
      setError('Lỗi kết nối server.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout title="Tạo đơn mua hàng" icon={<ShoppingCart size={16} className="text-purple-500" />}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <button
          onClick={() => router.push('/purchase-orders')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Danh sách PO
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Tạo đơn mua hàng mới</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Info */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Thông tin chung</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nhà cung cấp</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                >
                  <option value="">— Chọn NCC —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kho nhận hàng</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                >
                  <option value="">— Chọn kho —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày dự kiến nhận</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú cho đơn hàng..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Sản phẩm</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors"
              >
                <Plus size={14} />
                Thêm SP
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Mã SP</label>
                    <input
                      type="text"
                      value={item.product_code}
                      onChange={(e) => updateItem(i, 'product_code', e.target.value)}
                      placeholder="PC-001"
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Tên SP</label>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) => updateItem(i, 'product_name', e.target.value)}
                      placeholder="Tên sản phẩm"
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">SL</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Đơn giá (₫)</label>
                    <input
                      type="number"
                      min={0}
                      value={item.unit_price}
                      onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length <= 1}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <div className="text-right">
                <span className="text-xs text-gray-400 uppercase">Tổng cộng: </span>
                <span className="text-xl font-extrabold text-gray-900 ml-2">
                  {total.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-200 transition-all"
          >
            {submitting ? 'Đang tạo...' : 'Tạo đơn mua hàng'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
