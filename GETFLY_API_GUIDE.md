# Getfly CRM API - Hướng Dẫn & Tài Liệu Khai Thác Dữ Liệu

> ⚠️ **CHÚ Ý QUAN TRỌNG**: API này chỉ dùng để **RÚT TRÍCH DỮ LIỆU** (READ-ONLY).  
> **TUYỆT ĐỐI KHÔNG** sync/push/update dữ liệu ngược lên Getfly trừ khi được yêu cầu rõ ràng.

---

## 🔐 Thông Tin Đăng Nhập & API

| Thông tin | Giá trị |
|-----------|---------|
| **CRM URL** | https://blackstonesdvtl.getflycrm.com/#/ |
| **User** | `haphuong@blackstones.vn` |
| **Password** | `Phuong@123456` |
| **API Key** | `UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1` |
| **API Version** | `v3` (duy nhất hoạt động) |
| **Base URL** | `https://blackstonesdvtl.getflycrm.com/api/v3` |

---

## 🔑 Cách Xác Thực (Authentication)

Sử dụng header `X-API-KEY` trong mỗi request:

```
Headers:
  X-API-KEY: UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1
  Content-Type: application/json
  Accept: application/json
```

**Ví dụ PowerShell:**
```powershell
$headers = @{
    "X-API-KEY"    = "UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1"
    "Content-Type" = "application/json"
    "Accept"       = "application/json"
}
$base = "https://blackstonesdvtl.getflycrm.com/api/v3"
$result = Invoke-RestMethod -Uri "$base/accounts?page=1" -Headers $headers -Method GET
```

