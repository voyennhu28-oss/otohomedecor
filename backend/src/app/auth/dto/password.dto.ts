import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../users/dto/user-fields';

export class ForgotPasswordDto extends createZodDto(
  z.object({ email: emailSchema }),
) {}

/** Token là chuỗi hex 64 ký tự trong link gửi qua email. */
export class ResetPasswordDto extends createZodDto(
  z.object({
    token: z.string().regex(/^[a-f\d]{64}$/i, 'Token không hợp lệ'),
    newPassword: passwordSchema,
  }),
) {}

export class ChangePasswordDto extends createZodDto(
  z
    .object({
      oldPassword: z.string().min(1),
      newPassword: passwordSchema,
    })
    .refine((d) => d.oldPassword !== d.newPassword, {
      message: 'Mật khẩu mới phải khác mật khẩu cũ',
      path: ['newPassword'],
    }),
) {}
