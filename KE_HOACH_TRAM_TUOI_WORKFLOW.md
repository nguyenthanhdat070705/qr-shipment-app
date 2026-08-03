# Workflow Chương Trình Trăm Tuổi — Blackstones Lifecare

> Tài liệu mô tả cách chương trình **Trăm Tuổi** đang vận hành trong hệ thống: hai cấp độ
> (Hội Viên → Khách Hàng), quy tắc nghiệp vụ, vòng đời chuyển tiếp, luồng dữ liệu và tra cứu.
> Cập nhật: 08/07/2026.

---

## 1. Tổng quan

Chương trình **Trăm Tuổi** là dịch vụ **trả trước** đồng hành cùng người cao tuổi ("hành trình
tôn vinh & tưởng nhớ"). Khách tham gia theo **2 cấp độ nối tiếp nhau**:

| Cấp độ | Ý nghĩa | Bản chất dữ liệu |
|---|---|---|
| **① Hội Viên Trăm Tuổi (HVTT)** | Bước gia nhập ban đầu | **Hợp đồng** mã `MBS`, giá trị 2.160.000đ |
| **② Khách Hàng Trăm Tuổi (KHTT)** | Nâng cấp lên gói dịch vụ nền đầy đủ | **Đơn bán** ("hợp đồng nền") mã chứa `KHTT` |

Nôm na: **Hội Viên** là "vé vào cửa" (đăng ký, đóng phí gia nhập). Khi khách mua **gói dịch vụ
nền** đầy đủ thì được nâng lên **Khách Hàng Trăm Tuổi**, và hợp đồng nền này sẽ được **kích hoạt
khi cần dùng đến**.

---

## 2. Hai cấp độ & quy tắc nhận biết (business rules)

### ① Hội Viên Trăm Tuổi (HVTT)
Một hợp đồng được xem là **hội viên hợp lệ** khi thoả **CẢ 3** điều kiện:
- **Mã hợp đồng** bắt đầu bằng `MBS` (vd: `MBS26030`).
- **Trạng thái** đúng bằng `"Đã duyệt"`.
- **Giá trị** đúng bằng **2.160.000đ** (đây là "chữ ký tài chính" nhận diện gói hội viên).

> Nguồn: `src/lib/membership.ts` (`isMembershipContract` = `hasMbsCode` + `isApprovedStatus` + `hasMembershipValue`).

### ② Khách Hàng Trăm Tuổi (KHTT) / Hợp đồng nền
Một đơn bán được xem là **hợp đồng nền đang hoạt động** khi:
- **Mã đơn** có chứa `KHTT` (không phân biệt hoa thường).
- **Trạng thái = `1` ("Chờ duyệt")** → khách **còn sống**, hợp đồng nền đang "chờ dùng".
- Khi **trạng thái = `2` ("Đã duyệt")** → hợp đồng nền **đã được sử dụng** → **ẩn** khỏi tra cứu.

> Nguồn: `src/lib/khtt.ts` (`isActiveKhttOrder`), `src/app/api/getfly-khtt/route.ts` (lọc `status = '1'`).

### Bảng so sánh nhanh
| Khía cạnh | Hội Viên Trăm Tuổi | Khách Hàng Trăm Tuổi |
|---|---|---|
| Bản chất | Hợp đồng (contract) | Đơn bán / hợp đồng nền (order) |
| Mã nhận diện | `MBS…` | `…KHTT…` |
| Trạng thái "sống" | `Đã duyệt` | `Chờ duyệt` (mã 1) |
| Giá trị đặc trưng | 2.160.000đ | Giá trị gói dịch vụ đầy đủ |
| Bảng dữ liệu | `crm_hop_dong_ban` / Google Sheet | `crm_don_ban` (join `crm_khach_hang`) |
| Khi kết thúc | Nâng cấp → `Đã hoàn thành`, giá trị = 0 | Khách mất → `Đã duyệt` (mã 2), ẩn đi |

---

## 3. Vòng đời & chuyển tiếp (lifecycle) — phần quan trọng nhất

```
①  ĐĂNG KÝ HỘI VIÊN                     ②  HỘI VIÊN HOẠT ĐỘNG
   Hợp đồng MBS                            Tra cứu công khai bằng
   2.160.000đ · "Đã duyệt"      ──▶        SĐT + mật khẩu CCCD
        │
        │  (khách nâng cấp gói dịch vụ nền)
        │  → Hợp đồng MBS chuyển "Đã hoàn thành", giá trị về 0
        ▼
③  NÂNG CẤP → KHÁCH HÀNG TRĂM TUỔI      ④  TRONG THỜI GIAN SỬ DỤNG
   Tạo đơn hợp đồng nền (mã KHTT)          Đơn KHTT trạng thái
   trạng thái "Chờ duyệt" (1)   ──▶        "Chờ duyệt" (1) — tra cứu được
                                                │
                                                │  (khách qua đời → dùng dịch vụ)
                                                ▼
                                           ⑤  KÍCH HOẠT / HOÀN TẤT
                                              Đơn KHTT "Đã duyệt" (2)
                                              → ẨN khỏi tra cứu công khai
```

**Diễn giải từng giai đoạn:**

1. **Đăng ký Hội Viên** — Khách ký hợp đồng `MBS`, đóng 2.160.000đ, hợp đồng ở trạng thái
   `Đã duyệt`. Đây là bản ghi "hội viên" hiển thị công khai.
2. **Hội viên hoạt động** — Người thân/khách có thể tra cứu thông tin hội viên trên web
   (nhập SĐT → xác thực bằng CCCD → xem thẻ).
3. **Nâng cấp thành Khách Hàng Trăm Tuổi** — Khi khách mua **gói dịch vụ nền** đầy đủ, hệ thống
   tạo **đơn KHTT** (hợp đồng nền). Đồng thời **hợp đồng MBS cũ chuyển sang `Đã hoàn thành` và
   giá trị về 0** → nên hợp đồng MBS đó **không còn nằm trong danh sách hội viên hợp lệ** nữa
   (vì đã hết điều kiện "Đã duyệt" + 2.160.000đ).
4. **Trong thời gian sử dụng** — Chừng nào khách còn sống, đơn KHTT giữ trạng thái `Chờ duyệt`
   (mã 1) và vẫn **tra cứu công khai được** (tab "Khách Hàng Trăm Tuổi").
5. **Kích hoạt / Hoàn tất** — Khi khách qua đời, hợp đồng nền được sử dụng, đơn KHTT chuyển
   `Đã duyệt` (mã 2) và **tự động ẩn** khỏi kết quả tra cứu.

*(Ngoài ra: một hợp đồng HVTT có thể bị `Đã huỷ` hoặc `Hết hạn` — hệ thống hiển thị badge tương ứng.)*

---

## 4. Các quy trình vận hành (operational flows)

| Quy trình | Cách hoạt động | Vị trí |
|---|---|---|
| **Đồng bộ dữ liệu** | GetFly/1Office → Google Sheet ("Hợp Đồng Bán", "Đơn Bán") → Supabase (`crm_*`). Đồng bộ định kỳ qua cron. | `src/lib/crmSheetSync.ts`, `/api/cron/sync-crm` |
| **Tra cứu công khai HVTT** | 2 bước: nhập **SĐT** → nhập **mật khẩu = CCCD** → xem thẻ. Đọc **trực tiếp Google Sheet Hợp Đồng Bán**. | `/embed/hoi-vien`, `/tra-cuu` (tab Hội Viên), `/api/membership/lookup-sheet` |
| **Tra cứu công khai KHTT** | Nhập **SĐT** → xem hợp đồng nền (mã KHTT, gói, giá trị…). Đọc `crm_don_ban` + join `crm_khach_hang`. | `/tra-cuu` (tab Khách Hàng), `/embed/khtt`, `/api/getfly-khtt` |
| **Tra cứu nội bộ (admin)** | Tìm tự do theo SĐT/CCCD/mã HV/tên/email trên bảng `members`; kết quả **được che (mask)** SĐT/CCCD/email. | `/membership/lookup`, `/api/membership/lookup?q=` |
| **Dashboard & báo cáo** | Thống kê tổng hợp đồng, giá trị, tỷ lệ thu, công nợ, hoa hồng, trạng thái, thời hạn còn lại, tỷ lệ hồ sơ đầy đủ; xuất **Excel 7 sheet**. Chỉ **admin@blackstone.com.vn** xem được. | `/dashboards/membership`, `/api/membership/dashboard` |
| **Chăm sóc khách hàng** | Ghi nhật ký tương tác (gọi / ZNS / SMS / gặp mặt) kèm nhân viên phụ trách, nội dung, ngày. | `/api/membership/care-log`, `/care-history` |
| **Hoa hồng người giới thiệu** | Theo dõi đơn giới thiệu: `Chờ duyệt → Đã duyệt → Đã thanh toán`; hoa hồng = giá trị × tỷ lệ %. | `/membership/commission`, `/api/membership/commission` |
| **Cảnh báo sắp hết hạn** | Liệt kê hội viên hết hạn trong N ngày tới (mặc định 30/90), theo giờ VN (UTC+7), sắp xếp theo số ngày còn lại. | `/api/membership/expiring` |

---

## 5. Workflow tra cứu công khai (chi tiết 2 bước)

1. **Bước 1 — Nhập SĐT**: hệ thống chuẩn hoá số (bỏ `84`, bỏ số 0 đầu) rồi dò trong Sheet.
   - Nếu không có → báo "Không tìm thấy".
   - Nếu có → **KHÔNG hiển thị thông tin ngay**, chỉ báo "Đã tìm thấy hội viên, nhập CCCD để xác thực".
2. **Bước 2 — Nhập mật khẩu = CCCD**: hệ thống chuẩn hoá CCCD (bỏ mọi số 0 đầu) và so khớp.
   - Sai → "CCCD không đúng".
   - Đúng → hiện **thẻ hội viên** (Mã HV, Tên, Ngày ký, Ngày hết hạn, Địa chỉ, Người thụ hưởng 1&2,
     Số tiền đã đóng, Sale phụ trách, badge trạng thái).

> Dung sai "rớt số 0": Sheet lưu SĐT/CCCD dạng số nên hay mất số 0 đầu → khách nhập **có hoặc
> không có** số 0 đầu đều tra được (vd `903605835` ⇄ `0903605835`).

**Khác biệt tra cứu nội bộ (admin):** tìm tự do theo nhiều trường trên bảng `members`, **không cần
mật khẩu CCCD**, nhưng kết quả **bị che** một phần (SĐT/CCCD/email) để bảo mật.

---

## 6. Luồng dữ liệu

```
GetFly / 1Office (nguồn gốc)
        │  (Apps Script, định kỳ)
        ▼
Google Sheet  ──►  "Hợp Đồng Bán" (HVTT)   +   "Đơn Bán" (KHTT)
        │  (cron sync-crm)                  │  (đọc trực tiếp cho HVTT công khai)
        ▼                                    ▼
Supabase:  crm_hop_dong_ban · crm_don_ban · crm_khach_hang · members(legacy)
        │
        ├─► Tra cứu HVTT công khai  ← đọc THẲNG Google Sheet Hợp Đồng Bán
        ├─► Tra cứu KHTT công khai  ← crm_don_ban + crm_khach_hang
        ├─► Tra cứu nội bộ admin    ← members (mask)
        └─► Dashboard / báo cáo     ← crm_hop_dong_ban + đính kèm Drive
```

---

## 7. Điểm cần lưu ý (nghiệp vụ & dữ liệu)

- **Nhận diện hội viên dựa vào (mã + trạng thái + giá trị)** vì GetFly không có trường "loại khách
  hàng". Nếu ai đó chỉnh giá trị hợp đồng khác 2.160.000đ hoặc đổi trạng thái, hợp đồng sẽ **rơi
  khỏi** danh sách hội viên hợp lệ.
- **Trùng mã MBS**: nếu một mã MBS xuất hiện 2 dòng (do đổi ID GetFly), hệ thống giữ **bản đồng bộ
  mới nhất**.
- **Đã nâng cấp lên KHTT thì không còn là "hội viên hợp lệ"** theo định nghĩa chuẩn (vì trạng thái
  thành `Đã hoàn thành`). Nhưng bản tra cứu công khai HVTT (đọc Sheet) vẫn hiển thị hợp đồng MBS đó
  kèm **badge trạng thái thật** (Chờ duyệt / Đã hoàn thành / Hết hạn…).
- **KHTT ẩn khi khách mất**: đúng thiết kế — chỉ hiển thị hợp đồng nền còn "Chờ duyệt".
- **Bảo mật nguồn**: tra cứu HVTT đang đọc Google Sheet — nên đặt Sheet ở chế độ **Restricted** và
  đọc qua service account để không lộ dữ liệu (code đã sẵn sàng).
- **Timezone**: cảnh báo hết hạn tính theo giờ VN (UTC+7); nên đồng nhất mốc ngày để tránh lệch quanh nửa đêm.

---

*Các quy tắc trên trích trực tiếp từ mã nguồn: `src/lib/membership.ts`, `src/lib/khtt.ts`,
`src/lib/hopDongBanSheet.ts`, `src/app/api/membership/*`, `src/app/api/getfly-khtt/route.ts`.*
