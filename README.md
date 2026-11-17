# Quick Report – Nạp vào sheet

Extension Chrome giúp ghi phản ánh vào Google Sheet trong vài giây: bôi đen đoạn chat hoặc chụp vùng màn hình, gõ nội dung, Enter là xong.

- **Alt+Shift+X**: lưu nhanh đoạn chat đang bôi đen
- **Alt+Shift+S**: chụp vùng màn hình, khoanh đỏ, gõ nội dung rồi gửi
- Tự cập nhật từ GitHub, không cần Chrome Web Store

---

## 1. Cài đặt (mỗi máy làm 1 lần)

### Bước 1 – Tải extension

1. Tải file: **https://github.com/gitcuaquan/quick-report/archive/refs/heads/main.zip**
2. Giải nén, chép thư mục **`extension`** ra một chỗ cố định, ví dụ `D:\quick-report`.
   > Đừng để trong thư mục Downloads rồi lỡ xoá. Chrome đọc extension trực tiếp từ thư mục này.

### Bước 2 – Nạp vào Chrome

1. Mở `chrome://extensions`
2. Bật **Chế độ dành cho nhà phát triển** (góc phải trên)
3. Bấm **Tải tiện ích đã giải nén** → chọn thư mục `D:\quick-report`
4. Bấm biểu tượng ghim 📌 để icon extension hiện trên thanh công cụ

### Bước 3 – Kết nối Google Sheet

1. Trên thẻ extension → **Chi tiết** → **Tùy chọn tiện ích**
2. Điền **URL script** và **Khoá bí mật** (hỏi người quản lý Sheet)
3. Bấm **Kết nối** → chọn **tab bạn phụ trách** → **Lưu**

### Bước 4 – Bật tự cập nhật

Trong thư mục `D:\quick-report`, **bấm đúp `tu-dong-cap-nhat.bat`**.
Cửa sổ báo "Đã bật tự cập nhật" là xong.

### Phím tắt

**Không cần cài.** `Alt+Shift+X` và `Alt+Shift+S` chạy ngay trên mọi trang, kể cả tab đã mở từ trước — không phải F5, không phải vào `chrome://extensions/shortcuts`.

---

## 2. Cập nhật

### Tự động (đã bật ở Bước 4)

Không phải làm gì. Cứ 30 phút Windows kiểm tra GitHub, có bản mới thì tự tải về, extension tự tải lại trong khoảng 1 phút.

### Bằng tay

Khi icon extension hiện chữ đỏ **NEW** (hoặc thông báo sau khi gửi ghi "Có bản mới") → **bấm đúp `cap-nhat.bat`** trong thư mục extension.

### Khi nào phải bấm tải lại ↻

Bản mới có **thêm quyền** (sửa `permissions` / `host_permissions` trong `manifest.json`) thì Chrome không tự nhận.
Mỗi người mở `chrome://extensions` → bấm **↻** trên thẻ extension một lần, rồi **F5** các tab đang mở.

### Tắt tự cập nhật

Mở PowerShell trong thư mục extension, chạy:

```powershell
powershell -ExecutionPolicy Bypass -File cap-nhat.ps1 -Uninstall
```

### Lỡ chuyển thư mục extension sang chỗ khác

Nạp lại thư mục mới trong `chrome://extensions`, rồi bấm đúp `tu-dong-cap-nhat.bat` ở thư mục mới.

---

## 3. Cách dùng

| Muốn | Làm |
|---|---|
| Lưu nhanh đoạn chat | Bôi đen → **Alt+Shift+X** → gửi luôn (góc phải báo "✓ Đã nạp") |
| Gửi đoạn chat có sửa | Bôi đen → chuột phải → **Nạp vào sheet** → sửa / gõ nội dung → **Enter** |
| Gửi ảnh chụp | **Alt+Shift+S** → kéo chọn vùng (hoặc **Enter** để lấy cả màn hình) → gõ nội dung → **Enter** |
| Khoanh trên ảnh | Sau khi chọn vùng, kéo chuột trong vùng. Chọn công cụ ở thanh trên cùng: Khung · Tròn · Mũi tên · Bút |
| Xoá hình vừa vẽ | **Ctrl+Z** |
| Gửi ảnh trong chat | Chuột phải vào ảnh → **Nạp vào sheet** → gõ nội dung → **Enter** |
| Xuống dòng / Huỷ | `Shift+Enter` / `Esc` |

**Link màn hình là bắt buộc.** Extension tự lấy nếu đang mở trang lenful.com / localhost, hoặc trong đoạn bôi đen có link đó. Không có thì hiện ô bắt nhập.

Mỗi dòng trong Sheet được tự điền:

| Cột | Lấy từ |
|---|---|
| Kênh tiếp nhận | Link trang đang mở |
| Thông tin Seller | Tên cuộc chat (nếu đang ở trang chat) |
| Màn hình | Tiêu đề tab (nếu đang ở trang lenful.com / localhost) |
| Link màn hình | Link lenful.com / localhost |
| Nội dung phản ánh | Nội dung bạn gõ / đoạn bôi đen |
| Hình ảnh | Link ảnh trên imgbb |
| Trạng thái | Tiếp nhận |
| Người xử lý / Người duyệt | **Để trống** cho người phụ trách tự điền |

Dòng mới được ghi vào dòng trống đầu tiên của tab (dòng chỉ có số thứ tự cũng tính là trống).

---

## 4. Lỗi thường gặp

| Thông báo | Cách xử lý |
|---|---|
| Chưa cài đặt extension | Làm lại Bước 3 |
| Sai khoá bí mật | Hỏi lại khoá, điền vào Tùy chọn |
| Không tìm thấy tab trong Sheet | Tùy chọn → **Kết nối** → chọn lại tab → **Lưu** |
| Thiếu link màn hình | Nhập link lenful.com / localhost vào ô Link màn hình |
| Bấm phím tắt không có gì xảy ra | Trang `chrome://…` và Chrome Web Store không cho extension chạy. Trang thường: **F5** rồi thử lại |
| Extension vừa được cập nhật. Tải lại trang | **F5** trang đang mở |

---

## 5. Cho người phát triển

### Phát hành bản mới

Sửa code trong thư mục `extension/` → commit → push lên `main`. Xong.

GitHub Action (`.github/workflows/bump-version.yml`) tự tăng version trong `manifest.json` (VD `2.6.0` → `2.6.1`) và commit lại. Máy mọi người nhận bản mới trong vòng 30 phút.

> Vì Action commit thêm vào `main`, trước khi push lần sau nhớ `git pull --rebase`.
> Muốn tăng số giữa / số đầu (VD lên `2.7.0`) thì tự sửa `version` trong `manifest.json` rồi push — Action sẽ cộng tiếp thành `2.7.1`.

### Google Apps Script (phía Sheet)

Code Apps Script **không** nằm trong repo này (giữ riêng vì đi kèm khoá bí mật). Mỗi lần sửa:
**Lưu** → **Triển khai → Quản lý triển khai → ✏️ → Phiên bản: Phiên bản mới → Triển khai** (giữ nguyên URL).
Chỉ bấm Lưu thì bản đang chạy **không** đổi.
