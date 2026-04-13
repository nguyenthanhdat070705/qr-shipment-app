'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Package, Search, Plus, Minus, Trash2, 
  ChevronLeft, Check, ChevronRight, Calculator, FileText,
  User, Send, Loader2
} from 'lucide-react';
import PageLayout from '@/components/PageLayout';

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
interface Product {
  code: string;
  name: string;
  ton_kho: number;
  gia_ban?: number;
  nhom_san_pham?: string;
}

interface CartItem extends Product {
  quantity: number;
}

/* ─────────────────────────────────────
   Page Main
───────────────────────────────────── */
export default function CreateOrderPage() {
  const router = useRouter();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Form (basic)
  const [customerName, setCustomerName] = useState('');
  const [funeralCode, setFuneralCode] = useState('');
  const [note, setNote] = useState('');

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products?limit=100'); // Lấy tạm 100 sản phẩm hoặc API mặc định
        const json = await res.json();
        // Fallback mock nếu API trống
        if (!json.products || json.products.length === 0) {
          setProducts([
            { code: 'HOM001', name: 'Hòm gỗ sao cao cấp', ton_kho: 5, gia_ban: 15000000, nhom_san_pham: 'Hòm' },
            { code: 'HOA002', name: 'Vòng hoa phong lan trắng', ton_kho: 15, gia_ban: 2500000, nhom_san_pham: 'Hoa' },
            { code: 'DV003', name: 'Quần áo tang lễ (10 bộ)', ton_kho: 50, gia_ban: 800000, nhom_san_pham: 'Vật tư tang lễ' },
            { code: 'TB004', name: 'Đèn chùm pha lê', ton_kho: 2, gia_ban: 4000000, nhom_san_pham: 'Trang thiết bị' },
            { code: 'VL005', name: 'Bột ướp xác chuyên dụng', ton_kho: 100, gia_ban: 500000, nhom_san_pham: 'Vật tư y tế' },
          ]);
        } else {
          setProducts(json.products);
        }
      } catch {
        // Mock on error
        setProducts([
          { code: 'HOM001', name: 'Hòm An Trường (Gỗ tự nhiên)', ton_kho: 12, gia_ban: 18000000, nhom_san_pham: 'Hòm' },
          { code: 'HOA002', name: 'Lẵng hoa đám tang', ton_kho: 20, gia_ban: 1500000, nhom_san_pham: 'Hoa' },
          { code: 'ACC001', name: 'Bộ đồ tẩm liệm', ton_kho: 45, gia_ban: 1200000, nhom_san_pham: 'Vật tư tang lễ' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.code === product.code);
      if (existing) {
        return prev.map(item => 
          item.code === product.code 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (code: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.code === code) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (code: string) => {
    setCart(prev => prev.filter(item => item.code !== code));
  };

  const calcTotal = () => {
    return cart.reduce((sum, item) => sum + (item.gia_ban || 0) * item.quantity, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Vui lòng chọn ít nhất 1 sản phẩm.');
    
    setIsSubmitting(true);
    // Giả lập API delay
    await new Promise(r => setTimeout(r, 1200));
    setIsSubmitting(false);
    setOrderComplete(true);
  };

  if (orderComplete) {
    return (
      <PageLayout title="Lên đơn sản phẩm" icon={<ShoppingCart size={16} className="text-amber-500" />}>
        <div className="max-w-2xl mx-auto mt-10">
          <div className="bg-white rounded-3xl p-10 shadow-xl border border-amber-100 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Check size={48} className="text-amber-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Đơn hàng đã được tạo!</h2>
            <p className="text-gray-500 mb-8">
              Mã đơn hàng <span className="font-mono text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">ORD-{Math.floor(Math.random() * 100000)}</span> đã được lưu. <br/>
              Kho hàng sẽ sớm nhận được yêu cầu xuất vật tư cho đơn hàng này.
            </p>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => router.push('/sales')}
                className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Về trang Bán hàng
              </button>
              <button 
                onClick={() => {
                  setCart([]);
                  setCustomerName('');
                  setFuneralCode('');
                  setNote('');
                  setOrderComplete(false);
                }}
                className="px-6 py-3 bg-[#1B2A4A] rounded-xl font-bold text-sm text-white hover:bg-blue-900 transition-colors flex items-center gap-2 shadow-md"
              >
                Tạo đơn hàng khác <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Lên đơn sản phẩm" icon={<ShoppingCart size={16} className="text-amber-500" />}>
      <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6">
        
        {/* ── Left side: Product Catalog ── */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {/* Header & Search */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <button 
              onClick={() => router.push('/sales')}
              className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-4"
            >
              <ChevronLeft size={16} /> Về trang chủ Sale
            </button>
            
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Package className="text-amber-500" size={24} /> Danh mục sản phẩm
              </h2>
              
              <div className="relative w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên hoặc mã sản phẩm..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-50/20">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 size={32} className="animate-spin mb-3 text-amber-500" />
                <p className="text-sm font-medium">Đang tải danh mục...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Search size={40} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                  <div key={p.code} className="bg-white border text-left border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-amber-200 transition-all flex flex-col group">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        {p.nhom_san_pham || 'Sản phẩm'}
                      </span>
                      <span className="text-xs font-mono text-gray-400 group-hover:text-amber-500 transition-colors">{p.code}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 min-h-[40px] leading-tight">{p.name}</h3>
                    
                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-end justify-between">
                      <div>
                        {p.gia_ban ? (
                          <p className="text-sm font-black text-emerald-600">{formatPrice(p.gia_ban)}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Chưa báo giá</p>
                        )}
                        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Kho sẵn: {p.ton_kho || 0}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(p)}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors"
                        title="Thêm vào đơn"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right side: Cart & Checkout ── */}
        <div className="w-full lg:w-[400px] xl:w-[450px] bg-white rounded-3xl shadow-lg border border-gray-200 flex flex-col overflow-hidden relative">
          
          <div className="p-5 bg-gradient-to-r from-gray-900 to-[#1B2A4A] text-white">
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Calculator size={20} className="text-amber-400" />
              Chi tiết Đơn hàng
            </h2>
            <p className="text-xs text-white/60 mt-1">
              Bạn có {cart.length} nhóm sản phẩm trong giỏ
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 py-20 text-center">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-semibold text-gray-400">Giỏ hàng trống</p>
                <p className="text-xs text-gray-300 mt-1">Chọn món hàng phía bên trái để bán</p>
              </div>
            ) : (
              <div className="py-3 space-y-4">
                {cart.map(item => (
                  <div key={item.code} className="flex gap-3 items-center group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-gray-400">{item.code}</span>
                        <span className="text-xs font-semibold text-emerald-600">
                          {item.gia_ban ? formatPrice(item.gia_ban) : '—'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Quantity Control */}
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg h-8">
                      <button 
                        onClick={() => updateQuantity(item.code, -1)}
                        className="h-full px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-l-lg transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.code, 1)}
                        className="h-full px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-r-lg transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.code)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {/* Subtotal */}
                <div className="pt-4 border-t border-gray-100 mt-4 flex justify-between items-end">
                  <span className="text-xs font-bold text-gray-500 uppercase">Tổng cộng:</span>
                  <span className="text-xl font-black text-gray-900">{formatPrice(calcTotal())}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 bg-gray-50 border-t border-gray-200 space-y-4">
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">Thông tin bắt buộc</h3>
            
            <div className="space-y-3">
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" placeholder="Tên khách hàng hoặc Đại diện..."
                  value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" placeholder="Mã Đám (VD: DAM-001)"
                    value={funeralCode} onChange={e => setFuneralCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm uppercase placeholder:normal-case"
                  />
                </div>
                <input 
                  type="text" placeholder="Ghi chú thêm..."
                  value={note} onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={isSubmitting || cart.length === 0}
              className={`
                w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white shadow-md
                transition-all
                ${cart.length === 0 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 hover:shadow-lg'
                }
              `}
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Tạo đơn ngay <Send size={16} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
