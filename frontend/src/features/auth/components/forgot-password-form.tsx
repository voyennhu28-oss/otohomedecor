'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/features/auth/schemas';
import { setServerErrors } from '@/lib/form-errors';
import { authService } from '@/services/auth.service';

import { FormAlert } from '@/components/form-alert';

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const { errors } = form.formState;

  const forgot = useMutation({
    mutationFn: authService.forgotPassword,
    onError: (error) =>
      setServerErrors(form.setError, error, { fields: ['email'] }),
  });

  if (forgot.isSuccess) {
    return (
      <div
        role='status'
        className='flex flex-col gap-4 text-sm leading-relaxed'
      >
        <p>
          Nếu <span className='font-medium'>{forgot.variables.email}</span> đã
          đăng ký, cửa hàng đã gửi link đặt lại mật khẩu tới email này. Link hết
          hạn sau 15 phút.
        </p>
        <p className='text-muted-foreground'>
          Không thấy email? Kiểm tra thư mục spam, hoặc gửi lại sau ít phút.
        </p>
        <div className='mt-4 flex flex-wrap gap-x-6 gap-y-3'>
          <Link
            href='/sign-in'
            className='font-medium underline underline-offset-4'
          >
            Quay lại đăng nhập
          </Link>
          <button
            type='button'
            onClick={() => forgot.reset()}
            className='text-muted-foreground underline underline-offset-4 hover:text-foreground'
          >
            Dùng email khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => forgot.mutate(values))}
    >
      <FieldGroup className='gap-6'>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor='email'>Email</FieldLabel>
          <Input
            id='email'
            type='email'
            autoComplete='email'
            inputMode='email'
            className='h-11'
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        {errors.root?.server && (
          <FormAlert>{errors.root.server.message}</FormAlert>
        )}

        <Button
          type='submit'
          size='lg'
          disabled={forgot.isPending}
          className='h-14 w-full rounded-sm label-caps'
        >
          {forgot.isPending ? 'Đang gửi…' : 'Gửi link đặt lại mật khẩu'}
        </Button>
      </FieldGroup>
    </form>
  );
}
