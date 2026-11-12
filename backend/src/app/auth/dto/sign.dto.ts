import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  emailSchema,
  fullNameSchema,
  passwordSchema,
  phoneSchema,
} from '../../users/dto/user-fields';

/** Đăng ký luôn tạo customer, nên không nhận role / status. */
export class SignUpDto extends createZodDto(
  z
    .object({
      email: emailSchema,
      password: passwordSchema,
      fullName: fullNameSchema,
      phone: phoneSchema.optional(),
    })
    .strict(),
) {}

export class SignInDto extends createZodDto(
  z.object({
    email: emailSchema,
    password: z.string().min(1),
  }),
) {}

/** Web dùng cookie; app mobile / client không có cookie thì gửi refreshToken trong body. */
export class RefreshTokenDto extends createZodDto(
  // .default({}): Express 5 để req.body = undefined khi request không có body (web chỉ gửi cookie)
  z.object({ refreshToken: z.string().optional() }).default({}),
) {}
