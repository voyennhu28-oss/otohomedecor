import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ');

export const emailSchema = z.string().trim().toLowerCase().email();

export const fullNameSchema = z.string().trim().min(1).max(100);

/** bcrypt chỉ dùng 72 BYTE đầu (chữ có dấu chiếm 2–3 byte) nên giới hạn theo byte, không theo ký tự. */
export const PASSWORD_MAX_BYTES = 72;

export const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES, {
    message: `Mật khẩu tối đa ${PASSWORD_MAX_BYTES} byte (chữ có dấu tính 2–3 byte)`,
  });
