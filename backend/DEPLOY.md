# Deploy lên Render

API chạy bằng **Node runtime** của Render, không dùng Docker. Database là MongoDB Atlas, ảnh lưu trên Cloudinary, mail gửi qua Brevo, thanh toán qua SePay.

## 1. Tạo Web Service

Render → **New → Web Service** → chọn repo.

| Mục | Giá trị |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npx prisma generate && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/api/health` |
| Instance Type | **Starter trở lên** cho production (xem mục 5) |

- `--include=dev` là **bắt buộc**. Khi đặt `NODE_ENV=production`, `npm ci` bỏ qua devDependencies, mà bước build cần `@nestjs/cli`, `prisma`, `typescript` (đều là devDependencies), nên build sẽ lỗi.
- `npx prisma generate` sinh Prisma client cho đúng nền tảng Linux của Render. Không dùng lại client sinh trên Windows.
- `/api/health` ping MongoDB: trả 200 khi kết nối được, 503 khi không. Render dựa vào endpoint này để biết bản deploy có chạy được không.

## 2. Biến môi trường

Khai báo ở tab **Environment** của service. Có thể xem `.example.env` để biết ý nghĩa từng biến. Ở production, app **dừng ngay khi khởi động** nếu thiếu hoặc sai biến bắt buộc, và báo rõ tên biến trong log.

| Biến | Giá trị production | Ghi chú |
|---|---|---|
| `NODE_ENV` | `production` | Bật các kiểm tra bắt buộc bên dưới |
| `NODE_VERSION` | `24` | Phiên bản Node Render dùng để build và chạy |
| `TRUST_PROXY` | `1` | Render đứng trước app 1 proxy. Thiếu biến này thì rate limit coi mọi khách là cùng 1 IP |
| `APP_PREFIX` | `/api` | |
| `FE_URL` | `https://shop.vn` | Dùng cho CORS, chống CSRF và link trong email. Nhiều domain thì cách nhau bằng dấu phẩy |
| `COOKIE_SAME_SITE` | `lax` hoặc `none` | Xem mục 4 |
| `DATABASE_URL` | `mongodb+srv://.../home_decor?retryWrites=true&w=majority` | **Phải có tên database** sau dấu `/` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | 2 chuỗi ngẫu nhiên **khác nhau**, ≥ 32 ký tự | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | | Bắt buộc |
| `SEPAY_WEBHOOK_API_KEY`, `SEPAY_BANK`, `SEPAY_ACCOUNT_NUMBER` | | Bắt buộc. `SEPAY_ACCOUNT_NAME` tùy chọn |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | `smtp-relay.brevo.com`, `587`, SMTP login, **SMTP key**, sender đã xác minh | Có `MAIL_HOST` thì bắt buộc có `MAIL_FROM` |
| `ORDER_UNPAID_TIMEOUT_MINUTES` | `30` | Sau thời gian này, đơn chuyển khoản chưa nhận được tiền sẽ bị tự hủy |

Không cần đặt `PORT`: Render tự cấp và app đọc `process.env.PORT`.

## 3. MongoDB Atlas: Network Access

Atlas chỉ nhận kết nối từ IP nằm trong danh sách cho phép. Nếu IP không có trong danh sách, kết nối bị từ chối ngay lúc bắt tay TLS. Log sẽ báo `Server selection timeout ... received fatal alert: InternalError` và `/api/health` trả 503.

- Lấy **Outbound IP** của service: Render dashboard → service → **Connect → Outbound**. Thêm các dải IP đó vào Atlas → **Network Access**.
- Mở `0.0.0.0/0` thì dễ hơn, nhưng an toàn kém hơn nhiều. Nếu buộc phải mở, hãy dùng user database có mật khẩu mạnh và chỉ cấp quyền trên database `home_decor`.

## 4. Cookie đăng nhập (`COOKIE_SAME_SITE`)

- FE và API **cùng domain gốc**, ví dụ `shop.vn` và `api.shop.vn` (gắn custom domain cho service Render): dùng `lax`.
- FE và API **khác domain gốc**, ví dụ FE trên `*.vercel.app` và API trên `*.onrender.com`: dùng `none`. `onrender.com` và `vercel.app` đều nằm trong Public Suffix List, nên dù là subdomain của chúng thì vẫn tính là khác site. Middleware kiểm tra `Origin` vẫn chống CSRF trong trường hợp này, với điều kiện `FE_URL` khai báo đúng domain của FE.

## 5. Gói instance

Gói **Free** tự tắt service khi không có request khoảng 15 phút. Khi service đang tắt:

- **Cron hủy đơn quá hạn không chạy**, nên đơn chuyển khoản không được tự hủy và kho không được hoàn.
- **Webhook SePay có thể lỗi**: SePay chỉ chờ phản hồi 30 giây, trong khi service khởi động lại có thể lâu hơn. SePay sẽ gửi lại (tối đa 7 lần trong khoảng 33 phút), nhưng xác nhận thanh toán bị chậm.

Production nên dùng gói trả phí (Starter trở lên). Chạy nhiều instance vẫn an toàn: mỗi đơn bị cron hủy trong transaction riêng, nên instance chạy sau sẽ bị từ chối.

## 6. Sau lần deploy đầu tiên

1. **Tạo index** cho database production, chạy từ máy local với `DATABASE_URL` trỏ tới DB production:
   ```bash
   npm run db:push
   ```
2. **Dữ liệu ban đầu** (tùy chọn):
   ```bash
   SEED_ADMIN_EMAIL=admin@shop.vn SEED_ADMIN_PASSWORD='<mật khẩu mạnh>' npm run db:seed
   ```
   Seed tạo admin, cây danh mục, vùng giao hàng, mã giảm giá **và 25 sản phẩm mẫu**. Nếu shop thật không muốn có sản phẩm mẫu, hãy tạo admin xong rồi xóa sản phẩm mẫu trong trang admin, hoặc nhập vùng giao hàng và mã giảm giá bằng tay.
3. **SePay** (my.sepay.vn):
   - Webhook URL: `https://<service>.onrender.com/api/payments/sepay/webhook`. Gắn custom domain thì dùng domain đó.
   - Chứng thực **API Key** (đúng bằng `SEPAY_WEBHOOK_API_KEY`), body **JSON**, bật "Tự động gửi lại khi server trả lỗi".
   - Cấu trúc mã thanh toán: tiền tố `HD`, hậu tố dài 12–12, loại ký tự **Số và chữ**.
4. **Brevo**: xác minh sender và domain dùng cho `MAIL_FROM`.

## 7. Kiểm tra sau deploy

```bash
curl https://<service>.onrender.com/api/health
# {"status":"ok","database":"up","uptimeSeconds":...}
```

- Swagger ở `https://<service>.onrender.com/api` và đang công khai ở production. Nếu không muốn lộ danh sách API thì cần chặn lại.
- Đặt thử 1 đơn COD và 1 đơn chuyển khoản, chuyển khoản số tiền nhỏ đúng nội dung, rồi xem log Render để chắc webhook về được và email đã gửi.
- Đối soát giao dịch không tự khớp được: `GET /api/admin/payments?status=failed`.
