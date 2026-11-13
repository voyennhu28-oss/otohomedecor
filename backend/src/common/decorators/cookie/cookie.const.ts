import { CookieOptions } from 'express';

export const COOKIE_SAME_SITE_VALUES = ['lax', 'strict', 'none'] as const;
export type CookieSameSite = (typeof COOKIE_SAME_SITE_VALUES)[number];

/**
 * Cookie đăng nhập. `SameSite=Lax`: trình duyệt không gửi cookie kèm request POST từ site khác.
 * FE và API cùng site (cùng domain gốc, khác port / subdomain vẫn tính là cùng site) dùng 'lax'.
 * Chỉ đặt COOKIE_SAME_SITE=none khi FE và API khác domain gốc; khi đó middleware `verifyOrigin`
 * vẫn chặn CSRF.
 */
export const COOKIE_CONFIG_DEFAULT = {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
} as const satisfies CookieOptions;
