# 📚 TỔNG HỢP TÀI LIỆU QUẢN TRỊ HỆ THỐNG BLACKSTONE ORDER SCM

> ⚠️ **LƯU Ý BẢO MẬT:** File này chứa thông tin cực kỳ quan trọng của toàn bộ hệ thống. Tuyệt đối KHÔNG chia sẻ file này ra ngoài nội bộ công ty. Mọi mật khẩu nhạy cảm bạn hãy tự điền vào các phần `[...]` để đảm bảo tôi (AI) không lưu trữ nó.

---

## 🛠️ 1. CÁC CÔNG CỤ & DỊCH VỤ ĐANG SỬ DỤNG (HẠ TẦNG)

### A. Vercel (Máy chủ lưu trữ Web & Chạy mã nền)
- **Chức năng:** Nơi chứa toàn bộ code "Trang web", cung cấp đường link có đuôi `.vercel.app` để nhân viên truy cập trên điện thoại/máy tính. Chạy các hàm API tự động (như tự động đồng bộ).
- **Đường link Quản trị:** [https://vercel.com/](https://vercel.com/)
- **Tài khoản (Email):** `[Nhập Email Vercel của bạn]`
- **Mật khẩu:** `[Nhập Mật khẩu Vercel]`
- **Link Website dự án:** `https://blackstone-order-scm.vercel.app`
- **Link API gọi tự động:** `https://blackstone-order-scm.vercel.app/api/cron/sync-dam`

### B. Supabase (Cơ sở dữ liệu lõi & Phân quyền User)
- **Chức năng:** Bộ não trung tâm lưu trữ toàn bộ dữ liệu (Bảng Đám Tang, Hòm, Nhà cung cấp, Tồn Kho, Lịch sử Xuất/Nhập). Nơi tạo tài khoản cho nhân viên Kho và cấp quyền truy cập.
- **Đường link Quản trị:** [https://supabase.com/](https://supabase.com/)
- **Project URL:** `https://zspazvdyrrkdosqigomk.supabase.co`
- **Tài khoản (Email):** `[Nhập Email Supabase của bạn]`
- **Mật khẩu:** `[Nhập Mật khẩu Supabase]`

### C. GitHub (Kho lưu trữ mã nguồn)
- **Chức năng:** "Két sắt" chứa toàn bộ file code của dự án. Vercel sẽ tự động lấy code từ Két sắt này ra để chạy trang web mỗi khi bạn có cập nhật mới.
- **Đường link Quản trị:** [https://github.com/](https://github.com/)
- **Tài khoản / Username:** `nguyenthanhdat070705` (Repo: `qr-shipment-app`)
- **Mật khẩu:** `[Nhập Mật khẩu GitHub]`

### D. Google Sheets (Nguồn nhập liệu tự nhiên)
- **Chức năng:** Các bảng tính được nhân sự (Điều phối, Kho...) sử dụng để gõ/copy-paste dữ liệu hàng ngày. Cực kỳ dễ dùng và quen thuộc.
- **Link File Tồn Kho:** `[Gắn link file Tồn kho vào đây]`
- **Link File Đám Tang:** `https://docs.google.com/spreadsheets/d/1NySorW3c07R_w7smqMkGbAja6I9rIVLT4s0OGZEOIOg/edit` (GID: 1072390539)
- **Quyền truy cập:** Phải luôn được cài đặt là `"Mọi người có đường link"` để Robot của Web có thể vào xin dữ liệu.

### E. Cron-job.org (Robot Tự động hóa)
- **Chức năng:** Hoạt động như một chiếc đồng hồ báo thức. Cứ đúng chu kỳ 5 phút hoặc 10 phút, nó sẽ ra lệnh cho Vercel chạy vào Google Sheet và chép dữ liệu đè lên Supabase.
- **Đường link Quản trị:** [https://cron-job.org/](https://cron-job.org/)
- **Tài khoản (Email):** `[Nhập Email đã đăng ký cron-job]`
- **Mật khẩu:** `[Nhập Mật khẩu cron-job]`

---

## 👥 2. DANH SÁCH TÀI KHOẢN NHÂN SỰ BÊN TRONG HỆ THỐNG
*(Đây là các tài khoản dùng để đăng nhập vào trang Web Blackstone SCM. Được quản lý bên trong mục Authentication của Supabase)*

**Tài Khoản QUẢN TRỊ VIÊN (Admin - Thấy mọi dữ liệu):**
- **Email:** `[Email Admin]`
- **Mật khẩu:** `[Mật khẩu Admin]`
- **Mã Kho:** `(Không giới hạn)`

**Tài Khoản KHO 1:**
- **Email:** `[Email NV Kho 1]`
- **Mật khẩu:** `[Mật khẩu NV Kho 1]`
- **Mã Kho:** (Được phân quyền chỉ thấy dữ liệu thuộc Kho 1)

**Tài Khoản KHO 2:**
- **Email:** `[Email NV Kho 2]`
- **Mật khẩu:** `[Mật khẩu NV Kho 2]`
- **Mã Kho:** (Được phân quyền chỉ thấy dữ liệu thuộc Kho 2)

**Tài Khoản KHO 3:**
- **Email:** `[Email NV Kho 3]`
- **Mật khẩu:** `[Mật khẩu NV Kho 3]`
- **Mã Kho:** (Được phân quyền chỉ thấy dữ liệu thuộc Kho 3)

---

## 📝 3. CÁC ĐỊNH NGHĨA QUAN TRỌNG

- **PO (Purchase Order):** Đơn đặt hàng nội bộ gửi Nhà cung cấp.
- **GR (Goods Receipt):** Lệnh nhận hàng / Nhập kho (có chức năng Tự động cộng số lượng tồn kho gốc).
- **GI (Goods Issue):** Lệnh Xuất kho. Mỗi món hàng xuất ra đều được bắn mã vạch và gắn liền MÃ ĐÁM.
- **Fact Table (`fact_inventory`, `fact_dam`...):** Bảng dữ liệu liên tục thay đổi hàng ngày, chứa các con số và sự kiện (thêm bớt tồn kho, đám tang mới).
- **Dim Table (`dim_hom`, `dim_kho`, `dim_dam`...):** Bảng tĩnh chứa Danh mục cốt lõi (Tên khoa, Tên Nhà Cung Cấp, Danh sách các Hòm) để làm chuẩn cho hệ thống truy xuất.
- **Auto-Sync:** Luồng kỹ thuật lấy dữ liệu từ "Google Sheet → Vercel API → Supabase" một cách tự động mỗi chu kỳ 5 phút.

---
📅 *Cập nhật lần cuối: 31/03/2026*
