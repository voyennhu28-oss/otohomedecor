import { z } from 'zod';

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((url) => /^https?:\/\//i.test(url), {
    message: 'URL phải bắt đầu bằng http:// hoặc https://',
  });
