import type { AuthResult } from '@/features/auth/types';
import { api } from '@/lib/api-client';

// POST /auth/* — xem ../backend/src/app/auth/auth.controller.ts

export type SignInBody = { email: string; password: string };

/** SignUpDto là .strict(): chỉ gửi đúng các field này, `phone` bỏ hẳn khi trống. */
export type SignUpBody = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

export const authService = {
  signIn: (body: SignInBody) =>
    api.post<AuthResult>('/auth/sign-in', body, { skipAuthRefresh: true }),

  signUp: (body: SignUpBody) =>
    api.post<AuthResult>('/auth/sign-up', body, { skipAuthRefresh: true }),

  logout: () =>
    api.post<{ message: string }>('/auth/logout', undefined, {
      skipAuthRefresh: true,
    }),

  /** Luôn trả cùng một câu, email có tồn tại hay không (chống dò email). */
  forgotPassword: (body: { email: string }) =>
    api.post<{ message: string }>('/auth/forgot-password', body, {
      skipAuthRefresh: true,
    }),

  resetPassword: (body: { token: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/reset-password', body, {
      skipAuthRefresh: true,
    }),
};
