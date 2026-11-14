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
const SEPAY_KEYS = ['SEPAY_BANK', 'SEPAY_ACCOUNT_NUMBER'] as const;

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
    // Số reverse proxy phía trước app (Render / Railway: 1). 0 = không có proxy
    TRUST_PROXY: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(10).default(0)),

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

    // Brevo SMTP relay. Bỏ trống MAIL_HOST: không gửi mail (dev in nội dung ra log)
    MAIL_HOST: optionalString,
    MAIL_PORT: positiveInt(587),
    MAIL_USER: optionalString, // SMTP login do Brevo cấp, không phải email gửi đi
    MAIL_PASS: optionalString, // SMTP key
    MAIL_FROM: optionalString, // sender đã xác minh trên Brevo (bắt buộc khi có MAIL_HOST)

    ORDER_UNPAID_TIMEOUT_MINUTES: positiveInt(30), // đơn chuyển khoản chưa nhận tiền quá hạn → cron hủy

    // SePay (chuyển khoản). Thiếu thì không đặt được đơn bank_transfer; production bắt buộc
    // Xác thực webhook: SEPAY_WEBHOOK_SECRET (HMAC-SHA256, khuyến nghị) hoặc SEPAY_WEBHOOK_API_KEY
    SEPAY_WEBHOOK_SECRET: optionalString,
    SEPAY_WEBHOOK_API_KEY: optionalString,
    SEPAY_BANK: optionalWithWarning('SEPAY_BANK'),
    SEPAY_ACCOUNT_NUMBER: z.preprocess(
      emptyToUndefined,
      z.string().regex(/^[A-Za-z0-9]+$/, 'chỉ gồm chữ và số').optional(),
    ),
    SEPAY_ACCOUNT_NAME: optionalString,

    THROTTLE_TTL: positiveInt(60_000),
    THROTTLE_LIMIT: positiveInt(100),
    CACHE_INTERNAL_TTL: positiveInt(30_000),
    MULTER_DESTINATION_FILE: z.string().default('./uploads'),
  })
  .passthrough() // giữ các biến chưa khai báo ở đây (SEED_*...)
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
    // Brevo chỉ gửi từ sender đã xác minh; thiếu MAIL_FROM thì nodemailer lấy MAIL_USER (SMTP login) → bị từ chối
    if (env.MAIL_HOST && !env.MAIL_FROM) {
      const message = 'bắt buộc khi có MAIL_HOST (sender đã xác minh trên Brevo)';
      if (isProduction) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MAIL_FROM'], message });
      else Logger.warn(`ENV [MAIL_FROM] ${message}`, 'Env');
    }
    // Webhook SePay phải có 1 cách xác thực, không thì ai cũng gọi được để đánh dấu đơn đã trả tiền
    if (!env.SEPAY_WEBHOOK_SECRET && !env.SEPAY_WEBHOOK_API_KEY) {
      const message = 'cần SEPAY_WEBHOOK_SECRET (HMAC-SHA256) hoặc SEPAY_WEBHOOK_API_KEY để xác thực webhook SePay';
      if (isProduction) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SEPAY_WEBHOOK_SECRET'], message });
      else Logger.warn(`ENV ${message}`, 'Env');
    }
    if (isProduction) {
      for (const key of [...CLOUDINARY_KEYS, ...SEPAY_KEYS]) {
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
