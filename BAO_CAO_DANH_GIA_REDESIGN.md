# 🩺 BÁO CÁO ĐÁNH GIÁ CHUYÊN SÂU & ĐỀ XUẤT THIẾT KẾ LẠI
### Hệ thống Blackstones — SCM · Bán hàng · CSKH/CRM

> **Người đánh giá:** Senior Software Engineer (review độc lập)
> **Ngày:** 11/06/2026 · **Phạm vi:** toàn bộ `src/app` (65 trang) + `src/components` + `src/lib` + 116 API route + cấu hình build/deploy
> **Phương pháp:** đọc trực tiếp source, xác minh từng lỗi bằng `file:line` (không suy đoán)

---

## 0. TÓM TẮT CHO LÃNH ĐẠO (Executive Summary)

Hệ thống đã **chạy được và bao phủ nghiệp vụ rất rộng** (kho vận, mua hàng, bán hàng, hội viên, CRM, tang lễ, tích hợp GetFly/1Office/Zalo/Drive). Đây là tài sản lớn. **Nhưng** về mặt kỹ thuật & trải nghiệm, hệ thống đang ở trạng thái **"nguyên mẫu trưởng thành"** (mature prototype) chứ chưa phải sản phẩm production chỉn chu:

| Trục đánh giá | Điểm /10 | Nhận định 1 dòng |
|---|:---:|---|
| 🎨 **Giao diện (UI)** | **5.5** | Nền tảng đẹp nhưng mỗi trang tự "chế" lại — thiếu hệ thống thiết kế thống nhất |
| 🧭 **Trải nghiệm (UX)** | **5.0** | Điều hướng rối (5 hub trùng vai trò), thiếu trạng thái loading/empty/error |
| 🐛 **Độ ổn định (Bug)** | **4.0** | Nhiều luồng "giả lập" không ghi DB; lỗi hiển thị trạng thái nghiêm trọng |
| 🔐 **Bảo mật** | **2.5** | Xác thực client-side; API không kiểm quyền; secret hard-code; ~33 route debug mở công khai |
| 🧹 **Chất lượng mã** | **3.5** | 123 file rác ở root, 39 file trùng "MacBook Air", tắt cả type-check khi build |
| ♿ **Tiếp cận (A11y)** | **4.0** | Chặn zoom (vi phạm WCAG), nút icon thiếu nhãn, form thiếu `<label>` |
| ⚡ **Hiệu năng** | **5.5** | Component khổng lồ render client-side, ảnh không tối ưu, poll 30s |
| | **≈ 4.2/10** | **Cần tái cấu trúc nền tảng + thiết kế lại, không chỉ "sơn lại"** |

**Kết luận:** Việc bạn muốn — *thiết kế lại toàn bộ, nâng cấp UI/UX, sửa hết bug* — là **đúng hướng và cần thiết**. Tuy nhiên đây không phải việc "thay theme" trong 1-2 ngày. Tôi đề xuất một **lộ trình 5 giai đoạn** (mục 8) để vừa **dựng lại hệ thống thiết kế (design system)**, vừa **vá các lỗi nghiêm trọng**, vừa **dọn nợ kỹ thuật** — làm trên nhánh `feat/nang-cap-toan-dien` đang có.

---

## 1. KIẾN TRÚC HIỆN TẠI (bối cảnh để hiểu vấn đề)

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · TailwindCSS 4 · Supabase (Postgres + Auth + Storage, dùng **service-role key**) · Vercel (4 cron).
- **Mô hình dữ liệu:** star schema tiếng Việt (`dim_*` + `fact_*`), tên cột tiếng Việt dễ nhầm (vd `fact_inventory."Ghi chú"` = **SL khả dụng**, không phải ghi chú).
- **Xác thực:** **100% phía client** qua `localStorage`. **Không có `middleware.ts`**. Vai trò suy ra từ email (`src/config/roles.config.ts`).
- **Quy mô:** 65 trang, 116 API route (trong đó **~33 route là debug/probe/init/fix/migration** — không nên tồn tại ở production).

> Đây là gốc rễ của phần lớn rủi ro bảo mật ở mục 4.

---

## 2. ĐÁNH GIÁ GIAO DIỆN (UI) — chi tiết

