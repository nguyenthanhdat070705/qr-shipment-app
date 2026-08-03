# 📋 BÁO CÁO CẤU TRÚC WEBSITE — Blackstones SCM & CSKM

> Ngày lập: 10/06/2026 · Phạm vi: toàn bộ `src/app` (≈ 70 màn hình + ≈ 130 API route)
> Mục đích: rà soát toàn bộ flow & màn hình để chủ hệ thống kiểm tra luồng nghiệp vụ.

---

## 1. TỔNG QUAN HỆ THỐNG

**Đây là gì:** Hệ thống quản trị nội bộ cho **Blackstones** (dịch vụ tang lễ / mai táng – sản phẩm chính là "hòm"/quách đá). Gộp 3 mảng lớn:
1. **Chuỗi cung ứng (SCM)** – đặt mua, nhập kho, tồn kho, xuất kho, kiểm kho.
2. **Bán hàng & Sản phẩm** – catalog hòm, đơn hàng, gói dịch vụ, QR sản phẩm.
3. **CSKH / Hội viên / CRM** – Hội viên Trăm Tuổi, Khách Hàng Trăm Tuổi (KHTT), vận hành tang lễ (Lịch Đám), tích hợp GetFly CRM + 1Office + Zalo ZNS.

**Công nghệ:**
| Hạng mục | Chi tiết |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript, TailwindCSS 4 |
| Backend | Supabase (Postgres + Auth + Storage) – dùng **service-role key** ở hầu hết API |
| Tích hợp ngoài | GetFly CRM, 1Office ERP/CRM, Google Drive, Google Sheets, Zalo ZNS |
| Deploy | Vercel (có 4 cron job hàng ngày) |
| Mô hình dữ liệu | Star schema tiếng Việt: `dim_*` (danh mục) + `fact_*` (giao dịch) |

**Lưu ý kiến trúc quan trọng:** Toàn bộ xác thực & phân quyền là **client-side** (đọc `localStorage`). **Không có `middleware.ts`** và **đa số API không kiểm tra quyền ở server** → xem mục 8 (Rủi ro).

---

## 2. MÔ HÌNH PHÂN QUYỀN (5 vai trò + VIP)

Vai trò được suy ra **từ email** (`src/config/roles.config.ts` → `getUserRole`). Tài khoản lạ mặc định = `sales`.

| Vai trò | Nhãn | Trang chủ sau đăng nhập | Quyền chính |
|---|---|---|---|
| `admin` | Quản trị | `/admin` | Toàn quyền |
| `procurement` | Thu mua | `/procurement` | Tạo/duyệt PO, duyệt phiếu nhập, xem NCC |
| `warehouse` | Kho vận | `/warehouse` | Nhập/xuất kho, kiểm kho — **khoá cứng vào 1 kho** (kho1→Hàm Long, kho2→Kha Vạn Cân, kho3→Kinh Dương Vương) |
| `operations` | Vận hành | `/operations` | Xuất hàng, điều phối giao hàng, vận hành tang lễ |
| `sales` | Bán hàng | `/sales` | Xem hàng, **giữ hàng 24h**, membership; **KHÔNG thấy NCC/giá vốn** |
| `quantri@blackstone.com.vn` | VIP Admin (ẩn) | `/admin` | Cấp cao nhất, ẩn với mọi user; quyền duy nhất chỉnh **số lượng tồn** |

**Cơ chế điều hướng:** `/` (HomePage) đọc `auth_user` → redirect theo vai trò. Sidebar (`PageLayout.tsx`) hiển thị menu **khác nhau theo role**.

---

## 3. SƠ ĐỒ ĐIỀU HƯỚNG (Sidebar theo vai trò)

Menu trái gom theo "section". Mục hiển thị tuỳ vai trò:

