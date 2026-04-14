# 🔐 BlackStones — Thông Tin Xác Thực & Truy Cập Hệ Thống

> ⚠️ **TÀI LIỆU NỘI BỘ - TUYỆT MẬT**  
> Không chia sẻ file này ra bên ngoài. Chỉ dành cho admin hệ thống.  
> Cập nhật lần cuối: 2026-04-10

---

## 1. 📊 Getfly CRM

| Thông tin | Giá trị |
|-----------|---------|
| **URL** | https://blackstonesdvtl.getflycrm.com |
| **User** | haphuong@blackstones.vn |
| **Password** | Phuong@123456 |
| **API Key** | UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1 |
| **API Version** | v3 (active) |
| **Base API URL** | https://blackstonesdvtl.getflycrm.com/api/v3/ |
| **Auth Header** | `X-API-KEY: UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1` |

### Các Endpoint Chính (API v3)

| Endpoint | Phương thức | Mô tả |
|----------|-------------|-------|
| `/api/v3/users` | GET | Danh sách nhân viên (29 users) |
| `/api/v3/accounts` | GET | Danh sách khách hàng (6,652 records) |
| `/api/v3/products` | GET | Danh mục sản phẩm/dịch vụ (27 items) |
| `/api/v3/tasks` | GET | Danh sách công việc / nhắc nhở |
| `/api/v3/orders?order_type=2` | GET | Đơn hàng / deals |
| `/api/v3/campaigns` | GET | Danh sách chiến dịch |

---

## 2. 🗄️ Supabase (Database) — Mac Scan

| Thông tin | Giá trị |
|-----------|---------|
| **Project** | Mac Scan |
| **URL** | https://zspazvdyrrkdosqigomk.supabase.co |
| **Anon Public Key** | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjIwOTcsImV4cCI6MjA4OTM5ODA5N30.fwJGPh46Hqd8ekKMJ-6nb9uyd1raerKmc1n4qXHEIrM |
| **Service Role Key** | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY |
| **Dashboard** | https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk |

### Membership Tables
| Bảng | Mô tả |
|------|-------|
| `members` | Danh sách hội viên |
| `beneficiaries` | Người thụ hưởng |
| `posthumous_plans` | Kế hoạch hậu sự |
| `benefit_claims` | Phiếu quyền lợi |
| `care_logs` | Lịch sử CSKH |
| `membership_quotas` | Quota hàng năm |

---

## 3. 🚀 Vercel (Hosting)

| Thông tin | Giá trị |
|-----------|---------|
| **Project** | blackstone-membership |
| **Dashboard** | https://vercel.com/dashboard |

---

## 4. 🔄 n8n (Automation)

| Thông tin | Giá trị |
|-----------|---------|
| **Loại** | Self-hosted via Cloudflare Tunnel |
| **Chi tiết** | Xem conversation: efc9881f |

---

## 📝 Ghi Chú Tích Hợp Getfly → Hệ Thống Membership

Với API Key này, có thể tự động hóa:
- Đồng bộ khách hàng Getfly → Supabase (hội viên mới)
- Tạo tasks chăm sóc khách hàng từ n8n
- Đồng bộ đơn hàng / gói dịch vụ đã mua
- Lấy danh sách nhân viên phụ trách để phân công

