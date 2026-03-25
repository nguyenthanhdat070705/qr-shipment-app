'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import type { Warehouse } from '@/types';

interface DeliveryItem {
  product_code: string;
  product_name: string;
  quantity: number;
  note: string;
}

export default function CreateOperationsPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<DeliveryItem[]>([
    { product_code: '', product_name: '', quantity: 1, note: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    fetch(`${supabaseUrl}/rest/v1/warehouses?is_active=eq.true&select=*`, { headers })
      .then(r => r.json())
      .then((data) => setWarehouses(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const addItem = () => {
    setItems([...items, { product_code: '', product_name: '', quantity: 1, note: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof DeliveryItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    let createdBy = 'unknown';
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) createdBy = JSON.parse(raw).email || 'unknown';
    } catch { /* ignore */ }

    const validItems = items.filter((item) => item.product_code.trim() && item.product_name.trim());

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId || null,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          delivery_date: deliveryDate || null,
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

      router.push(`/operations/${result.data.id}`);
    } catch (err) {
      setError('Lỗi kết nối server.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout title="Tạo đơn giao hàng" icon={<Truck size={16} className="text-amber-500" />}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => router.push('/operations')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Danh sách đơn giao
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Tạo đơn giao hàng mới</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Thông tin giao hàng</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên khách hàng</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Địa chỉ giao hàng</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="123 Nguyễn Huệ, Q1, TP.HCM"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kho xuất</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                >
                  <option value="">— Chọn kho —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày giao dự kiến</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Sản phẩm giao</h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                <Plus size={14} />
                Thêm SP
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="col-span-4">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Mã SP</label>
                    <input
                      type="text"
                      value={item.product_code}
                      onChange={(e) => updateItem(i, 'product_code', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                      required
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Tên SP</label>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) => updateItem(i, 'product_name', e.target.value)}
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
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
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
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
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 disabled:opacity-50 shadow-lg shadow-amber-200 transition-all"
          >
            {submitting ? 'Đang tạo...' : 'Tạo đơn giao hàng'}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}