| Section | Mục menu | Đường dẫn | Ai thấy |
|---|---|---|---|
| Quản trị | Dashboards Quản Trị | `/dashboards` | tất cả |
| Quản trị | Khách hàng tìm kiếm | `/tra-cuu` | ≠ sales, ≠ warehouse |
| Bán Hàng | Trung tâm Bán Hàng | `/sales-hub` | sales, admin |
| CSKH | Trung tâm CSKH Membership | `/membership-hub` | **admin** |
| Chuỗi cung ứng | Trung tâm Kho Vận | `/warehouse-hub` | mọi role ≠ warehouse |
| Chuỗi cung ứng | Quản lý xuất nhập + Kiểm kho | `/inout-management`, `/stocktake` | **chỉ warehouse** |
| Automation | Zalo Automation | `/zalo-automation` | admin |
| Data Outsource | 1Office CRM | `/crm` | admin |
| Data Outsource | CRM GetFly | `/sales/crm` | admin |
| Data Outsource | Quản lý hợp đồng bán | `/sales/contracts` | admin |
| Data Outsource | Lịch Đám | `/funerals` | ≠ sales |
| Hệ thống | Hồ sơ cá nhân | `/profile` | tất cả |
| Hệ thống | Quản lý tài khoản | `/accounts` | admin |

**Top bar (mọi trang):** ô tìm kiếm · nút xem giao diện điện thoại · toggle Sáng/Tối · **chuông thông báo** (poll 30s từ `/api/notifications`) · avatar → `/profile`.

---

## 4. NHÓM A — XÁC THỰC, KHUNG ỨNG DỤNG & QUẢN TRỊ

### Flow đăng nhập
```
/login  → POST /api/auth/login  → lưu localStorage (auth_token, auth_user)
        → /  (HomePage)  → redirect theo role  → /admin | /sales | /procurement | /operations | /warehouse
```
- `AuthGuard` chỉ kiểm tra **có token hay không** (không kiểm tra hạn/role). Thiếu token → `/login?redirect=<trang đang vào>`.
- Đăng xuất: nút ở footer sidebar → xoá token → `/login`.

### Màn hình
| Màn hình | Route | Ai vào | Chức năng |
|---|---|---|---|
| Đăng nhập | `/login` | công khai | Email + mật khẩu; có chế độ local-dev khi thiếu Supabase env |
| Redirect chủ | `/` | đã đăng nhập | Chỉ là spinner điều hướng theo role |
| Hồ sơ cá nhân | `/profile` | mọi user | Sửa thông tin, đổi avatar, xem **lịch sử xuất hàng** của mình |
| Quản lý tài khoản | `/accounts` | **admin** | 9 tài khoản hệ thống, ma trận quyền, đổi/reset mật khẩu |
| Admin Dashboard | `/admin` | admin (trang chủ) | "Quản trị hòm": KPI + bảng nhập/xuất/tồn/giá trị từng mã hòm, lọc theo 8 chiều Dim Hòm |

### API tiện ích/bảo trì (dev)
`init-db`, `init-1office-tables`, `init-dim-dam`, `run-migration*`, `check-migration`, `reload-schema`, `fix-rls`, `fix-dim-dam`, `clean-dam`, `testdata`, `test-getfly`, và nhóm **debug-getfly1-5 / probe-* / dump-mbs26003** → đều là công cụ thăm dò/migration, **đa số không bảo vệ**, nên gỡ trước khi production.

---

## 5. NHÓM B — CHUỖI CUNG ỨNG: NHẬP HÀNG (Mua → Nhập kho)

