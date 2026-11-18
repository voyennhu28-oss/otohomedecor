import type { AuthResult } from '@/features/auth/types';
import { api } from '@/lib/api-client';

export type SignInBody = { email: string; password: string };

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

  forgotPassword: (body: { email: string }) =>
    api.post<{ message: string }>('/auth/forgot-password', body, {
      skipAuthRefresh: true,
    }),

  resetPassword: (body: { token: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/reset-password', body, {
      skipAuthRefresh: true,
    }),
};
