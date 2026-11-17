// Khớp model User của backend (../backend/src/app/users/entities) sau khi bỏ field nhạy cảm
// (password, resetPasswordToken, resetPasswordExp, tokenVersion). Ngày giờ về dạng chuỗi ISO.

export type Role = 'admin' | 'customer';
export type UserStatus = 'active' | 'inactive';

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  wishlistProductIDs: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Response của sign-in / sign-up. Backend trả kèm accessToken / refreshToken cho app mobile,
 * nhưng web dùng cookie httpOnly nên type cố ý không khai báo token: không đọc, không lưu.
 */
export type AuthResult = {
  user: User;
};
