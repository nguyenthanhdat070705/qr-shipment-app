# QR Shipment Tracker

A mobile-first **Next.js 14** web application for managing product QR code scanning and shipment confirmation, backed by **Supabase** PostgreSQL.

## Tech Stack

| Layer    | Technology                                  |
|----------|---------------------------------------------|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Icons    | Lucide React                                |
| Backend  | Next.js API Routes (server-side only)       |
| Database | Supabase (PostgreSQL + RLS)                 |

---

## Project Structure

```
qr-shipment-app/
├── schema.sql                          # Full Supabase SQL schema — run this first
├── .env.local.example                  # Environment variable template
├── src/
│   ├── types/
│   │   └── index.ts                    # TypeScript types: Product, ShipmentConfirmation, etc.
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client (anon key)
│   │   │   └── server.ts               # Server Supabase client (service_role key) ⚠️ secret
│   │   └── utils/
│   │       └── email.ts                # Email validation helper
│   ├── components/
│   │   ├── StatusBadge.tsx             # Color-coded status badge
│   │   ├── ProductDetailCard.tsx       # Full product info display card
│   │   ├── ProductNotFound.tsx         # Friendly 404 card
│   │   ├── ShipmentConfirmationForm.tsx       # Client form (email + note + submit)
│   │   └── ShipmentConfirmationFormWrapper.tsx # Client state wrapper
│   └── app/
│       ├── layout.tsx                  # Root layout (Inter font, mobile viewport)
│       ├── globals.css                 # Tailwind + base styles
│       ├── page.tsx                    # Home page with demo links
│       ├── product/
│       │   └── [qrCode]/
│       │       └── page.tsx            # Dynamic product page (RSC)
│       └── api/
│           └── confirm-shipment/
│               └── route.ts            # POST handler — all business logic lives here
```

---

## 1. Environment Variable Setup

> **Step 1:** Copy the template

```bash
cp .env.local.example .env.local
```