### 2.1. Điểm tốt (giữ lại khi redesign)
- ✅ Đã có **bảng màu thương hiệu** hợp ngành (trang trọng): navy `#1B2A4A`, teal `#2D6B7A`, gold `#c5a55a` — định nghĩa ở `globals.css:4-38`.
- ✅ Dùng **lucide-react** (icon vector) thay vì emoji.
- ✅ Sidebar dark navy (`PageLayout.tsx`) trông hiện đại; bo góc `rounded-2xl`, đổ bóng mềm.
- ✅ Có **dark mode thật** (587 chỗ dùng `dark:`), toggle lưu `localStorage`.
- ✅ `DataTable.tsx`, `StatusBadge.tsx` là ví dụ component tái sử dụng **tốt**.

### 2.2. Vấn đề cốt lõi — **"Mỗi trang là một app khác nhau"**

**A. Bảng màu thương hiệu bị bỏ quên ~70% số trang.** Đã định nghĩa navy/teal/gold nhưng các trang lại hard-code màu tuỳ hứng:
- `sales-hub/page.tsx` dùng gradient `from-stone-700 to-amber-900`, `from-rose-400 to-pink-600`…
- `admin/page.tsx` KPI dùng `from-indigo-500 to-violet-600` (tím-chàm, không phải màu brand).
- `products-manage.css` dùng `linear-gradient(135deg, #6366f1, #8b5cf6)` (tím indigo) xuyên suốt.
→ Hệ quả: cảm giác **rời rạc, thiếu nhất quán**, không ra "một sản phẩm".

**B. Component lõi bị "chế lại" trên mỗi trang thay vì tái sử dụng:**
- Thẻ KPI/Stat được **viết lại ≥4 lần** gần như giống hệt: `admin/page.tsx`, `sales/page.tsx`, `warehouse/page.tsx`, `membership/page.tsx`.
- **Không có** component `Button`, `Input`, `Modal`, `Card`, `Skeleton`, `EmptyState` dùng chung → mỗi nơi tự style.

**C. Hai "thời kỳ thiết kế" cùng tồn tại:** nhiều trang viết bằng **CSS thuần rời** thay vì Tailwind:
- `products-manage.css` (**~2.000 dòng** CSS thủ công, class `.pm-*`), `login.css`, `suppliers-manage.css`, `warehouses-manage.css`.
→ Mâu thuẫn với hướng "Tailwind-first", khó bảo trì, hard-code hex (`#e2e8f0`, `#334155`…) khắp nơi.

**D. Lạm dụng gradient** (mốt 2021-2022) cho nút bấm → trông cũ so với SaaS hiện đại (Linear, Vercel) vốn dùng màu phẳng + nhấn nhá tinh tế.

### 2.3. Điểm trừ về typography
- 🔴 **Font Inter được khai báo nhưng KHÔNG được tải** (`globals.css:42` chỉ đặt biến CSS; `layout.tsx` không `import next/font` cũng không `<link>`). → Thực tế web đang chạy **font hệ thống**, không phải Inter. Tiếng Việt nên cân nhắc **Be Vietnam Pro** (dấu đẹp hơn).

---

## 3. ĐÁNH GIÁ TRẢI NGHIỆM (UX) — chi tiết

| Vấn đề | Mô tả | Ảnh hưởng |
|---|---|---|
| **Điều hướng trùng lặp** | 5 "hub" (`/dashboards`, `/warehouse-hub`, `/sales-hub`, `/membership-hub`, `/inout-management`) + còn `/io-management` (bản cũ) song song. | Người dùng lạc, không rõ vào đâu |
| **Thiếu trạng thái loading** | Hầu như **không có skeleton**; phần lớn chỉ spinner hoặc trắng màn hình khi fetch. | Cảm giác "đơ", chậm |
| **Thiếu empty state** | `DataTable` chỉ in chữ "Không có dữ liệu." trơ trọi, không icon/gợi ý hành động. | Kém chuyên nghiệp |
| **Thiếu error state** | API lỗi thường `catch(console.error)` — người dùng **không thấy gì**, tưởng đang tải. | Khó dùng, khó hỗ trợ |
| **Mật độ thông tin lệch** | Bảng `products-manage` cố định cột rộng → **tràn ngang** trên tablet/mobile; chữ nhãn `text-[10px]/[11px]` quá nhỏ. | Khó đọc trên điện thoại |
| **Deep-link gãy** | Bấm "Thêm vào đơn" ở catalog → `/sales/orders?ma_hom=…` nhưng trang orders **không đọc** tham số. | Phải tìm lại sản phẩm |

---

## 4. 🐛 DANH SÁCH LỖI (đã xác minh `file:line`)

