import { z } from 'zod';

/**
 * URL chỉ nhận http(s). `z.string().url()` nhận mọi scheme (`javascript:`, `data:`...),
 * frontend render thành href / src sẽ bị XSS. Dùng cho MỌI field URL do người dùng nhập.
 */
export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  // Không dùng new URL() ở đây: refine vẫn chạy khi .url() đã fail, new URL() sẽ ném lỗi
  .refine((url) => /^https?:\/\//i.test(url), {
    message: 'URL phải bắt đầu bằng http:// hoặc https://',
  });
