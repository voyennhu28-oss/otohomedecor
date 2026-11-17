import { z } from 'zod';

// Rule giữ giống SignUpDto / SignInDto của backend
// (../backend/src/app/auth/dto/sign.dto.ts và ../backend/src/app/users/dto/user-fields.ts).

/** bcrypt chỉ dùng 72 byte đầu; chữ có dấu chiếm 2–3 byte nên đếm theo byte. */
const PASSWORD_MAX_BYTES = 72;
const PHONE_PATTERN = /^(0|\+84)\d{9}$/;

const emailField = z
  .string()
  .trim()
  .min(1, 'Nhập email')
  .pipe(z.email('Email không hợp lệ'));

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Nhập mật khẩu'),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Nhập họ và tên')
    .max(100, 'Họ và tên tối đa 100 ký tự'),
  email: emailField,
  /** Không bắt buộc. Để trống thì không gửi lên backend. */
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || PHONE_PATTERN.test(value),
      'Số điện thoại gồm 10 số, bắt đầu bằng 0 hoặc +84',
    ),
  password: z
    .string()
    .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
    .refine(
      (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
      'Mật khẩu quá dài (tối đa 72 byte, chữ có dấu tính 2–3 byte)',
    ),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
