# Module `users` (src/app/users)

## `src/app/users/dto/create-user.dto.ts`

- **CreateUserDto**: POST /admin/users

## `src/app/users/dto/query-users.dto.ts`

- **QueryUsersDto**: GET /admin/users?page=&itemPerPage=&q=&role=&status=
- **QueryUsersDto › q** (`q: z.string().trim().min(1).optional(),`): tìm theo email, tên, SĐT

## `src/app/users/dto/update-me.dto.ts`

- **UpdateMeDto**: PATCH /me: chỉ sửa thông tin cá nhân. Gửi field khác (role, email...) sẽ bị 400.

## `src/app/users/dto/update-user.dto.ts`

- **UpdateUserDto**: PATCH /admin/users/:id. Không sửa email, mật khẩu ở đây.

## `src/app/users/dto/user-fields.spec.ts`

- **TOO_LONG_BYTES**: 37 chữ "ê" = 37 ký tự nhưng 74 byte UTF-8.
- **MAX_BYTES** (`const MAX_BYTES = 'ê'.repeat(36);`): 72 byte

## `src/app/users/dto/user-fields.ts`

- **PASSWORD_MAX_BYTES**: bcrypt chỉ dùng 72 BYTE đầu (chữ có dấu chiếm 2–3 byte) nên giới hạn theo byte, không theo ký tự.

## `src/app/users/users.controller.ts`

- **UsersController**: Tài khoản của người đang đăng nhập. userID luôn lấy từ token.

## `src/app/users/users.module.ts`

- **UsersModule › imports** (`ProductsModule,`): wishlist đọc thông tin sản phẩm qua ProductsService
- **UsersModule › imports** (`OrdersModule,`): tổng chi tiêu của user (admin xem chi tiết user)
- **UsersModule › exports** (`exports: [UsersService],`): auth dùng để tìm user khi đăng nhập

## `src/app/users/users.service.spec.ts`

- **expectOmitSensitive**: Mọi lệnh đọc / ghi trả user ra ngoài phải omit đủ các field nhạy cảm.
- **describe('UsersService') › describe('wishlist') › it('BUG-08: có request thêm sản phẩm chen vào (P2034) → đọc lại, không làm mất sản phẩm vừa thêm')** (`.mockResolvedValueOnce({ wishlistProductIDs: [P1, P2] });`): P2 vừa được thêm

## `src/app/users/users.service.ts`

- **SENSITIVE_FIELDS**: Không bao giờ trả các field này ra response.
- **omitSensitive**: Bỏ các field nhạy cảm khỏi user đã đọc kèm password (vd từ `findForAuth`), không cần query lại.
- **nextTokenVersion**: Tăng tokenVersion → mọi refresh token đã phát mất hiệu lực (field thiếu = 0).
- **rethrowNotFound**: `update` không khớp bản ghi nào (không tồn tại / đã soft delete) → 404 với câu thông báo riêng.
- **UsersService › updateMe**: 1 lệnh: `where` kèm NOT_DELETED nên tài khoản đã xóa không khớp → P2025 → 404.
- **UsersService › getWishlist › byID**: Sản phẩm thêm sau hiện trước. Sản phẩm đã ẩn / xóa thì không hiện (vẫn giữ ID trong mảng)
- **UsersService › addToWishlist**: Atomic: chỉ push khi chưa có, nên gọi 2 lần cũng không bị trùng.
  Không cần kiểm tra user trước: user đã xóa không khớp NOT_DELETED (không ghi gì),
- **UsersService › addToWishlist**: và getWishlistIDs ngay sau đó ném 404.
- **UsersService › removeFromWishlist**: Prisma + MongoDB không có `pull` cho mảng scalar, nên phải đọc rồi ghi lại cả mảng.
  Chạy trong transaction: nếu request khác (vd thêm sản phẩm) ghi chen vào giữa thì
- **UsersService › removeFromWishlist › wishlistProductIDs**: transaction bị xung đột (P2034) và chạy lại với dữ liệu mới, không ghi đè mất.
- **UsersService › findAll › [list, totalItems]** (`this.extended.count({ where }),`): cùng where với findMany
- **UsersService › findOne › [user, totalSpent]**: Chạy song song: tổng chi tiêu không phụ thuộc kết quả đọc user (user không có thì bỏ đi)
- **UsersService › create › existing**: Dùng client gốc để thấy cả tài khoản đã soft delete (email vẫn bị giữ bởi @unique)
- **UsersService › update › isLocking**: Khóa tài khoản: thu hồi luôn refresh token, để mở khóa sau này token cũ không dùng lại được
- **UsersService › remove › { count }**: 1 lệnh, atomic: chỉ xóa khi chưa bị xóa; không khớp bản ghi nào → 404
- **UsersService › findForAuth**: User KÈM password để auth so sánh. Không bao giờ trả kết quả này ra response.
- **UsersService › findByResetPasswordToken**: Tìm user có token reset còn hạn (token đã được hash).
- **UsersService › updatePassword**: Hash mật khẩu mới, vô hiệu hóa token reset (nếu có) và mọi refresh token đã phát.
  Trả về tokenVersion mới để auth cấp token mới cho phiên hiện tại.
- **UsersService › ensureExists**: Ném 404 nếu user không tồn tại hoặc đã bị soft delete.