### Flow Inbound (2 đường)
```
ĐƯỜNG A (chuẩn, có PO trước):
  Thu mua: /purchase-orders/create → POST /api/purchase-orders (PO = "confirmed")
     ↓ (PO detail có nút "Tạo phiếu nhập GRPO")
  Kho: /goods-receipt/create?po_id=… → đếm thực nhận → "Kiểm tra đơn hàng"
     ↓ POST /api/goods-receipt
  ⇒ Phiếu nhập = "completed" NGAY + CỘNG TỒN KHO + sinh QR + PO → "received"

ĐƯỜNG B (hàng về trước, nhập tạm):
  Kho: /goods-receipt/create?temporary=true → phiếu "pending_po" (CHƯA cộng tồn)
     ↓ thông báo + email Thu mua
  Thu mua: /receipt-management/[id] → chọn PO → "Liên kết & Duyệt"
       (hoặc "Xác nhận trực tiếp không cần PO")
  ⇒ CỘNG TỒN KHO + sinh QR + phiếu "completed"
```
> Huỷ phiếu nhập = **chỉ admin** (nếu đã completed sẽ trừ tồn ngược lại).

### Màn hình
| Màn hình | Route | Ai vào | Ghi chú |
|---|---|---|---|
| Trung tâm Kho Vận (hub) | `/warehouse-hub` | mọi role (warehouse bị đẩy về `/warehouse`) | Lưới thẻ chức năng |
| Dashboard Kho | `/warehouse` | warehouse (trang chủ) | KPI nhập/xuất/tồn, lịch sử, quick actions; scope theo kho |
| Khai báo thông tin kho | `/warehouse-settings` | tab theo role | Gộp 4 tab: SP / Hòm / NCC / Kho |
| Quản lý kho | `/warehouses-manage` | ghi=admin | CRUD `dim_kho` |
| Quản lý NCC | `/suppliers-manage` | admin, procurement | CRUD + **import Excel** NCC; ẩn với sales |
| Quản lý hòm/SP | `/products-manage` | ghi≠sales; chỉnh SL=**VIP** | CRUD `dim_hom`, upload ảnh, import Excel |
| Dashboard Thu mua | `/procurement` | thu mua (trang chủ) | PO + phiếu cần duyệt |
| Danh sách PO | `/purchase-orders` | đã đăng nhập | Bảng PO, huỷ PO |
| Tạo PO | `/purchase-orders/create` | **admin/procurement** | Chọn NCC, kho, item; server tự định giá theo `dim_hom` |
| Chi tiết PO | `/purchase-orders/[id]` | đã đăng nhập | QR PO, in, nút tạo GRPO |
| Danh sách phiếu nhập | `/goods-receipt` | đã đăng nhập (view **Kho**) | Trạng thái timeline |
| Tạo phiếu nhập | `/goods-receipt/create` | đã đăng nhập | Thường (theo PO) / Nhập tạm |
| Chi tiết phiếu nhập | `/goods-receipt/[id]` | đã đăng nhập; huỷ=admin | Duyệt nhập tạm |
| In phiếu nhập | `/goods-receipt/[id]/print` | — | A4: phiếu nhập + 1 phiếu SP/đơn vị |
| Quản lý nhập hàng | `/receipt-management` + `/[id]` | đã đăng nhập (view **Thu mua**) | Cùng dữ liệu `/goods-receipt` nhưng thêm duyệt/từ chối |
| Quản lý Xuất Nhập | `/inout-management` | tab theo role | Shell gộp nhiều màn (nhập/xuất/tồn/huỷ) |
| (Cũ) IO Management | `/io-management` | **không gating** | Bản cũ/admin, nên dọn |

> **Quan hệ quan trọng:** `purchase-orders` (bảng `fact_don_hang`) và `goods-receipt` (`fact_nhap_hang`) là 2 thực thể khác nhau. `/goods-receipt` và `/receipt-management` là **2 giao diện trên cùng dữ liệu phiếu nhập** — một bên góc nhìn Kho, một bên góc nhìn Thu mua.

---

## 6. NHÓM C — CHUỖI CUNG ỨNG: TỒN KHO · XUẤT KHO · KIỂM KHO · QR

