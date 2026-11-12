import { Role, UserStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  emailSchema,
  fullNameSchema,
  passwordSchema,
  phoneSchema,
} from './user-fields';

/** POST /admin/users */
export class CreateUserDto extends createZodDto(
  z
    .object({
      email: emailSchema,
      password: passwordSchema,
      fullName: fullNameSchema,
      phone: phoneSchema.optional(),
      role: z.nativeEnum(Role).default(Role.customer),
      status: z.nativeEnum(UserStatus).default(UserStatus.active),
    })
    .strict(),
) {}
