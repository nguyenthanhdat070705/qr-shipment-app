# KẾ HOẠCH NÂNG CẤP BẢO MẬT — TRA CỨU TRĂM TUỔI
### (Hội Viên Trăm Tuổi + Khách Hàng Trăm Tuổi) — trọng tâm: thêm CAPTCHA

> Tài liệu để **đọc và quyết định trước khi làm**. Chưa sửa 1 dòng code nào.
> Ngày lập: 2026-07-18. Nhánh hiện tại: `refactor/tach-biet-khtt-normalize`.

---

## 0. TÓM TẮT NHANH (đọc phần này là đủ để quyết)

**CAPTCHA có làm được không?** → **CÓ**, dễ, khuyến nghị dùng **Cloudflare Turnstile** (miễn phí không giới hạn, chạy ẩn/không phiền người dùng, nhúng iframe tốt, hợp người dùng VN vì không dính "chọn ảnh đèn giao thông" của Google).

**Nhưng — điều quan trọng nhất bạn cần biết trước khi quyết:**
CAPTCHA chỉ chặn **bot / dò tự động**. Nó **KHÔNG** tự vá được lỗ hổng lớn nhất mà tôi phát hiện:

> 🔴 API tra cứu **Khách Hàng Trăm Tuổi** (`/api/getfly-khtt`) trả **toàn bộ thông tin khách** (tên, SĐT, gói, số tiền đã đóng, còn lại, người thụ hưởng) **chỉ cần 1 số điện thoại — không cần mật khẩu**. Tệ hơn: gọi API **không kèm tham số** thì nó trả **CẢ DANH SÁCH** khách hàng (tối đa 200–500 bản ghi). Đây là kênh rò rỉ dữ liệu nghiêm trọng, một người bình thường mở trình duyệt cũng lấy được.

→ Vì vậy đề xuất của tôi là: **CAPTCHA + 3 việc đi kèm** (xem Phần 5). Nếu chỉ gắn CAPTCHA mà không vá lỗ hổng trên thì vẫn hở.

**Ước lượng công sức:** CAPTCHA thuần: ~0.5–1 ngày. Cả gói vá 4 điểm: ~2–3 ngày. Chi phí phần mềm: **0 đồng** (Turnstile free).

---

## 1. HIỆN TRẠNG — HỆ THỐNG TRA CỨU ĐANG HOẠT ĐỘNG THẾ NÀO

Có **2 luồng tra cứu riêng biệt**, nguồn dữ liệu khác nhau:

| | **Hội Viên Trăm Tuổi** | **Khách Hàng Trăm Tuổi (KHTT)** |
|---|---|---|
| Nguồn dữ liệu | Google Sheet "Hợp Đồng Bán" (đọc CSV trực tiếp) | Supabase `crm_don_ban` + `crm_khach_hang` (mirror từ GetFly) |
| Lọc bản ghi | Mã HĐ bắt đầu `MBS` | Mã đơn chứa `KHTT` + trạng thái "Chờ duyệt" |
| Cách xác thực | **2 bước**: SĐT → mật khẩu = **CCCD** | **1 bước**: chỉ SĐT (❗ không mật khẩu) |
| API | `GET /api/membership/lookup-sheet` | `GET /api/getfly-khtt` |

### Các cửa vào (nơi người dùng bấm tra cứu)

| Trang | File | Gọi API | Ghi chú |
|---|---|---|---|
| `/tra-cuu` | `src/app/tra-cuu/page.tsx` | cả 2 API | Trang công khai, có tab chuyển Hội viên / Khách hàng |
| `/embed/hoi-vien` | `src/app/embed/hoi-vien/page.tsx` | `lookup-sheet` | Widget nhúng iframe vào web ngoài (2 bước) |
| `/embed/khtt` | `src/app/embed/khtt/page.tsx` | `getfly-khtt` | Widget nhúng iframe (1 bước, chỉ SĐT) |
| `/membership/tram-tuoi` | `src/app/membership/tram-tuoi/page.tsx` | `getfly-khtt` (không tham số) | Trang quản lý nội bộ — nhưng API nó gọi lại công khai |

### "Thử search toàn bộ" — chính xác một lần tra cứu trả về những gì

Tôi đã đối chiếu từng trường trong code (đây là bề mặt dữ liệu bị lộ):

**Hội viên** (sau khi nhập đúng SĐT **+ CCCD**):
`Mã hội viên`, `Tên hội viên`, `Ngày ký kết`, `Ngày hết hạn`, `Địa chỉ`, `Người thụ hưởng 1`, `Người thụ hưởng 2`, `Số tiền đã đóng`, `Sale phụ trách`.

**Khách hàng KHTT** (chỉ cần nhập **SĐT**, không mật khẩu):
`Mã khách hàng`, `Họ tên`, `Số điện thoại`, `Gói dịch vụ`, `Tổng giá trị gói`, `Số tiền đặt cọc`, `Số tiền còn lại`, `Ngày đặt hàng`, `Ngày hết hạn`, `Người thụ hưởng` (tên + SĐT), `Người phụ trách`.

