# Module `auth` (src/app/auth)

## `src/app/auth/auth.controller.spec.ts`

- **describe('AuthController') › expectTokenCookies**: Cả 2 cookie phải httpOnly + Secure + SameSite=Lax (chống CSRF); refresh chỉ gửi tới /api/auth.

## `src/app/auth/auth.controller.ts`

- **AuthController › constructor**: Refresh token chỉ được gửi kèm request tới /api/auth/*
- **AuthController › signIn** (`@Throttle(STRICT_THROTTLE)`): chống dò mật khẩu
- **AuthController › forgotPassword** (`@Throttle(STRICT_THROTTLE)`): chống spam email
- **AuthController › resetPassword** (`@Throttle(STRICT_THROTTLE)`): chống dò token
- **AuthController › changePassword**: Token cũ ở mọi thiết bị mất hiệu lực; phiên hiện tại nhận cookie token mới.
- **AuthController › changePassword** (`@Throttle(STRICT_THROTTLE)`): chống dò mật khẩu cũ khi bị lộ token

## `src/app/auth/auth.service.spec.ts`

- **`jest.mock('bcrypt', () => {`**: Bọc bcrypt.compare để kiểm tra được lời gọi (namespace import không spyOn được)
- **flush**: Chờ các việc chạy nền (gửi mail fire-and-forget) xong.
- **describe('AuthService')**: Mock có trạng thái: updatePassword đổi hash và tăng tokenVersion giống UsersService thật
- **describe('AuthService') › describe('signIn') › it('BUG-07: email không tồn tại → 401 cùng thông báo, VẪN chạy bcrypt.compare (chống dò email)')**: so với hash giả có cùng cost (10) với hash thật → thời gian xử lý như nhau
- **describe('AuthService') › describe('forgotPassword') › it('email tồn tại: lưu HASH của token (hết hạn 15 phút) và gửi link chứa token gốc')** (`);`): FE_URL đầu tiên
- **describe('AuthService') › describe('forgotPassword') › it('BUG-07: trả lời ngay, không chờ gửi mail (SMTP chậm không làm chậm response)')** (`mail.send.mockReturnValue(new Promise(() => undefined));`): SMTP treo mãi

## `src/app/auth/auth.service.ts`

- **DUMMY_PASSWORD_HASH**: Hash giả (cùng cost với hash thật) để signIn luôn chạy bcrypt.compare kể cả khi email
  không tồn tại → không dò được email đã đăng ký qua thời gian phản hồi.
- **AuthService › constructor**: Link trong email trỏ về FE đầu tiên, chuẩn hóa giống CORS ("https://a.com/" → "https://a.com")
- **AuthService › signIn**: Đã có đủ dữ liệu user: bỏ field nhạy cảm tại chỗ, không query lại DB
- **AuthService › refreshToken**: Đổi / reset mật khẩu hoặc bị khóa sẽ tăng tokenVersion → refresh token phát trước đó bị từ chối
- **AuthService › forgotPassword**: Không await: email có tồn tại hay không thì thời gian phản hồi như nhau,
- **AuthService › forgotPassword**: và gửi mail không chặn response. Lỗi được ghi log bên trong.
- **AuthService › changePassword**: Đổi mật khẩu làm mọi refresh token cũ (mọi thiết bị) mất hiệu lực.
  Trả về cặp token mới để phiên hiện tại không bị đăng xuất.

## `src/app/auth/consts/jwt.const.ts`

- **(đầu file)**: Đơn vị: giây. Access token ngắn vì không kiểm tra DB mỗi request;
- **ACCESS_TOKEN_TTL**: refresh token dài và mỗi lần refresh sẽ đọc lại role / status từ DB.
- **TokenType**: Claim `type` để access token không dùng thay refresh token được (và ngược lại).
- **JwtPayload › ver**: Chỉ có ở refresh token: `User.tokenVersion` lúc phát token. Token cũ không có = 0.

## `src/app/auth/dto/password.dto.ts`

- **ResetPasswordDto**: Token là chuỗi hex 64 ký tự trong link gửi qua email.

## `src/app/auth/dto/sign.dto.ts`

- **SignUpDto**: Đăng ký luôn tạo customer, nên không nhận role / status.
- **RefreshTokenDto**: Web dùng cookie; app mobile / client không có cookie thì gửi refreshToken trong body.
- **RefreshTokenDto**: .default({}): Express 5 để req.body = undefined khi request không có body (web chỉ gửi cookie)
