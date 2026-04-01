# BlackStone Order SCM - Git Workflow (Fork Flow)

Tài liệu này hướng dẫn cách làm việc với 2 luồng phát triển song song của hệ thống: **Version 1 (Luồng đang chạy)** và **Version 2 (Luồng phát triển, thử nghiệm tính năng mới)**.

## 1. Cấu trúc Branch (Nhánh)

*   `main`: Tương ứng với **Version 1 (Production)**. Nhánh này là 코드 (code) đang chạy ổn định của hệ thống hiện tại. Mọi bản release cho V1 đều lấy từ đây.
*   `v2-testing`: Tương ứng với **Version 2 (Development)**. Nhánh này được tách ra từ `main`. Mọi tính năng mới, thay đổi CSDL lớn (thêm/bớt cột), thiết kế lại UI/UX đều phải thực hiện trên nhánh này.

---

## 2. Quy trình làm việc hàng ngày

### Phát triển tính năng mới cho Version 2
Toàn bộ công việc thêm tính năng, thay đổi luồng phải được làm ở `v2-testing`.
1.  Đảm bảo bạn đang ở nhánh `v2-testing`:
    ```bash
    git checkout v2-testing
    ```
2.  Viết code, thay đổi file. Cấu hình file `.env.local` trỏ tới Database thử nghiệm của V2.
3.  Lưu (commit) thay đổi và đẩy (push) lên:
    ```bash
    git add .
    git commit -m "Tính năng mới cho V2: abc xyz"
    git push origin v2-testing
    ```

### Sửa lỗi khẩn cấp (Hotfix) cho Version 1
Nếu hệ thống hiện tại có lỗi, bắt buộc phải sửa ở nhánh `main`, KHÔNG sửa trên `v2-testing`.
1.  Chuyển sang nhánh `main`:
    ```bash
    git checkout main
    ```
2.  Làm việc với file để sửa lỗi và commit:
    ```bash
    git add .
    git commit -m "FIX LỖI: Cập nhật luồng hàng hóa"
    git push origin main
    ```
3.  **(QUAN TRỌNG):** Sau khi sửa lỗi ở V1 xong, bạn phải cập nhật bản vá lỗi này sang V2 ngay lập tức để khi ra mắt V2, lỗi này không bị lặp lại.
    ```bash
    git checkout v2-testing
    git merge main
    git push origin v2-testing
    ```

---

## 3. Đồng bộ hóa Version 1 sang Version 2 (Cập nhật định kỳ)

Định kỳ (hàng tuần, hoặc bất cứ khi nào `main` có thay đổi lớn), bạn cần đồng bộ mã nguồn để `v2-testing` luôn ở trạng thái mới nhất.
Mô phỏng lại mũi tên "kéo từ nhánh trên xuống nhánh dưới" dựa vào tư duy Git:

```bash
# B1: Đảm bảo bạn đang ở V2
git checkout v2-testing

# B2: Cập nhật danh sách thay đổi từ trên mạng
git fetch origin

# B3: Hợp nhất (Merge) TỪ nhánh main VÀO v2-testing
git merge main

# (Nếu có dòng code nào chỏi nhau / conflict, bạn cần giải quyết bằng tay trên editor và commit lại)

# B4: Đẩy phiên bản V2 mới lên
git push origin v2-testing
```

---

## 4. Phát hành Version 2 (Go-Live)

Giai đoạn cuối cùng khi Version 2 đã phát triển trọn vẹn mọi yêu cầu và được testing hoàn thiện. Lúc này nhánh `main` sẽ bị ghi đè bởi những thay đổi đột phá của V2.

```bash
# B1: Đảm bảo v2-testing đang là bản mới nhất
git checkout v2-testing
git pull origin v2-testing

# B2: Chuyển lại về nhánh chính
git checkout main

# B3: Hợp nhất V2 vào hệ thống
git merge v2-testing

# B4: (Cập nhật môi trường `.env` trỏ về CSDL chính)

# B5: Đẩy lên cloud để tự động Vercel deploy
git push origin main
```
