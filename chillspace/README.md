# ◐ ChillSpace — Góc làm việc chill

Web app vừa làm việc vừa thư giãn: chọn một **không gian**, bật âm thanh nền và nhạc YouTube, rồi bấm vào **đồ vật trong cảnh** để mở công cụ
(máy tính → ghi chú, ly cà phê → đếm ly, đồng hồ → Pomodoro, bút chì → bảng vẽ…).

Không cần build, không cần server riêng, không có ảnh hay nhạc mang bản quyền: cảnh vẽ bằng SVG, âm thanh nền tự tạo bằng Web Audio.
Cài được lên máy tính/điện thoại như app thật (PWA).

## Chạy thử

```bash
cd chillspace && python3 -m http.server 8000      # hoặc: npx serve .
# mở http://localhost:8000
```

> Phải mở qua `http://` (không mở thẳng file `index.html`), vì YouTube không cho nhúng video vào trang `file://`.
> Muốn có link dùng mọi nơi: bật **GitHub Pages** cho repo này (Settings → Pages → Branch), hoặc kéo thả thư mục lên Netlify/Vercel/Cloudflare Pages.

## 18 không gian

| Không gian | Tâm trạng | Âm thanh nền | Đồ vật → công cụ |
|---|---|---|---|
| 🛂 **Immigration space** (không gian riêng) | Làm việc · lưu trú | sảnh sân bay | 📋 **bảng hạn lưu trú** 21/30/45/90/180 ngày · 📅 lịch âm dương · 🌏 giờ các nước |
| 📈 **Bàn trader** | Giao dịch, kỷ luật | ồn nâu, mưa, gõ phím | 📈 biểu đồ TradingView · 🌏 phiên Á/Âu/Mỹ · 🧮 khối lượng lệnh · ✅ checklist · 📒 nhật ký lệnh · 📰 lịch kinh tế · 🐻 hít thở |
| 📚 Bàn học | Học tập | đồng hồ tích tắc, mưa nhẹ | 💻 ghi chú · 📖 sách · 🎧 sách nói · 🗂️ flashcard · ☕ đếm cà phê · ✏️ bút vẽ · 📝 bài tập · ⏰ Pomodoro 25/5 |
| 💼 Bàn làm việc | Deep work | tiếng ồn nâu, gõ phím | 📋 việc hôm nay · ⏱️ phiên 50/10 · 📒 ghi chú · 🪴 giãn cơ / nghỉ mắt |
| 🏖️ Bờ biển | Nghỉ ngơi | sóng, gió, chim | 🌴 hít thở theo sóng · 🥥 nhắc uống nước · 🐚 nhật ký biết ơn · ⛱️ nghỉ 15 phút |
| 🏴‍☠️ Tàu hải tặc | Anime phiêu lưu, vui vẻ | sóng, gió, hải âu | 🗺️ nhiệm vụ săn kho báu (xong việc = 💰) · 🦜 vẹt cổ vũ · 🧭 nhật ký hải trình · 🚩 ra khơi 25 phút |
| ⚽ Sân bóng | Sôi động | khán đài cổ vũ | ⚽ "bàn thắng" hôm nay · ⏱️ hiệp đấu 45/15 · 📋 bảng chiến thuật (vẽ trên sân) · 🥅 khởi động |
| 🛏️ Phòng ngủ | Thư giãn | mưa, mèo gừ gừ | 🧸 thở 4-7-8 · 📔 nhật ký · 📚 sách nói · 🌙 hẹn giờ tắt nhạc |
| ☕ Cà phê phố cổ | Sáng tạo, viết lách | tiếng quán, mưa nhẹ | ☕ đếm ly · 📓 viết tự do · 🎨 phác thảo · 🎷 jazz |
| 🌧️ Đêm mưa | Đọc sách | mưa, sấm xa | 🕯️ hít thở · 📖 sách · 🍵 trà · 📔 nhật ký |
| 🏕️ Lửa trại | Tĩnh tâm | lửa tí tách, dế, gió | 🔥 ngắm lửa hít thở · 🌠 điều ước · ⛺ hẹn giờ ngủ · 🎸 guitar |
| 🚀 Trạm vũ trụ | Coding / deep work | động cơ tàu, sóng não (binaural) | 🛰️ chu kỳ 90 phút · 📋 nhiệm vụ · 📡 log · 👩‍🚀 giãn cơ |
| 🌸 Vườn Nhật | Thiền, viết | suối, chuông gió, chim | 📜 viết haiku · 🖌️ thư pháp · 🍵 trà xanh · 🧘 thiền 25′ · 🪷 nhật ký · 🎋 hít thở (hoa anh đào rơi) |
| 🚂 Tàu đêm | Đọc sách, mơ màng | tiếng tàu xình xịch, mưa | 🧳 chặng 30′ · 💻 nhật ký hành trình · 🎫 lịch trình · 🌙 ngủ tới ga (cảnh chạy ngoài cửa sổ, mưa trên kính) |
| ❄️ Cabin tuyết | Ấm áp | lửa lò sưởi, gió | 🧶 việc nhỏ · 🍫 cacao · 🐕 cún động viên · 🔥 ngắm lửa (tuyết rơi ngoài cửa sổ) |
| 🐠 Đáy biển | Tập trung sâu | dưới nước, bong bóng | 🐙 việc cần làm · 🪸 lặn 50′ · 🐢 hít thở · 💎 kho ý tưởng (cá bơi, bong bóng) |
| 🌾 Đồng quê | Bình yên, quê nhà | ếch nhái, dế, gió | 🐃 vận động · 🐓 gà gáy 25′ · 🌾 việc hôm nay · 🍵 trà đá · 🪁 thả diều (đom đóm) |
| 🏮 Phố Hội | Lãng mạn | sông nước, dế, chuông gió | 🪷 **thả hoa đăng gửi điều ước** · 🏮 đèn sáng 25′ · ☕ cà phê ven sông (đèn trời bay lên) |

