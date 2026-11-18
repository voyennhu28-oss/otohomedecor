import { Role, UserStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { fullNameSchema, phoneSchema } from './user-fields';

export class UpdateUserDto extends createZodDto(
  z
    .object({
      fullName: fullNameSchema.optional(),
      phone: phoneSchema.nullable().optional(),
      role: z.nativeEnum(Role).optional(),
      status: z.nativeEnum(UserStatus).optional(),
    })
    .strict(),
) {}