### Flow Xuất kho (Outbound) — có 2 cách
```
CÁCH 1 (trang /goods-issue, dành cho Kho):
  Nhập Mã Đám / mã SP → /api/goods-issue/search → chọn lô kho
  → chọn "Xuất cho Đám" (cần Mã Đám) HOẶC "Xuất trả NCC/Bảo hành"
  → POST /api/goods-issue (RPC process_goods_issue) ⇒ TRỪ TỒN + ghi fact_xuat_hang + báo Vận hành
  (Mỗi Mã Đám chỉ xuất 1 lần)

CÁCH 2 (qua QR sản phẩm):
  Quét QR → /product/[qrCode] → ShipmentConfirmationForm (Mã Đám 6 số, SL=1)
  → POST /api/confirm-shipment ⇒ TRỪ TỒN → /transfer-complete (in phiếu IT)
```

### Flow Kiểm kho
```
/stocktake → "Tạo phiếu" (chọn kho) → POST /api/stocktake
   (tự chụp số lượng hệ thống vào phiếu)
→ Modal chi tiết: nhập SL thực tế từng mã
→ "Lưu tạm" | "Hoàn thành" | "Điều chỉnh tồn kho" (ghi chênh lệch về fact_inventory)
```

### Flow Giữ hàng (Hold) — chỉ Sales
`POST /api/hold-product` → giữ **24h** (`HOLD_DURATION_MS`); chỉ người giữ mới được nhả (`DELETE`); hết hạn tự xoá.

### Màn hình
| Màn hình | Route | Ai vào | Ghi chú |
|---|---|---|---|
| Kho hàng (tồn) | `/inventory` | mọi role (canViewInventory) | Lọc theo trạng thái/kho/loại; **ẩn NCC** |
| Chi tiết SP tồn | `/inventory/[...code]` | mọi role | Thông số + tồn theo kho + giá/biên LN + lịch sử nhập/xuất |
| Xuất hàng | `/goods-issue` | warehouse/canExport | Quét → xuất 1 đơn vị; lịch sử; huỷ lệnh |
| Kiểm kho (chính) | `/stocktake` | nav=warehouse | Tạo phiếu, đối chiếu, điều chỉnh tồn |
| Kiểm kho quét (cũ) | `/stocktake/[id]` | — | **Trang mồ côi/legacy** (dùng API `/stocktakes` số nhiều) |
| QR landing | `/scan/[type]/[id]` | công khai | po→nhập kho · product→/product · grpo/delivery |
| Phiếu chuyển hoàn thành | `/transfer-complete` | có link | In phiếu IT (từ query string) |
| Quản lý phiếu huỷ | `/voided-receipts` | đã đăng nhập (huỷ ẩn với warehouse) | Huỷ nhập/xuất, tự đảo tồn |

> **Lưu ý dữ liệu:** Tồn = bảng `fact_inventory` với tên cột tiếng Việt "lạ": `"Số lượng"`=tổng, `"Ghi chú"`=**SL khả dụng** (không phải ghi chú text), `"Tên hàng hóa"`=FK sản phẩm, `"Kho"`=FK kho. "Đám" = ca tang lễ (Mã Đám ~6 số). Có **trùng lặp** `/api/stocktake` (đang dùng) vs `/api/stocktakes` (legacy, nên dọn).

---

## 7. NHÓM D — BÁN HÀNG & CATALOG SẢN PHẨM

### Flow Catalog → Giữ hàng
```
/sales-hub → /sales/catalog (duyệt hòm, lọc gỗ/màu/tôn giáo/giá)
   → /sales/catalog/[ma_hom] (thông số + tồn theo kho + QR)
   → "Phiếu" → /product-sheet/[ma_hom] (in A4)
   → "Thêm vào đơn hàng" → /sales/orders  (⚠ chưa đọc tham số ma_hom)
Giữ hàng KHÔNG nằm ở catalog → đi qua /inventory hoặc /product/[qrCode] → POST /api/hold-product
```

