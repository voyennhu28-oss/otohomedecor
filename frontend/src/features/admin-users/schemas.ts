import { z } from 'zod';

import type {
  CreateUserInput,
  UpdateUserInput,
} from '@/features/admin-users/types';
import {
  emailField,
  fullNameField,
  optionalPhoneField,
  passwordField,
} from '@/features/auth/schemas';
import type { User } from '@/features/auth/types';
import { parseOption, parsePositiveInt } from '@/hooks/use-url-filters';

const roleField = z.enum(['customer', 'admin']);
const statusField = z.enum(['active', 'inactive']);

export const createUserSchema = z.object({
  email: emailField,
  password: passwordField,
  fullName: fullNameField,
  phone: optionalPhoneField,
  role: roleField,
  status: statusField,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  fullName: fullNameField,
  phone: optionalPhoneField,
  role: roleField,
  status: statusField,
});

export type EditUserValues = z.infer<typeof editUserSchema>;

export const CREATE_USER_FIELDS = [
  'email',
  'password',
  'fullName',
  'phone',
  'role',
  'status',
] as const;

export const EDIT_USER_FIELDS = [
  'fullName',
  'phone',
  'role',
  'status',
] as const;

export function toCreateUserInput(values: CreateUserValues): CreateUserInput {
  const { phone, ...rest } = values;
  return phone ? { ...rest, phone } : rest;
}

export function toEditUserValues(user: User): EditUserValues {
  return {
    fullName: user.fullName,
    phone: user.phone ?? '',
    role: user.role,
    status: user.status,
  };
}

export function toUpdateUserInput(
  values: EditUserValues,
  original: User,
): UpdateUserInput {
  const body: UpdateUserInput = {};
  if (values.fullName !== original.fullName) body.fullName = values.fullName;
  if (values.phone !== (original.phone ?? ''))
    body.phone = values.phone || null;
  if (values.role !== original.role) body.role = values.role;
  if (values.status !== original.status) body.status = values.status;
  return body;
}

export const USER_FILTER_DEFAULTS = {
  q: '',
  role: '',
  status: '',
  page: '1',
  size: '20',
};

export function toUserQuery(raw: typeof USER_FILTER_DEFAULTS) {
  const role = parseOption(raw.role, ['', 'customer', 'admin'] as const, '');
  const status = parseOption(
    raw.status,
    ['', 'active', 'inactive'] as const,
    '',
  );
  const q = raw.q.trim().slice(0, 100);
  return {
    q: q || undefined,
    role: role || undefined,
    status: status || undefined,
    page: parsePositiveInt(raw.page, 1),
    itemPerPage: Math.min(parsePositiveInt(raw.size, 20), 100),
  };
}