### 🔴 NGHIÊM TRỌNG (Critical) — mất dữ liệu / lỗ hổng bảo mật

| # | Lỗi | Vị trí | Bằng chứng | Ảnh hưởng |
|---|---|---|---|---|
| C1 | **Tạo đơn hàng chỉ "giả lập", KHÔNG ghi DB** | `sales/orders/page.tsx:126` | `await new Promise(r => setTimeout(r,1200)); setOrderComplete(true)` + dòng 53 "Fallback mock" | Mọi đơn hàng tạo ra **biến mất** |
| C2 | **Bán gói SP chỉ "giả lập", KHÔNG ghi DB** | `sales/packages/page.tsx:119-128` | tương tự C1; 4 gói hard-code | Đăng ký gói **biến mất**, automation không chạy |
| C3 | **Hard-code API key GetFly trong source** (≥10 file) | `api/sync-getfly/route.ts:4` và 9 file khác | `const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1'` | Lộ khoá; ai có source là gọi được CRM |
| C4 | **~33 route debug/probe/init/fix/migration mở công khai** | `api/run-migration`, `api/init-db`, `api/fix-rls`, `api/reload-schema`, `api/dump-mbs26003`, `debug-getfly1-5`, `probe-*`… | không kiểm quyền, dùng service-role | Có thể **chạy DDL / migration / xoá dữ liệu** từ bên ngoài |
| C5 | **API đổi/reset mật khẩu không kiểm quyền server** | `api/accounts/change-password`, `api/accounts/reset-defaults` | dùng service-role, không xác thực người gọi | **Bất kỳ ai** có thể reset mật khẩu admin |
| C6 | **Không có `middleware.ts`; xác thực chỉ client-side** | `components/AuthGuard.tsx:18` | chỉ kiểm `localStorage.getItem('auth_token')` tồn tại | Gọi thẳng API là đọc/ghi được dữ liệu |

### 🟠 CAO (High)

| # | Lỗi | Vị trí | Bằng chứng | Ảnh hưởng |
|---|---|---|---|---|
| H1 | **Trạng thái `pending` hiển thị nhãn "Đã hoàn thành"** | `operations/page.tsx:19` | `pending: { label: 'Đã hoàn thành', … }` | Lệnh **chờ xử lý** bị đọc nhầm là **xong** → bỏ sót giao hàng |
| H2 | **GetFly vẫn dùng `/api/v3/` dù đã migrate v6** | 24 file dùng `api/v3`, chỉ 3 file dùng `api/v6` | grep toàn `src/` | Theo memo: **v3 + key cũ đã chết** → các tab CRM live dễ hỏng |
| H3 | **`/api/send-email` chỉ `console.log`, không gửi thật** | `api/send-email/route.ts:8-15` | `console.log('📧 MOCK EMAIL')` rồi trả `success:true` | Email (xác nhận, nhắc hạn…) **không bao giờ tới** |
| H4 | **`/care-history` & `/customer-support` toàn dữ liệu giả** | `care-history/page.tsx:17`, `customer-support/page.tsx:17` | `mockHistory`, `mockTickets` hard-code | Không phải dữ liệu thật |
| H5 | **Hard-code token 1Office & cron-secret** | `lib/1office/client.ts:8`; `zalo-automation/ZaloAutomationClient.tsx` | `|| '84869196569c…'`; `|| 'blackstone-cron-secret-2026'` | Lộ secret trong source/bundle client |
| H6 | **Tắt type-check khi build** | `next.config.ts:6` | `typescript: { ignoreBuildErrors: true }` | Lỗi kiểu **lọt thẳng** ra production |

### 🟡 TRUNG BÌNH (Medium)

| # | Lỗi | Vị trí | Ảnh hưởng |
|---|---|---|---|
| M1 | Deep-link `?ma_hom=` không được đọc | `sales/orders/page.tsx` (thiếu `useSearchParams`) | UX gãy, phải tìm lại SP |
| M2 | `Promise.all().catch(console.error)` nuốt lỗi, không báo UI | `purchase-orders/create/page.client.tsx:91-99` | Dropdown trống mà người dùng không biết vì sao |
| M3 | Trùng route/legacy mồ côi | `/io-management` vs `/inout-management`; `/stocktake/[id]` + `/api/stocktakes` (số nhiều) | Rối, dễ sửa nhầm bản |
| M4 | Catalog vẫn `select gia_von` (giá vốn) đưa xuống client | `sales/catalog` | Sales **không được** thấy giá vốn nhưng dữ liệu vẫn tải về client |
| M5 | Comment cron mâu thuẫn lịch thực tế ("mỗi 3 giờ" nhưng chạy 1 lần/ngày) | `api/cron/*` | Gây hiểu nhầm vận hành |

