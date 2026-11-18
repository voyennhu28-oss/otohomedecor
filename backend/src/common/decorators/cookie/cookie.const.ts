import { CookieOptions } from 'express';

export const COOKIE_SAME_SITE_VALUES = ['lax', 'strict', 'none'] as const;
export type CookieSameSite = (typeof COOKIE_SAME_SITE_VALUES)[number];

export const COOKIE_CONFIG_DEFAULT = {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
} as const satisfies CookieOptions;
