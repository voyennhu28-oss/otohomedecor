import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ');

export const emailSchema = z.string().trim().toLowerCase().email();

export const fullNameSchema = z.string().trim().min(1).max(100);

// bcrypt chỉ dùng 72 byte đầu của mật khẩu
export const passwordSchema = z.string().min(8).max(72);