### 🟢 NHẸ (Low) — dọn dẹp

| # | Việc | Bằng chứng |
|---|---|---|
| L1 | **39 file trùng `*-Thành's MacBook Air.tsx/.ts`** — đều **đang được git theo dõi** | `find src -name "*MacBook*"` = 39, `git ls-files` = 39 |
| L2 | **123 file rác ở thư mục gốc** (test-*.js, scratch-*, migration_*.sql, *.csv/json dump, build_error.txt…) | `ls -p \| grep -v / \| wc -l` = 123 |
| L3 | Tiêu đề trang vẫn là **"QR Shipment Tracker"** (tên dự án cũ) | `layout.tsx:6` |

---

## 5. 🔐 BẢO MẬT (mục riêng — ưu tiên cao nhất)

> Đây là nhóm rủi ro **nguy hiểm nhất** vì có thể bị khai thác từ Internet mà không cần đăng nhập.

1. **Toàn bộ API dùng service-role key của Supabase** nhưng **không có lớp xác thực/uỷ quyền server** → mọi bảng đọc/ghi được nếu biết endpoint.
2. **~33 route công cụ (debug/probe/init/fix/run-migration) mở công khai** → có thể thực thi DDL, dump dữ liệu nhạy cảm (vd `dump-mbs26003`), reset RLS.
3. **Đổi/reset mật khẩu không kiểm quyền** → chiếm tài khoản admin.
4. **Secret hard-code trong source** (GetFly key, 1Office token, cron secret) → lộ khi ai đó có repo/bundle.
5. **`maximumScale:1, userScalable:false`** không phải bảo mật nhưng **vi phạm WCAG** (chặn phóng to).

**Khuyến nghị tối thiểu trước khi coi là "production":** thêm `middleware.ts` chặn token + kiểm role ở server cho mọi API ghi; **xoá sạch** nhóm route debug/probe/migration; chuyển hết secret vào biến môi trường (và **thu hồi & xoay khoá** đã lộ vì chúng đã nằm trong lịch sử git).

---

## 6. 🧹 CHẤT LƯỢNG MÃ & NỢ KỸ THUẬT

- **Root "ngập" 123 file rời:** ~41 file `.js` test/scratch, 16 `.sql` migration, 14 `.txt` log/diff, 10 `.json` dump (có file 370KB), 4 `.csv`… → nên gom vào `/scripts`, `/migrations`, `/docs` hoặc xoá.
- **39 file trùng "MacBook Air"** đang được commit → xoá ngay (rủi ro import nhầm, sửa nhầm bản).
- **`ignoreBuildErrors: true`** + ESLint lỏng → CI không bắt được lỗi. `tsconfig` đã `strict: true` nhưng bị vô hiệu lúc build.
- **Component khổng lồ:** `sales/crm/page.tsx` 1.400 dòng, `warehouse/page.tsx` 1.272 dòng, `dashboards/membership` 1.172 dòng — đều `'use client'`, tự fetch toàn bộ data → khó đọc, khó test, chậm tải lần đầu.

---

## 7. ♿ TIẾP CẬN (A11y) & ⚡ HIỆU NĂNG

**A11y:**
- 🔴 `userScalable:false` (chặn zoom) — `layout.tsx:18`.
- 🟠 Nút icon (chuông thông báo, toggle theme) **thiếu `aria-label`** — `PageLayout.tsx:586`.
- 🟠 Form thiếu `<label htmlFor>` (vd `sales/crm`) → đọc màn hình không biết ô nhập là gì.
- 🟡 `<div onClick>` (item thông báo) thiếu `role="button"`/`tabindex` → không dùng được bằng bàn phím.

**Hiệu năng:**
- Ảnh dùng `<img>` thuần (không `next/image`) ở nhiều trang (products-manage, inventory, profile, goods-issue…) → không WebP/lazy/srcset.
- Dashboard fetch client-side hoàn toàn (không SSR) → **FCP chậm**.
- Poll `/api/notifications` mỗi **30s/người** (`PageLayout.tsx:477`) → tốn tài nguyên khi nhiều người.

---

