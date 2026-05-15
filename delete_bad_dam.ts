import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const badId = "đợi hạ huyệt/hạ quách tại Sala,BLS,7 mâm cơm cúng,Tâm Linh,anh Duy,,Gỗ,saxophone liệm";
  
  // Xóa các dòng có mã đám bất thường (dài hơn 20 ký tự hoặc chứa chữ "đợi hạ huyệt")
  const { data, error } = await supabase
    .from('fact_dam')
    .delete()
    .ilike('ma_dam', '%đợi hạ huyệt%');
    
  console.log("Delete by like:", data, error);
  
  // Cũng check các mã đám có dấu phẩy hoặc quá dài
  const { data: allData } = await supabase.from('fact_dam').select('ma_dam');
  if (allData) {
     const badRows = allData.filter(r => r.ma_dam.length > 30);
     for (const r of badRows) {
        console.log("Deleting bad row with ma_dam:", r.ma_dam);
        await supabase.from('fact_dam').delete().eq('ma_dam', r.ma_dam);
     }
  }
}
run();