### Màn hình
| Màn hình | Route | Ai vào | Ghi chú |
|---|---|---|---|
| Trung tâm Bán Hàng (hub) | `/sales-hub` | sales/admin | 4 thẻ: Catalog, Đơn hàng, Gói SP, Pháp lý |
| Dashboard Bán hàng | `/sales` | sales (trang chủ) | KPI, "Đám của tôi", giữ hàng, hướng dẫn 4 bước |
| Catalog hòm | `/sales/catalog` | sales/admin | Duyệt `dim_hom`, lọc/sắp xếp/in |
| Chi tiết catalog | `/sales/catalog/[ma_hom]` | sales/admin | Thông số đầy đủ + SP liên quan |
| Tạo đơn hàng | `/sales/orders` | sales/admin | ⚠ **Submit chỉ giả lập** (không ghi DB), fallback mock |
| Bán gói SP | `/sales/packages` | sales/admin | ⚠ 4 gói **hard-code**, submit **giả lập** |
| Văn bản pháp lý | `/sales/legal-documents` | sales/admin | 1 văn bản thật + upload Google Drive |
| Hợp đồng bán | `/sales/contracts` | admin (nav) | Đọc `getfly_contracts` (đồng bộ GetFly) |
| CRM GetFly | `/sales/crm` | admin (nav) | 7 tab: live GetFly + mirror local |
| Sản phẩm (sau quét QR) | `/product/[qrCode]` | login bắt buộc | Thẻ chi tiết + form xác nhận xuất kho |
| Toàn bộ QR sản phẩm | `/product/fullproductlist` | đã đăng nhập | In/Tải **PDF tất cả QR** |
| Phiếu thông tin SP | `/product-sheet/[id]` | — | In A4 kèm QR |

> **Định danh SP:** `ma_hom` là khoá xuyên suốt. QR mã hoá URL `…/product/<ma_hom>`. `fact_inventory` nối SP qua `"Tên hàng hóa" = dim_hom.id`.

> **⚠ GetFly v3 vs v6:** Tất cả tích hợp GetFly hiện vẫn gọi **`/api/v3/`**; riêng `api/getfly` và `sync-getfly` còn **hard-code key cũ** `UyNhqLj3…`. Theo memo migration v6, **v3 + key cũ đã chết** → các tab live CRM dễ hỏng nhất, cần chuyển sang `/api/v6/` + key mới.

---

## 8. NHÓM E — MEMBERSHIP / CSKH / KHTT

> **Phân biệt 2 chương trình khác nhau (hay nhầm):**
> - **Hội Viên Trăm Tuổi (Membership):** thẻ hội viên trả phí ~2.000.000đ (giá trị 2.160.000đ trên GetFly), hạn 10 năm. Bảng `members` + `getfly_contracts` (mã MBS, status "Đã duyệt").
> - **Khách Hàng Trăm Tuổi (KHTT):** hợp đồng nền trả trước (đơn hàng GetFly `order_type=2`, mã chứa "KHTT", status "Chờ duyệt"), kích hoạt khi khách qua đời. Bảng `getfly_khtt_orders`.

### Flow Đăng ký hội viên → chăm sóc
```
/membership/register → POST /api/membership/register
   ⇒ sinh mã MemYYMMDDNNN + tạo folder Google Drive + tạo bản ghi hoa hồng + gửi ZNS chào mừng
→ In phiếu đăng ký
→ /membership/[id]: thêm care log, mở/tạo folder Drive, upload giấy tờ
→ /membership/expiring: nhắc sắp hết hạn (cho cron/Zalo)
→ /membership/commission: duyệt → thanh toán hoa hồng
```

### Flow KHTT
```
/membership/tram-tuoi → "Đồng bộ GetFly" → POST /api/getfly-khtt/sync
   (đọc đơn hàng GetFly read-only, lọc KHTT "Chờ duyệt", lưu getfly_khtt_orders)
Tra cứu công khai: /embed/khtt (iframe) & /tra-cuu (tab KHTT) → GET /api/getfly-khtt?phone=
```