> Lưu ý: hai khoá nội bộ `_phone_key` / `_cccd_key` (bên hội viên) **không** bị trả ra client — điểm này code làm đúng.

---

## 2. ĐÁNH GIÁ BẢO MẬT HIỆN TẠI (xếp theo mức độ nghiêm trọng)

| # | Mức | Vấn đề | Vị trí |
|---|---|---|---|
| 1 | 🔴 Cao | **KHTT: 1 SĐT ra full thông tin, không mật khẩu.** Ai biết/đoán SĐT là lấy được tên, tiền, người thụ hưởng. | `getfly-khtt/route.ts:122` |
| 2 | 🔴 Cao | **Gọi `/api/getfly-khtt` không tham số → trả cả danh sách** (200–500 bản ghi). Rò rỉ hàng loạt. | `getfly-khtt/route.ts:88,120` |
| 3 | 🟠 Vừa | **Rate limit để trong RAM, theo IP** → trên Vercel (serverless, nhiều instance, cold start) **gần như vô hiệu**; IP lại dễ giả mạo. | cả 3 route |
| 4 | 🟠 Vừa | **CORS mở `*`** trên mọi endpoint → website bất kỳ gọi được. Widget `postMessage` cũng để đích `'*'`. | cả 3 route |
| 5 | 🟠 Vừa | **Không có CAPTCHA / honeypot / chống bot** ở đâu cả. | toàn bộ |
| 6 | 🟡 Thấp | **Hội viên: bước 1 lộ "SĐT này có phải hội viên không" + số hợp đồng** (dò được danh sách SĐT). CCCD ở VN cũng bán-công khai nên "mật khẩu CCCD" không thật sự bí mật. | `lookup-sheet/route.ts:88-94` |
| 7 | 🟡 Thấp | **`POST /api/crm/sync` không kiểm tra secret** — ai cũng kích được đồng bộ lại 14 sheet (dự án đã có sẵn `CRON_SECRET` nhưng route này không dùng). | `api/crm/sync` |
| 8 | 🟡 Thấp | Không có `middleware.ts` → **không có chốt chặn chung** cho toàn site. | (repo) |

**Kết luận đánh giá:** luồng **Hội viên** đã tạm ổn (có lớp mật khẩu CCCD). Luồng **Khách hàng** là chỗ yếu nhất và cần vá trước cả khi bàn tới CAPTCHA.

---

## 3. CAPTCHA — CÓ LÀM ĐƯỢC KHÔNG & CHỌN LOẠI NÀO

**Kết luận: Làm được, không phá vỡ kiến trúc hiện tại.** Cơ chế chung: người dùng giải/đi qua CAPTCHA ở trình duyệt → nhận 1 `token` → gửi kèm request tra cứu → **server tự gọi API của nhà cung cấp để xác minh token** trước khi trả dữ liệu. Không có token hợp lệ = từ chối.

### So sánh 3 lựa chọn phổ biến

| Tiêu chí | **Cloudflare Turnstile** ⭐ | Google reCAPTCHA v3 | hCaptcha |
|---|---|---|---|
| Chi phí | Miễn phí, **không giới hạn** | Miễn phí ≤ 1 triệu lượt/tháng | Miễn phí (bản cơ bản) |
| Trải nghiệm | **Ẩn / không phiền** (đa số không phải click) | Ẩn, chấm điểm 0–1 | Thường phải click chọn ảnh |
| Nhúng iframe | Tốt | Tốt | Tốt |
| Quyền riêng tư | Cao (không bám quảng cáo) | Thấp hơn (hệ sinh thái Google) | Cao |
| Phụ thuộc Google | Không | **Có** | Không |
| Độ khó tích hợp | Thấp | Thấp | Thấp–vừa |
| Nhược điểm | Ít người biết thương hiệu | v3 chỉ cho điểm, mình phải tự đặt ngưỡng + xử lý fallback | Có ma sát UX (phải click) |

### 👉 Khuyến nghị: **Cloudflare Turnstile**
Lý do: miễn phí thật sự không giới hạn, chạy **vô hình** (không làm phiền khách lớn tuổi — đúng tệp "Trăm Tuổi"), hợp widget nhúng, và không kéo theo phụ thuộc Google. reCAPTCHA v3 là lựa chọn thay thế tốt nếu bạn đã quen hệ Google.

---

## 4. CAPTCHA GẮN VÀO ĐÂU & CHẠY RA SAO

```
[Người dùng] nhập SĐT (và CCCD với hội viên)
     │  Turnstile chạy ngầm → sinh token
     ▼
[Trình duyệt] GET /api/...?phone=...&cf_token=XXXX
     │
     ▼
[Server route] ──(1)──► Cloudflare siteverify (kiểm token)
     │  token hỏng/thiếu → 403 "Vui lòng thử lại"
     │  token OK
     ──(2)──► mới chạy tra cứu như hiện tại → trả dữ liệu
```

