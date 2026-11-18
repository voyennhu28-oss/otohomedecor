# Khởi động, cấu hình app, filter lỗi, logger

## `src/app/app.controller.ts`

- **AppController › health**: GET /api/health: Render / Railway / Docker gọi định kỳ, nên public và không giới hạn tần suất.

## `src/app/app.module.ts`

- **AppModule › imports**: nạp .env vào process.env; thiếu / sai biến bắt buộc thì dừng ngay lúc khởi động
- **AppModule › imports**: Giai đoạn 3: mua hàng
- **AppModule › imports**: Giai đoạn 4: thanh toán (SePay) + cron
- **AppModule › imports**: Giai đoạn 5: review + dashboard
- **AppModule › providers** (`ZodExceptionFilter,`): CatchEverythingFilter dùng để định dạng lỗi Zod
- **AppModule › providers** (`{ provide: APP_FILTER, useClass: CatchEverythingFilter },`): định dạng mọi lỗi, map lỗi Prisma
- **AppModule › providers** (`{ provide: APP_PIPE, useClass: ZodValidationPipe },`): validate mọi DTO tạo bằng createZodDto
- **AppModule › providers**: bọc response thành công thành { errors: null, data, message } (trừ file và @SkipFormatResponse)
- **AppModule › providers**: Global guard chạy theo thứ tự khai báo:
- **AppModule › providers**: ThrottlerGuard chặn spam trước → AuthGuard gắn req.user → AdminGuard đọc req.user

## `src/app/app.service.ts`

- **AppService › health**: Health check cho nền tảng deploy: app chạy + kết nối được MongoDB. Lỗi DB → 503.

## `src/app/purchase-controllers.spec.ts`

- **(đầu file)**: Controller của giai đoạn 3 (mua hàng) chỉ chuyển tiếp sang service. Test khóa 2 điều dễ sai:
   - phân quyền: route /me/... cần đăng nhập (không @Public), route /admin/... có @AdminOnly
   - userID luôn lấy từ token (@User), không từ body / param
- **describe('Controller giai đoạn 3') › describe('admin') › it('promotions / shipping zones: chuyển tiếp đúng tham số') › promoModule**: Mỗi controller 1 module: AutoMockingModule tạo mock riêng cho từng nơi inject

## `src/catch-everything/catch-everything.filter.spec.ts`

- **describe('CatchEverythingFilter') › handle**: Gọi filter, trả về [status, body] đã gửi cho client.

## `src/catch-everything/catch-everything.filter.ts`

- **PRISMA_ERRORS**: Lỗi Prisma hay gặp → HTTP status + câu thông báo cho client (không lộ query / tên index).
- **duplicatedFields**: Field bị trùng của lỗi P2002. MongoDB trả tên index (vd "Product_slug_key"),
  SQL trả mảng field (vd ["slug"]).
- **CatchEverythingFilter › catch**: Lỗi 5xx là lỗi của server: ghi log đầy đủ để debug, client chỉ thấy câu chung
- **CatchEverythingFilter › resolve**: Dữ liệu client gửi lên sai schema
- **CatchEverythingFilter › resolve**: Response của server không khớp schema: lỗi của server

## `src/init.ts`

- **removeFieldsAndRelations**: Quan hệ `user` ở trên sinh ra `userID` → xóa lại các audit field
- **NEST_APP_OPTIONS**: - bodyParser: false → tắt parser mặc định (có urlencoded); `applyMiddlewares` chỉ bật lại parser JSON
  - rawBody: true → giữ body gốc ở `req.rawBody` để kiểm tra chữ ký HMAC của webhook SePay
- **initApp**: Sau reverse proxy (Render, Railway, Nginx): tin X-Forwarded-For của N proxy gần nhất để req.ip
- **initApp › proxyHops**: là IP thật của khách (rate limit theo IP). KHÔNG bật khi không có proxy: client sẽ giả được IP.
- **initApp › allowedOrigins**: FE_URL có thể chứa nhiều địa chỉ, cách nhau bằng dấu phẩy
- **initApp**: Auth dùng cookie nên phải bật credentials, và khi đó origin KHÔNG được là '*'.

## `src/main.ts`

- **bootstrap › config**: Giá trị đã qua validate.env.ts (có sẵn mặc định), không khai báo lại mặc định ở đây

## `types.ts`

- **`export {};`**: This file must be a module.
