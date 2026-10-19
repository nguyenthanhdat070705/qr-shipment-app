# Đồng bộ hòm 2AQ từ 1Office

## Luồng tự động

- Cron 1Office lọc mã bắt đầu bằng `2AQ`, bỏ trùng theo mã hòm và thêm mã còn thiếu vào `dim_hom`. Tên, màu sắc và trạng thái được lấy từ nguồn khi tạo mã mới; các mã đã tồn tại giữ nguyên dữ liệu do web app quản lý.
- Nguồn tồn kho là `infoInventory` trong Product API của tenant `blackstones.1office.vn`. Ảnh chụp tồn 2AQ được lưu vào `inventory_1office` để đối chiếu trước khi áp dụng vào `fact_inventory`.
- Với các kho chính đã ánh xạ, số lượng hiện tại được thay bằng số lượng từ ảnh chụp 1Office. Cặp mã hòm/kho không còn số tồn trong ảnh chụp được đặt về 0. Kho không có đối ứng trong nguồn giữ nguyên dữ liệu hiện tại.
- Web app tạo bản ghi `dim_kho` cho kho chính mới. Kho phụ như ký gửi, đặt cọc, hàng lỗi và hư hỏng được giữ trong ảnh chụp nhưng không tạo thành chi nhánh hoặc tồn bán được.
- `Tô Ký` mặc định ánh xạ tới `Kho Hóc Môn` khi kho Hóc Môn đang hoạt động và địa chỉ có cả Tô Ký lẫn Hóc Môn. Nếu điều kiện không đủ, sync ghi chú để đối soát. Có thể cấu hình ánh xạ đã được xác nhận bằng `ONEOFFICE_WAREHOUSE_NAME_MAP_JSON`.

## Cập nhật cơ sở dữ liệu

Trước khi bật cron với nhánh mới, chạy `sql/migration_1office_coffin_sync.sql` trong Supabase SQL Editor. Migration thêm khóa `source_key` để ảnh chụp tồn theo mã hòm + kho được upsert chống trùng.

## Tài khoản kho mới

Tạo bản ghi kho không đồng thời tạo tài khoản đăng nhập. Tài khoản kho cần được tạo qua Supabase Auth và có hồ sơ `dim_account` với tên hiển thị `Kho <Tên kho>` (ví dụ `Kho Nguyễn Văn Linh`). Cần xác nhận quyền và kho được hiển thị sau khi đăng nhập trước khi bàn giao tài khoản.

## Điều chỉnh kho ngày 19/10/2026

- `kho1`: `KHO-01` đổi tên Hàm Long thành `Kho Nguyễn Văn Linh (Kho 1)`. Giữ nguyên UUID, toàn bộ dòng tồn và liên kết phiếu cũ; không tạo phiếu điều chuyển.
- Theo lựa chọn của chủ hệ thống, `kho4` tiếp tục dùng kho riêng `1O-39`, tên `Kho Nguyễn Văn Linh (Kho 4)`. Hai kho không cộng gộp hay sao chép dữ liệu qua lại.
- `kho5`: tài khoản của `KHO-05`, `Kho Hóc Môn` (Tô Ký). Mật khẩu chỉ được truyền vào công cụ quản trị khi cấp tài khoản, không lưu trong repository.
- Nguồn `Nguyễn Văn Linh` của 1Office ánh xạ vào Kho 4. Tồn Kho 1 được giữ theo dữ liệu chủ kho đã xác nhận; sync chỉ lưu ảnh chụp đối soát cho nguồn Hàm Long nếu xuất hiện, không ghi đè tồn Kho 1.
- SQL đổi tên chỉ cập nhật `dim_kho` và tên hồ sơ `dim_account`; có kiểm tra toàn bộ tồn và lịch sử trước/sau trong cùng giao dịch. Công cụ cấp tài khoản không thay mật khẩu các tài khoản đã tồn tại.

## Cấu hình production

- Nhánh triển khai: `main`; URL production: https://blackstone-order-scm.vercel.app.
- Vercel đang yêu cầu commit được GitHub xác minh. Chỉ xác nhận phát hành sau khi deployment của commit mới đạt `Ready`.
- Biến môi trường cần có: `ONEOFFICE_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY`. Không đưa giá trị bí mật vào Git.
- `ONEOFFICE_API_BASE_URL` là cấu hình tùy chọn; mặc định là `https://blackstones.1office.vn`.
- Lịch trong `vercel.json`: `/api/cron/sync-1office` chạy lúc `0 0 * * *` UTC, tương ứng 07:00 giờ Việt Nam mỗi ngày. Đây là đồng bộ theo lịch, không phải webhook tức thời.
- Deployment thành công chưa đủ để xác nhận đồng bộ tự động: cần xem kết quả cron và các bảng đối soát sau khi chạy.

## An toàn đồng bộ

- Chỉ sản phẩm có mã `2AQ` được ghi vào danh mục hòm và dữ liệu tồn của web app.
- Mã hòm được upsert theo `dim_hom.ma_hom`; ảnh chụp 1Office được upsert theo `inventory_1office.source_key`.
- Nếu web app đã có nhiều dòng tồn cho cùng một hòm/kho, sync bỏ qua cặp đó và ghi chú để đối soát.
- Nếu bước lưu ảnh chụp đối soát thất bại, sync bỏ qua bước cập nhật tồn web app.
- Cron từ chối chạy nếu thiếu `CRON_SECRET`; gửi khóa bằng header `Authorization: Bearer ...`, không truyền trong URL.
