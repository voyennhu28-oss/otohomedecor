import { Logger } from '@nestjs/common';
import { z, ZodTypeAny } from 'zod';

const zodWarnOptional = <T extends ZodTypeAny>(schema: T, envName: string) =>
  schema.optional().transform((val) => {
    if (val === undefined || val === null || val === '') {
      Logger.warn(`ENV [${envName}] is not set. Some features may not work.`);
      return undefined;
    }
    return val;
  });

const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  APP_PREFIX: z.string().default('/api'),
  APP_NAME: z.string().default('nestjs_ecommerce'),
  APP_URL: z.string().url().optional(),

  FE_URL: z.string().optional(),

  THROTTLE_TTL: z.coerce.number().default(600000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  JWT_SECRET: z.string().optional(),

  MULTER_DESTINATION_FILE: z.string().default('./uploads'),

  CLOUDINARY_NAME: zodWarnOptional(z.string(), 'CLOUDINARY_NAME'),
  CLOUDINARY_API_KEY: zodWarnOptional(z.string(), 'CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: zodWarnOptional(z.string(), 'CLOUDINARY_API_SECRET'),

  CACHE_INTERNAL_TTL: z.coerce.number().default(30000),

  MAIL_INCOMING_USER: zodWarnOptional(z.string(), 'MAIL_INCOMING_USER'),
  MAIL_INCOMING_PASS: zodWarnOptional(z.string(), 'MAIL_INCOMING_PASS'),
  MAIL_HOST: zodWarnOptional(z.string(), 'MAIL_HOST'),
  MAIL_PORT: zodWarnOptional(z.string(), 'MAIL_PORT'),

  DATABASE_URL: z.string().url(),
});

const envSchema = baseEnvSchema.transform((data) => {
  const expectedUrl = `http://${data.HOST}:${data.PORT}${data.APP_PREFIX}`;

  if (!data.APP_URL) {
    data = { ...data, APP_URL: expectedUrl };
  }

  if (data.APP_URL !== expectedUrl) {
    throw new Error(`APP_URL must be "${expectedUrl}"`);
  }

  if (!data.JWT_SECRET) {
    data = { ...data, JWT_SECRET: `JWT_SECRET_${data.APP_NAME}` };
  }

  return data;
});

type EnvSchema = z.infer<typeof baseEnvSchema>;

export const EnvVars = Object.keys(baseEnvSchema.shape).reduce(
  (acc, key) => {
    acc[key] = key;
    return acc;
  },
  {} as Record<keyof EnvSchema, keyof EnvSchema>,
);

export const validate = (config: Record<string, unknown>) => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.errors.map(
      (err) => `[${err.path[0]}] ${err.message}`,
    );
    throw new Error(`Please check .env config: ${errors.join('\n')}`);
  }
  return parsed.data;
};
