# Cài máy chủ cho "Phòng chung" (Supabase) – khoảng 10 phút, làm được trên iPhone

Gói miễn phí của Supabase đủ cho giai đoạn đầu (khoảng 50.000 người dùng/tháng, 200 người online cùng lúc).

## 1. Tạo dự án
1. Vào **supabase.com** → **Start your project** → đăng nhập bằng **GitHub** (dùng luôn tài khoản Khoatay).
2. **New project**:
   - Name: `chillspace`
   - Database Password: bấm **Generate**, lưu lại ở chỗ an toàn (không cần gửi cho ai)
   - Region: **Southeast Asia (Singapore)**, gần Việt Nam nhất nên nhanh
3. Bấm **Create new project**, đợi 1–2 phút.

## 2. Chạy file cài đặt
1. Menu trái → **SQL Editor** → **New query**.
2. Mở file `supabase/setup.sql` trên GitHub → bấm nút copy (biểu tượng 2 ô vuông) → dán vào ô SQL.
3. Bấm **Run**. Thấy *Success* là xong. (Có dòng NOTICE màu vàng thì không sao.)

## 3. Bật đăng nhập không cần email
Menu trái → **Authentication** → **Sign In / Providers** → bật **Allow anonymous sign-ins** → **Save**.

## 4. Lấy 2 mã kết nối
Menu trái → **Project Settings** (bánh răng) → **API** (hoặc **Data API** / **API Keys**):
- **Project URL**: dạng `https://abcdxyz.supabase.co`
- Khoá **anon public** hoặc **publishable** (`eyJ...` hoặc `sb_publishable_...`)

Hai mã này **được phép công khai**: app nào chạy trên trình duyệt cũng phải chứa chúng, còn dữ liệu đã được bảo vệ bằng phân quyền trong `setup.sql`.

⚠️ **Tuyệt đối không** gửi cho ai hay dán vào app khoá **service_role** / **secret**. Khoá đó có toàn quyền với dữ liệu.

## 5. Điền vào app
Dán 2 mã vào `js/config.js`:
```js
window.CS_CONFIG = {
  supabaseUrl: 'https://abcdxyz.supabase.co',
  supabaseKey: 'eyJ...hoặc sb_publishable_...',
};
```

## Sau này, khi bán
- Bật **CAPTCHA** (Authentication → Attack Protection) để chặn bot tạo tài khoản ảo.
- Thêm đăng nhập Google/Apple để người dùng giữ tài khoản khi đổi máy.
- Theo dõi dung lượng ở **Reports**. Vượt gói miễn phí thì gói Pro khoảng 25 USD/tháng.
