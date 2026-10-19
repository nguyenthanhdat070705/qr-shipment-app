# Đồng bộ hòm 2AQ từ 1Office

## Luồng tự động

- Cron 1Office lọc mã bắt đầu bằng `2AQ`, bỏ trùng theo mã hòm và upsert danh mục vào `dim_hom`. Các trường giá, ảnh, nhà cung cấp và chi tiết do web app quản lý không bị đồng bộ đè.
- Tồn kho 2AQ được lưu vào `inventory_1office` để đối chiếu. Với kho khớp rõ tên, web app tự tạo bản ghi `dim_kho` khi cần và đồng bộ số lượng vào `fact_inventory`.
- Tồn ở Hàm Long, Kha Vạn Cân và Kinh Dương Vương được bỏ qua vì số hiện tại trên web app đã được xác nhận đúng.
- Kho phụ như ký gửi, đặt cọc, hư hỏng được giữ trong ảnh chụp 1Office nhưng không tạo thành chi nhánh hoặc tồn bán được.
- `Tô Ký` đang là tên kho chưa được xác nhận có phải Hóc Môn hay không. Khi xác nhận, thêm alias vào cấu hình:

```env
ONEOFFICE_WAREHOUSE_NAME_MAP_JSON={"Tô Ký":"Hóc Môn"}
```

Nếu chưa cấu hình alias, số tồn Tô Ký vẫn ở bảng staging và cron ghi chú để đối soát, không tự gán vào Hóc Môn.

## Cập nhật cơ sở dữ liệu

Trước khi bật cron với nhánh mới, chạy `sql/migration_1office_coffin_sync.sql` trong Supabase SQL Editor. Migration thêm khóa `source_key` để ảnh chụp tồn theo mã hòm + kho được upsert chống trùng.

## Tài khoản kho mới

Đồng bộ kho không tự tạo tài khoản đăng nhập hoặc mật khẩu dùng chung. Sau khi có email nhân viên, tạo/invite tài khoản qua Supabase Auth và tạo hồ sơ `dim_account` có tên hiển thị `Kho <Tên kho>` (ví dụ `Kho Hóc Môn`). Email bắt đầu bằng `kho.` được nhận quyền kho và chỉ được thao tác tại tên kho đã gán trong hồ sơ. Cách này tránh sinh thông tin đăng nhập không thuộc về một nhân viên cụ thể.

## An toàn đồng bộ

- Chỉ sản phẩm có mã `2AQ` được ghi vào danh mục hòm và dữ liệu tồn của web app.
- Mã hòm được upsert theo `dim_hom.ma_hom`; ảnh chụp 1Office được upsert theo `inventory_1office.source_key`.
- Nếu web app đã có nhiều dòng tồn cho cùng một hòm/kho, sync bỏ qua cặp đó và báo lỗi thay vì tự gộp hoặc xóa dữ liệu.
- Cron từ chối chạy nếu thiếu `CRON_SECRET`; gửi khóa bằng header `Authorization: Bearer ...`, không truyền trong URL.
