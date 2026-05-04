import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://zspazvdyrrkdosqigomk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY');

async function main() {
    // Fetch warehouses
    const { data: khoData, error: kError } = await supabase.from('dim_kho').select('*');
    if (kError) {
        console.error('Error fetching dim_kho:', kError);
        return;
    }
    
    const kvc = khoData.find(k => k.ten_kho.includes('Kha Vạn Cân') || k.ten_kho.includes('Kinh Dương Vương') || k.ten_kho.includes('Kha Kinh'));
    if (!kvc) {
        console.log('Kho not found. Available:', khoData.map(k => k.ten_kho));
        return;
    }
    console.log('Selected Kho:', kvc.ten_kho, kvc.id);
    
    // Fetch inventory
    const { data: invData, error: invError } = await supabase.from('fact_inventory').select('*').eq('Kho', kvc.id);
    if (invError) {
        console.error('Error fetching inventory:', invError);
        return;
    }
    
    // Fetch products
    const { data: homData, error: homErr } = await supabase.from('dim_hom').select('id, ma_hom, ten_hom_the_hien, ten_hom');
    if (homErr) {
        console.error('Error fetching products:', homErr);
        return;
    }
    
    const productMap = {};
    for (const p of homData) {
        productMap[p.id] = p;
    }
    
    console.log(`\nInventory in Database for ${kvc.ten_kho}:`);
    console.log("Mã Hòm\t| Tên\t| Số lượng DB\t| Ghi chú (Khả dụng)");
    console.log("-".repeat(80));
    
    for (const item of invData) {
        const p = productMap[item['Tên hàng hóa']];
        const maHom = p ? p.ma_hom : 'UNKNOWN';
        const tenHom = p ? (p.ten_hom_the_hien || p.ten_hom) : item['Tên hàng hóa'];
        const qty = item['Số lượng'];
        const avail = item['Ghi chú'];
        
        console.log(`${maHom}\t| ${tenHom.substring(0,40)}...\t| ${qty}\t| ${avail}`);
    }
}
main();