Thêm hoặc sửa không gian: chỉnh mảng `SPACES` trong `js/spaces.js` (vị trí đồ vật tính theo % khung cảnh 16:9), vẽ cảnh trong `SCENES`.

## 👥 Phòng chung – làm việc cùng nhau online

Tạo phòng, gửi mã hoặc link cho bạn bè, rồi cả nhóm cùng "ngồi" trong một không gian. Không gọi thoại, không camera:
- **Avatar ngồi trong cảnh**: dùng ảnh thật hoặc emoji. Vòng sáng cam là đang tập trung, xanh là đang nghỉ
- **Sticker việc đang làm** (📚 học bài, ⌨️ gõ phím, ☕ uống cafe, 🎨 vẽ, 🍜 ăn uống…) và dòng "📌 đang làm…"
- **Pomodoro chung**: một người bấm là cả phòng cùng chạy. Vào trễ thì đồng hồ tự khớp
- **Chat**, **thả emoji bay lên** từ avatar, nút **"✅ Xong việc"** bắn pháo giấy cho cả phòng
- **Bảng xếp hạng** giờ tập trung trong tuần
- Chủ phòng đổi không gian thì cả phòng đổi theo

Cần máy chủ Supabase (có gói miễn phí): xem [supabase/HUONG-DAN.md](supabase/HUONG-DAN.md). Chưa cài thì app vẫn chạy bình thường, chỉ tắt tính năng này.

## 🛂 Immigration space – hạn lưu trú

Bảng treo trên tường luôn hiện ngày hết hạn tính từ **hôm nay (giờ Việt Nam)**: 21 · **30** · **45** · 90 · 180 ngày. Hai mốc 30 và 45 được tô nổi bật. Ngày nhập cảnh tính là ngày thứ 1, qua 0 giờ bảng tự sang ngày mới. Bấm vào bảng để mở cửa sổ, bấm vào một dòng để copy.

## 🕛 Báo thức 00:00 – đổi ngày con dấu (Immigration space)

Tự động: đúng 00:00 giờ Việt Nam app đổ chuông và hiện bảng **ĐỔI NGÀY CON DẤU** kèm ngày mới, chuông kêu đến khi bấm **Đã quay dấu**. Chỉ kêu khi app đang mở ở Immigration space (Nhập hoặc Xuất cảnh) lúc qua 00:00 (mở app sau 00:00 thì không kêu). Bật/tắt bằng nút nhỏ **⏰ 00:00 BẬT/TẮT** ở góc trên bên trái. Chuông chỉ kêu khi app đang mở.

## 🛫 Xuất cảnh (nhánh của Immigration space)

Công tắc **🛬 Nhập cảnh | 🛫 Xuất cảnh** ở góc trên bên trái. Bên Xuất cảnh không có bảng hạn lưu trú, thay bằng bảng **chuyến quốc tế đi**: giờ đi, **mở quầy** (giờ khởi hành − 3 giờ), **hết khách** (giờ khởi hành − 40 phút), tính theo giờ lịch. Chuyến trễ có thêm dòng ghi chú bên dưới: trễ bao lâu, dự kiến đi lúc mấy giờ. Khung dữ liệu từ 1 giờ trước đến 11 giờ tới.

## 📋 Nguồn lịch bay: Google Sheet (khuyên dùng)

Mở bảng chuyến bay → ⚙️ → dán **link Google Sheet lịch bay** → Lưu & tải. Bảng cần mở quyền "Bất kỳ ai có đường liên kết đều xem được". App đọc trang "Lịch D/M" của ngày hôm nay (giờ VN), phần **Lịch bay quốc tế** (chuyến đến bên trái, chuyến đi bên phải), kèm các chuyến sau nửa đêm ("00:30+") ở trang hôm trước. Tự tải lại mỗi 5 phút, không tốn phí. Link chỉ lưu trên máy, **không ghi vào code** vì repo công khai. Chưa có link thì app dùng AeroDataBox (dữ liệu có thể thiếu chuyến).

## ✈️ Chuyến quốc tế đến (Immigration space)

