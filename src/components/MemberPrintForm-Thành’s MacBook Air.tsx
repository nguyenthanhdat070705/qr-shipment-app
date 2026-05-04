'use client';

import { useRef } from 'react';
import { Printer, X, Download } from 'lucide-react';

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
interface Beneficiary {
  full_name: string;
  id_number: string;
  address: string;
  relationship: string;
}

interface MemberPrintData {
  member_code: string;
  full_name: string;
  id_number: string;
  id_issue_date?: string;
  id_issue_place?: string;
  phone: string;
  email: string;
  address: string;
  registered_date: string;
  expiry_date: string;
  payment_method: string;
  service_package: string;
  contract_number: string;
  consultant_name: string;
  branch: string;
  beneficiaries: Beneficiary[];
}

interface Props {
  data: MemberPrintData;
  onClose: () => void;
}

/* ─────────────────────────────────────
   Helpers
───────────────────────────────────── */
function formatDateVN(dateStr: string): string {
  if (!dateStr) return '...........................';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getPackageLabel(pkg: string): string {
  const map: Record<string, string> = {
    tieu_chuan: 'Tiêu Chuẩn',
    cao_cap: 'Cao Cấp',
    dac_biet: 'Đặc Biệt',
    gia_dinh: 'Gói Gia Đình',
  };
  return map[pkg] || pkg || '...............';
}

function dotFill(val: string | undefined, minDots = 40): string {
  if (!val || !val.trim()) return '.'.repeat(minDots);
  return val;
}

/* ─────────────────────────────────────
   Main Component
───────────────────────────────────── */
export default function MemberPrintForm({ data, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=1200');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Đăng Ký Hội Viên - ${data.full_name}</title>
        <style>
          @page { 
            size: A4; 
            margin: 0; 
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 13px; 
            line-height: 1.6; 
            color: #000; 
            background: #fff;
          }
          .page { 
            width: 100%; 
            position: relative; 
            page-break-after: always;
          }
          .page:last-child { page-break-after: auto; }
          
          /* Header */
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 6px;
          }
          .logo-area { display: flex; align-items: center; gap: 8px; }
          .logo-icon { 
            width: 36px; height: 36px; 
            border: 2px solid #000; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 18px; font-weight: bold;
            border-radius: 4px;
          }
          .brand-name { font-size: 14px; font-weight: bold; letter-spacing: 2px; }
          .brand-sub { font-size: 8px; letter-spacing: 1px; color: #555; }
          .doc-code { font-size: 11px; text-align: right; }
          
          /* Title */
          .main-title { 
            text-align: center; 
            font-size: 18px; 
            font-weight: bold; 
            margin: 12px 0 4px; 
            text-transform: uppercase;
          }
          .sub-title { 
            text-align: center; 
            font-size: 13px; 
            font-style: italic; 
            margin-bottom: 16px; 
          }
          
          /* Sections */
          .section-title { 
            font-weight: bold; 
            font-size: 13px; 
            margin: 14px 0 6px; 
          }
          .section-num { font-weight: bold; }
          
          /* Field rows */
          .field-row { 
            display: flex; 
            margin: 4px 0; 
            min-height: 22px;
            align-items: baseline;
          }
          .field-label { 
            font-weight: normal; 
            min-width: 100px; 
            flex-shrink: 0;
          }
          .field-value { 
            flex: 1; 
            padding-bottom: 1px;
            min-height: 18px;
            font-weight: bold;
          }
          .field-row-split {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          /* Sub items */
          .sub-item { margin: 3px 0 3px 20px; }
          .sub-bullet { margin: 2px 0 2px 40px; }
          .indent { margin-left: 20px; }
          
          /* Table */
          .discount-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 8px 0; 
            font-size: 12px;
          }
          .discount-table th, .discount-table td { 
            border: 1px solid #000; 
            padding: 4px 8px; 
            text-align: center; 
          }
          .discount-table th { 
            font-weight: bold; 
            background: #f0f0f0; 
          }
          
          /* Beneficiary */
          .ben-section { margin: 8px 0 8px 20px; }
          .ben-title { font-weight: bold; margin-bottom: 4px; font-style: italic; }
          
          /* Signature */
          .signature-area { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 40px; 
            text-align: center;
          }
          .sig-box { width: 45%; }
          .sig-title { font-weight: bold; font-size: 13px; }
          .sig-space { height: 70px; }
          
          /* Footer */
          .page-footer { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0;
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 8px 0;
            border-top: 1px solid #ddd;
            font-size: 9px; 
            color: #666; 
          }
          .iso-badge { 
            display: flex; 
            align-items: center; 
            gap: 6px; 
          }
          .iso-box { 
            border: 2px solid #000; 
            padding: 2px 6px; 
            font-weight: bold; 
            font-size: 8px; 
            line-height: 1.2;
          }
          
          /* Checkbox */
          .checkbox { 
            display: inline-block; 
            width: 14px; height: 14px; 
            border: 1.5px solid #000; 
            margin-right: 6px; 
            vertical-align: middle;
            position: relative;
          }
          .checkbox.checked::after {
            content: '✓';
            position: absolute;
            top: -2px; left: 1px;
            font-size: 12px;
            font-weight: bold;
          }
          
          /* Highlight */
          .highlight { 
            font-weight: bold; 
          }
          
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const regDate = formatDateVN(data.registered_date);
  const expDate = formatDateVN(data.expiry_date);
  const ben1 = data.beneficiaries[0] || { full_name: '', id_number: '', address: '', relationship: '' };
  const ben2 = data.beneficiaries[1] || { full_name: '', id_number: '', address: '', relationship: '' };
  const todayVN = new Date().toLocaleDateString('vi-VN');

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      {/* Toolbar */}
      <div className="fixed top-4 right-4 z-[210] flex items-center gap-2">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-xl"
        >
          <Printer size={16} /> In Phiếu
        </button>
        <button
          onClick={onClose}
          className="p-3 bg-white/90 text-gray-700 rounded-xl hover:bg-white transition-all shadow-xl"
        >
          <X size={18} />
        </button>
      </div>

      {/* Print Content (A4 preview) */}
      <div className="bg-white shadow-2xl rounded-lg mx-4" style={{ width: '210mm', minHeight: '297mm' }}>
        <div ref={printRef}>
          {/* ════════ PAGE 1 ════════ */}
          <div className="page" style={{ padding: '15mm 20mm 20mm 20mm', fontFamily: "'Times New Roman', Times, serif", fontSize: '13px', lineHeight: '1.6', color: '#000' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Logo was here, removed as requested */}
              </div>
              <div style={{ fontSize: '11px', textAlign: 'right' }}>BM-{data.member_code || '____'}</div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', margin: '12px 0 4px', textTransform: 'uppercase' as const }}>
              PHIẾU ĐĂNG KÝ HỘI VIÊN
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
              Chương trình Hội Viên Trăm Tuổi
            </div>

            {/* Section I */}
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '14px 0 8px' }}>
              <span style={{ fontWeight: 'bold' }}>I.</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ textDecoration: 'underline' }}>THÔNG TIN NGƯỜI ĐĂNG KÍ HỘI VIÊN:</span>
            </div>

            <div style={{ margin: '5px 0' }}>
              <span>Họ và tên&nbsp;&nbsp;:&nbsp;&nbsp;</span>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '400px', paddingBottom: '1px' }}>
                {dotFill(data.full_name)}
              </span>
            </div>
            <div style={{ margin: '5px 0' }}>
              <span>CCCD số&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</span>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '400px', paddingBottom: '1px' }}>
                {dotFill(data.id_number)}
              </span>
            </div>
            <div style={{ margin: '5px 0', display: 'flex', gap: '20px' }}>
              <div>
                <span>Ngày cấp&nbsp;&nbsp;:&nbsp;&nbsp;</span>
                <span style={{ display: 'inline-block', minWidth: '160px', paddingBottom: '1px' }}>
                  {dotFill(data.id_issue_date ? formatDateVN(data.id_issue_date) : undefined, 25)}
                </span>
              </div>
              <div>
                <span>Nơi cấp:&nbsp;&nbsp;</span>
                <span style={{ display: 'inline-block', minWidth: '180px', paddingBottom: '1px' }}>
                  {dotFill(data.id_issue_place, 28)}
                </span>
              </div>
            </div>
            <div style={{ margin: '5px 0' }}>
              <span>Địa chỉ&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</span>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '400px', paddingBottom: '1px' }}>
                {dotFill(data.address)}
              </span>
            </div>
            <div style={{ margin: '5px 0' }}>
              <span>Điện thoại&nbsp;:&nbsp;&nbsp;</span>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '400px', paddingBottom: '1px' }}>
                {dotFill(data.phone)}
              </span>
            </div>
            <div style={{ margin: '5px 0' }}>
              <span>Email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</span>
              <span style={{ display: 'inline-block', minWidth: '400px', paddingBottom: '1px' }}>
                {dotFill(data.email)}
              </span>
            </div>

            {/* Section II */}
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '16px 0 8px' }}>
              <span style={{ fontWeight: 'bold' }}>II.</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ textDecoration: 'underline' }}>THÔNG TIN CHƯƠNG TRÌNH HỘI VIÊN KẾ HOẠCH TRĂM TUỔI</span>
            </div>

            <div style={{ margin: '5px 0' }}>
              <span>Mã hội viên&nbsp;&nbsp;:&nbsp;&nbsp;</span>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '400px', paddingBottom: '1px' }}>
                {dotFill(data.member_code)}
              </span>
            </div>

            <div style={{ margin: '8px 0' }}>
              <strong>2.1. Phí đăng ký hội viên: 2.000.000đ</strong> (bằng chữ: Hai triệu đồng)
            </div>
            <div style={{ margin: '4px 0', fontSize: '12px' }}>
              Hình thức thanh toán: Người đăng kí hội viên thanh toán bằng tiền mặt hoặc chuyển khoản vào thông tin tài khoản dưới đây:
            </div>
            <div style={{ margin: '6px 0 6px 0', fontSize: '12px' }}>
              <div>Tên chủ tài khoản: <strong>CÔNG TY CỔ PHẦN DỊCH VỤ TANG LỄ BLACKSTONES</strong></div>
              <div>Số tài khoản: <strong>053 10000 2 19 19</strong></div>
              <div>Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)</div>
              <div>Nội dung chuyển khoản: &quot;<strong>{data.full_name || 'Họ tên hội viên'}</strong>&quot; chuyển tiền hội viên</div>
            </div>

            <div style={{ margin: '8px 0' }}>
              <strong>2.2. Thời hạn hội viên:</strong> 10 năm kể từ ngày bắt đầu tham gia.
            </div>
            <div style={{ margin: '5px 0' }}>
              <span>Ngày bắt đầu tham gia hội viên:&nbsp;&nbsp;</span>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '250px', paddingBottom: '1px' }}>
                {regDate}
              </span>
            </div>
            <div style={{ margin: '5px 0' }}>
              <span>Ngày kết thúc hội viên:&nbsp;&nbsp;</span>
              <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '250px', paddingBottom: '1px' }}>
                {expDate}
              </span>
            </div>

            {/* 2.3 Quyền lợi */}
            <div style={{ margin: '8px 0' }}><strong>2.3. Quyền lợi hội viên</strong></div>
            <div style={{ marginLeft: '16px', fontSize: '12px' }}>
              <div style={{ margin: '4px 0' }}><strong>a. Quyền lợi Tâm an – Trọn vẹn:</strong></div>
              <div style={{ marginLeft: '20px', fontSize: '11.5px' }}>
                <div>- Chuyên viên tư vấn hỗ trợ lập kế hoạch tang lễ</div>
                <div>- Chuyên viên tư vấn nơi an nghỉ</div>
                <div>- Chuyên viên tư vấn dịch vụ y tế, chăm sóc giảm nhẹ cuối đời</div>
                <div>- Hotline sẵn sàng hỗ trợ gia đình 24/7</div>
                <div>- Ưu tiên nguồn lực hỗ trợ khi phát sinh nhu cầu Dịch vụ tang lễ</div>
                <div>- Hotline công ty: <strong>0868 57 67 77</strong></div>
                <div>- Liên hệ của chuyên viên tư vấn: <strong>{dotFill(data.consultant_name, 32)}</strong></div>
              </div>

              <div style={{ margin: '6px 0 0' }}><strong>b. Quyền lợi Tiết kiệm:</strong></div>
              <div style={{ marginLeft: '20px', fontSize: '11.5px' }}>
                <div>- Phí hội viên 2.000.000đ được khấu trừ vào chi phí <strong>Gói dịch vụ tang lễ</strong> khi sử dụng</div>
                <div>- Chiết khấu chi phí <strong>Gói dịch vụ tang lễ</strong> theo thời gian tham gia hội viên cụ thể theo bảng sau:</div>
              </div>
            </div>

            {/* Discount table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', background: '#f0f0f0' }}>Thời gian tham gia hội viên</th>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', background: '#f0f0f0' }}>Mức chiết khấu</th>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', background: '#f0f0f0' }} colSpan={2}>Thời gian áp dụng cụ thể</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { period: '60 ngày đầu tiên', rate: '0%' },
                  { period: 'Trên 60 ngày dưới 1 năm', rate: '5%' },
                  { period: 'Trên 1 năm dưới 3 năm', rate: '7%' },
                  { period: 'Trên 3 năm', rate: '10%' },
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={{ border: '1px solid #000', padding: '3px 8px' }}>{r.period}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 8px', textAlign: 'center', fontWeight: 'bold' }}>{r.rate}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 8px', fontSize: '10px' }}>Từ: ............</td>
                    <td style={{ border: '1px solid #000', padding: '3px 8px', fontSize: '10px' }}>đến: ............</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginLeft: '16px', fontSize: '12px' }}>
              <div style={{ margin: '4px 0' }}><strong>c.</strong> Quyền lợi Y tế: chiết khấu 15% trên giá niêm yết Dịch vụ y tế của Blackstones.</div>
              <div style={{ margin: '4px 0' }}><strong>d.</strong> Các quyền lợi khác được quy định trong <strong>Điều Khoản và Điều Kiện</strong>.</div>
            </div>

            {/* Section III — Beneficiaries */}
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '16px 0 6px' }}>
              <span style={{ fontWeight: 'bold' }}>III.</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ textDecoration: 'underline' }}>ĐỐI TƯỢNG THỤ HƯỞNG QUYỀN LỢI HỘI VIÊN</span>
            </div>
            <div style={{ fontSize: '12px', margin: '2px 0 6px' }}>
              <strong>3.1.</strong> Quyền lợi Tiết kiệm chỉ áp dụng một lần duy nhất cho một trong các đối tượng thụ hưởng khi sử dụng Dịch vụ tang lễ.
            </div>
            <div style={{ fontSize: '12px', margin: '2px 0 6px' }}>
              <strong>3.2.</strong> Đối tượng thụ hưởng được đăng kí cụ thể dưới đây (Tối đa 2 đối tượng)
            </div>

            {/* Ben 1 */}
            <div style={{ margin: '6px 0 6px 16px' }}>
              <div style={{ fontWeight: 'bold', fontStyle: 'italic', margin: '0 0 4px' }}>Đối tượng 1:</div>
              <div style={{ margin: '3px 0' }}>
                Họ và tên:&nbsp;
                <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '380px' }}>{dotFill(ben1.full_name, 55)}</span>
              </div>
              <div style={{ margin: '3px 0' }}>
                CCCD:&nbsp;
                <span style={{ display: 'inline-block', minWidth: '380px' }}>{dotFill(ben1.id_number, 55)}</span>
              </div>
              <div style={{ margin: '3px 0' }}>
                Địa chỉ:&nbsp;
                <span style={{ display: 'inline-block', minWidth: '380px' }}>{dotFill(ben1.address, 55)}</span>
              </div>
              <div style={{ margin: '3px 0' }}>
                Mối quan hệ với hội viên:&nbsp;
                <span style={{ fontWeight: 'bold', display: 'inline-block', minWidth: '280px' }}>{dotFill(ben1.relationship, 40)}</span>
              </div>
            </div>

            {/* Ben 2 */}
            <div style={{ margin: '6px 0 6px 16px' }}>
              <div style={{ fontWeight: 'bold', fontStyle: 'italic', margin: '0 0 4px' }}>Đối tượng 2:</div>
              <div style={{ margin: '3px 0' }}>
                Họ và tên:&nbsp;
                <span style={{ fontWeight: ben2.full_name ? 'bold' : 'normal', display: 'inline-block', minWidth: '380px' }}>{dotFill(ben2.full_name, 55)}</span>
              </div>
              <div style={{ margin: '3px 0' }}>
                CCCD:&nbsp;
                <span style={{ display: 'inline-block', minWidth: '380px' }}>{dotFill(ben2.id_number, 55)}</span>
              </div>
              <div style={{ margin: '3px 0' }}>
                Địa chỉ:&nbsp;
                <span style={{ display: 'inline-block', minWidth: '380px' }}>{dotFill(ben2.address, 55)}</span>
              </div>
              <div style={{ margin: '3px 0' }}>
                Mối quan hệ với hội viên:&nbsp;
                <span style={{ fontWeight: ben2.relationship ? 'bold' : 'normal', display: 'inline-block', minWidth: '280px' }}>{dotFill(ben2.relationship, 40)}</span>
              </div>
            </div>

            {/* Section IV — Cam kết */}
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '16px 0 6px' }}>
              <span>IV.</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ textDecoration: 'underline' }}>CAM KẾT CỦA NGƯỜI ĐĂNG KÍ HỘI VIÊN</span>
            </div>
            <div style={{ fontSize: '12px', margin: '4px 0', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1.5px solid #000', flexShrink: 0, marginTop: '3px', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-3px', left: '1px', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
              </span>
              <span>
                Tôi xác nhận đã đọc, hiểu rõ và đồng ý với toàn bộ <strong>Điều Khoản và Điều Kiện</strong> chương trình Hội viên Kế Hoạch trăm tuổi của Công ty Cổ phần Dịch vụ tang lễ Blackstones.
              </span>
            </div>
            <div style={{ fontSize: '11px', margin: '8px 0', fontStyle: 'italic', color: '#555' }}>
              Quét mã QR để xem toàn bộ Điều Khoản và Điều Kiện
            </div>

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', textAlign: 'center' }}>
              <div style={{ width: '45%' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>ĐẠI DIỆN CÔNG TY</div>
                <div style={{ height: '70px' }}></div>
              </div>
              <div style={{ width: '45%' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>NGƯỜI ĐĂNG KÍ HỘI VIÊN</div>
                <div style={{ height: '70px' }}></div>
                <div style={{ fontWeight: 'bold' }}>{data.full_name}</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: '10mm', left: '20mm', right: '20mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ddd', paddingTop: '6px', fontSize: '9px', color: '#666' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ border: '2px solid #000', padding: '2px 6px', fontWeight: 'bold', fontSize: '8px', lineHeight: '1.2' }}>
                  <div>ISO 9001</div>
                  <div style={{ fontSize: '6px' }}>:2015</div>
                  <div style={{ fontSize: '6px' }}>CERTIFIED</div>
                </div>
                <div>
                  <div>Mã số: 9199300161480-QMS</div>
                  <div>Cấp ngày: 17.05.2025</div>
                </div>
              </div>
              <div>Ngày in: {todayVN}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
