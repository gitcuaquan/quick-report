# Hướng dẫn "Nạp vào sheet"

## A. Người quản lý Sheet

1. Mở Sheet → **Tiện ích mở rộng → Apps Script**.
2. Xoá code cũ, dán toàn bộ `apps-script/Code.gs` → **Lưu**.
3. **Cài đặt dự án** (bánh răng) → **Thuộc tính tập lệnh**: `SECRET` = khoá bí mật dùng chung.
4. **Triển khai → Quản lý triển khai → bút chì → Phiên bản: Phiên bản mới → Triển khai** (URL giữ nguyên).
   Mỗi lần sửa `Code.gs` đều phải làm lại bước này, chỉ Lưu thì bản thật không đổi.

Script tự tìm dòng tiêu đề (dòng có từ 2 tên cột quen thuộc trở lên) và tìm cột theo tên. Đổi thứ tự cột không sao, nhưng **không đổi tên tiêu đề**.

## B. Cài cho mỗi người (1 lần)

1. Tải https://github.com/gitcuaquan/quick-report/archive/refs/heads/main.zip → giải nén.
   Chép thư mục `extension` ra chỗ cố định, VD `D:\lenful-nap-sheet` (đừng để trong Downloads rồi xoá).
2. `chrome://extensions` → bật **Chế độ dành cho nhà phát triển** → **Tải tiện ích đã giải nén** → chọn thư mục đó.
3. **Chi tiết → Tùy chọn tiện ích**: URL script, khoá bí mật → **Kết nối** → chọn tab của bạn → **Lưu**.
4. Kiểm tra phím tắt ở `chrome://extensions/shortcuts` (mặc định Alt+Shift+X và Alt+Shift+S).

## C. Cập nhật

- **Tự động hoàn toàn (khuyên dùng):** bấm đúp `tu-dong-cap-nhat.bat` trong thư mục extension **1 lần**.
  Từ đó Windows tự kiểm tra GitHub mỗi 30 phút, có bản mới thì tự tải, extension tự tải lại. Không phải làm gì nữa.
  Tắt: chạy `powershell -File cap-nhat.ps1 -Uninstall`.
- **Bằng tay:** icon hiện chữ đỏ **NEW** → bấm đúp `cap-nhat.bat`. Trong ~1 phút extension tự tải lại.
- Người sửa code: push lên nhánh `main` là xong — GitHub Action tự tăng version, máy mọi người tự thấy NEW trong ≤ 30 phút.
  Riêng khi đổi quyền trong `manifest.json` thì mọi người phải bấm ↻ trong `chrome://extensions` một lần.

## D. Dùng

| Muốn | Làm |
|---|---|
| Lưu nhanh đoạn chat | Bôi đen → **Alt+Shift+X** → gửi luôn (góc phải báo "✓ Đã nạp") |
| Gửi đoạn chat có sửa | Bôi đen → chuột phải → **Nạp vào sheet** → sửa/gõ nội dung → **Enter** |
| Gửi ảnh chụp | **Alt+Shift+S** → kéo chọn vùng → gõ nội dung → **Enter** |
| Khoanh trên ảnh | Sau khi chọn vùng, kéo chuột trong vùng. Đổi công cụ bằng nút trên cùng: Khung · Tròn · Mũi tên · Bút · Hoàn tác |
| Gửi ảnh trong chat | Chuột phải vào ảnh → Nạp vào sheet → gõ nội dung → **Enter** |
| Xuống dòng / Huỷ | `Shift+Enter` / `Esc` |

**Link màn hình là bắt buộc**: tự lấy nếu đang mở trang lenful.com / localhost hoặc trong đoạn bôi đen có link đó; không có thì hiện ô bắt nhập.

Mỗi dòng tự điền: Kênh tiếp nhận (link trang đang mở), Thông tin Seller (tên hội thoại, nếu là trang chat), Màn hình (tiêu đề tab nếu là trang app), Link màn hình, Nội dung phản ánh, Hình ảnh (link imgbb), Trạng thái (Tiếp nhận). **Người xử lý / Người duyệt để trống** cho người phụ trách tự điền.
