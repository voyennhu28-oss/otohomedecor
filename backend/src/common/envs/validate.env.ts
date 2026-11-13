import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { COOKIE_SAME_SITE_VALUES } from '../decorators/cookie/cookie.const';
import { parseOrigins } from '../middlewares/csrf.middleware';

const MIN_SECRET_LENGTH = 32;

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

/** Biến tùy chọn: thiếu thì chỉ cảnh báo (tính năng liên quan không chạy). */
const optionalWithWarning = (envName: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .optional()
      .transform((value) => {
        if (value === undefined) {
          Logger.warn(`ENV [${envName}] chưa đặt, một số tính năng sẽ không chạy`, 'Env');
        }
        return value;
      }),
  );

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

/** Số nguyên dương, để trống thì lấy mặc định. */
const positiveInt = (defaultValue: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(defaultValue));

/** Bắt buộc có. Độ dài tối thiểu chỉ chặn ở production (dev: cảnh báo). */
const secret = z.preprocess(emptyToUndefined, z.string({ required_error: 'bắt buộc' }).min(1, 'bắt buộc'));
const SECRET_KEYS = ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

const CLOUDINARY_KEYS = ['CLOUDINARY_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: positiveInt(5000),
    HOST: z.string().default('localhost'),
    APP_PREFIX: z.string().default('/api'),
    APP_NAME: z.string().default('home_decor'),

    FE_URL: z
      .string()
      .default('http://localhost:3000')
      .refine((value) => parseOrigins(value).length > 0, 'phải là URL (nhiều URL cách nhau bằng dấu phẩy)'),
    COOKIE_SAME_SITE: z.preprocess(emptyToUndefined, z.enum(COOKIE_SAME_SITE_VALUES).default('lax')),

    DATABASE_URL: z
      .string({ required_error: 'bắt buộc' })
      .regex(
        /^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/,
        'phải là URL MongoDB có tên database, vd ".../home_decor?retryWrites=true"',
      ),

    JWT_SECRET: secret,
    JWT_REFRESH_SECRET: secret,

    CLOUDINARY_NAME: optionalWithWarning('CLOUDINARY_NAME'),
    CLOUDINARY_API_KEY: optionalWithWarning('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: optionalWithWarning('CLOUDINARY_API_SECRET'),

    MAIL_HOST: optionalString, // bỏ trống: không gửi mail (dev in nội dung ra log)
    MAIL_PORT: positiveInt(587),
    MAIL_USER: optionalString,
    MAIL_PASS: optionalString,
    MAIL_FROM: optionalString,

    ORDER_UNPAID_TIMEOUT_MINUTES: positiveInt(30),

    THROTTLE_TTL: positiveInt(60_000),
    THROTTLE_LIMIT: positiveInt(100),
    CACHE_INTERNAL_TTL: positiveInt(30_000),
    MULTER_DESTINATION_FILE: z.string().default('./uploads'),
  })
  .passthrough() // giữ các biến chưa khai báo ở đây (VNPAY_*, MOMO_*, SEED_*...)
  .superRefine((env, ctx) => {
    if (env.JWT_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'phải khác JWT_SECRET',
      });
    }
    const isProduction = env.NODE_ENV === 'production';
    for (const key of SECRET_KEYS) {
      if (!env[key] || env[key].length >= MIN_SECRET_LENGTH) continue;
      const message = `phải dài ít nhất ${MIN_SECRET_LENGTH} ký tự`;
      if (isProduction) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
      else Logger.warn(`ENV [${key}] ${message} (bắt buộc khi production)`, 'Env');
    }
    if (isProduction) {
      for (const key of CLOUDINARY_KEYS) {
        if (!env[key]) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'bắt buộc khi production' });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Dùng trong `ConfigModule.forRoot({ validate })`: thiếu / sai biến bắt buộc thì app dừng
 * ngay lúc khởi động, báo rõ tên biến (không đợi tới khi có request chạm tới).
 */
export const validate = (config: Record<string, unknown>): Env => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Cấu hình .env không hợp lệ:\n${errors.join('\n')}`);
  }
  return parsed.data;
};