### Màn hình
| Màn hình | Route | Ai vào | Ghi chú |
|---|---|---|---|
| Hub CSKH | `/membership-hub` | admin | 11 thẻ chức năng |
| Tổng quan Membership | `/membership` | admin | KPI + bậc chiết khấu |
| Danh sách hội viên | `/membership/list` | admin | Tìm/lọc + import Excel |
| Chi tiết hội viên | `/membership/[id]` | admin | Sửa, care log, folder Drive, in HĐ |
| Đăng ký hội viên | `/membership/register` | admin | + 2 người thụ hưởng, in phiếu |
| Tra cứu nội bộ | `/membership/lookup` | admin | Tìm thông minh SĐT/CCCD/mã/tên |
| Hợp đồng (Drive) | `/membership/contracts` | admin | Folder Drive + thông tin hội viên |
| Đối soát hoa hồng | `/membership/commission` | admin | Duyệt/Thanh toán/Xuất Excel |
| KHTT | `/membership/tram-tuoi` | admin | 2 tab Khách hàng / Hợp đồng nền |
| Dashboard Membership | `/dashboards/membership` | **chỉ admin@blackstone.com.vn** | BI tài chính HĐ MBS |
| Lịch sử chăm sóc | `/care-history` | admin | ⚠ **dữ liệu giả (mock)** |
| Ticket hỗ trợ | `/customer-support` | admin | ⚠ **dữ liệu giả (mock)** |
| Widget KHTT (nhúng) | `/embed/khtt` | **công khai** | Tra cứu KHTT theo SĐT, dùng iframe |
| Tra cứu công khai | `/tra-cuu` | **công khai** | 2 tab: Hội viên (CCCD/SĐT) & KHTT (SĐT) |

> `/api/send-email` hiện chỉ **console.log** (chưa gửi email thật).

---

## 9. NHÓM F — VẬN HÀNH · LỊCH ĐÁM · 1OFFICE · ZALO · DASHBOARDS

### Flow Vận hành / Giao hàng
```
/operations (giám sát) → /operations/create (tạo lệnh giao DO-…)
  → /operations/[id]: pending → assigned → in_transit → delivered (hoặc cancelled)
  (Huỷ lệnh ⇒ trả tồn kho qua RPC adjust_product_quantity)
Tab Gantt gộp 3 luồng: Tang lễ + Giao hàng + Xuất kho
```

### Màn hình
| Màn hình | Route | Ai vào | Ghi chú |
|---|---|---|---|
| Dashboard Vận hành | `/operations` | operations (trang chủ) | KPI giao hàng + Gantt |
| Tạo lệnh giao | `/operations/create` | operations/admin | Form + item; tải kho qua Supabase REST |
| Chi tiết lệnh giao | `/operations/[id]` | operations/admin | Máy trạng thái giao hàng |
| Lịch Đám | `/funerals` | ≠ sales | Danh sách + chi tiết ~47 trường + Sync Sheets |
| Dashboard Đám (Gantt) | `/funerals/dashboard` | admin/sales/operations | Thống kê + Gantt tang lễ |
| Dashboards (hub) | `/dashboards` | tất cả (thẻ lọc theo role) | Cổng vào các dashboard |
| 1Office CRM | `/crm` | admin | 5 tab mirror 1Office + Full/Delta Sync |
| Zalo Automation | `/zalo-automation` | admin | ZNS chào mừng + sinh nhật + log |

### Cron job (Vercel — `vercel.json`, giờ UTC)
| Cron | Giờ VN | Việc |
|---|---|---|
| `/api/cron/sync-1office` `0 0 * * *` | 07:00 | Đồng bộ 1Office (SP, phiếu nhập, HĐ, báo giá, kiểm kho, đơn) |
| `/api/cron/sync-1office-crm` `0 2 * * *` | 09:00 | Đồng bộ CRM 1Office (KH, cơ hội, công việc) |
| `/api/cron/sync-dam` `0 20 * * *` | 03:00 | Google Sheets → `fact_dam`/`dim_dam` (tang lễ) |
| `/api/cron/birthday-zns` `0 1 * * *` | 08:00 | Gửi ZNS sinh nhật + nhắc sales |