## 8. 🚀 ĐỀ XUẤT THIẾT KẾ LẠI & LỘ TRÌNH (Roadmap)

### 8.1. Định hướng thiết kế (Design direction)
Giữ **bản sắc cao cấp – trang trọng** đúng ngành (tang lễ/tưởng niệm), nhưng **chuẩn hoá** lại:

- **Bảng màu:** giữ **Navy (chủ đạo) + Gold (nhấn) + Teal (phụ)**; thêm token **ngữ nghĩa** (`surface`, `surface-muted`, `text-primary`, `success/warning/danger`, `border`). Bỏ tím-indigo/stone-amber tuỳ hứng.
- **Typography:** tải font thật bằng `next/font` — đề xuất **Be Vietnam Pro** (tối ưu dấu tiếng Việt) cho UI, giữ thang cỡ chữ rõ ràng (12/14/16/20/24/30).
- **Thang đo:** chuẩn hoá `radius` (sm/md/lg/xl), `shadow` (1 bộ 4 cấp), `spacing` theo lưới 4px.
- **Phong cách:** giảm gradient, dùng màu phẳng + viền/đổ bóng tinh tế; **light & dark** đồng bộ trên mọi trang.

### 8.2. Hệ thống thiết kế (Design System) cần dựng
Tạo thư mục `src/components/ui/` với các primitive **dùng chung toàn hệ thống**:
`Button` · `Input/Select/Textarea` · `Card` · `Modal/Dialog` · `Badge` · `Table` (nâng cấp `DataTable`) · `Tabs` · `Skeleton` · `EmptyState` · `Toast/Alert` · `StatCard` · `PageHeader`.
→ Sau đó **thay thế dần** code inline & các file `.css` rời.

### 8.3. Lộ trình 5 giai đoạn (làm trên `feat/nang-cap-toan-dien`)

| GĐ | Tên | Nội dung chính | Kết quả |
|:--:|---|---|---|
| **0** | **An toàn & dọn nền** (1-2 ngày) | Xoá 39 file "MacBook Air"; gom/xoá file rác root; **xoá ~33 route debug/probe/migration**; chuyển secret ra ENV; tải font Inter/Be Vietnam Pro; sửa title; bật lại type-check | Repo sạch, bớt lỗ hổng lộ liễu |
| **1** | **Vá bug nghiêm trọng** (2-3 ngày) | Sửa C1/C2 (ghi DB thật cho orders/packages), H1 (status pill), H3 (gửi email thật), M1 (đọc `?ma_hom=`); thêm `middleware.ts` + kiểm role server (C5/C6) | Hết "giả lập", luồng nghiệp vụ đúng |
| **2** | **Dựng Design System** (3-5 ngày) | Token màu/typography/spacing; bộ `components/ui/*`; chuẩn hoá `PageLayout`, dark mode | Nền tảng UI thống nhất |
| **3** | **Redesign theo cụm** (1-2 tuần) | Áp design system lần lượt: Dashboard/Admin → Kho vận → Bán hàng/Catalog → Hội viên/CRM → Tang lễ. Thêm skeleton/empty/error mọi trang; bỏ `.css` rời | Diện mạo mới đồng bộ |
| **4** | **Hoàn thiện & tối ưu** (3-5 ngày) | A11y (aria-label, label, zoom), `next/image`, tách server/client component, dọn route trùng, kiểm thử | Mượt, nhanh, tiếp cận tốt |

> Tổng ước lượng: **~4-6 tuần** làm tuần tự (có thể song song một phần). Mỗi GĐ ra PR riêng để bạn duyệt, **không merge `main`** đến khi bạn đồng ý (theo ghi chú dự án).

---

## 9. BƯỚC TIẾP THEO — cần bạn quyết định
1. **Bản sắc thiết kế:** giữ tông Navy+Gold trang trọng hiện tại, hay muốn đổi hẳn hướng (sáng/tối giản, hoặc ấm áp hơn)?
2. **Điểm bắt đầu:** ưu tiên **vá bug nghiêm trọng trước** (an toàn dữ liệu) hay **làm diện mạo mới trước** (để thấy ngay sự thay đổi)?
3. **Phạm vi đợt này:** làm trọn lộ trình 5 GĐ, hay trước mắt chọn 1-2 cụm trang quan trọng nhất để redesign mẫu?

---
*Hết báo cáo. Mọi lỗi trong mục 4 đều đã được xác minh trực tiếp trên source bằng `file:line`.*
