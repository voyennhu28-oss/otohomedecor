'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { useAuthSuccess } from '@/features/auth/hooks/use-auth-success';
import { signUpSchema, type SignUpValues } from '@/features/auth/schemas';
import { setServerErrors } from '@/lib/form-errors';
import { authService } from '@/services/auth.service';

import { FormAlert } from './form-alert';
import { PasswordInput } from './password-input';

const FIELDS = ['fullName', 'email', 'phone', 'password'] as const;

export function SignUpForm() {
  const onAuthSuccess = useAuthSuccess();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '' },
  });
  const { errors } = form.formState;

  const signUp = useMutation({
    mutationFn: ({ phone, ...rest }: SignUpValues) =>
      authService.signUp(phone ? { ...rest, phone } : rest),
    onSuccess: (result) => {
      toast.success('Đã tạo tài khoản');
      onAuthSuccess(result);
    },
    onError: (error) =>
      setServerErrors(form.setError, error, {
        fields: FIELDS,
        conflictField: 'email',
      }),
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => signUp.mutate(values))}
    >
      <FieldGroup className='gap-6'>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor='fullName'>Họ và tên</FieldLabel>
          <Input
            id='fullName'
            autoComplete='name'
            className='h-11'
            aria-invalid={!!errors.fullName}
            {...form.register('fullName')}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>

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

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor='phone'>
            Số điện thoại
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          </FieldLabel>
          <Input
            id='phone'
            type='tel'
            autoComplete='tel'
            inputMode='tel'
            className='h-11'
            aria-invalid={!!errors.phone}
            aria-describedby='phone-description'
            {...form.register('phone')}
          />
          {errors.phone ? (
            <FieldError errors={[errors.phone]} />
          ) : (
            <FieldDescription id='phone-description'>
              Dùng để liên hệ khi giao hàng.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor='password'>Mật khẩu</FieldLabel>
          <PasswordInput
            id='password'
            autoComplete='new-password'
            className='h-11'
            aria-invalid={!!errors.password}
            aria-describedby='password-description'
            {...form.register('password')}
          />
          {errors.password ? (
            <FieldError errors={[errors.password]} />
          ) : (
            <FieldDescription id='password-description'>
              Ít nhất 8 ký tự.
            </FieldDescription>
          )}
        </Field>

        {errors.root?.server && (
          <FormAlert>{errors.root.server.message}</FormAlert>
        )}

        <Button
          type='submit'
          size='lg'
          disabled={signUp.isPending || signUp.isSuccess}
          className='h-14 w-full rounded-sm label-caps'
        >
          {signUp.isPending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </Button>
      </FieldGroup>
    </form>
  );
}
