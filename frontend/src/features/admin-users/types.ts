import type { Address } from '@/features/addresses/types';
import type { Role, User, UserStatus } from '@/features/auth/types';

export const ROLES: Record<Role, string> = {
  customer: 'Khách hàng',
  admin: 'Quản trị viên',
};

export const USER_STATUSES: Record<UserStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Đã khóa',
};

export type AdminUserDetail = User & {
  addresses: Address[];
  _count: { orders: number; reviews: number };
  totalSpent: number;
};

export type AdminUserQuery = {
  q?: string;
  role?: Role;
  status?: UserStatus;
  page?: number;
  itemPerPage?: number;
};

export type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: Role;
  status?: UserStatus;
};

export type UpdateUserInput = Partial<{
  fullName: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
}>;
