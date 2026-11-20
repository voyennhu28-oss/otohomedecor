import { describe, expect, it } from 'vitest';

import {
  createUserSchema,
  toCreateUserInput,
  toEditUserValues,
  toUpdateUserInput,
  toUserQuery,
  USER_FILTER_DEFAULTS,
} from '@/features/admin-users/schemas';
import type { User } from '@/features/auth/types';

const user: User = {
  id: 'u1',
  email: 'an@example.com',
  fullName: 'Nguyễn Văn An',
  phone: null,
  avatarUrl: null,
  role: 'customer',
  status: 'active',
  wishlistProductIDs: [],
  deletedAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

describe('admin users', () => {
  it('tạo tài khoản: SĐT trống thì không gửi, mật khẩu ≥ 8 ký tự', () => {
    const values = createUserSchema.parse({
      email: ' An@Example.com ',
      password: '12345678',
      fullName: 'An',
      phone: '',
      role: 'admin',
      status: 'active',
    });
    expect(toCreateUserInput(values)).toEqual({
      email: 'An@Example.com',
      password: '12345678',
      fullName: 'An',
      role: 'admin',
      status: 'active',
    });
    expect(
      createUserSchema.safeParse({ ...values, password: '123' }).success,
    ).toBe(false);
  });

  it('sửa: chỉ gửi field đã đổi, xóa SĐT gửi null', () => {
    const values = toEditUserValues({ ...user, phone: '0912345678' });
    expect(toUpdateUserInput(values, { ...user, phone: '0912345678' })).toEqual(
      {},
    );
    expect(
      toUpdateUserInput(
        { ...values, phone: '', status: 'inactive' },
        { ...user, phone: '0912345678' },
      ),
    ).toEqual({ phone: null, status: 'inactive' });
  });

  it('đọc bộ lọc URL', () => {
    expect(
      toUserQuery({ ...USER_FILTER_DEFAULTS, role: 'admin', status: 'x' }),
    ).toEqual({ role: 'admin', page: 1, itemPerPage: 20 });
  });
});
