'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { toast } from 'sonner';

import { SegmentedControl } from '@/components/admin/segmented-control';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  useCreateUser,
  useUpdateUser,
} from '@/features/admin-users/hooks/use-admin-users';
import {
  CREATE_USER_FIELDS,
  createUserSchema,
  EDIT_USER_FIELDS,
  editUserSchema,
  toCreateUserInput,
  toEditUserValues,
  toUpdateUserInput,
  type CreateUserValues,
  type EditUserValues,
} from '@/features/admin-users/schemas';
import { ROLES } from '@/features/admin-users/types';
import { PasswordInput } from '@/features/auth/components/password-input';
import type { User } from '@/features/auth/types';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';

export type UserFormTarget = { mode: 'create' } | { mode: 'edit'; user: User };

export function UserFormDialog({
  target: targetProp,
  currentUserID,
  onClose,
}: {
  target: UserFormTarget | null;
  currentUserID: string | undefined;
  onClose: () => void;
}) {
  const target = useRetainedValue(targetProp);
  const [openCount, setOpenCount] = useState(0);
  const [lastTarget, setLastTarget] = useState(targetProp);
  if (targetProp !== null && targetProp !== lastTarget) {
    setLastTarget(targetProp);
    setOpenCount((count) => count + 1);
  }

  return (
    <Dialog
      open={targetProp !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-lg'>
        {target?.mode === 'create' && (
          <CreateUserForm key={openCount} onDone={onClose} />
        )}
        {target?.mode === 'edit' && (
          <EditUserForm
            key={openCount}
            user={target.user}
            isSelf={target.user.id === currentUserID}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleStatusFields({
  control,
  isSelf,
}: {
  control: Control<EditUserValues>;
  isSelf: boolean;
}) {
  return (
    <>
      <Controller
        control={control}
        name='role'
        render={({ field }) => (
          <Field>
            <FieldLabel>Quyền</FieldLabel>
            {isSelf ? (
              <p className='text-sm'>
                {ROLES[field.value]}{' '}
                <span className='text-muted-foreground'>
                  (không tự đổi quyền của chính mình được)
                </span>
              </p>
            ) : (
              <SegmentedControl
                label='Quyền'
                value={field.value}
                onChange={field.onChange}
                options={ROLES}
              />
            )}
            {!isSelf && field.value === 'admin' && (
              <FieldDescription>
                Quản trị viên vào được trang quản trị và thấy toàn bộ đơn, khách
                hàng.
              </FieldDescription>
            )}
          </Field>
        )}
      />
      <Controller
        control={control}
        name='status'
        render={({ field }) => (
          <Field orientation='horizontal'>
            <Switch
              id='user-active'
              checked={field.value === 'active'}
              disabled={isSelf}
              onCheckedChange={(checked) =>
                field.onChange(checked ? 'active' : 'inactive')
              }
              onBlur={field.onBlur}
            />
            <FieldContent>
              <FieldLabel htmlFor='user-active'>Cho phép đăng nhập</FieldLabel>
              <FieldDescription>
                {isSelf
                  ? 'Không tự khóa tài khoản của chính mình được.'
                  : 'Tắt để khóa: tài khoản bị đăng xuất khỏi mọi thiết bị.'}
              </FieldDescription>
            </FieldContent>
          </Field>
        )}
      />
    </>
  );
}

function Footer({
  pending,
  disabled,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  disabled?: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <DialogFooter className='shrink-0 border-t bg-muted/30 px-6 py-4'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='rounded-sm'
        onClick={onCancel}
      >
        Hủy
      </Button>
      <Button
        type='submit'
        size='sm'
        className='rounded-sm'
        disabled={pending || disabled}
      >
        {pending ? 'Đang lưu…' : submitLabel}
      </Button>
    </DialogFooter>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'customer',
      status: 'active',
    },
  });
  const { errors } = form.formState;
  const create = useCreateUser();

  const onSubmit = (values: CreateUserValues) =>
    create.mutate(toCreateUserInput(values), {
      onSuccess: (user) => {
        toast.success(`Đã tạo tài khoản ${user.email}`);
        onDone();
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          form.setError(
            'email',
            { message: error.message },
            { shouldFocus: true },
          );
          return;
        }
        setServerErrors(form.setError, error, { fields: CREATE_USER_FIELDS });
      },
    });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className='flex min-h-0 flex-1 flex-col'
    >
      <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
        <DialogTitle className='text-2xl'>Tạo tài khoản</DialogTitle>
        <DialogDescription>
          Dùng để tạo thêm quản trị viên hoặc tài khoản cho khách. Gửi mật khẩu
          cho người dùng để họ đăng nhập rồi tự đổi.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className='no-scrollbar min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-5'>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor='user-name'>Họ và tên</FieldLabel>
          <Input
            id='user-name'
            autoFocus
            autoComplete='off'
            aria-invalid={!!errors.fullName}
            {...form.register('fullName')}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor='user-email'>Email</FieldLabel>
          <Input
            id='user-email'
            type='email'
            inputMode='email'
            autoComplete='off'
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor='user-password'>Mật khẩu</FieldLabel>
          <PasswordInput
            id='user-password'
            autoComplete='new-password'
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
          {errors.password ? (
            <FieldError errors={[errors.password]} />
          ) : (
            <FieldDescription>Ít nhất 8 ký tự.</FieldDescription>
          )}
        </Field>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor='user-phone'>
            Số điện thoại
            <span className='font-normal text-muted-foreground'>
              (không bắt buộc)
            </span>
          </FieldLabel>
          <Input
            id='user-phone'
            type='tel'
            inputMode='tel'
            aria-invalid={!!errors.phone}
            {...form.register('phone')}
          />
          <FieldError errors={[errors.phone]} />
        </Field>
        <RoleStatusFields
          control={form.control as unknown as Control<EditUserValues>}
          isSelf={false}
        />
      </FieldGroup>
      {errors.root?.server && (
        <FormAlert className='mx-6 mb-4 shrink-0'>
          {errors.root.server.message}
        </FormAlert>
      )}
      <Footer
        pending={create.isPending}
        submitLabel='Tạo tài khoản'
        onCancel={onDone}
      />
    </form>
  );
}

function EditUserForm({
  user,
  isSelf,
  onDone,
}: {
  user: User;
  isSelf: boolean;
  onDone: () => void;
}) {
  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: toEditUserValues(user),
  });
  const { errors, isDirty } = form.formState;
  const update = useUpdateUser();

  const onSubmit = (values: EditUserValues) => {
    const body = toUpdateUserInput(values, user);
    if (isSelf) {
      delete body.role;
      delete body.status;
    }
    if (Object.keys(body).length === 0) return onDone();
    update.mutate(
      { id: user.id, body },
      {
        onSuccess: () => {
          toast.success(`Đã lưu tài khoản ${user.email}`);
          onDone();
        },
        onError: (error) =>
          setServerErrors(form.setError, error, { fields: EDIT_USER_FIELDS }),
      },
    );
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className='flex min-h-0 flex-1 flex-col'
    >
      <DialogHeader className='shrink-0 border-b px-6 pt-6 pr-14 pb-4'>
        <DialogTitle className='text-2xl'>Sửa tài khoản</DialogTitle>
        <DialogDescription>
          {user.email}
          {isSelf && ' (bạn)'}. Email và mật khẩu không đổi ở đây.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className='no-scrollbar min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-5'>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor='user-name'>Họ và tên</FieldLabel>
          <Input
            id='user-name'
            aria-invalid={!!errors.fullName}
            {...form.register('fullName')}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor='user-phone'>Số điện thoại</FieldLabel>
          <Input
            id='user-phone'
            type='tel'
            inputMode='tel'
            aria-invalid={!!errors.phone}
            {...form.register('phone')}
          />
          {errors.phone ? (
            <FieldError errors={[errors.phone]} />
          ) : (
            <FieldDescription>Bỏ trống để xóa số điện thoại.</FieldDescription>
          )}
        </Field>
        <RoleStatusFields control={form.control} isSelf={isSelf} />
      </FieldGroup>
      {errors.root?.server && (
        <FormAlert className='mx-6 mb-4 shrink-0'>
          {errors.root.server.message}
        </FormAlert>
      )}
      <Footer
        pending={update.isPending}
        disabled={!isDirty}
        submitLabel='Lưu thay đổi'
        onCancel={onDone}
      />
    </form>
  );
}
