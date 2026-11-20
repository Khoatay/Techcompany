# Việc cần làm tiếp

## ⏭️ Ngày mai: test Phòng chung trên PC
Trên máy tính làm sẽ nhanh hơn điện thoại (dễ copy/dán, mở được 2 cửa sổ để giả làm 2 người).

1. **Cài máy chủ Supabase** theo [supabase/HUONG-DAN.md](supabase/HUONG-DAN.md) (khoảng 10 phút).
2. Gửi cho Claude **Project URL** và khoá **anon public / publishable**. Không gửi khoá *service_role / secret*.
3. Claude gắn mã vào `js/config.js` rồi push lên.
4. Thử với 2 "người":
   - Cửa sổ Chrome thường: tạo hồ sơ, tạo phòng, bấm 🔗 để copy link mời
   - Cửa sổ **ẩn danh** (Ctrl+Shift+N): dán link mời → tạo hồ sơ khác → vào phòng
   - Kiểm tra: avatar hiện ở cả 2 bên, chat, thả emoji, đổi sticker, bấm Pomodoro chung, nút "Xong việc", bảng xếp hạng
5. Thử thêm trên iPhone: vào bằng link mời, chụp ảnh làm avatar.

## Immigration space
- [x] Quy ước: ngày nhập cảnh là **ngày thứ 1** (đã xác nhận)
- [ ] Chuyến bay: đăng ký AeroDataBox trên RapidAPI (gói Basic miễn phí), dán khoá vào ✈️ → ⚙️, kiểm tra với lịch thật ở Cam Ranh
- [ ] Sau này: chuyển khoá API lên máy chủ Supabase để nhiều người dùng chung, không ai phải tự đăng ký

## Khi đóng gói thành app (PC / Android)
- Ưu tiên: app PC (Windows) và app Android trước; chưa cần lo Safari / iPhone
- [ ] Ô **"Ứng dụng của tôi"** trong từng không gian: tự thêm app/web (MT5, TradingView, Notion, Google Sheet…),
      mở ngay trong ChillSpace (app không bị chặn nhúng như web) hoặc mở app đã cài trên máy

Link app: https://khoatay.github.io/Techcompany/chillspace/