**Chỗ phải sửa (tối thiểu):**
- Frontend: thêm widget Turnstile vào 3 trang — `tra-cuu/page.tsx`, `embed/khtt/page.tsx`, `embed/hoi-vien/page.tsx` — và đính token vào request.
- Backend: thêm 1 helper `verifyCaptcha(token)` dùng chung, chèn vào đầu 2 route `getfly-khtt` và `lookup-sheet` (trước khi đọc dữ liệu).
- ENV mới cần đặt trên Vercel: `TURNSTILE_SECRET_KEY` (server) và `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client). Lấy free tại dashboard Cloudflare.

> ⚠️ **Ràng buộc "tách biệt Trăm Tuổi":** theo ghi nhớ dự án, **luồng Hội viên đang "đóng băng"** — không được đổi hành vi. Trang `tra-cuu/page.tsx` **dùng chung cho cả 2 tab**. Nên khi gắn CAPTCHA phải làm **cộng thêm, không đổi logic sẵn có**, và test kỹ tab Hội viên không bị ảnh hưởng. Đây là điểm rủi ro cần lưu ý khi thi công.

---

## 5. KẾ HOẠCH TRIỂN KHAI ĐỀ XUẤT (theo giai đoạn)

Sắp theo thứ tự "vá chỗ hở to trước, đẹp sau". Bạn có thể chọn làm cả gói hoặc từng phần.

| GĐ | Việc | Vì sao | Công sức |
|---|---|---|---|
| **0** | **Gắn CAPTCHA (Turnstile)** vào 2 API tra cứu + 3 trang | Chặn bot dò/quét hàng loạt | ~0.5–1 ngày |
| **1** | **Vá `/api/getfly-khtt`**: bắt buộc có `phone`; **chặn gọi không tham số** và `?q=` từ ngoài (chỉ cho trang quản lý nội bộ đã đăng nhập dùng) | Bịt kênh dump cả danh sách (lỗ hổng 🔴 #1,#2) | ~0.5 ngày |
| **2** | **Rate limit bền vững** (Upstash Redis) theo IP **+ SĐT**, thay bản in-memory | Rate limit hiện tại vô hiệu trên Vercel | ~0.5 ngày |
| **3** | **Siết CORS** về đúng (các) domain nhúng widget; cân nhắc thêm lớp xác thực thứ 2 cho KHTT (vd mã đơn / ngày sinh) giống hội viên | Giảm bề mặt tấn công | ~0.5–1 ngày |
| (kèm) | Thêm kiểm tra secret cho `POST /api/crm/sync` | Chặn kích đồng bộ trái phép (#7) | ~15 phút |

**Phương án tối giản** (nếu bạn chỉ muốn nhanh): làm **GĐ 0 + GĐ 1**. Đây là 2 việc mang lại 80% giá trị bảo mật.

**Phương án đầy đủ:** GĐ 0 → 3, tổng ~2–3 ngày, chi phí phần mềm 0đ (Turnstile + Upstash đều có bậc miễn phí).

---

## 6. RỦI RO & LƯU Ý KHI THI CÔNG

- **Không được đổi hành vi luồng Hội viên** (đóng băng). CAPTCHA phải là lớp cộng thêm; test lại tab Hội viên trên `/tra-cuu` sau khi sửa.
- **Trang `/tra-cuu` dùng chung** — sửa cẩn thận để không vỡ 1 trong 2 tab.
- CAPTCHA làm tăng 1 nhịp mạng khi tra cứu → cần giữ chế độ "vô hình" để khách lớn tuổi không bối rối.
- Widget nhúng iframe: Turnstile chạy được trong iframe nhưng cần khai báo domain nhúng ở Cloudflare — cần bạn cung cấp **danh sách domain đang nhúng** widget.
- GĐ 1 (chặn `?q=`/không-tham-số) có thể ảnh hưởng trang quản lý `/membership/tram-tuoi` → phải chuyển trang này sang cách gọi có xác thực nội bộ. Cần xác nhận trang nội bộ hiện có đăng nhập chưa.

---

## 7. NHỮNG ĐIỀU CẦN BẠN QUYẾT

1. **Chọn loại CAPTCHA:** Turnstile (khuyến nghị) / reCAPTCHA v3 / hCaptcha?
2. **Phạm vi:** chỉ CAPTCHA (GĐ 0), hay tối giản (GĐ 0+1), hay đầy đủ (GĐ 0→3)?
3. **Luồng KHTT:** có muốn thêm **lớp xác thực thứ 2** cho Khách hàng (như CCCD của Hội viên) không, hay giữ 1 bước + chỉ dựa vào CAPTCHA?
4. Cung cấp **danh sách domain** đang nhúng 2 widget `/embed/*` (để khai báo CORS + Turnstile).
5. Có muốn tôi làm luôn **bản demo tra cứu trực tiếp** (chạy dev server) để bạn thấy tận mắt dữ liệu đang lộ ra sao không?

---
*Chưa có thay đổi code nào được thực hiện. Sau khi bạn chốt, tôi sẽ tách nhánh riêng và làm theo đúng phạm vi bạn chọn.*
