'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  RESET_TOKEN_PATTERN,
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/features/auth/schemas';
import { setServerErrors } from '@/lib/form-errors';
import { authService } from '@/services/auth.service';

import { FormAlert } from './form-alert';
import { PasswordInput } from './password-input';

const requestAgainLink = (
  <Link
    href='/forgot-password'
    className='font-medium underline underline-offset-4'
  >
    Gửi lại link mới
  </Link>
);

/** Đọc `?token=` từ link trong email. Trang phải bọc component này trong <Suspense>. */
export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const { errors } = form.formState;

  const reset = useMutation({
    mutationFn: ({ newPassword }: ResetPasswordValues) =>
      authService.resetPassword({ token, newPassword }),
    onSuccess: () => {
      toast.success('Đã đặt lại mật khẩu. Đăng nhập bằng mật khẩu mới.');
      router.replace('/sign-in');
    },
    onError: (error) =>
      setServerErrors(form.setError, error, {
        fields: ['newPassword', 'confirmPassword'],
      }),
  });

  if (!RESET_TOKEN_PATTERN.test(token)) {
    return (
      <div className='flex flex-col items-start gap-4 text-sm leading-relaxed'>
        <FormAlert>Link đặt lại mật khẩu không hợp lệ.</FormAlert>
        <p className='text-muted-foreground'>
          Hãy mở đúng link trong email, hoặc yêu cầu link mới.
        </p>
        {requestAgainLink}
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => reset.mutate(values))}
    >
      <FieldGroup className='gap-6'>
        <Field data-invalid={!!errors.newPassword}>
          <FieldLabel htmlFor='newPassword'>Mật khẩu mới</FieldLabel>
          <PasswordInput
            id='newPassword'
            autoComplete='new-password'
            className='h-11'
            aria-invalid={!!errors.newPassword}
            aria-describedby='newPassword-description'
            {...form.register('newPassword')}
          />
          {errors.newPassword ? (
            <FieldError errors={[errors.newPassword]} />
          ) : (
            <FieldDescription id='newPassword-description'>
              Ít nhất 8 ký tự.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor='confirmPassword'>
            Nhập lại mật khẩu mới
          </FieldLabel>
          <PasswordInput
            id='confirmPassword'
            autoComplete='new-password'
            className='h-11'
            aria-invalid={!!errors.confirmPassword}
            {...form.register('confirmPassword')}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>

        {errors.root?.server && (
          <FormAlert className='flex flex-col items-start gap-2'>
            {errors.root.server.message}
            {requestAgainLink}
          </FormAlert>
        )}

        <Button
          type='submit'
          size='lg'
          disabled={reset.isPending || reset.isSuccess}
          className='h-14 w-full rounded-sm label-caps'
        >
          {reset.isPending ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
        </Button>
      </FieldGroup>
    </form>
  );
}
