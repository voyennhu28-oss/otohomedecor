import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  emailSchema,
  fullNameSchema,
  passwordSchema,
  phoneSchema,
} from '../../users/dto/user-fields';

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

export class RefreshTokenDto extends createZodDto(
  z.object({ refreshToken: z.string().optional() }).default({}),
) {}