---

## 10. ⚠ CÁC VẤN ĐỀ PHÁT HIỆN (cần lưu ý / xử lý)

### A. Bảo mật (ưu tiên cao)
1. **API đổi/reset mật khẩu không kiểm tra quyền server** (`/api/accounts/change-password`, `/api/accounts/reset-defaults`) — dùng service-role, ai gọi cũng được → có thể reset mật khẩu admin. *(Đã tạo task xử lý riêng.)*
2. **Không có middleware**, hầu hết API không xác thực token → gọi trực tiếp là đọc/ghi được dữ liệu.
3. **Hard-code bí mật trong source:** key GetFly v3 cũ; token 1Office (`client.ts`); cron secret dự phòng `'blackstone-cron-secret-2026'` lộ trong client Zalo.
4. Nhiều route DDL/migration/probe **mở công khai** (init-*, fix-*, clean-dam, run-migration…).

### B. Tích hợp dễ hỏng
5. **GetFly vẫn dùng v3 + key cũ** dù đã migration v6 → tab CRM live (Tổng quan/KH/Deals/Công việc) và `sync-getfly` rủi ro cao nhất.
6. `/api/send-email` chưa gửi email thật (chỉ log).

### C. Màn hình chưa hoàn thiện (mock / giả lập)
7. `/sales/orders` & `/sales/packages`: submit **giả lập**, không ghi DB.
8. `/care-history` & `/customer-support`: **dữ liệu mock** toàn bộ.
9. `/sales/catalog/[ma_hom]` → `/sales/orders?ma_hom=` nhưng trang orders **không đọc** tham số (deep-link vô tác dụng).

### D. Code trùng/cũ nên dọn
10. `/stocktake/[id]` + `/api/stocktakes` (số nhiều) là **legacy mồ côi**, trùng với `/api/stocktake`.
11. `/io-management` (bản cũ, không gating) trùng vai trò với `/inout-management`.
12. File rác `*-Thành's MacBook Air.tsx` trong `components/` và `zalo-automation/`.

### E. Lỗi nhỏ / nhầm lẫn
13. `/operations`: status pill ánh xạ `pending` → nhãn **"Đã hoàn thành"** (nghi là bug hiển thị).
14. Comment trong cron file ("mỗi 3 giờ/10 phút") **mâu thuẫn** lịch thực tế (đều 1 lần/ngày).
15. Trang catalog vẫn **select `gia_von`** (giá vốn) đưa vào props client dù không hiển thị — sales về lý thuyết không được thấy giá vốn.

---

## 11. PHỤ LỤC — THỐNG KÊ NHANH

- **~70 màn hình (page.tsx)** trong `src/app`.
- **~130 API route** (gồm ~25 route debug/probe nên gỡ).
- **5 hub điều hướng:** `/dashboards`, `/warehouse-hub`, `/sales-hub`, `/membership-hub`, `/inout-management`.
- **3 trang công khai (không cần login):** `/login`, `/tra-cuu`, `/embed/khtt` (+ `/scan/*` resolve QR).
- **4 cron** + **5 tích hợp ngoài** (GetFly, 1Office, Google Drive, Google Sheets, Zalo).
- **Bảng dữ liệu chính:** `dim_hom`, `dim_kho`, `dim_ncc`, `dim_account`, `dim_dam`/`fact_dam`, `fact_don_hang(_items)`, `fact_nhap_hang(_items)`, `fact_xuat_hang(_items)`, `fact_inventory`, `fact_kiem_kho(_items)`, `members`, `beneficiaries`, `care_logs`, `commission_records`, `getfly_*`, `oneoffice_crm_*`, `delivery_orders(_items)`, `notifications`, `zns_log`.