> **Step 2:** Fill in your Supabase values (from [app.supabase.com](https://app.supabase.com) → your project → Settings → API)

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...          # anon / public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...              # service_role key ← KEEP SECRET
```

---

## 2. Database Setup (Supabase)

1. Open [app.supabase.com](https://app.supabase.com) → navigate to your project.
2. Click **SQL Editor** → **New query**.
3. Paste the entire contents of `schema.sql` and click **Run**.

This will create:
- `products` table with CHECK constraint on `status`
- `shipment_confirmations` table
- `product_logs` table
- All indexes (qr_code, product_code, status, FKs)
- `set_products_updated_at` trigger
- RLS policies (anon: read-only on products; writes via service_role)

---

## 3. Seed Sample Data

The schema already includes 3 demo products. After running `schema.sql`, you can test with:

| QR Code     | Product Name              | Status   |
|-------------|---------------------------|----------|
| `QR-PC-001` | Industrial Widget Alpha   | in_stock |
| `QR-PC-002` | Precision Sensor Module   | in_stock |
| `QR-PC-003` | Compact Power Supply Unit | in_stock |

Visit directly: `http://localhost:3000/product/QR-PC-001`

To add your own product manually in Supabase SQL Editor:

```sql
INSERT INTO products (product_code, qr_code, name, sku, batch_no, serial_no, description, manufacture_date, expiry_date)
VALUES (
  'PC-MYCODE',
  'QR-MYCODE',
  'My Test Product',
  'SKU-MYTEST',
  'BATCH-2025-99',
  'SN-99999',
  'A test product for development.',
  '2025-01-01',
  '2027-01-01'
);
```

---

## 4. Local Development

```bash
# Install dependencies (if not already done)
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

**Mobile testing tip:** Use ngrok or similar to expose your dev server:
```bash
npx ngrok http 3000
```
Then scan the QR code or open the ngrok URL on your phone.

---

## 5. QR Code URL Format

Each product's QR code should encode a URL in this format:
```
https://yourdomain.com/product/<qr_code_value>
```

For example:
```
https://yourdomain.com/product/QR-PC-001
```

The `qr_code` column value must exactly match what's in the URL.

---

## 6. Deployment (Vercel — Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the project directory
cd qr-shipment-app
vercel --prod
```

Set the same environment variables in Vercel dashboard:
- **Settings → Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ← mark as **Secret**

---

## 7. API Reference

### `POST /api/confirm-shipment`

**Request body:**
```json
{
  "qrCode": "QR-PC-001",
  "email": "staff@company.com",
  "note": "Shipped via DHL, tracking: 1234567890"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Shipment confirmed successfully.",
  "confirmation": {
    "customer_email": "staff@company.com",
    "confirmed_at": "2025-03-18T09:22:10.000Z",
    "note": "Shipped via DHL, tracking: 1234567890"
  },
  "product": {
    "id": "...",
    "name": "Industrial Widget Alpha",
    "status": "exported"
  }
}
```

**Error responses:**

| HTTP | `code`              | Reason                      |
|------|---------------------|-----------------------------|
| 400  | `VALIDATION_ERROR`  | Missing/invalid inputs      |
| 404  | `PRODUCT_NOT_FOUND` | No product with that QR code|
| 409  | `ALREADY_EXPORTED`  | Product already exported    |
| 500  | `DATABASE_ERROR`    | Supabase error              |

---

## 8. Future Improvements

| Feature                            | Notes                                                     |
|------------------------------------|-----------------------------------------------------------|
| **Admin dashboard**                | `/admin` route — search products, view shipment history   |
| **QR code generation**             | Use `qrcode` npm package to render QR from `qr_code` field |
| **Scan history logging**           | Insert a `product_logs` record on every page view         |
| **Email OTP verification**         | Verify the confirmer's email via Supabase Auth Magic Link |
| **Role-based access control**      | Supabase Auth + RLS policies per `user_role`              |
| **i18n / localization**            | Add `next-intl` for multi-language support                |
| **Offline / PWA support**          | Service worker + cache for scanning in low-connectivity   |

---

## 9. Getfly CRM Integration (READ-ONLY)

> ⚠️ **QUAN TRỌNG**: API Getfly chỉ được sử dụng để **RÚT TRÍCH DỮ LIỆU**.  
> **TUYỆT ĐỐI KHÔNG** sync/push/update dữ liệu ngược lên Getfly trừ khi được yêu cầu rõ ràng.

### Thông Tin Đăng Nhập

| Thông tin | Giá trị |
|-----------|---------|
| **CRM URL** | https://blackstonesdvtl.getflycrm.com/#/ |
| **User** | `haphuong@blackstones.vn` |
| **Password** | `Phuong@123456` |
| **API Key** | `UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1` |
| **API Base URL** | `https://blackstonesdvtl.getflycrm.com/api/v3` |
| **Auth Header** | `X-API-KEY: UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1` |

### Endpoints Khả Dụng

| Endpoint | Records | Mô tả |
|----------|---------|--------|
| `GET /accounts?page=N` | 6,712 KH | Khách hàng (50/page, 135 pages) |
| `GET /products?page=N` | 27 SP | Sản phẩm (20/page, 2 pages) |
| `GET /tasks?page=N` | Nhiều | Công việc (30/page) |
| `GET /users` | 29 NV | Nhân viên (trả hết) |
| `GET /campaigns` | 1+ | Chiến dịch |

📖 Xem chi tiết đầy đủ tại: [`GETFLY_API_GUIDE.md`](./GETFLY_API_GUIDE.md)

---

## 10. Zalo ZNS Automation

Dự án có tích hợp hệ thống chăm sóc hội viên tự động qua **Zalo ZNS** (Zalo Notification Service).

### Thông Tin Đăng Nhập
---

## 2. Database Setup (Supabase)

1. Open [app.supabase.com](https://app.supabase.com) → navigate to your project.
2. Click **SQL Editor** → **New query**.
3. Paste the entire contents of `schema.sql` and click **Run**.

This will create:
- `products` table with CHECK constraint on `status`
- `shipment_confirmations` table
- `product_logs` table
- All indexes (qr_code, product_code, status, FKs)
- `set_products_updated_at` trigger
- RLS policies (anon: read-only on products; writes via service_role)

---

## 3. Seed Sample Data

The schema already includes 3 demo products. After running `schema.sql`, you can test with:

| QR Code     | Product Name              | Status   |
|-------------|---------------------------|----------|
| `QR-PC-001` | Industrial Widget Alpha   | in_stock |
| `QR-PC-002` | Precision Sensor Module   | in_stock |
| `QR-PC-003` | Compact Power Supply Unit | in_stock |

Visit directly: `http://localhost:3000/product/QR-PC-001`

To add your own product manually in Supabase SQL Editor:

```sql
INSERT INTO products (product_code, qr_code, name, sku, batch_no, serial_no, description, manufacture_date, expiry_date)
VALUES (
  'PC-MYCODE',
  'QR-MYCODE',
  'My Test Product',
  'SKU-MYTEST',
  'BATCH-2025-99',
  'SN-99999',
  'A test product for development.',
  '2025-01-01',
  '2027-01-01'
);
```

---

## 4. Local Development

```bash
# Install dependencies (if not already done)
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

**Mobile testing tip:** Use ngrok or similar to expose your dev server:
```bash
npx ngrok http 3000
```
Then scan the QR code or open the ngrok URL on your phone.

---

## 5. QR Code URL Format

Each product's QR code should encode a URL in this format:
```
https://yourdomain.com/product/<qr_code_value>
```

For example:
```
https://yourdomain.com/product/QR-PC-001
```

The `qr_code` column value must exactly match what's in the URL.

---

## 6. Deployment (Vercel — Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the project directory
cd qr-shipment-app
vercel --prod
```

Set the same environment variables in Vercel dashboard:
- **Settings → Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ← mark as **Secret**

---

## 7. API Reference

### `POST /api/confirm-shipment`

**Request body:**
```json
{
  "qrCode": "QR-PC-001",
  "email": "staff@company.com",
  "note": "Shipped via DHL, tracking: 1234567890"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Shipment confirmed successfully.",
  "confirmation": {
    "customer_email": "staff@company.com",
    "confirmed_at": "2025-03-18T09:22:10.000Z",
    "note": "Shipped via DHL, tracking: 1234567890"
  },
  "product": {
    "id": "...",
    "name": "Industrial Widget Alpha",
    "status": "exported"
  }
}
```

**Error responses:**

| HTTP | `code`              | Reason                      |
|------|---------------------|-----------------------------|
| 400  | `VALIDATION_ERROR`  | Missing/invalid inputs      |
| 404  | `PRODUCT_NOT_FOUND` | No product with that QR code|
| 409  | `ALREADY_EXPORTED`  | Product already exported    |
| 500  | `DATABASE_ERROR`    | Supabase error              |

---

## 8. Future Improvements

| Feature                            | Notes                                                     |
|------------------------------------|-----------------------------------------------------------|
| **Admin dashboard**                | `/admin` route — search products, view shipment history   |
| **QR code generation**             | Use `qrcode` npm package to render QR from `qr_code` field |
| **Scan history logging**           | Insert a `product_logs` record on every page view         |
| **Email OTP verification**         | Verify the confirmer's email via Supabase Auth Magic Link |
| **Role-based access control**      | Supabase Auth + RLS policies per `user_role`              |
| **i18n / localization**            | Add `next-intl` for multi-language support                |
| **Offline / PWA support**          | Service worker + cache for scanning in low-connectivity   |

---

## 9. Getfly CRM Integration (READ-ONLY)

> ⚠️ **QUAN TRỌNG**: API Getfly chỉ được sử dụng để **RÚT TRÍCH DỮ LIỆU**.  
> **TUYỆT ĐỐI KHÔNG** sync/push/update dữ liệu ngược lên Getfly trừ khi được yêu cầu rõ ràng.

### Thông Tin Đăng Nhập

| Thông tin | Giá trị |
|-----------|---------|
| **CRM URL** | https://blackstonesdvtl.getflycrm.com/#/ |
| **User** | `haphuong@blackstones.vn` |
| **Password** | `Phuong@123456` |
| **API Key** | `UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1` |
| **API Base URL** | `https://blackstonesdvtl.getflycrm.com/api/v3` |
| **Auth Header** | `X-API-KEY: UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1` |

### Endpoints Khả Dụng

| Endpoint | Records | Mô tả |
|----------|---------|--------|
| `GET /accounts?page=N` | 6,712 KH | Khách hàng (50/page, 135 pages) |
| `GET /products?page=N` | 27 SP | Sản phẩm (20/page, 2 pages) |
| `GET /tasks?page=N` | Nhiều | Công việc (30/page) |
| `GET /users` | 29 NV | Nhân viên (trả hết) |
| `GET /campaigns` | 1+ | Chiến dịch |

📖 Xem chi tiết đầy đủ tại: [`GETFLY_API_GUIDE.md`](./GETFLY_API_GUIDE.md)

---

## 10. Zalo ZNS Automation

Dự án có tích hợp hệ thống chăm sóc hội viên tự động qua **Zalo ZNS** (Zalo Notification Service).

### Thông Tin Đăng Nhập
| Thông tin | Giá trị |
|-----------|---------|
| **Zalo OA Manager** | https://oa.zalo.me |
| **Zalo Developers** | https://developers.zalo.me/app |
| **App Name** | Blackstones Automation |
| **App ID** | `2722021009595077001` |
| **App Secret** | `EOPm59yC4bKs8vUYcCt1` |
| **Access Token** | *Đã lưu trong .env.local (hết hạn trong 1h, tự làm mới qua API)* |
| **Refresh Token** | *Đã lưu trong .env.local (hết hạn sau 3 tháng)* |

> ⚠️ **Lưu ý Quan trọng:**
> - Tuyệt đối không để lộ file `.env.local` hoặc commit lên git. Access Token và Refresh Token đã được cấu hình cẩn thận, có giá trị sinh ra tiền phí ZNS.
> - Tham khảo thêm mã trong `src/lib/zalo/zns.ts` để hiểu luồng refresh token tự động.
