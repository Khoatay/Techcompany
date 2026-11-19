# Chụp & Quét

Web app (PWA) gộp 2 chức năng trong 1:

1. **Ảnh logo** – chụp ảnh tự gắn khung thương hiệu: logo, tên công ty, ngày giờ, địa chỉ, số điện thoại, tọa độ GPS, ghi chú.
2. **Quét tài liệu** – chụp giấy tờ, tự nhận mép giấy, làm phẳng, làm trắng nền / đen trắng, gộp nhiều trang thành **PDF**.

Mọi file được lưu cố định trong mục **Thư viện** của app (ngay trên điện thoại). Từ đó có thể lưu vào Ảnh, Tệp (Files), Google Drive, Zalo… bằng nút **Lưu / Chia sẻ**. PDF tự tải về thư mục *Downloads* (bật/tắt trong Cài đặt). Trên máy tính Chrome/Edge có thể chọn 1 thư mục để app tự ghi file vào.

Không cần server, không cần tài khoản, chạy được khi mất mạng sau lần mở đầu tiên. Không dùng thư viện ngoài.

## Cài lên điện thoại

App phải được mở qua **https** (camera chỉ hoạt động trên https). Cách miễn phí: GitHub Pages.

1. Vào repo trên GitHub → **Settings → Pages**.
2. *Source*: **Deploy from a branch**, chọn branch chứa code và thư mục `/ (root)` → **Save**.
3. Sau 1–2 phút sẽ có link dạng `https://<tên-tài-khoản>.github.io/<tên-repo>/`.
4. Mở link trên điện thoại:
   - **iPhone (Safari)**: nút Chia sẻ → **Thêm vào MH chính**.
   - **Android (Chrome)**: menu ⋮ → **Thêm vào màn hình chính / Cài đặt ứng dụng**.
5. Mở app từ biểu tượng, cho phép quyền **Camera** (và **Vị trí** nếu muốn hiện GPS).

> GitHub Pages với repo riêng tư cần gói GitHub trả phí. Nếu repo private, có thể dùng Netlify Drop (kéo thả thư mục lên app.netlify.com/drop) hoặc Cloudflare Pages, đều miễn phí.

## Sử dụng

- **Camera** (⚙️ → Camera):
  - *Camera của máy* (mặc định trên iPhone): bấm chụp sẽ mở camera gốc của điện thoại, không phải cấp quyền mỗi lần mở app.
  - *Camera trong app*: thấy khung logo ngay khi ngắm, nhưng iPhone có thể hỏi quyền mỗi lần mở app.
- **Xem lại**: bấm ô ảnh nhỏ góc trái để mở ảnh hoặc PDF mới nhất.
  - Vuốt ngang để chuyển file, chụm 2 ngón hoặc chạm 2 lần để phóng to, chạm 1 lần để ẩn/hiện thanh công cụ.
  - PDF xem từng trang ngay trong app. Nút *Tất cả* để mở lưới thư viện.

- Lần đầu: bấm ⚙️ → nhập tên công ty, SĐT, địa chỉ, chọn logo, vị trí và màu khung.
- **ẢNH LOGO**: bấm nút chụp → ảnh đã gắn khung được lưu vào Thư viện.
- **QUÉT TÀI LIỆU**: chụp → chỉnh 4 góc (app tự đoán) → chọn *Làm rõ / Đen trắng / Xám / Gốc* → *Thêm & chụp tiếp* cho nhiều trang, hoặc *Thêm & tạo PDF*.
- Nút 🖼️ trên cùng: dùng ảnh có sẵn trong máy thay vì chụp mới.

## Cấu trúc

| File | Nội dung |
|---|---|
| `index.html` | Giao diện |
| `style.css` | Kiểu dáng |
| `app.js` | Camera, khung thương hiệu, cắt / làm phẳng / lọc ảnh, thư viện (IndexedDB) |
| `pdf.js` | Tạo file PDF từ ảnh JPEG |
| `sw.js`, `manifest.webmanifest`, `icons/` | Cài như app, chạy offline |

Chạy thử trên máy tính: `python3 -m http.server 8000` rồi mở http://localhost:8000.

---

## Ứng dụng khác trong repo

- **ChillSpace** – góc làm việc chill: thư mục [`chillspace/`](chillspace/) · https://khoatay.github.io/Techcompany/chillspace/