Bấm ✈️ ngoài cửa kính để xem chuyến quốc tế đến **Cam Ranh** (đổi được sang Nội Bài, Tân Sơn Nhất, Đà Nẵng, Phú Quốc…), lấy trong khung từ 3 giờ trước đến 9 giờ tới. Chuyến nội địa và chuyến hàng đã được lọc bỏ.
- Giờ theo lịch, giờ dự kiến (vàng là trễ), trạng thái, nước xuất phát, nhà ga, băng chuyền. Chuyến kế tiếp được làm nổi
- Lọc theo nước, ví dụ chỉ chuyến từ 🇰🇷 Hàn Quốc
- Dữ liệu từ **AeroDataBox** (RapidAPI). Cần đăng ký gói Basic miễn phí rồi dán khoá vào ⚙️. Khoá chỉ lưu trên máy đó. Kết quả được giữ 30 phút để tiết kiệm lượt gọi

## Công cụ có sẵn

Pomodoro (vòng tròn đếm giờ, thông báo, thống kê theo ngày) · Việc cần làm (pháo giấy khi xong) · Ghi chú (tự lưu, tải .txt) ·
Bút vẽ (màu, tẩy, hoàn tác, tải PNG) · Flashcard (lật thẻ, lặp lại ngắt quãng) · Tủ sách & sách nói (theo dõi số trang) ·
Nhật ký + cảm xúc · Hít thở (5-5, hộp 4-4-4-4, 4-7-8) · Giãn cơ 7 động tác · Đếm cà phê/nước/trà · Lời động viên ·
Hẹn giờ tắt nhạc · Thả hoa đăng (gửi điều ước) · Bộ trộn 21 âm thanh nền · Trình phát YouTube.

Phím tắt: `R` phòng chung · `M` âm thanh · `Y` YouTube · `P` Pomodoro · `T` công cụ · `H` ẩn giao diện · `F` toàn màn hình · `1`–`0` đổi không gian · `Esc` đóng cửa sổ.

Dữ liệu (ghi chú, việc, nhật ký…) lưu trong trình duyệt (localStorage), không gửi đi đâu cả.

## YouTube & YouTube Premium

- Dán link video, playlist hoặc livestream vào cửa sổ ▶️ YouTube. Link hay dùng có thể ⭐ lưu riêng cho từng không gian.
- Trình phát dùng chính tài khoản YouTube đang đăng nhập trong trình duyệt: **đăng nhập tài khoản Premium là nghe không quảng cáo**.
  Không có API nào để "kết nối" Premium trực tiếp, và cũng không cần.
- Safari, hoặc trình duyệt chặn cookie bên thứ ba, có thể không nhận đăng nhập trong khung nhúng (khi đó vẫn có quảng cáo).

## ⚠️ Nếu muốn bán

1. **One Piece là tài sản trí tuệ của Eiichiro Oda / Shueisha / Toei.** Vì vậy không gian "Tàu hải tặc" chỉ là phong cách anime phiêu lưu
   *tự sáng tác* — không có nhân vật, logo hay tên riêng của One Piece. Dùng hình, nhạc hoặc tên One Piece trong sản phẩm bán là vi phạm bản quyền.
   Dùng riêng cho bản thân thì tuỳ bạn.
2. **YouTube**: chỉ được phát qua trình phát nhúng chính thức, đúng như app đang làm. Không tách lấy âm thanh, không ẩn hẳn khung video
   (điều khoản yêu cầu khung tối thiểu 200×200px), không chặn quảng cáo.
3. Link Lofi Girl gợi ý sẵn là kênh công khai, cho phép nhúng. Nếu chủ kênh đổi livestream thì cập nhật link trong `js/spaces.js`.
4. Âm thanh nền và hình vẽ trong app đều tự tạo, bán được không vướng bản quyền.

## Hướng phát triển (gợi ý)

- Tài khoản + đồng bộ dữ liệu giữa các máy (Supabase/Firebase) → làm gói trả phí
- Kết nối Spotify (Web Playback SDK, yêu cầu người dùng có Premium)
- Cảnh động vẽ tay hoặc thuê hoạ sĩ, thêm theme theo mùa (Tết, Trung thu, Noel)
- Phòng học nhóm (học chung, đếm giờ chung với bạn bè), bảng xếp hạng giờ tập trung
- Đóng gói app desktop (Tauri/Electron) và mobile (Capacitor) để đưa lên store

## Cấu trúc

```
index.html            khung trang
css/style.css         giao diện (kính mờ, responsive, hoạt ảnh)
js/spaces.js          10 không gian + cảnh SVG
js/audio.js           16 âm thanh nền tổng hợp bằng Web Audio
js/tools.js           các công cụ, Pomodoro, YouTube
js/app.js             quản lý cửa sổ, hiệu ứng hạt, chuyển cảnh, phím tắt
js/room.js            Phòng chung (kết nối Supabase)
js/config.js          mã kết nối Supabase
supabase/             file cài đặt máy chủ + hướng dẫn
sw.js, manifest       cài đặt như app (PWA)
```