**Ví dụ cURL:**
```bash
curl -X GET "https://blackstonesdvtl.getflycrm.com/api/v3/accounts?page=1" \
  -H "X-API-KEY: UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

---

## 📊 Tổng Quan Dữ Liệu Có Thể Khai Thác

| # | Endpoint | Method | Trạng thái | Số lượng records | Pagination |
|---|----------|--------|------------|-----------------|------------|
| 1 | `/accounts` | GET | ✅ OK | **6,712** khách hàng | 135 pages × 50 records |
| 2 | `/products` | GET | ✅ OK | **27** sản phẩm | 2 pages × 20 records |
| 3 | `/tasks` | GET | ✅ OK | **Nhiều** (30/page, nhiều pages) | ✅ Có |
| 4 | `/users` | GET | ✅ OK | **29** nhân viên | Không (trả hết) |
| 5 | `/campaigns` | GET | ✅ OK | 1 campaign | Trả single object |
| 6 | `/account` | GET | ✅ OK | Single account detail | N/A |

### Endpoints KHÔNG hoạt động:
| Endpoint | Status Code | Ghi chú |
|----------|-------------|---------|
| `/opportunities` | 404 | Không hỗ trợ |
| `/orders` | 400 | Yêu cầu params đặc biệt |
| `/funds` | 404 | Không hỗ trợ |
| `/tickets` | 405 | Method Not Allowed |
| `/contacts` | 404 | Dùng contacts trong accounts |
| `/invoices`, `/notes`, `/deals` | 404 | Không hỗ trợ |

---

## 📋 Chi Tiết Cấu Trúc Dữ Liệu

### 1. Accounts (Khách Hàng) — `/accounts`
**Endpoint:** `GET /api/v3/accounts?page={page_number}`  
**Tổng:** 6,712 records | 135 pages | 50 records/page

```json
{
    "records": [...],
    "pagination": {
        "page": 1,
        "total_record": "6712",
        "total_page": 135
    }
}
```

**Các trường dữ liệu (fields):**

| Field | Mô tả | Ví dụ |
|-------|--------|-------|
| `account_id` | ID khách hàng | `"1"` |
| `account_code` | Mã khách hàng | `"18042023"` |
| `account_name` | Tên khách hàng | `"Chị Lan"` |
| `address` | Địa chỉ | `"Chung cư 206..."` |
| `phone` | Số điện thoại | `"0907236466"` |
| `email` | Email | |
| `manager_email` | Email nhân viên phụ trách | `"hung.lm@blackstones.vn"` |
| `manager_user_name` | Username NV phụ trách | `"hung.lm@blackstones.vn"` |
| `birthday` | Ngày sinh | |
| `created_at` | Ngày tạo | `"2023-07-12 10:33:21"` |
| `account_type_id` | ID loại KH | `"5"` |
| `account_type` | Loại KH | `"An Táng"` |
| `account_source_id` | ID nguồn KH | `"1"` |
| `account_source` | Nguồn KH | `"MKT-Facebook"` |
| `relation_id` | ID trạng thái quan hệ | `"4"` |
| `relation_name` | Trạng thái quan hệ | `"TL. Tiềm năng"` |
| `gender` | Giới tính | `"0"` |
| `revenue` | Doanh thu | `"38500000"` |
| `province_name` | Tỉnh/Thành | `"HỒ CHÍ MINH"` |
| `industry_name` | Ngành nghề/Nghĩa trang | `"Bệnh Viện NTP"` |
| **Custom Fields** | | |
| `dia_chi_lien_he` | Địa chỉ liên hệ | |
| `ho_ten_nguoi_mat` | Họ tên người mất | `"LÊ NGỌC TÂN"` |
| `so_cccd` | Số CCCD | |
| `so_tk_ngan_hang` | Số tài khoản ngân hàng | |
| `ten_ngan_hang` | Tên ngân hàng | |
| `ngay_mat` | Ngày mất | `"26/02/2023"` |
| `thoi_gian_to_chuc_dam` | Thời gian tổ chức đám | `"24/04/2021"` |
| `dia_chi_chon_cat` | Địa chỉ chôn cất | |
| `ma_hoi_vien` | Mã hội viên | |
| `goi_dich_vu` | Gói dịch vụ | |
| `trang_thai_hoi_vien` | Trạng thái hội viên | |
| `ngay_tham_gia` | Ngày tham gia | |
| `kkenh_tiep_can` | Kênh tiếp cận | |
| **Nested: contacts** | | |
| `contacts[].contact_id` | ID liên hệ | |
| `contacts[].first_name` | Tên | |
| `contacts[].phone_mobile` | SĐT di động | |
| `contacts[].phone_home` | SĐT nhà | |
| `contacts[].email` | Email liên hệ | |

---

### 2. Products (Sản Phẩm) — `/products`
**Endpoint:** `GET /api/v3/products?page={page_number}`  
**Tổng:** 27 records | 2 pages | 20 records/page

```json
{
    "records": [...],
    "pagination": {
        "page": "1",
        "limit": 20,
        "total_page": 2,
        "total_records": 27
    }
}
```

**Các trường dữ liệu:**

| Field | Mô tả |
|-------|--------|
| `product_id` | ID sản phẩm |
| `category_id` | ID danh mục |
| `product_code` | Mã sản phẩm |
| `product_name` | Tên sản phẩm |
| `unit_id` | ID đơn vị tính |
| `cover_price` | Giá bìa |
| `saleoff_price` | Giá khuyến mãi |
| `price_wholesale` | Giá sỉ |
| `price_online` | Giá online |
| `product_vat` | VAT |
| `weight` | Trọng lượng |
| `short_description` | Mô tả ngắn |
| `description` | Mô tả chi tiết |
| `created_at` | Ngày tạo |
| `updated_at` | Ngày cập nhật |
| `images` | Hình ảnh sản phẩm (nested) |
| `thumbnail_file` | URL ảnh thumbnail |

---

### 3. Tasks (Công Việc) — `/tasks`
**Endpoint:** `GET /api/v3/tasks?page={page_number}`  
**Tổng:** Nhiều records | 30 records/page

**Các trường dữ liệu:**

| Field | Mô tả | Ví dụ |
|-------|--------|-------|
| `task_id` | ID công việc | `607` |
| `task_code` | Mã công việc | `"CVI/2025-04/000592"` |
| `task_name` | Tên công việc | `"CHƯƠNG TRÌNH THĂM VIẾNG..."` |
| `task_receiver` | ID người nhận | `15` |
| `receiver_name` | Tên người nhận | `"LÊ MINH HÙNG"` |
| `task_creator` | ID người tạo | `33` |
| `creator_name` | Tên người tạo | `"NGUYỄN CHÂU MỸ HẠNH"` |
| `task_start_date` | Ngày bắt đầu | `"2025-04-19 09:00:00"` |
| `task_end_date` | Ngày kết thúc | `"2025-04-19 23:59:00"` |
| `task_progress` | Tiến độ (%) | `0` |
| `task_description` | Mô tả (HTML) | |
| `task_emoji` | Cảm xúc | `"lbl_emoji_no_feelings"` |
| `project_id` | ID dự án | `1` |
| `project_name` | Tên dự án | `"Công việc"` |
| `task_status` | Trạng thái (1=active) | `1` |
| `task_remain_day` | Số ngày còn lại | `-356` |
| `task_type` | Loại công việc | `1` |
| `task_type_name` | Tên loại | `"Công viêc"` |
| `star` | Đánh dấu sao | `0` |

---

### 4. Users (Nhân Viên) — `/users`
**Endpoint:** `GET /api/v3/users`  
**Tổng:** 29 nhân viên (trả hết trong 1 request)

**Các trường dữ liệu:**

| Field | Mô tả | Ví dụ |
|-------|--------|-------|
| `id` | ID nhân viên | `"1"` |
| `name` | Họ tên | `"TÔN QUANG VĨ"` |
| `dept_id` | ID phòng ban | `"2"` |
| `dept_name` | Tên phòng ban | `"Ban giám đốc"` |
| `email` | Email công ty | `"vu.tq@blackstones.vn"` |
| `mobile` | SĐT di động | `"0979755790"` |

**Danh sách phòng ban:**
- Ban giám đốc
- Vận hành
- Kế toán
- Kinh Doanh
- Team 1, Team 2
- ASM 1, ASM 2, ASM 3, ASM 4
- Marketing
- CSKH
- Phát triển thị trường
- Tư Vấn Lưu Giữ Tro Cốt

---

### 5. Campaigns (Chiến Dịch) — `/campaigns`
**Endpoint:** `GET /api/v3/campaigns`

**Các trường dữ liệu:**

| Field | Mô tả |
|-------|--------|
| `campaign_id` | ID chiến dịch |
| `campaign_name` | Tên chiến dịch |
| `token_api` | Token API riêng |
| `description` | Mô tả |
| `start_date` | Ngày bắt đầu |
| `end_date` | Ngày kết thúc |

---

## 🔄 Hướng Dẫn Phân Trang (Pagination)

Đa số endpoint sử dụng query parameter `?page=N`:

```powershell
# Lấy tất cả accounts (tất cả 135 pages)
$allAccounts = @()
for ($p = 1; $p -le 135; $p++) {
    $result = Invoke-RestMethod -Uri "$base/accounts?page=$p" -Headers $headers -Method GET
    $allAccounts += $result.records
    Write-Host "Page $p/$($result.pagination.total_page) - Got $($result.records.Count) records"
}
Write-Host "Total: $($allAccounts.Count) accounts"
```

---

## 📌 Lưu Ý Quan Trọng

1. **CHỈ ĐỌC (READ-ONLY)**: Không bao giờ sử dụng POST/PUT/DELETE để thay đổi dữ liệu trên Getfly
2. **Encoding**: Dữ liệu tiếng Việt có thể bị lỗi encoding khi hiển thị trong console. Lưu ra JSON file sẽ giữ đúng ký tự
3. **Rate Limiting**: Không biết chính xác giới hạn, nên thêm delay giữa các request khi crawl nhiều pages
4. **API Version**: Chỉ `v3` hoạt động. Các version `v4`, `v5`, `v6`, `v6.1` đều trả 404
5. **Custom Fields**: Account có nhiều custom fields đặc thù cho BlackStones (hồ sơ tang lễ, hội viên...)

---

## 🗓️ Lịch Sử Cập Nhật

| Ngày | Thay đổi |
|------|----------|
| 2026-04-13 | Khởi tạo tài liệu - khám phá API, xác định endpoints hoạt động |
