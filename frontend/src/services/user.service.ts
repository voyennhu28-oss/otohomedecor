import type { User } from '@/features/auth/types';
import { api } from '@/lib/api-client';

export const userService = {
  getMe: () => api.get<User>('/me'),
};
