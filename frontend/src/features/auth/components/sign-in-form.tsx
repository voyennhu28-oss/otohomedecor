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
import { useAuthSuccess } from '@/features/auth/hooks/use-auth-success';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { setServerErrors } from '@/lib/form-errors';
import { authService } from '@/services/auth.service';

import { FormAlert } from './form-alert';
import { PasswordInput } from './password-input';

export function SignInForm() {
  const onSuccess = useAuthSuccess();
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const signIn = useMutation({
    mutationFn: authService.signIn,
    onSuccess,
    onError: (error) => {
      setServerErrors(form.setError, error, { fields: ['email', 'password'] });
      form.resetField('password', { keepError: true });
    },
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => signIn.mutate(values))}
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

        <Field data-invalid={!!errors.password}>
          <div className='flex items-baseline justify-between gap-4'>
            <FieldLabel htmlFor='password'>Mật khẩu</FieldLabel>
            <Link
              href='/forgot-password'
              className='text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline'
            >
              Quên mật khẩu?
            </Link>
          </div>
          <PasswordInput
            id='password'
            autoComplete='current-password'
            className='h-11'
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        {errors.root?.server && (
          <FormAlert>{errors.root.server.message}</FormAlert>
        )}

        <Button
          type='submit'
          size='lg'
          disabled={signIn.isPending || signIn.isSuccess}
          className='h-14 w-full rounded-sm label-caps'
        >
          {signIn.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </FieldGroup>
    </form>
  );
}
