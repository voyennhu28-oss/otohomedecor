import type { User } from '@/features/auth/types';
import { api } from '@/lib/api-client';

// /me — xem ../backend/src/app/users/users.controller.ts

export const userService = {
  getMe: () => api.get<User>('/me'),
};
